/** Parse mysql:// URLs for Prisma MariaDB adapter (XAMPP / MariaDB). */
export function parseMysqlUrl(connectionString: string) {
  const s = connectionString.replace(/^mysql:\/\//, "");
  const at = s.lastIndexOf("@");
  const auth = at >= 0 ? s.slice(0, at) : "";
  const rest = at >= 0 ? s.slice(at + 1) : s;
  const [user, password = ""] = auth.includes(":")
    ? splitOnce(auth, ":")
    : [auth, ""];
  const slash = rest.indexOf("/");
  const hostPort = slash >= 0 ? rest.slice(0, slash) : rest;
  const database =
    slash >= 0 ? rest.slice(slash + 1).split("?")[0] ?? "" : "";
  const [host, portStr] = hostPort.includes(":")
    ? splitOnce(hostPort, ":")
    : [hostPort, "3306"];
  return {
    user: decodeURIComponent(user),
    password: decodeURIComponent(password),
    host,
    port: Number(portStr) || 3306,
    database,
  };
}

function splitOnce(str: string, sep: string): [string, string] {
  const i = str.indexOf(sep);
  return i < 0 ? [str, ""] : [str.slice(0, i), str.slice(i + 1)];
}
