import * as Phaser from "phaser";
import { AiDirector } from "@/game/ai/AiDirector";
import { DAMAGE_BONUS_PER_PURCHASE } from "@/lib/damage-upgrade-economy";
import { type GameBalancePayload } from "@/lib/game-balance-types";
import type { MatchOutcome } from "@/lib/match-end-types";
import { soldierAttackIntervalMs } from "@/lib/soldier-attack-interval";
import {
  registerBattleTextures,
  TEX_ALLY,
  TEX_BASE,
  TEX_GROUND,
} from "@/game/pixel/renderPixelArt";

type UnitRow = {
  id: string;
  playerId: number;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  attackIntervalMs: number;
  sprite: Phaser.GameObjects.Image;
  logicX: number;
  logicY: number;
  hitW: number;
  hitH: number;
  bobPhase: number;
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

const COLLISION_PAD = 4;

const TINT_HUMAN = 0xffffff;
const TINT_AI = 0xffb090;

function collisionHalf(u: UnitRow) {
  return {
    hw: u.hitW / 2 + COLLISION_PAD,
    hh: u.hitH / 2 + COLLISION_PAD,
  };
}

function baseCenterForPlayer(
  playerId: number,
  playerCount: number,
  mapWidth: number,
  mapHeight: number,
  baseHeight: number,
): { x: number; y: number } {
  if (playerId === 0) {
    return { x: mapWidth / 2, y: mapHeight - baseHeight / 2 };
  }
  const x = (mapWidth * playerId) / playerCount;
  /** Borde superior del mapa: el rectángulo de la base toca y=0. */
  return { x, y: baseHeight / 2 };
}

export class BattleScene extends Phaser.Scene {
  private balance!: GameBalancePayload;
  private units: UnitRow[] = [];
  /** Bases por jugador (mismo índice que playerId). */
  private bases: (UnitRow | null)[] = [];
  private hud!: Phaser.GameObjects.Text;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private combatTimer!: Phaser.Time.TimerEvent;
  private spawnSlotIndex = 0;
  /** Bonus de ataque acumulado por compras; se suma al spawn y a unidades vivas. */
  private attackBonusByPlayer: number[] = [];
  /** Bonus de golpes/s por compras de velocidad de ataque. */
  private attackSpeedApsBonusByPlayer: number[] = [];
  private readonly aiDirector = new AiDirector();
  private readonly vSeek = new Phaser.Math.Vector2();
  private readonly vSep = new Phaser.Math.Vector2();
  private readonly vClose = new Phaser.Math.Vector2();
  private matchEnded = false;

  constructor() {
    super({ key: "BattleScene" });
  }

  create() {
    this.balance = this.registry.get("balance") as GameBalancePayload;
    const { mapWidth, mapHeight, baseWidth, baseHeight, playerCount } =
      this.balance;

    registerBattleTextures(this);

    this.add
      .tileSprite(0, 0, mapWidth, mapHeight, TEX_GROUND)
      .setOrigin(0)
      .setDepth(-10);

    const baseDef = this.balance.units.base;
    this.attackBonusByPlayer = Array.from({ length: playerCount }, () => 0);
    this.attackSpeedApsBonusByPlayer = Array.from({ length: playerCount }, () => 0);
    this.bases = Array.from({ length: playerCount }, () => null);

    for (let p = 0; p < playerCount; p++) {
      const { x: bx, y: by } = baseCenterForPlayer(
        p,
        playerCount,
        mapWidth,
        mapHeight,
        baseHeight,
      );
      const tint = p === 0 ? TINT_HUMAN : TINT_AI;
      const baseSprite = this.add
        .image(bx, by, TEX_BASE)
        .setDisplaySize(baseWidth, baseHeight)
        .setTint(tint)
        .setDepth(p === 0 ? 2 : 3);
      const row: UnitRow = {
        id: `base_p${p}`,
        playerId: p,
        hp: baseDef.maxHp,
        maxHp: baseDef.maxHp,
        attack: baseDef.attack,
        speed: 0,
        attackIntervalMs: 999999999,
        sprite: baseSprite,
        logicX: bx,
        logicY: by,
        hitW: baseWidth,
        hitH: baseHeight,
        bobPhase: 0,
        lastStrikeAt: 0,
        isBase: true,
      };
      this.bases[p] = row;
      this.units.push(row);
      this.attachHpBar(row, true);
    }

    this.hud = this.add
      .text(16, 16, "", {
        fontSize: "28px",
        color: "#e0e0e0",
        resolution: 2,
      })
      .setScrollFactor(0)
      .setDepth(200);

    this.spawnTimer = this.time.addEvent({
      delay: this.balance.spawnIntervalMs,
      loop: true,
      callback: () => this.spawnTickMirrored(),
    });

    this.combatTimer = this.time.addEvent({
      delay: this.balance.combatTickMs,
      loop: true,
      callback: () => this.combatTick(),
    });

    this.aiDirector.setBattleApi({
      applyDamageUpgradeForPlayer: (playerId: number) =>
        this.applyDamageUpgradeForPlayer(playerId),
      applyAttackSpeedUpgradeForPlayer: (playerId: number) =>
        this.applyAttackSpeedUpgradeForPlayer(playerId),
    });
    this.aiDirector.onMatchStart({
      playerCount,
      balance: this.balance,
    });

    this.spawnTickMirrored();

    this.game.events.emit("battle-ready");
  }

  /**
   * Sube el daño de todas las unidades móviles actuales del jugador y los futuros spawns.
   */
  applyDamageUpgradeForPlayer(playerId: number): boolean {
    if (playerId < 0 || playerId >= this.balance.playerCount) return false;

    const delta = DAMAGE_BONUS_PER_PURCHASE;
    this.attackBonusByPlayer[playerId] += delta;

    for (const u of this.units) {
      if (u.playerId !== playerId || u.isBase || u.hp <= 0) continue;
      u.attack += delta;
    }
    return true;
  }

  getAttackBonusForPlayer(playerId: number): number {
    return this.attackBonusByPlayer[playerId] ?? 0;
  }

  getAttackSpeedApsBonusForPlayer(playerId: number): number {
    return this.attackSpeedApsBonusByPlayer[playerId] ?? 0;
  }

  /** Depuración: suma ataque plano al bonus y a soldados vivos del jugador. */
  debugAddFlatDamageBonusForPlayer(playerId: number, delta: number): boolean {
    if (playerId < 0 || playerId >= this.balance.playerCount) return false;
    if (!Number.isFinite(delta) || delta <= 0) return false;

    this.attackBonusByPlayer[playerId] += delta;
    for (const u of this.units) {
      if (u.playerId !== playerId || u.isBase || u.hp <= 0) continue;
      u.attack += delta;
    }
    return true;
  }

  /** Depuración: suma APS al bonus y recalcula intervalos de soldados vivos. */
  debugAddFlatAttackSpeedApsForPlayer(
    playerId: number,
    delta: number,
  ): boolean {
    if (playerId < 0 || playerId >= this.balance.playerCount) return false;
    if (!Number.isFinite(delta) || delta <= 0) return false;

    this.attackSpeedApsBonusByPlayer[playerId] += delta;

    const def = this.balance.units.soldier_ally;
    const bonus = this.attackSpeedApsBonusByPlayer[playerId];
    const cd = this.balance.attackCooldownMs;

    for (const u of this.units) {
      if (u.playerId !== playerId || u.isBase || u.hp <= 0) continue;
      u.attackIntervalMs = soldierAttackIntervalMs(
        def.attacksPerSecond,
        bonus,
        cd,
      );
    }
    return true;
  }

  /** Depuración: fuerza victoria humana dejando bases enemigas en 0 HP. */
  debugForceHumanVictory(): boolean {
    if (this.matchEnded) return false;
    if (this.balance.playerCount <= 1) return false;

    let changed = false;
    for (let p = 1; p < this.bases.length; p++) {
      const base = this.bases[p];
      if (!base) continue;
      if (base.hp > 0) {
        base.hp = 0;
        changed = true;
      }
    }

    if (!changed) return false;
    this.checkMatchEndAfterBaseHit();
    return true;
  }

  /**
   * Sube APS efectivos del soldado para unidades vivas y futuros spawns del jugador.
   */
  applyAttackSpeedUpgradeForPlayer(playerId: number): boolean {
    if (playerId < 0 || playerId >= this.balance.playerCount) return false;

    const add = this.balance.attackSpeedApsPerPurchase;
    if (!Number.isFinite(add) || add <= 0) return false;

    this.attackSpeedApsBonusByPlayer[playerId] += add;

    const def = this.balance.units.soldier_ally;
    const bonus = this.attackSpeedApsBonusByPlayer[playerId];
    const cd = this.balance.attackCooldownMs;

    for (const u of this.units) {
      if (u.playerId !== playerId || u.isBase || u.hp <= 0) continue;
      u.attackIntervalMs = soldierAttackIntervalMs(
        def.attacksPerSecond,
        bonus,
        cd,
      );
    }
    return true;
  }

  /** Un tick de spawn: humano + espejo para cada IA (mismo slotIndex). */
  private spawnTickMirrored() {
    const slot = this.spawnSlotIndex;
    this.spawnSlotIndex += 1;

    this.spawnSoldierForPlayer(0, slot);
    this.aiDirector.onHumanBaseCommand({ type: "spawn_soldier", slotIndex: slot });

    for (let p = 1; p < this.balance.playerCount; p++) {
      this.spawnSoldierForPlayer(p, slot);
    }
  }

  private spawnSoldierForPlayer(playerId: number, slotIndex: number) {
    const def = this.balance.units.soldier_ally;
    const { mapWidth, mapHeight, baseHeight } = this.balance;
    const basePos = baseCenterForPlayer(
      playerId,
      this.balance.playerCount,
      mapWidth,
      mapHeight,
      baseHeight,
    );

    const offsetX = ((slotIndex % 9) - 4) * 52;
    const sx = basePos.x + offsetX;
    const sy =
      playerId === 0
        ? mapHeight - baseHeight - 24
        : basePos.y + baseHeight / 2 + 24;

    const aw = 36;
    const ah = 36;
    const tint = playerId === 0 ? TINT_HUMAN : TINT_AI;
    const spr = this.add
      .image(sx, sy, TEX_ALLY)
      .setDisplaySize(aw, ah)
      .setTint(tint);

    const bonus = this.attackBonusByPlayer[playerId] ?? 0;
    const apsBonus = this.attackSpeedApsBonusByPlayer[playerId] ?? 0;
    const row: UnitRow = {
      id: uid(),
      playerId,
      hp: def.maxHp,
      maxHp: def.maxHp,
      attack: def.attack + bonus,
      speed: def.speed,
      attackIntervalMs: soldierAttackIntervalMs(
        def.attacksPerSecond,
        apsBonus,
        this.balance.attackCooldownMs,
      ),
      sprite: spr,
      logicX: sx,
      logicY: sy,
      hitW: aw,
      hitH: ah,
      bobPhase: Math.random() * Math.PI * 2,
      lastStrikeAt: 0,
      isBase: false,
    };
    this.units.push(row);
    this.attachHpBar(row, false);
  }

  update(_t: number, delta: number) {
    if (this.matchEnded) return;

    this.aiDirector.onTick(this.time.now, {
      time: this.time.now,
      playerCount: this.balance.playerCount,
      deltaMs: delta,
    });

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
      u.logicX += (vx / len) * maxStep;
      u.logicY += (vy / len) * maxStep;
    }

    this.resolveSolidOverlaps();
    this.clampMobilesToMap();
    this.syncUnitSpritesWithBob();
    this.syncHpBars();
    this.refreshHud();
  }

  private syncUnitSpritesWithBob() {
    const t = this.time.now;
    for (const u of this.units) {
      if (u.hp <= 0 && !u.isBase) continue;
      const bob =
        !u.isBase && u.hp > 0
          ? Math.sin(t * 0.007 + u.bobPhase) * 1.5
          : 0;
      u.sprite.setPosition(u.logicX, u.logicY + bob);
    }
  }

  private edgeGapBetween(a: UnitRow, b: UnitRow): number {
    const dx = Math.abs(a.logicX - b.logicX);
    const dy = Math.abs(a.logicY - b.logicY);
    const hx = a.hitW / 2 + b.hitW / 2;
    const hy = a.hitH / 2 + b.hitH / 2;
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
    const hw = u.hitW / 2;
    const hh = u.hitH / 2;
    out.set(
      Phaser.Math.Clamp(px, u.logicX - hw, u.logicX + hw),
      Phaser.Math.Clamp(py, u.logicY - hh, u.logicY + hh),
    );
  }

  private seekTowardMeleeGap(u: UnitRow, foe: UnitRow) {
    const maxGap = this.balance.meleeEdgeGapMaxPx;
    if (this.edgeGapBetween(u, foe) <= maxGap) {
      this.vSeek.set(0, 0);
      return;
    }
    this.setClosestPointOnRect(u.logicX, u.logicY, foe, this.vClose);
    let wx = this.vClose.x - u.logicX;
    let wy = this.vClose.y - u.logicY;
    let wlen = Math.hypot(wx, wy);
    if (wlen < 1e-4) {
      wx = u.logicY - foe.logicY || 0.001;
      wy = foe.logicX - u.logicX || 0.001;
      wlen = Math.hypot(wx, wy) || 1;
    }
    this.vSeek.set(wx / wlen, wy / wlen);
  }

  private accumulateSeparation(u: UnitRow) {
    const R = this.balance.aiSeparationRadiusPx;
    const w = this.balance.aiSeparationWeight;

    for (const o of this.units) {
      if (o === u || o.hp <= 0 || o.playerId !== u.playerId) continue;
      const dx = u.logicX - o.logicX;
      const dy = u.logicY - o.logicY;
      const d = Math.hypot(dx, dy);
      if (d >= R || d < 1e-4) continue;
      const strength = (R - d) / R;
      this.vSep.x += (dx / d) * strength * w;
      this.vSep.y += (dy / d) * strength * w;
    }
  }

  /** IA (norte): barra bajo la unidad; humano: barra encima. */
  private hpBarRectOrigin(u: UnitRow, isBase: boolean): { x: number; y: number } {
    const bw = isBase ? 224 : 60;
    const yOffAbove = isBase ? 72 : 30;
    const gapBelow = 10;
    const x = u.logicX - bw / 2;
    if (u.playerId > 0) {
      return { x, y: u.logicY + u.hitH / 2 + gapBelow };
    }
    return { x, y: u.logicY - u.hitH / 2 - yOffAbove };
  }

  private attachHpBar(u: UnitRow, isBase: boolean) {
    const bw = isBase ? 224 : 60;
    const bh = 10;
    const { x, y } = this.hpBarRectOrigin(u, isBase);
    const fillColor = u.playerId === 0 ? 0x2ecc71 : 0xe67e22;

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
      const bw = isBase ? 224 : 60;
      const bh = 10;
      const { x, y } = this.hpBarRectOrigin(u, isBase);
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
    const dx = b.logicX - a.logicX;
    const dy = b.logicY - a.logicY;
    const overlapX = ha.hw + hb.hw - Math.abs(dx);
    const overlapY = ha.hh + hb.hh - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) return;

    const aStatic = a.isBase;
    const bStatic = b.isBase;

    if (aStatic || bStatic) {
      if (overlapX < overlapY) {
        const dir = dx >= 0 ? 1 : -1;
        const push = overlapX;
        if (aStatic && !bStatic) b.logicX += dir * push;
        else if (!aStatic && bStatic) a.logicX -= dir * push;
      } else {
        const dir = dy >= 0 ? 1 : -1;
        const push = overlapY;
        if (aStatic && !bStatic) b.logicY += dir * push;
        else if (!aStatic && bStatic) a.logicY -= dir * push;
      }
      return;
    }

    if (a.playerId !== b.playerId) {
      const low = a.playerId < b.playerId ? a : b;
      const high = a.playerId < b.playerId ? b : a;
      this.pushCrossDisplaceLower(low, high, overlapX, overlapY);
      return;
    }

    if (overlapX < overlapY) {
      const dir = dx >= 0 ? 1 : -1;
      const push = overlapX;
      a.logicX -= dir * (push / 2);
      b.logicX += dir * (push / 2);
    } else {
      const dir = dy >= 0 ? 1 : -1;
      const push = overlapY;
      a.logicY -= dir * (push / 2);
      b.logicY += dir * (push / 2);
    }
  }

  /** En melé entre jugadores, el de menor playerId cede (generaliza al antiguo aliado). */
  private pushCrossDisplaceLower(
    lower: UnitRow,
    other: UnitRow,
    overlapX: number,
    overlapY: number,
  ) {
    const dx = other.logicX - lower.logicX;
    const dy = other.logicY - lower.logicY;
    if (overlapX < overlapY) {
      const dir = dx >= 0 ? 1 : -1;
      lower.logicX -= dir * overlapX;
    } else {
      const dir = dy >= 0 ? 1 : -1;
      lower.logicY -= dir * overlapY;
    }
  }

  private clampMobilesToMap() {
    const { mapWidth, mapHeight } = this.balance;
    for (const u of this.units) {
      if (u.hp <= 0 || u.isBase) continue;
      const { hw, hh } = collisionHalf(u);
      u.logicX = Phaser.Math.Clamp(u.logicX, hw, mapWidth - hw);
      u.logicY = Phaser.Math.Clamp(u.logicY, hh, mapHeight - hh);
    }
  }

  private pickAttackTargetUnit(u: UnitRow): UnitRow | null {
    const foes = this.units.filter(
      (o) => o.playerId !== u.playerId && o.hp > 0,
    );
    if (foes.length === 0) return null;

    let best = foes[0];
    let bestD = Phaser.Math.Distance.Between(
      u.logicX,
      u.logicY,
      best.logicX,
      best.logicY,
    );
    for (let i = 1; i < foes.length; i++) {
      const o = foes[i];
      const d = Phaser.Math.Distance.Between(
        u.logicX,
        u.logicY,
        o.logicX,
        o.logicY,
      );
      if (d < bestD) {
        bestD = d;
        best = o;
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

      const foes = alive.filter((t) => t.playerId !== attacker.playerId);
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

      if (target.isBase && target.hp <= 0) {
        this.checkMatchEndAfterBaseHit();
      }
    }

    const next: UnitRow[] = [];
    for (const u of this.units) {
      if (u.hp > 0 || u.isBase) {
        next.push(u);
      } else {
        u.sprite.destroy();
        u.hpBarBg?.destroy();
        u.hpBarFill?.destroy();
      }
    }
    this.units = next;
  }

  /**
   * Fin de partida: derrota si cae la base humana (0); victoria si todas las bases IA están a 0.
   * Si ambas condiciones coinciden, cuenta derrota.
   */
  private checkMatchEndAfterBaseHit() {
    if (this.matchEnded) return;

    const humanDead = !!(this.bases[0] && this.bases[0].hp <= 0);
    const aiBases = this.bases.slice(1);
    const hasRivals =
      this.balance.playerCount > 1 && aiBases.length > 0;
    const allAiDead =
      hasRivals && aiBases.every((b) => b && b.hp <= 0);

    let outcome: MatchOutcome | null = null;
    if (humanDead) {
      outcome = "defeat";
    } else if (allAiDead) {
      outcome = "victory";
    }

    if (!outcome) return;

    this.matchEnded = true;
    this.spawnTimer.remove(false);
    this.combatTimer.remove(false);
    this.game.events.emit("match-end", { outcome });
  }

  private refreshHud() {
    const humanBase = this.bases[0];
    const hp0 = humanBase?.hp ?? 0;
    const max0 = humanBase?.maxHp ?? 1;
    const parts: string[] = [
      `Humano: ${Math.max(0, hp0)}/${max0}`,
    ];

    for (let p = 1; p < this.balance.playerCount; p++) {
      const b = this.bases[p];
      parts.push(`IA${p}: ${Math.max(0, b?.hp ?? 0)}/${b?.maxHp ?? 1}`);
    }

    const mine = this.units.filter((u) => u.playerId === 0 && !u.isBase && u.hp > 0)
      .length;
    const theirs = this.units.filter(
      (u) => u.playerId !== 0 && !u.isBase && u.hp > 0,
    ).length;
    parts.push(`Unidades H:${mine} rival:${theirs}`);

    this.hud.setText(parts.join("  |  "));
  }
}
