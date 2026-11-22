export type Need = { id: string; pending: number };
export function allocate(available: number, needs: Need[]) {
  if (!Number.isSafeInteger(available) || available < 0 ||
      needs.some(n => !Number.isSafeInteger(n.pending) || n.pending < 0) ||
      new Set(needs.map(n => n.id)).size !== needs.length) {
    throw new Error("Las cantidades deben ser enteros positivos o cero y los centros únicos.");
  }
  const total = needs.reduce((sum, n) => sum + BigInt(n.pending), 0n);
  const budget = total < BigInt(available) ? total : BigInt(available);
  const rows = needs.map(n => {
    const numerator = budget * BigInt(n.pending);
    return { id: n.id, quantity: total ? Number(numerator / total) : 0,
      remainder: total ? numerator % total : 0n, pending: n.pending };
  });
  let remaining = Number(budget) - rows.reduce((sum, n) => sum + n.quantity, 0);
  const ordered = [...rows].sort((a,b) => a.remainder === b.remainder
    ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    : a.remainder > b.remainder ? -1 : 1);
  for (const row of ordered) {
    if (remaining > 0 && row.quantity < row.pending) { row.quantity++; remaining--; }
  }
  return rows.map(({ id, quantity, pending }) => ({
    id, quantity, pendingAfter: pending - quantity,
    explanation: total === 0n ? "Sin necesidad pendiente." :
      `${pending} de ${total} unidades pendientes. Reparto proporcional de ${budget} unidades, con redondeo por mayor resto.`
  }));
}
