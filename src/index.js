const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PLAYER_COOKIE = "st_session";
const TEAM_ADMIN_COOKIE = "st_team_admin";
const SYSTEM_COOKIE = "st_system";
const SAMPLE_TEAM_ID = "6BnWv2K3zo";
const PBKDF2_ITERATIONS = 120000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url);
      }

      const pageAsset = pageAssetForPath(url.pathname);
      if (pageAsset) {
        return await serveHtmlPage(request, env, url, pageAsset);
      }

      const response = await env.ASSETS.fetch(request);
      const noCache = ["/index.html", "/team.html", "/admin.html", "/landing.js", "/team.js", "/admin.js", "/admin-entry.js", "/share-utils.js", "/styles.css"].includes(url.pathname);
      return withHeaders(response, { noCache });
    } catch (error) {
      console.error("SIGN TRAINER worker error", error);
      return apiJson({ error: "server_error", message: "サーバーでエラーが発生しました。" }, 500);
    }
  }
};

function pageAssetForPath(pathname) {
  const clean = pathname.replace(/\/$/, "") || "/";
  if (clean === "/") return "/__pages/index.txt";
  if (clean === "/admin" || clean === "/register") return "/__pages/admin.txt";
  if (/^\/t\/[^/]+\/admin$/.test(clean)) return "/__pages/admin.txt";
  if (/^\/t\/[^/]+$/.test(clean)) return "/__pages/team.txt";
  return null;
}

async function serveHtmlPage(request, env, url, assetPath) {
  const assetUrl = new URL(assetPath, url.origin);
  const assetRequest = new Request(assetUrl, {
    method: "GET",
    headers: request.headers
  });
  const assetResponse = await env.ASSETS.fetch(assetRequest);

  if (!assetResponse.ok) {
    console.error("SIGN TRAINER page asset error", {
      route: url.pathname,
      assetPath,
      status: assetResponse.status,
      location: assetResponse.headers.get("location")
    });
    return new Response("ページを読み込めませんでした。", { status: 500 });
  }

  const headers = new Headers(assetResponse.headers);
  headers.set("content-type", "text/html; charset=UTF-8");
  headers.delete("location");
  headers.delete("content-length");

  const response = new Response(assetResponse.body, {
    status: 200,
    headers
  });
  return withHeaders(response, { noIndex: url.pathname !== "/", noCache: true });
}

async function handleApi(request, env, url) {
  const method = request.method.toUpperCase();
  if (!env.DB) return apiJson({ error: "db_not_configured", message: "D1データベースが設定されていません。" }, 503);

  // Public/player APIs
  if (url.pathname === "/api/session" && method === "GET") return playerSession(request, env, url);
  if (url.pathname === "/api/auth" && method === "POST") return playerAuth(request, env, url);
  if (url.pathname === "/api/logout" && method === "POST") return playerLogout(request, url);
  if (url.pathname === "/api/signs" && method === "GET") return playerSigns(request, env, url);

  // Team-admin auth/session
  if (url.pathname === "/api/team-admin/session" && method === "GET") return teamAdminSession(request, env, url);
  if (url.pathname === "/api/team-admin/auth" && method === "POST") return teamAdminAuth(request, env, url);
  if (url.pathname === "/api/team-admin/logout" && method === "POST") return teamAdminLogout(request, url);
  if (url.pathname === "/api/team-admin/team" && method === "GET") return teamAdminGetTeam(request, env, url);
  if (url.pathname === "/api/team-admin/team" && method === "PUT") return teamAdminUpdateTeam(request, env, url);
  if (url.pathname === "/api/team-admin/signs" && method === "POST") return teamAdminCreateSign(request, env, url);

  let match = url.pathname.match(/^\/api\/team-admin\/signs\/(\d+)$/);
  if (match && method === "PUT") return teamAdminUpdateSign(request, env, url, Number(match[1]));
  if (match && method === "DELETE") return teamAdminDeleteSign(request, env, url, Number(match[1]));

  match = url.pathname.match(/^\/api\/team-admin\/signs\/(\d+)\/videos$/);
  if (match && method === "POST") return teamAdminCreateVideo(request, env, url, Number(match[1]));

  match = url.pathname.match(/^\/api\/team-admin\/videos\/(\d+)$/);
  if (match && method === "PUT") return teamAdminUpdateVideo(request, env, url, Number(match[1]));
  if (match && method === "DELETE") return teamAdminDeleteVideo(request, env, url, Number(match[1]));

  // System-admin auth/session
  if (url.pathname === "/api/system/session" && method === "GET") return systemSession(request, env);
  if (url.pathname === "/api/system/auth" && method === "POST") return systemAuth(request, env, url);
  if (url.pathname === "/api/system/logout" && method === "POST") return systemLogout(request, url);
  if (url.pathname === "/api/system/teams" && method === "GET") return systemListTeams(request, env);
  if (url.pathname === "/api/system/teams" && method === "POST") return systemCreateTeam(request, env);

  match = url.pathname.match(/^\/api\/system\/teams\/([A-Za-z0-9_-]+)$/);
  if (match && method === "PUT") return systemUpdateTeam(request, env, decodeURIComponent(match[1]));
  if (match && method === "DELETE") return systemDeleteTeam(request, env, decodeURIComponent(match[1]));

  return apiJson({ error: "not_found" }, 404);
}

// ---------- Player ----------
async function playerSession(request, env, url) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId) return apiJson({ authenticated: false, error: "invalid_team" }, 400);
  const team = await getTeam(env.DB, teamId);
  if (!team) return apiJson({ authenticated: false, error: "team_not_found", message: "チームが見つかりません。" }, 404);
  if (team.status !== "active") return apiJson({ authenticated: false, error: "team_inactive", teamId, teamName: team.name, message: "このチームは現在利用停止中です。" }, 403);
  const session = await readRoleSession(request, env, PLAYER_COOKIE, "player");
  return apiJson({ authenticated: Boolean(session && session.teamId === teamId), teamId, teamName: team.name, isSample: teamId === SAMPLE_TEAM_ID });
}

async function playerAuth(request, env, url) {
  if (!env.SESSION_SECRET) return apiJson({ error: "server_not_configured", message: "認証設定がありません。" }, 503);
  const body = await safeJson(request);
  const teamId = normalizeTeamId(body?.teamId);
  const passphrase = normalizeSecret(body?.passphrase);
  if (!teamId || !passphrase) return apiJson({ error: "invalid_request", message: "チームと合言葉を確認してください。" }, 400);
  const team = await getTeam(env.DB, teamId);
  if (!team) return apiJson({ error: "team_not_found", message: "チームが見つかりません。" }, 404);
  if (team.status !== "active") return apiJson({ error: "team_inactive", message: "このチームは現在利用停止中です。" }, 403);
  if (!(await verifyPassword(passphrase, team.passphrase_hash))) return apiJson({ error: "invalid_passphrase", message: "合言葉が違うようです。" }, 401);

  const days = positiveNumber(env.SESSION_DAYS, 30);
  const maxAge = Math.round(days * 86400);
  const token = await createSessionToken({ role: "player", teamId, exp: nowSeconds() + maxAge }, env.SESSION_SECRET);
  return apiJson({ ok: true, teamId, teamName: team.name }, 200, { "set-cookie": cookieValue(PLAYER_COOKIE, token, maxAge, url) });
}

async function playerLogout(request, url) {
  return apiJson({ ok: true }, 200, { "set-cookie": cookieValue(PLAYER_COOKIE, "", 0, url) });
}

async function playerSigns(request, env, url) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId) return apiJson({ error: "invalid_team" }, 400);
  const session = await readRoleSession(request, env, PLAYER_COOKIE, "player");
  if (!session || session.teamId !== teamId) return apiJson({ error: "unauthorized", message: "合言葉を入力してください。" }, 401);
  const team = await getTeam(env.DB, teamId);
  if (!team || team.status !== "active") return apiJson({ error: "team_inactive", message: "チームを利用できません。" }, 403);
  const signs = await getTeamSigns(env.DB, teamId, { onlyEnabled: true });
  return apiJson({ team: { id: team.id, name: team.name }, signs });
}

// ---------- Team admin ----------
async function teamAdminSession(request, env, url) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId) return apiJson({ authenticated: false, error: "invalid_team" }, 400);
  const team = await getTeam(env.DB, teamId);
  if (!team) return apiJson({ authenticated: false, error: "team_not_found", message: "チームが見つかりません。" }, 404);
  const session = await readRoleSession(request, env, TEAM_ADMIN_COOKIE, "team-admin");
  return apiJson({ authenticated: Boolean(session && session.teamId === teamId), teamId, teamName: team.name, status: team.status });
}

async function teamAdminAuth(request, env, url) {
  if (!env.SESSION_SECRET) return apiJson({ error: "server_not_configured", message: "認証設定がありません。" }, 503);
  const body = await safeJson(request);
  const teamId = normalizeTeamId(body?.teamId);
  const password = normalizeSecret(body?.password);
  if (!teamId || !password) return apiJson({ error: "invalid_request", message: "管理者パスワードを入力してください。" }, 400);
  const team = await getTeam(env.DB, teamId);
  if (!team) return apiJson({ error: "team_not_found", message: "チームが見つかりません。" }, 404);
  if (!(await verifyPassword(password, team.admin_password_hash))) return apiJson({ error: "invalid_password", message: "管理者パスワードが違います。" }, 401);
  const hours = positiveNumber(env.ADMIN_SESSION_HOURS, 12);
  const maxAge = Math.round(hours * 3600);
  const token = await createSessionToken({ role: "team-admin", teamId, exp: nowSeconds() + maxAge }, env.SESSION_SECRET);
  return apiJson({ ok: true, teamId, teamName: team.name }, 200, { "set-cookie": cookieValue(TEAM_ADMIN_COOKIE, token, maxAge, url) });
}

async function teamAdminLogout(request, url) {
  return apiJson({ ok: true }, 200, { "set-cookie": cookieValue(TEAM_ADMIN_COOKIE, "", 0, url) });
}

async function requireTeamAdmin(request, env, teamId) {
  const session = await readRoleSession(request, env, TEAM_ADMIN_COOKIE, "team-admin");
  if (!session || session.teamId !== teamId) return null;
  return session;
}

async function teamAdminGetTeam(request, env, url) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return apiJson({ error: "unauthorized" }, 401);
  const team = await getTeam(env.DB, teamId);
  if (!team) return apiJson({ error: "team_not_found" }, 404);
  const signs = await getTeamSigns(env.DB, teamId, { onlyEnabled: false });
  return apiJson({ team: publicTeam(team), signs });
}

async function teamAdminUpdateTeam(request, env, url) {
  const body = await safeJson(request);
  const teamId = normalizeTeamId(body?.teamId || url.searchParams.get("teamId"));
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return apiJson({ error: "unauthorized" }, 401);
  const team = await getTeam(env.DB, teamId);
  if (!team) return apiJson({ error: "team_not_found" }, 404);

  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : team.name;
  if (!name) return apiJson({ error: "invalid_name", message: "チーム名を入力してください。" }, 400);
  let passphraseHash = team.passphrase_hash;
  let adminHash = team.admin_password_hash;
  const nextPassphrase = normalizeSecret(body?.passphrase);
  const nextAdminPassword = normalizeSecret(body?.adminPassword);
  if (nextPassphrase.length > 200 || nextAdminPassword.length > 200) return apiJson({ error: "secret_too_long", message: "合言葉・パスワードは200文字以内にしてください。" }, 400);
  if (nextAdminPassword && nextAdminPassword.length < 8) return apiJson({ error: "weak_admin_password", message: "管理者パスワードは8文字以上にしてください。" }, 400);
  if (nextPassphrase) passphraseHash = await hashPassword(nextPassphrase);
  if (nextAdminPassword) adminHash = await hashPassword(nextAdminPassword);
  await env.DB.prepare("UPDATE teams SET name=?, passphrase_hash=?, admin_password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .bind(name, passphraseHash, adminHash, teamId).run();
  return apiJson({ ok: true, team: publicTeam(await getTeam(env.DB, teamId)) });
}

async function teamAdminCreateSign(request, env, url) {
  const body = await safeJson(request);
  const teamId = normalizeTeamId(body?.teamId || url.searchParams.get("teamId"));
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return apiJson({ error: "unauthorized" }, 401);
  const name = cleanName(body?.name, 80);
  if (!name) return apiJson({ error: "invalid_name", message: "サイン名を入力してください。" }, 400);
  const maxRow = await env.DB.prepare("SELECT COALESCE(MAX(sort_order),0) AS max_order FROM signs WHERE team_id=?").bind(teamId).first();
  const result = await env.DB.prepare("INSERT INTO signs(team_id,name,sort_order,enabled) VALUES(?,?,?,1)").bind(teamId, name, Number(maxRow?.max_order || 0) + 10).run();
  const signId = Number(result.meta.last_row_id);
  if (body?.youtubeUrl) {
    const parsed = parseYouTubeUrl(body.youtubeUrl);
    if (!parsed) {
      await env.DB.prepare("DELETE FROM signs WHERE id=? AND team_id=?").bind(signId, teamId).run();
      return apiJson({ error: "invalid_youtube", message: "YouTube URLを確認してください。" }, 400);
    }
    await env.DB.prepare("INSERT INTO sign_videos(sign_id,youtube_url,youtube_video_id,sort_order,enabled) VALUES(?,?,?,?,1)")
      .bind(signId, parsed.url, parsed.videoId, 10).run();
  }
  return apiJson({ ok: true, sign: await getSignWithVideos(env.DB, teamId, signId) }, 201);
}

async function teamAdminUpdateSign(request, env, url, signId) {
  const body = await safeJson(request);
  const teamId = normalizeTeamId(body?.teamId || url.searchParams.get("teamId"));
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return apiJson({ error: "unauthorized" }, 401);
  const sign = await env.DB.prepare("SELECT * FROM signs WHERE id=? AND team_id=?").bind(signId, teamId).first();
  if (!sign) return apiJson({ error: "not_found" }, 404);
  const name = body?.name === undefined ? sign.name : cleanName(body.name, 80);
  if (!name) return apiJson({ error: "invalid_name", message: "サイン名を入力してください。" }, 400);
  const sortOrder = Number.isFinite(Number(body?.sortOrder)) ? Math.trunc(Number(body.sortOrder)) : sign.sort_order;
  const enabled = body?.enabled === undefined ? sign.enabled : (body.enabled ? 1 : 0);
  await env.DB.prepare("UPDATE signs SET name=?,sort_order=?,enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND team_id=?")
    .bind(name, sortOrder, enabled, signId, teamId).run();
  return apiJson({ ok: true, sign: await getSignWithVideos(env.DB, teamId, signId) });
}

async function teamAdminDeleteSign(request, env, url, signId) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return apiJson({ error: "unauthorized" }, 401);
  const sign = await env.DB.prepare("SELECT id FROM signs WHERE id=? AND team_id=?").bind(signId, teamId).first();
  if (!sign) return apiJson({ error: "not_found" }, 404);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sign_videos WHERE sign_id=?").bind(signId),
    env.DB.prepare("DELETE FROM signs WHERE id=? AND team_id=?").bind(signId, teamId)
  ]);
  return apiJson({ ok: true });
}

async function teamAdminCreateVideo(request, env, url, signId) {
  const body = await safeJson(request);
  const teamId = normalizeTeamId(body?.teamId || url.searchParams.get("teamId"));
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return apiJson({ error: "unauthorized" }, 401);
  const sign = await env.DB.prepare("SELECT id FROM signs WHERE id=? AND team_id=?").bind(signId, teamId).first();
  if (!sign) return apiJson({ error: "not_found" }, 404);
  const parsed = parseYouTubeUrl(body?.youtubeUrl);
  if (!parsed) return apiJson({ error: "invalid_youtube", message: "YouTube URLを確認してください。" }, 400);
  const maxRow = await env.DB.prepare("SELECT COALESCE(MAX(sort_order),0) AS max_order FROM sign_videos WHERE sign_id=?").bind(signId).first();
  const result = await env.DB.prepare("INSERT INTO sign_videos(sign_id,youtube_url,youtube_video_id,sort_order,enabled) VALUES(?,?,?,?,1)")
    .bind(signId, parsed.url, parsed.videoId, Number(maxRow?.max_order || 0) + 10).run();
  return apiJson({ ok: true, videoId: Number(result.meta.last_row_id), sign: await getSignWithVideos(env.DB, teamId, signId) }, 201);
}

async function teamAdminUpdateVideo(request, env, url, videoId) {
  const body = await safeJson(request);
  const teamId = normalizeTeamId(body?.teamId || url.searchParams.get("teamId"));
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return apiJson({ error: "unauthorized" }, 401);
  const video = await env.DB.prepare("SELECT v.*,s.team_id FROM sign_videos v JOIN signs s ON s.id=v.sign_id WHERE v.id=? AND s.team_id=?").bind(videoId, teamId).first();
  if (!video) return apiJson({ error: "not_found" }, 404);
  let youtubeUrl = video.youtube_url;
  let youtubeVideoId = video.youtube_video_id;
  if (body?.youtubeUrl !== undefined) {
    const parsed = parseYouTubeUrl(body.youtubeUrl);
    if (!parsed) return apiJson({ error: "invalid_youtube", message: "YouTube URLを確認してください。" }, 400);
    youtubeUrl = parsed.url;
    youtubeVideoId = parsed.videoId;
  }
  const sortOrder = Number.isFinite(Number(body?.sortOrder)) ? Math.trunc(Number(body.sortOrder)) : video.sort_order;
  const enabled = body?.enabled === undefined ? video.enabled : (body.enabled ? 1 : 0);
  await env.DB.prepare("UPDATE sign_videos SET youtube_url=?,youtube_video_id=?,sort_order=?,enabled=? WHERE id=?")
    .bind(youtubeUrl, youtubeVideoId, sortOrder, enabled, videoId).run();
  return apiJson({ ok: true, sign: await getSignWithVideos(env.DB, teamId, video.sign_id) });
}

async function teamAdminDeleteVideo(request, env, url, videoId) {
  const teamId = normalizeTeamId(url.searchParams.get("teamId"));
  if (!teamId || !(await requireTeamAdmin(request, env, teamId))) return apiJson({ error: "unauthorized" }, 401);
  const video = await env.DB.prepare("SELECT v.id,v.sign_id FROM sign_videos v JOIN signs s ON s.id=v.sign_id WHERE v.id=? AND s.team_id=?").bind(videoId, teamId).first();
  if (!video) return apiJson({ error: "not_found" }, 404);
  await env.DB.prepare("DELETE FROM sign_videos WHERE id=?").bind(videoId).run();
  return apiJson({ ok: true, sign: await getSignWithVideos(env.DB, teamId, video.sign_id) });
}

// ---------- System admin ----------
async function systemSession(request, env) {
  const session = await readRoleSession(request, env, SYSTEM_COOKIE, "system");
  return apiJson({ authenticated: Boolean(session) });
}

async function systemAuth(request, env, url) {
  if (!env.SYSTEM_ADMIN_SECRET || !env.SESSION_SECRET) return apiJson({ error: "server_not_configured", message: "システム管理者認証が設定されていません。" }, 503);
  const body = await safeJson(request);
  const secret = normalizeSecret(body?.secret);
  if (!secret || !constantTimeEqual(secret, normalizeSecret(env.SYSTEM_ADMIN_SECRET))) return apiJson({ error: "invalid_secret", message: "管理者キーが違います。" }, 401);
  const hours = positiveNumber(env.ADMIN_SESSION_HOURS, 12);
  const maxAge = Math.round(hours * 3600);
  const token = await createSessionToken({ role: "system", exp: nowSeconds() + maxAge }, env.SESSION_SECRET);
  return apiJson({ ok: true }, 200, { "set-cookie": cookieValue(SYSTEM_COOKIE, token, maxAge, url) });
}

async function systemLogout(request, url) {
  return apiJson({ ok: true }, 200, { "set-cookie": cookieValue(SYSTEM_COOKIE, "", 0, url) });
}

async function requireSystem(request, env) {
  return readRoleSession(request, env, SYSTEM_COOKIE, "system");
}

async function systemListTeams(request, env) {
  if (!(await requireSystem(request, env))) return apiJson({ error: "unauthorized" }, 401);
  const result = await env.DB.prepare(`
    SELECT t.id,t.name,t.status,t.created_at,t.updated_at,COUNT(DISTINCT s.id) AS sign_count,COUNT(DISTINCT v.id) AS video_count
    FROM teams t
    LEFT JOIN signs s ON s.team_id=t.id
    LEFT JOIN sign_videos v ON v.sign_id=s.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all();
  return apiJson({ teams: (result.results || []).map((row) => ({ ...row, sign_count: Number(row.sign_count || 0), video_count: Number(row.video_count || 0) })) });
}

async function systemCreateTeam(request, env) {
  if (!(await requireSystem(request, env))) return apiJson({ error: "unauthorized" }, 401);
  const body = await safeJson(request);
  const name = cleanName(body?.name, 80);
  const passphrase = normalizeSecret(body?.passphrase);
  const adminPassword = normalizeSecret(body?.adminPassword);
  if (!name || !passphrase || !adminPassword) return apiJson({ error: "invalid_request", message: "チーム名・選手用合言葉・管理者パスワードを入力してください。" }, 400);
  if (passphrase.length > 200 || adminPassword.length > 200) return apiJson({ error: "secret_too_long", message: "合言葉・パスワードは200文字以内にしてください。" }, 400);
  if (adminPassword.length < 8) return apiJson({ error: "weak_admin_password", message: "管理者パスワードは8文字以上にしてください。" }, 400);
  let teamId = "";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    teamId = randomId(10);
    if (!(await getTeam(env.DB, teamId))) break;
  }
  if (!teamId) return apiJson({ error: "id_generation_failed" }, 500);
  const passphraseHash = await hashPassword(passphrase);
  const adminHash = await hashPassword(adminPassword);
  await env.DB.prepare("INSERT INTO teams(id,name,passphrase_hash,admin_password_hash,status) VALUES(?,?,?,?, 'active')")
    .bind(teamId, name, passphraseHash, adminHash).run();
  return apiJson({ ok: true, team: publicTeam(await getTeam(env.DB, teamId)), urls: teamUrls(teamId) }, 201);
}

async function systemUpdateTeam(request, env, teamId) {
  if (!(await requireSystem(request, env))) return apiJson({ error: "unauthorized" }, 401);
  const team = await getTeam(env.DB, teamId);
  if (!team) return apiJson({ error: "team_not_found" }, 404);
  const body = await safeJson(request);
  const name = body?.name === undefined ? team.name : cleanName(body.name, 80);
  const status = body?.status === undefined ? team.status : String(body.status);
  if (!name || !["active", "suspended"].includes(status)) return apiJson({ error: "invalid_request" }, 400);
  let passphraseHash = team.passphrase_hash;
  let adminHash = team.admin_password_hash;
  const nextPassphrase = normalizeSecret(body?.passphrase);
  const nextAdminPassword = normalizeSecret(body?.adminPassword);
  if (nextPassphrase.length > 200 || nextAdminPassword.length > 200) return apiJson({ error: "secret_too_long", message: "合言葉・パスワードは200文字以内にしてください。" }, 400);
  if (nextAdminPassword && nextAdminPassword.length < 8) return apiJson({ error: "weak_admin_password", message: "管理者パスワードは8文字以上にしてください。" }, 400);
  if (nextPassphrase) passphraseHash = await hashPassword(nextPassphrase);
  if (nextAdminPassword) adminHash = await hashPassword(nextAdminPassword);
  await env.DB.prepare("UPDATE teams SET name=?,status=?,passphrase_hash=?,admin_password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .bind(name, status, passphraseHash, adminHash, teamId).run();
  return apiJson({ ok: true, team: publicTeam(await getTeam(env.DB, teamId)) });
}

async function systemDeleteTeam(request, env, teamId) {
  if (!(await requireSystem(request, env))) return apiJson({ error: "unauthorized" }, 401);
  const team = await getTeam(env.DB, teamId);
  if (!team) return apiJson({ error: "team_not_found" }, 404);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sign_videos WHERE sign_id IN (SELECT id FROM signs WHERE team_id=?)").bind(teamId),
    env.DB.prepare("DELETE FROM signs WHERE team_id=?").bind(teamId),
    env.DB.prepare("DELETE FROM teams WHERE id=?").bind(teamId)
  ]);
  return apiJson({ ok: true });
}

// ---------- DB helpers ----------
async function getTeam(db, teamId) {
  return db.prepare("SELECT id,name,passphrase_hash,admin_password_hash,status,created_at,updated_at FROM teams WHERE id=?").bind(teamId).first();
}

function publicTeam(team) {
  return { id: team.id, name: team.name, status: team.status, createdAt: team.created_at, updatedAt: team.updated_at };
}

async function getTeamSigns(db, teamId, { onlyEnabled = false } = {}) {
  const signSql = onlyEnabled
    ? "SELECT * FROM signs WHERE team_id=? AND enabled=1 ORDER BY sort_order,id"
    : "SELECT * FROM signs WHERE team_id=? ORDER BY sort_order,id";
  const signRows = (await db.prepare(signSql).bind(teamId).all()).results || [];
  if (!signRows.length) return [];
  const ids = signRows.map((s) => s.id);
  const placeholders = ids.map(() => "?").join(",");
  const videoSql = `SELECT * FROM sign_videos WHERE sign_id IN (${placeholders})${onlyEnabled ? " AND enabled=1" : ""} ORDER BY sort_order,id`;
  const videoRows = (await db.prepare(videoSql).bind(...ids).all()).results || [];
  const bySign = new Map();
  for (const row of videoRows) {
    if (!bySign.has(row.sign_id)) bySign.set(row.sign_id, []);
    bySign.get(row.sign_id).push({ id: row.id, youtubeUrl: row.youtube_url, videoId: row.youtube_video_id, sortOrder: row.sort_order, enabled: Boolean(row.enabled) });
  }
  return signRows.map((row) => ({
    id: String(row.id),
    dbId: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    enabled: Boolean(row.enabled),
    videos: (bySign.get(row.id) || []).map((v) => onlyEnabled ? v.videoId : v),
    videoItems: onlyEnabled ? undefined : (bySign.get(row.id) || [])
  })).filter((sign) => !onlyEnabled || sign.videos.length > 0);
}

async function getSignWithVideos(db, teamId, signId) {
  const signs = await getTeamSigns(db, teamId, { onlyEnabled: false });
  return signs.find((s) => Number(s.dbId) === Number(signId)) || null;
}

// ---------- YouTube ----------
function parseYouTubeUrl(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return { videoId: raw, url: `https://youtu.be/${raw}` };
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] || "";
    else if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      else {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live"].includes(parts[0])) id = parts[1] || "";
      }
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return { videoId: id, url: `https://www.youtube.com/watch?v=${id}` };
  } catch {
    return null;
  }
}

// ---------- Password hashing ----------
async function hashPassword(value) {
  const normalized = normalizeSecret(value);
  if (!normalized) throw new Error("empty password");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(normalized), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${base64UrlEncode(salt)}$${base64UrlEncode(new Uint8Array(bits))}`;
}

async function verifyPassword(value, stored) {
  if (!stored || typeof stored !== "string") return false;
  const [scheme, iterRaw, saltRaw, hashRaw, extra] = stored.split("$");
  if (scheme !== "pbkdf2-sha256" || extra) return false;
  const iterations = Number(iterRaw);
  if (!Number.isInteger(iterations) || iterations < 10000 || iterations > 1000000) return false;
  try {
    const salt = base64UrlDecode(saltRaw);
    const expected = base64UrlDecode(hashRaw);
    const key = await crypto.subtle.importKey("raw", encoder.encode(normalizeSecret(value)), "PBKDF2", false, ["deriveBits"]);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, expected.length * 8));
    return constantTimeBytes(bits, expected);
  } catch {
    return false;
  }
}

// ---------- Session helpers ----------
async function readRoleSession(request, env, cookieName, role) {
  if (!env.SESSION_SECRET) return null;
  const token = parseCookies(request.headers.get("cookie") || "")[cookieName];
  if (!token) return null;
  const payload = await verifySessionToken(token, env.SESSION_SECRET);
  if (!payload || payload.role !== role || !payload.exp || payload.exp <= nowSeconds()) return null;
  return payload;
}

async function createSessionToken(payload, secret) {
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

async function verifySessionToken(token, secret) {
  const [payloadPart, signaturePart, extra] = String(token).split(".");
  if (!payloadPart || !signaturePart || extra) return null;
  const expected = await sign(payloadPart, secret);
  if (!constantTimeEqual(signaturePart, expected)) return null;
  try { return JSON.parse(decoder.decode(base64UrlDecode(payloadPart))); } catch { return null; }
}

async function sign(message, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return base64UrlEncode(new Uint8Array(signature));
}

function cookieValue(name, value, maxAge, url) {
  const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
  return [`${name}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${Math.max(0, maxAge)}`, ...(isLocal ? [] : ["Secure"])].join("; ");
}

// ---------- General helpers ----------
function normalizeTeamId(value) {
  const id = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9_-]{4,40}$/.test(id) ? id : "";
}

function normalizeSecret(value) {
  return typeof value === "string" ? value.trim().normalize("NFC") : "";
}

function cleanName(value, max) {
  return typeof value === "string" ? value.trim().normalize("NFC").slice(0, max) : "";
}

function teamUrls(teamId) {
  return { playerPath: `/t/${teamId}`, adminPath: `/t/${teamId}/admin` };
}

function randomId(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function nowSeconds() { return Math.floor(Date.now() / 1000); }

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseCookies(header) {
  return Object.fromEntries(header.split(";").map((p) => p.trim()).filter(Boolean).map((p) => {
    const i = p.indexOf("=");
    return i === -1 ? [p, ""] : [p.slice(0, i), p.slice(i + 1)];
  }));
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return mismatch === 0;
}

function constantTimeBytes(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) mismatch |= (a[i] || 0) ^ (b[i] || 0);
  return mismatch === 0;
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value) {
  let normalized = String(value).replaceAll("-", "+").replaceAll("_", "/");
  while (normalized.length % 4) normalized += "=";
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function safeJson(request) { try { return await request.json(); } catch { return null; } }

function apiJson(data, status = 200, extraHeaders = {}) {
  return withHeaders(json(data, status, { "cache-control": "no-store", ...extraHeaders }), { noIndex: true });
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
}

function withHeaders(response, { noIndex = false, noCache = false } = {}) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("cross-origin-opener-policy", "same-origin-allow-popups");
  headers.set("content-security-policy", "default-src 'self'; script-src 'self' https://www.youtube.com; style-src 'self'; img-src 'self' data: https:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; connect-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; media-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  if (noIndex) headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  if (noCache) headers.set("cache-control", "no-cache, no-store, must-revalidate");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
