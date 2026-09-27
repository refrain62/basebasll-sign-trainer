export const SHARE_TEXT_MODULE_SOURCE = String.raw`
function clean(value, max = 120) {
  return String(value == null ? "" : value).replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}
function formatDate(value) {
  const date = new Date(Number(value) || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
export function buildPracticeResultText(input = {}) {
  const team = clean(input.teamName || "チーム", 80);
  const total = Math.max(0, Number(input.total) || 0);
  const correct = Math.max(0, Number(input.correct) || 0);
  const rate = Math.max(0, Math.min(100, Number(input.rate) || 0));
  const duration = clean(input.durationLabel || "", 40);
  const group = clean(input.groupName || "", 80);
  const mode = clean(input.modeLabel || "", 40);
  const when = formatDate(input.completedAt);
  const lines = [
    "【SIGN TRAINER】練習結果",
    team,
    when ? "日時: " + when : "",
    group ? "練習: " + group : (mode ? "練習: " + mode : ""),
    "正解: " + correct + " / " + total + "問",
    "正答率: " + rate + "%",
    duration ? "時間: " + duration : "",
    "野球のサインを、チームの力に。"
  ];
  return lines.filter(Boolean).join("\n");
}
`;

export const PRO_ANALYTICS_MODULE_SOURCE = String.raw`
function rate(correct, attempts) { return attempts ? Math.round((correct / attempts) * 100) : 0; }
function text(value, fallback = "") { return String(value == null ? fallback : value); }
export function analyzePractice(history = [], signs = [], groups = []) {
  const signById = new Map((signs || []).map((sign) => [String(sign.id), sign]));
  const groupById = new Map((groups || []).map((group) => [String(group.id), group]));
  const groupStats = new Map();
  const signStats = new Map();
  const videoStats = new Map();
  const chronological = [];
  let attempts = 0;
  let correct = 0;
  const bump = (map, key, seed, grade, completedAt) => {
    if (!map.has(key)) map.set(key, { ...seed, attempts: 0, correct: 0, grades: [], lastAt: 0 });
    const row = map.get(key);
    row.attempts += 1;
    if (grade === "correct") row.correct += 1;
    row.grades.push(grade);
    row.lastAt = Math.max(row.lastAt, Number(completedAt || 0));
  };
  for (const entry of history || []) {
    for (const result of entry.results || []) {
      if (result.grade !== "correct" && result.grade !== "wrong") continue;
      attempts += 1;
      if (result.grade === "correct") correct += 1;
      chronological.push(result.grade);
      const signId = String(result.id);
      const currentSign = signById.get(signId);
      const groupIdValue = result.groupId == null ? (currentSign && currentSign.groupId != null ? currentSign.groupId : null) : result.groupId;
      const groupKey = groupIdValue == null ? "ungrouped" : String(groupIdValue);
      const group = groupById.get(groupKey);
      const groupName = groupKey === "ungrouped" ? "未分類" : text(group && group.name, "グループ " + groupKey);
      bump(groupStats, groupKey, { id: groupIdValue, name: groupName }, result.grade, entry.completedAt);
      bump(signStats, signId, { id: result.id, name: text(result.name || (currentSign && currentSign.name), "サイン " + signId), groupId: groupIdValue, groupName }, result.grade, entry.completedAt);
      if (result.videoId) {
        const videos = currentSign && Array.isArray(currentSign.videos) ? currentSign.videos : [];
        const videoIndex = videos.findIndex((id) => String(id) === String(result.videoId));
        const label = videoIndex >= 0 ? "動画" + (videoIndex + 1) : "動画パターン";
        bump(videoStats, signId + ":" + String(result.videoId), { signId: result.id, signName: text(result.name || (currentSign && currentSign.name), "サイン " + signId), videoId: result.videoId, label }, result.grade, entry.completedAt);
      }
    }
  }
  const finish = (map) => Array.from(map.values()).map((row) => {
    const recent = row.grades.slice(0, 10);
    const recentCorrect = recent.filter((grade) => grade === "correct").length;
    return { ...row, rate: rate(row.correct, row.attempts), recentRate: rate(recentCorrect, recent.length), recentAttempts: recent.length };
  });
  const signRows = finish(signStats).sort((a, b) => a.rate - b.rate || b.attempts - a.attempts || text(a.name).localeCompare(text(b.name), "ja"));
  const groupRows = finish(groupStats).sort((a, b) => a.rate - b.rate || b.attempts - a.attempts || text(a.name).localeCompare(text(b.name), "ja"));
  const allVideoRows = finish(videoStats);
  const videoCountBySign = new Map();
  allVideoRows.forEach((row) => videoCountBySign.set(String(row.signId), Number(videoCountBySign.get(String(row.signId)) || 0) + 1));
  const videoRows = allVideoRows.filter((row) => {
    const sign = signById.get(String(row.signId));
    return Number(videoCountBySign.get(String(row.signId)) || 0) > 1 || (sign && Array.isArray(sign.videos) && sign.videos.length > 1);
  }).sort((a, b) => a.rate - b.rate || b.attempts - a.attempts);
  const recent = chronological.slice(0, 10);
  const recentCorrect = recent.filter((grade) => grade === "correct").length;
  return {
    attempts,
    correct,
    rate: rate(correct, attempts),
    recentRate: rate(recentCorrect, recent.length),
    recentAttempts: recent.length,
    groupRows,
    signRows,
    videoRows,
    weakSigns: signRows.filter((row) => row.attempts >= 3).slice(0, 5)
  };
}
`;

export const SHARE_IMAGE_MODULE_SOURCE = String.raw`
function clampPercent(value) { return Math.max(0, Math.min(100, Number(value) || 0)); }
function safe(value, max = 80) { return String(value == null ? "" : value).replace(/[\r\n\t]+/g, " ").trim().slice(0, max); }
export function buildAnalyticsText(input = {}) {
  const team = safe(input.teamName || "チーム", 80);
  const rate = clampPercent(input.rate);
  const recentRate = clampPercent(input.recentRate);
  const attempts = Math.max(0, Number(input.attempts) || 0);
  const weakCount = Math.max(0, Number(input.weakCount) || 0);
  return [
    "【SIGN TRAINER】成績サマリー",
    team,
    "累計正答率: " + rate + "%",
    "直近の正答率: " + recentRate + "%",
    "総回答数: " + attempts,
    "苦手サイン: " + weakCount + "件",
    "※具体的なサイン内容や動画URLは共有していません。"
  ].join("\n");
}
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
function text(ctx, value, x, y, size, weight = 700, color = "#14394f", align = "left") {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = weight + " " + size + "px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(safe(value, 120), x, y);
  ctx.restore();
}
function brand(ctx, width) {
  text(ctx, "SIGN", 72, 92, 42, 900, "#123b59");
  text(ctx, "TRAINER", 190, 92, 42, 900, "#0a8a57");
  text(ctx, "野球のサインを、チームの力に。", width - 72, 91, 23, 700, "#6e8088", "right");
}
function makeCanvas(height = 1350) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f5faf7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  brand(ctx, canvas.width);
  return { canvas, ctx };
}
async function fileFromCanvas(canvas, filename) {
  const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("image_generation_failed")), "image/png", 0.95));
  return new File([blob], filename, { type: "image/png" });
}
function metric(ctx, x, y, w, label, value, suffix = "") {
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, w, 180, 28);
  ctx.fill();
  text(ctx, label, x + 30, y + 48, 24, 750, "#71828b");
  text(ctx, String(value) + suffix, x + 30, y + 130, 56, 900, "#0a7f51");
}
export async function createResultCardFile(input = {}) {
  const { canvas, ctx } = makeCanvas(1080);
  text(ctx, safe(input.teamName || "チーム"), 72, 185, 44, 900, "#123b59");
  text(ctx, "今回の練習結果", 72, 245, 30, 750, "#6a7b84");
  const rate = clampPercent(input.rate);
  metric(ctx, 72, 310, 440, "正答率", rate, "%");
  metric(ctx, 568, 310, 440, "正解", Math.max(0, Number(input.correct) || 0) + " / " + Math.max(0, Number(input.total) || 0), "問");
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 72, 535, 936, 250, 28); ctx.fill();
  text(ctx, "練習内容", 106, 590, 24, 800, "#71828b");
  text(ctx, safe(input.groupName || input.modeLabel || "サイン練習"), 106, 655, 38, 900, "#14394f");
  if (input.durationLabel) text(ctx, "練習時間  " + safe(input.durationLabel, 40), 106, 720, 27, 750, "#526b78");
  text(ctx, "具体的なサイン内容・動画URLは共有していません。", 72, 915, 24, 650, "#7a8b93");
  return fileFromCanvas(canvas, "sign-trainer-result.png");
}
export async function createAnalyticsCardFile(input = {}) {
  const { canvas, ctx } = makeCanvas(1350);
  const stats = input.stats || {};
  text(ctx, safe(input.teamName || "チーム"), 72, 185, 44, 900, "#123b59");
  text(ctx, "成績分析", 72, 245, 30, 750, "#6a7b84");
  metric(ctx, 72, 310, 288, "累計正答率", clampPercent(stats.rate), "%");
  metric(ctx, 396, 310, 288, "直近", clampPercent(stats.recentRate), "%");
  metric(ctx, 720, 310, 288, "総回答", Math.max(0, Number(stats.attempts) || 0), "");
  ctx.fillStyle = "#ffffff"; roundRect(ctx, 72, 535, 936, 410, 28); ctx.fill();
  text(ctx, "苦手傾向", 106, 595, 26, 900, "#14394f");
  const weak = Array.isArray(stats.weakSigns) ? stats.weakSigns.slice(0, 3) : [];
  if (!weak.length) {
    text(ctx, "もう少し練習すると苦手傾向を表示します。", 106, 675, 28, 700, "#73848c");
  } else if (input.includeSignNames) {
    weak.forEach((row, index) => {
      const y = 680 + index * 82;
      text(ctx, (index + 1) + ". " + safe(row.name || "サイン"), 112, y, 30, 850, "#173e55");
      text(ctx, clampPercent(row.rate) + "%  /  " + Math.max(0, Number(row.attempts) || 0) + "回答", 850, y, 26, 800, "#0a8555", "right");
    });
  } else {
    text(ctx, "苦手サイン  " + weak.length + "件", 106, 685, 40, 900, "#173e55");
    text(ctx, "サイン名はプライバシー保護のため非表示です。", 106, 745, 25, 700, "#73848c");
    const groups = Array.from(new Set(weak.map((row) => safe(row.groupName || "未分類", 50)))).slice(0, 3);
    if (groups.length) text(ctx, "対象グループ: " + groups.join(" / "), 106, 820, 27, 750, "#526b78");
  }
  text(ctx, "成績データはこの端末内で処理し、画像生成のためにサーバーへ送信していません。", 72, 1120, 23, 650, "#7a8b93");
  text(ctx, "SIGN TRAINER", 72, 1210, 30, 900, "#0a8555");
  return fileFromCanvas(canvas, "sign-trainer-analytics.png");
}
`;
