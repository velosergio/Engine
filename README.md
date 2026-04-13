# Battlefront Engine System

RTS en el navegador: **Next.js** sirve la aplicación y el balance desde **MariaDB/MySQL**; el combate corre en **Phaser 4** dentro de un cliente React montado solo en el cliente (sin SSR del canvas).

## Requisitos

- **Node.js** (recomendado LTS actual)
- **MariaDB o MySQL** (p. ej. XAMPP con MariaDB en `localhost:3306`)
- Base de datos llamada **`engine`** (o la que indiques en `DATABASE_URL`)

## Puesta en marcha

1. Clona el repositorio e instala dependencias:

   ```bash
   npm install
   ```

2. Crea el archivo **`.env`** a partir de [`.env.example`](.env.example) y ajusta la URL si hace falta:

   ```env
   DATABASE_URL="mysql://usuario:contraseña@localhost:3306/engine"
   ```

3. Aplica el esquema y datos iniciales:

   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. Arranca el entorno de desarrollo:

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000): la portada enlaza a **`/game`**, que carga el balance desde la base de datos y monta la escena de batalla.

## Scripts npm

| Comando | Descripción                                      |
|----------------|--------------------------------------------------|
| `npm run dev`  | Next.js con Turbopack                            |
| `npm run build`| `prisma generate` + compilación de producción    |
| `npm run start`| Servidor de producción                           |
| `npm run lint` | ESLint (config Next)                             |
| `npm run test` | Vitest en modo watch                             |
| `npm run test:ci` | Vitest una vez + informe de cobertura       |
| `npm run db:push` | Sincroniza el esquema Prisma con la BD      |
| `npm run db:seed` | Ejecuta [`prisma/seed.ts`](prisma/seed.ts) |

## Arquitectura (resumen)

- **`src/app/`** — Rutas App Router: `/` (inicio), `/game` (juego), API `GET /api/game-balance`.
- **`src/lib/`** — `getGameBalance` (Prisma), tipos de balance, economía compartida, `parseMysqlUrl` para el adaptador MariaDB.
- **`src/components/game/`** — `GameClient` / `GameClientGate`, barra lateral (`GameInfoSidebar`), modales de fin de partida si aplica.
- **`src/game/`** — `mountPhaserGame`, escena `BattleScene`, IA (`AiDirector`), arte pixel (`pixel/`).
- **`prisma/`** — Esquema: `UnitDefinition`, `GameRule` (reglas clave-valor para mapa, tiempos, economía de IA, etc.).

Los tests unitarios y de componentes usan **Vitest** + **Testing Library**; Phaser se suele mockear donde no hace falta un canvas real.

## API

- **`GET /api/game-balance`** — Devuelve el JSON de balance o `503` si falla la lectura desde la base de datos.
