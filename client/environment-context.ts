// Source of truth: TypeScript. Vite bundles this into each page entry that needs it.
export function initEnvironmentContextBadge() {
  const badge = document.querySelector<HTMLElement>("[data-environment-context-badge]");
  if (!badge) return;
  badge.addEventListener("click", () => {
    badge.classList.add("is-dismissing");
    badge.setAttribute("aria-hidden", "true");
    window.setTimeout(() => badge.remove(), 160);
  }, { once: true });
}
