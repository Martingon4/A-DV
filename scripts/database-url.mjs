// Correct non-breaking spaces introduced by copying a wrapped connection hostname.
export function normalizeDatabaseUrl(value) {
  if (!value) throw new Error("DATABASE_URL es obligatoria.");
  const trimmed = value.trim();
  const authorityStart = trimmed.indexOf("://") + 3;
  const hostStart = trimmed.indexOf("@", authorityStart) + 1 || authorityStart;
  const pathStart = trimmed.indexOf("/", hostStart);
  if (authorityStart < 3 || pathStart < 0) throw new Error("DATABASE_URL tiene un formato inválido.");
  const hostname = trimmed.slice(hostStart, pathStart).replace(/\u00a0|%C2%A0/gi, "");
  const normalized = trimmed.slice(0, hostStart) + hostname + trimmed.slice(pathStart);
  const parsed = new URL(normalized);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("Se requiere una conexión PostgreSQL.");
  return normalized;
}
