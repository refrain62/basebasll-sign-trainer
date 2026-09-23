const APP_BUILD = "55";
console.info(`[SIGN TRAINER] build ${APP_BUILD} admin`);

const { renderSystemAdmin, renderTeamAdmin } = await import(`/admin.js?v=${APP_BUILD}`);
const path = location.pathname.replace(/\/$/, "") || "/";

if (path === "/admin" || path === "/register") {
  renderSystemAdmin({ initialView: path === "/register" ? "create" : "list" });
} else {
  const match = path.match(/^\/t\/([A-Za-z0-9_-]+)\/admin$/);
  if (match) renderTeamAdmin(match[1]);
  else location.replace("/");
}
