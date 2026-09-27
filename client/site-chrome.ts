// Shared public-site chrome behavior for LP and all LP subpages.
export function initSiteChrome(): void {
  const button = document.querySelector<HTMLButtonElement>("#mobile-menu-button");
  const nav = document.querySelector<HTMLElement>("#mobile-nav");
  if (!button || !nav || button.dataset.wired === "1") return;

  button.dataset.wired = "1";
  const closedIcon = button.innerHTML;

  const closeMenu = () => {
    nav.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "メニューを開く");
    button.innerHTML = closedIcon;
  };

  button.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    button.innerHTML = open ? "×" : closedIcon;
  });

  nav.querySelectorAll("a, button").forEach((item) => item.addEventListener("click", closeMenu));
}
