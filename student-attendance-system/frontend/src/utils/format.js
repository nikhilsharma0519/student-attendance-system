// "2026-10-21" -> "21 Oct 2026" (done by hand so the browser timezone can never shift the day)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(str) {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return str || '-';
  const [y, m, d] = str.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// College "today" in Asia/Kolkata as YYYY-MM-DD
export function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function formatPercent(p) {
  return p === null || p === undefined ? 'No records' : `${p}%`;
}

export function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
