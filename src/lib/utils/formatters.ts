export function fmtINR(n: number): string {
  if (!isFinite(n) || n === 0) return '₹0';
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function fmtPct(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1) + '%';
}

export function fmtMult(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1) + 'x';
}

export function fmtDateWithDay(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return dateStr;
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
  return `${dateStr} (${dayName})`;
}