const badge = document.querySelector('[data-environment-context-badge]');
if (badge) {
  badge.addEventListener('click', () => {
    badge.classList.add('is-dismissing');
    window.setTimeout(() => badge.remove(), 160);
  });
}
