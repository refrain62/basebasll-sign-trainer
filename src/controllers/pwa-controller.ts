import { withHeaders } from "../http/response.ts";
import { createTeamRepository } from "../repositories/team-repository.ts";
import { createDataProtectorFromEnv } from "../security/data-protection.ts";
import { normalizeTeamId } from "../validation/common.ts";

export function buildTeamPwaManifest(teamId: string, teamName: string) {
  const safeTeamId = normalizeTeamId(teamId);
  if (!safeTeamId) return null;
  const safeName = String(teamName || "SIGN TRAINER").trim().slice(0, 80) || "SIGN TRAINER";
  const startUrl = `/t/${safeTeamId}?source=pwa`;
  return {
    id: `/pwa/team/${safeTeamId}`,
    name: safeName,
    short_name: safeName,
    description: `${safeName}の野球サイン練習 | SIGN TRAINER`,
    start_url: startUrl,
    scope: `/t/${safeTeamId}`,
    display: "standalone",
    background_color: "#082844",
    theme_color: "#082844",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}

export async function teamPwaManifest(_request, env, rawTeamId: string) {
  const teamId = normalizeTeamId(rawTeamId);
  if (!teamId) return new Response("PWA manifest not found", { status: 404 });

  const teams = createTeamRepository(env.DB, createDataProtectorFromEnv(env));
  const team = await teams.findById(teamId);
  if (!team || team.status !== "active") return new Response("PWA manifest not found", { status: 404 });

  const manifest = buildTeamPwaManifest(teamId, team.name);
  return withHeaders(new Response(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "no-store, max-age=0"
    }
  }), { noIndex: true, noCache: true });
}
