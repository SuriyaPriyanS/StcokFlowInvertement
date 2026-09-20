export function money(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const uid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
