import { describe, expect, it } from "vitest";
import { parseMysqlUrl } from "@/lib/parse-mysql-url";

describe("parseMysqlUrl", () => {
  it("parsea usuario, contraseña, host, puerto y base", () => {
    const r = parseMysqlUrl("mysql://user:secret@db.example.com:3307/mydb");
    expect(r).toEqual({
      user: "user",
      password: "secret",
      host: "db.example.com",
      port: 3307,
      database: "mydb",
    });
  });

  it("usa puerto 3306 si no se indica", () => {
    const r = parseMysqlUrl("mysql://root@localhost/engine");
    expect(r.host).toBe("localhost");
    expect(r.port).toBe(3306);
    expect(r.database).toBe("engine");
    expect(r.user).toBe("root");
    expect(r.password).toBe("");
  });

  it("decodifica usuario y contraseña con percent-encoding", () => {
    const r = parseMysqlUrl("mysql://user%40x:p%40ss%3Aw@127.0.0.1/db");
    expect(r.user).toBe("user@x");
    expect(r.password).toBe("p@ss:w");
  });

  it("ignora query string tras el nombre de la base", () => {
    const r = parseMysqlUrl("mysql://u:p@h/dbname?schema=public");
    expect(r.database).toBe("dbname");
  });
});
