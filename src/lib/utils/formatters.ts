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