import { describe, expect, it } from "vitest";
import { createQrSvgDataUrl, normalizeQrSize } from "../../client/qr-code.ts";

describe("QR code generation", () => {
  it("normalizes requested pixel size to a safe range", () => {
    expect(normalizeQrSize(undefined)).toBe(360);
    expect(normalizeQrSize(Number.NaN)).toBe(360);
    expect(normalizeQrSize(1)).toBe(160);
    expect(normalizeQrSize(359.6)).toBe(360);
    expect(normalizeQrSize(5000)).toBe(800);
  });

  it("returns a local SVG data URL for a team URL", async () => {
    const result = await createQrSvgDataUrl("https://example.com/t/team123", 320);
    expect(result).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    const svg = decodeURIComponent(result.slice(result.indexOf(",") + 1));
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg.toLowerCase()).not.toContain("<script");
  });

  it("produces different QR payloads for different URLs", async () => {
    const first = await createQrSvgDataUrl("https://example.com/t/a", 280);
    const second = await createQrSvgDataUrl("https://example.com/t/b", 280);
    expect(first).not.toBe(second);
  });
});
