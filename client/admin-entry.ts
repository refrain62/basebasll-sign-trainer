// Source of truth: TypeScript. Vite generates content-hashed browser bundles under public/build/.
import "vite/modulepreload-polyfill";
export {};
const APP_BUILD = __APP_VERSION__;
console.info(`[SIGN TRAINER] build ${APP_BUILD} admin`);

const { renderSystemAdmin, renderTeamAdmin } = await import("./admin");
const path = location.pathname.replace(/\/$/, "") || "/";

if (path === "/admin" || path === "/register") {
  renderSystemAdmin({ initialView: path === "/register" ? "create" : "list" });
} else {
  const match = path.match(/^\/t\/([A-Za-z0-9_-]+)\/admin$/);
  if (match) renderTeamAdmin(match[1]);
  else location.replace("/");
}
