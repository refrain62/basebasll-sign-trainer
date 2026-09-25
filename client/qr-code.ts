import * as QRCode from "qrcode";

const QR_MIN_SIZE = 160;
const QR_MAX_SIZE = 800;

export function normalizeQrSize(size: number | undefined): number {
  const numeric = Number(size);
  if (!Number.isFinite(numeric)) return 360;
  return Math.max(QR_MIN_SIZE, Math.min(Math.round(numeric), QR_MAX_SIZE));
}

export async function createQrSvgDataUrl(text: string, size = 360): Promise<string> {
  const svg = await QRCode.toString(String(text ?? ""), {
    type: "svg",
    width: normalizeQrSize(size),
    margin: 4,
    errorCorrectionLevel: "H",
    color: {
      dark: "#092b49ff",
      light: "#ffffffff"
    }
  });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
