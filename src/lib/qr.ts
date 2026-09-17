import QRCode from "qrcode";

export function patientFormUrl(hospitalId: string, departmentId: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/f/${hospitalId}/${departmentId}`;
}

export function qrDataUrl(url: string) {
  return QRCode.toDataURL(url, { margin: 1, width: 400, color: { dark: "#16181D", light: "#FFFFFF" } });
}
