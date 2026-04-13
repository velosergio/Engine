import { execSync } from "node:child_process";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

function parseMysqlUrl(url) {
  const parsed = new URL(url);
  if (!["mysql:", "mariadb:"].includes(parsed.protocol)) {
    throw new Error(
      `DATABASE_URL debe usar mysql:// o mariadb://. Recibido: ${parsed.protocol}`,
    );
  }
  const database = parsed.pathname.replace(/^\/+/, "");
  if (!database) {
    throw new Error("DATABASE_URL no incluye nombre de base de datos.");
  }
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está definida.");
  }

  const cfg = parseMysqlUrl(url);
  const adapter = new PrismaMariaDb(cfg);
  const prisma = new PrismaClient({ adapter });

  try {
    const count = await prisma.unitDefinition.count();
    if (count === 0) {
      console.log("DB vacia: ejecutando seed...");
      execSync("node ./scripts/seed-runtime.mjs", { stdio: "inherit" });
    } else {
      console.log("DB con datos: se omite seed.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
