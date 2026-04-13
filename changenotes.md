# Change notes

## 2026-04-13 — [0.0.0.3]

- `Dockerfile` actualizado para despliegue en EasyPanel: se incluye `prisma.config.ts`, se define `DATABASE_URL` en etapas de build y se ejecuta `seed` condicional al arrancar (solo si `UnitDefinition` está vacía).
- `src/lib/game-balance.ts` ahora valida unidades requeridas (`base`, `soldier_ally`) para evitar crash en cliente Phaser cuando faltan datos iniciales en base de datos.

## 2026-04-13 — [0.0.0.2]

- Renombrado del proyecto a **Battlefront Engine System** y ajuste de metadatos en `README` y layout.
- Nuevas `devDependencies` para desarrollo/testing (`Vitest`, `Testing Library` y utilidades relacionadas).
- Mejora de mecánicas: balance de unidades y lógica de spawn actualizados en seed.
- Reestructura del cliente de juego para manejar estado de preparación y fin de partida.
- Lógica de balance ampliada para multijugador y nuevas reglas de mejoras.
- Refactor de escena de batalla para bases por jugador e interacciones de IA.

## 2026-04-13 — [0.0.0.1]

- Scaffold inicial de **Battlefront Engine System** (Next.js + React + Phaser 4).
- Persistencia de balance vía **Prisma** sobre **MariaDB/MySQL** (schema + seed + utilidades).
- Nueva API `GET /api/game-balance` y ruta `/game` para montar el cliente Phaser.
- Configuración base del proyecto (eslint, tailwind, prisma config, env example) y primeros tests.
- Añadidos “skills” internos para generación de assets y guías de buenas prácticas.
