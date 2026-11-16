export function formatWatts(w: number): string {
  if (Math.abs(w) >= 1000) {
    return `${(w / 1000).toFixed(2)} kW`;
  }
  return `${w.toFixed(2)} W`;
}

export function formatWattHours(wh: number): string {
  if (Math.abs(wh) >= 1000) {
    return `${(wh / 1000).toFixed(3)} kWh`;
  }
  return `${wh.toFixed(2)} Wh`;
}

export function formatVoltage(v: number): string {
  return `${v.toFixed(2)} V`;
}

export function formatTemperature(c: number, unit: 'C' | 'F' = 'C'): string {
  if (unit === 'F') {
    const f = (c * 9) / 5 + 32;
    return `${f.toFixed(1)} °F`;
  }
  return `${c.toFixed(1)} °C`;
}

export function formatTime(ts: number): string {
  const date = new Date(ts * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDate(ts: number): string {
  const date = new Date(ts * 1000);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(ts: number): string {
  return `${formatDate(ts)} ${formatTime(ts)}`;
}
