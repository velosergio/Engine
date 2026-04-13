import * as Phaser from "phaser";
import {
  attackIntervalFromAps,
  type GameBalancePayload,
} from "@/lib/game-balance-types";

type TeamSide = "ally" | "enemy";

type UnitRow = {
  id: string;
  team: TeamSide;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  attackIntervalMs: number;
  rect: Phaser.GameObjects.Rectangle;
  lastStrikeAt: number;
  isBase: boolean;
  hpBarBg?: Phaser.GameObjects.Rectangle;
  hpBarFill?: Phaser.GameObjects.Rectangle;
};

let _uid = 0;
function uid() {
  _uid += 1;
  return `u${_uid}`;
}

const COLLISION_PAD = 2;

function collisionHalf(u: UnitRow) {
  return {
    hw: u.rect.width / 2 + COLLISION_PAD,
    hh: u.rect.height / 2 + COLLISION_PAD,
  };
}

export class BattleScene extends Phaser.Scene {
  private balance!: GameBalancePayload;
  private units: UnitRow[] = [];
  private baseRow: UnitRow | null = null;
  private hud!: Phaser.GameObjects.Text;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private combatTimer!: Phaser.Time.TimerEvent;
  private readonly vSeek = new Phaser.Math.Vector2();
  private readonly vSep = new Phaser.Math.Vector2();
  private readonly vClose = new Phaser.Math.Vector2();

  constructor() {
    super({ key: "BattleScene" });
  }

  create() {
    this.balance = this.registry.get("balance") as GameBalancePayload;
    const { mapWidth, mapHeight, baseWidth, baseHeight } = this.balance;

    this.add.rectangle(0, 0, mapWidth, mapHeight, 0x1e2636).setOrigin(0);

    const bx = mapWidth / 2;
    const by = mapHeight - baseHeight / 2;
    const baseDef = this.balance.units.base;
    const baseRect = this.add.rectangle(bx, by, baseWidth, baseHeight, 0x2d6a4f);
    this.baseRow = {
      id: "base",
      team: "ally",
      hp: baseDef.maxHp,
      maxHp: baseDef.maxHp,
      attack: baseDef.attack,
      speed: 0,
      attackIntervalMs: 999999999,
      rect: baseRect,
      lastStrikeAt: 0,
      isBase: true,
    };
    this.units.push(this.baseRow);
    this.attachHpBar(this.baseRow, true);

    const enemyDef = this.balance.units.soldier_enemy;
    const ex = mapWidth / 2;
    const ey = 48;
    const enemyRect = this.add.rectangle(ex, ey, 20, 20, 0xc1121f);
    const enemyRow: UnitRow = {
      id: uid(),
      team: "enemy",
      hp: enemyDef.maxHp,
      maxHp: enemyDef.maxHp,
      attack: enemyDef.attack,
      speed: enemyDef.speed,
      attackIntervalMs: attackIntervalFromAps(
        enemyDef.attacksPerSecond,
        this.balance.attackCooldownMs,
      ),
      rect: enemyRect,
      lastStrikeAt: 0,
      isBase: false,
    };
    this.units.push(enemyRow);
    this.attachHpBar(enemyRow, false);

    this.hud = this.add
      .text(8, 8, "", { fontSize: "14px", color: "#e0e0e0" })
      .setScrollFactor(0)
      .setDepth(200);

    this.spawnTimer = this.time.addEvent({
      delay: this.balance.spawnIntervalMs,
      loop: true,
      callback: () => this.spawnAlly(),
    });

    this.combatTimer = this.time.addEvent({
      delay: this.balance.combatTickMs,
      loop: true,
      callback: () => this.combatTick(),
    });

    this.spawnAlly();
  }

  update(_t: number, delta: number) {
    const dt = delta / 1000;

    for (const u of this.units) {
      if (u.hp <= 0 || u.isBase) continue;
      const target = this.pickAttackTargetUnit(u);
      if (!target) continue;

      this.seekTowardMeleeGap(u, target);
      this.vSep.set(0, 0);
      this.accumulateSeparation(u);

      const vx = this.vSeek.x + this.vSep.x;
      const vy = this.vSeek.y + this.vSep.y;
      const len = Math.hypot(vx, vy);
      const maxStep = u.speed * dt;
      if (len < 1e-5) continue;
      u.rect.x += (vx / len) * maxStep;
      u.rect.y += (vy / len) * maxStep;
    }

    this.resolveSolidOverlaps();
    this.clampMobilesToMap();
    this.syncHpBars();
    this.refreshHud();
  }

  /** Hueco entre bordes de los rectángulos (0 = solapado o tocando en eje). */
  private edgeGapBetween(a: UnitRow, b: UnitRow): number {
    const dx = Math.abs(a.rect.x - b.rect.x);
    const dy = Math.abs(a.rect.y - b.rect.y);
    const hx = a.rect.width / 2 + b.rect.width / 2;
    const hy = a.rect.height / 2 + b.rect.height / 2;
    const gx = Math.max(0, dx - hx);
    const gy = Math.max(0, dy - hy);
    return Math.hypot(gx, gy);
  }

  private setClosestPointOnRect(
    px: number,
    py: number,
    u: UnitRow,
    out: Phaser.Math.Vector2,
  ) {
    const hw = u.rect.width / 2;
    const hh = u.rect.height / 2;
    out.set(
      Phaser.Math.Clamp(px, u.rect.x - hw, u.rect.x + hw),
      Phaser.Math.Clamp(py, u.rect.y - hh, u.rect.y + hh),
    );
  }

  /**
   * Acercarse al enemigo hasta que el hueco entre cajas sea ≤ melé;
   * alineado con la comprobación de golpes (evita quedar a 1px sin pegar).
   */
  private seekTowardMeleeGap(u: UnitRow, foe: UnitRow) {
    const maxGap = this.balance.meleeEdgeGapMaxPx;
    if (this.edgeGapBetween(u, foe) <= maxGap) {
      this.vSeek.set(0, 0);
      return;
    }
    this.setClosestPointOnRect(u.rect.x, u.rect.y, foe, this.vClose);
    let wx = this.vClose.x - u.rect.x;
    let wy = this.vClose.y - u.rect.y;
    let wlen = Math.hypot(wx, wy);
    if (wlen < 1e-4) {
      wx = u.rect.y - foe.rect.y || 0.001;
      wy = foe.rect.x - u.rect.x || 0.001;
      wlen = Math.hypot(wx, wy) || 1;
    }
    this.vSeek.set(wx / wlen, wy / wlen);
  }

  /** Solo aliados entre sí (no empuja enemigos). */
  private accumulateSeparation(u: UnitRow) {
    const R = this.balance.aiSeparationRadiusPx;
    const w = this.balance.aiSeparationWeight;

    for (const o of this.units) {
      if (o === u || o.hp <= 0 || o.team !== u.team) continue;
      const dx = u.rect.x - o.rect.x;
      const dy = u.rect.y - o.rect.y;
      const d = Math.hypot(dx, dy);
      if (d >= R || d < 1e-4) continue;
      const strength = (R - d) / R;
      this.vSep.x += (dx / d) * strength * w;
      this.vSep.y += (dy / d) * strength * w;
    }
  }

  private attachHpBar(u: UnitRow, isBase: boolean) {
    const bw = isBase ? 112 : 30;
    const bh = 5;
    const yOff = isBase ? 36 : 15;
    const x = u.rect.x - bw / 2;
    const y = u.rect.y - u.rect.height / 2 - yOff;
    const fillColor = u.team === "ally" ? 0x2ecc71 : 0xe74c3c;

    const bg = this.add.rectangle(x, y, bw, bh, 0x1a1a1a).setOrigin(0, 0);
    const fill = this.add.rectangle(x, y, bw, bh, fillColor).setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x000000, 0.45);
    bg.setDepth(50);
    fill.setDepth(51);
    u.hpBarBg = bg;
    u.hpBarFill = fill;
  }

  private syncHpBars() {
    for (const u of this.units) {
      if (!u.hpBarFill || !u.hpBarBg) continue;
      if (u.hp <= 0 && !u.isBase) continue;

      const isBase = u.isBase;
      const bw = isBase ? 112 : 30;
      const bh = 5;
      const yOff = isBase ? 36 : 15;
      const x = u.rect.x - bw / 2;
      const y = u.rect.y - u.rect.height / 2 - yOff;
      const ratio = u.maxHp > 0 ? Phaser.Math.Clamp(u.hp / u.maxHp, 0, 1) : 0;

      u.hpBarBg.setPosition(x, y).setSize(bw, bh);
      u.hpBarFill.setPosition(x, y).setSize(bw * ratio, bh);
    }
  }

  private resolveSolidOverlaps() {
    const solids = this.units.filter((u) => u.hp > 0);
    const passes = 4;
    for (let p = 0; p < passes; p++) {
      for (let i = 0; i < solids.length; i++) {
        for (let j = i + 1; j < solids.length; j++) {
          this.resolvePairOverlap(solids[i], solids[j]);
        }
      }
    }
  }

  private resolvePairOverlap(a: UnitRow, b: UnitRow) {
    const ha = collisionHalf(a);
    const hb = collisionHalf(b);
    const dx = b.rect.x - a.rect.x;
    const dy = b.rect.y - a.rect.y;
    const overlapX = ha.hw + hb.hw - Math.abs(dx);
    const overlapY = ha.hh + hb.hh - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) return;

    const aStatic = a.isBase;
    const bStatic = b.isBase;

    if (aStatic || bStatic) {
      if (overlapX < overlapY) {
        const dir = dx >= 0 ? 1 : -1;
        const push = overlapX;
        if (aStatic && !bStatic) b.rect.x += dir * push;
        else if (!aStatic && bStatic) a.rect.x -= dir * push;
      } else {
        const dir = dy >= 0 ? 1 : -1;
        const push = overlapY;
        if (aStatic && !bStatic) b.rect.y += dir * push;
        else if (!aStatic && bStatic) a.rect.y -= dir * push;
      }
      return;
    }

    if (a.team !== b.team) {
      if (a.team === "ally") this.pushCrossOnlyAlly(a, b, overlapX, overlapY);
      else this.pushCrossOnlyAlly(b, a, overlapX, overlapY);
      return;
    }

    if (overlapX < overlapY) {
      const dir = dx >= 0 ? 1 : -1;
      const push = overlapX;
      a.rect.x -= dir * (push / 2);
      b.rect.x += dir * (push / 2);
    } else {
      const dir = dy >= 0 ? 1 : -1;
      const push = overlapY;
      a.rect.y -= dir * (push / 2);
      b.rect.y += dir * (push / 2);
    }
  }

  /** Melé aliado–enemigo: solo el aliado cede; el enemigo no es desplazado. */
  private pushCrossOnlyAlly(
    ally: UnitRow,
    _enemy: UnitRow,
    overlapX: number,
    overlapY: number,
  ) {
    const dx = _enemy.rect.x - ally.rect.x;
    const dy = _enemy.rect.y - ally.rect.y;
    if (overlapX < overlapY) {
      const dir = dx >= 0 ? 1 : -1;
      ally.rect.x -= dir * overlapX;
    } else {
      const dir = dy >= 0 ? 1 : -1;
      ally.rect.y -= dir * overlapY;
    }
  }

  private clampMobilesToMap() {
    const { mapWidth, mapHeight } = this.balance;
    for (const u of this.units) {
      if (u.hp <= 0 || u.isBase) continue;
      const { hw, hh } = collisionHalf(u);
      u.rect.x = Phaser.Math.Clamp(u.rect.x, hw, mapWidth - hw);
      u.rect.y = Phaser.Math.Clamp(u.rect.y, hh, mapHeight - hh);
    }
  }

  private spawnAlly() {
    const def = this.balance.units.soldier_ally;
    const { mapWidth, mapHeight, baseWidth, baseHeight } = this.balance;
    const allyIdx = this.units.filter((x) => !x.isBase && x.team === "ally")
      .length;
    const sx =
      mapWidth / 2 + ((allyIdx % 9) - 4) * 26;
    const sy = mapHeight - baseHeight - 12;
    const rect = this.add.rectangle(sx, sy, 18, 18, 0x457b9d);
    const row: UnitRow = {
      id: uid(),
      team: "ally",
      hp: def.maxHp,
      maxHp: def.maxHp,
      attack: def.attack,
      speed: def.speed,
      attackIntervalMs: attackIntervalFromAps(
        def.attacksPerSecond,
        this.balance.attackCooldownMs,
      ),
      rect,
      lastStrikeAt: 0,
      isBase: false,
    };
    this.units.push(row);
    this.attachHpBar(row, false);
  }

  private pickAttackTargetUnit(u: UnitRow): UnitRow | null {
    if (u.team === "ally") {
      const foes = this.units.filter(
        (o) => o.team === "enemy" && o.hp > 0 && !o.isBase,
      );
      if (foes.length === 0) return null;
      let best = foes[0];
      let bestD = Phaser.Math.Distance.Between(
        u.rect.x,
        u.rect.y,
        best.rect.x,
        best.rect.y,
      );
      for (let i = 1; i < foes.length; i++) {
        const d = Phaser.Math.Distance.Between(
          u.rect.x,
          u.rect.y,
          foes[i].rect.x,
          foes[i].rect.y,
        );
        if (d < bestD) {
          bestD = d;
          best = foes[i];
        }
      }
      return best;
    }

    const candidates: UnitRow[] = [];
    if (this.baseRow && this.baseRow.hp > 0) {
      candidates.push(this.baseRow);
    }
    for (const o of this.units) {
      if (o.team === "ally" && !o.isBase && o.hp > 0) {
        candidates.push(o);
      }
    }
    if (candidates.length === 0) return null;
    let best = candidates[0];
    let bestD = Phaser.Math.Distance.Between(
      u.rect.x,
      u.rect.y,
      best.rect.x,
      best.rect.y,
    );
    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i];
      const d = Phaser.Math.Distance.Between(
        u.rect.x,
        u.rect.y,
        c.rect.x,
        c.rect.y,
      );
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  private combatTick() {
    const now = this.time.now;
    const maxGap = this.balance.meleeEdgeGapMaxPx;

    const alive = this.units.filter((u) => u.hp > 0);
    for (const attacker of alive) {
      if (attacker.attack <= 0) continue;
      if (now - attacker.lastStrikeAt < attacker.attackIntervalMs) continue;

      const foes = alive.filter((t) => t.team !== attacker.team);
      let target: UnitRow | null = null;
      let bestGap = Infinity;
      for (const t of foes) {
        const g = this.edgeGapBetween(attacker, t);
        if (g <= maxGap && g < bestGap) {
          bestGap = g;
          target = t;
        }
      }
      if (!target) continue;

      target.hp -= attacker.attack;
      attacker.lastStrikeAt = now;
      if (target.hp <= 0 && target.isBase) {
        this.spawnTimer.remove(false);
        this.combatTimer.remove(false);
      }
    }

    const next: UnitRow[] = [];
    for (const u of this.units) {
      if (u.hp > 0 || u.isBase) {
        next.push(u);
      } else {
        u.rect.destroy();
        u.hpBarBg?.destroy();
        u.hpBarFill?.destroy();
      }
    }
    this.units = next;
  }

  private refreshHud() {
    const hp = this.baseRow?.hp ?? 0;
    const max = this.baseRow?.maxHp ?? 1;
    const allies = this.units.filter((u) => u.team === "ally" && !u.isBase)
      .length;
    const enemies = this.units.filter((u) => u.team === "enemy").length;
    this.hud.setText(
      `Base: ${Math.max(0, hp)} / ${max}  |  Aliados: ${allies}  |  Enemigos: ${enemies}`,
    );
  }
}
