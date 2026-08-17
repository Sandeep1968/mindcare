/*
 * CareNexa Wireframe Prototype — Bootstrap.
 * All state is in-memory (see src/state.js) and resets on reload — this is
 * intentional for a wireframe prototype: no localStorage, no cookies, no network.
 */
(function () {
  function start() {
    if (!location.hash) {
      location.hash = "#/";
    }
    CN.router.render();
  }

  document.addEventListener("DOMContentLoaded", start);
  window.addEventListener("hashchange", function () { CN.router.render(); });

  // Basic escape-key affordance: closes the topmost open modal or drawer.
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") {
      CN.actions.closeModal();
      CN.actions.closeDrawer();
    }
  });
})();
