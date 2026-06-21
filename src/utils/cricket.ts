export function ballsToOvers(balls: number): string {
  const overs = Math.floor(balls / 6);
  const remainder = balls % 6;
  return `${overs}.${remainder}`;
}

export function calcStrikeRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return parseFloat(((runs / balls) * 100).toFixed(2));
}

export function calcAverage(runs: number, dismissedCount: number): string {
  if (dismissedCount === 0) {
    return runs > 0 ? `${runs}*` : "-";
  }
  return (runs / dismissedCount).toFixed(2);
}

export function calcEconomy(runs: number, balls: number): string {
  if (balls === 0) return "0.00";
  const overs = balls / 6;
  return (runs / overs).toFixed(2);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
