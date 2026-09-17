export function generateTrackingCode() {
  const n = Math.floor(1000 + Math.random() * 9000); // 4-digit, matches design mock "BO-2481"
  return `BO-${n}`;
}
