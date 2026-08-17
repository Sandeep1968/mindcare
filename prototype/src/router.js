/*
 * CareNexa Wireframe Prototype — Hash-based router.
 * No build tooling, no server required: works by opening index.html directly,
 * or via any static file server.
 */
window.CN = window.CN || {};
CN.router = {};

function parseQueryObj(qs) {
  var out = {};
  if (!qs) return out;
  qs.split("&").forEach(function (pair) {
    var kv = pair.split("=");
    if (kv[0]) out[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
  });
  return out;
}

var ROUTES = [
  { re: /^\/?$/, auth: false, view: function () { return CN.views.home(); } },
  { re: /^\/services$/, auth: false, view: function () { return CN.views.services(); } },
  { re: /^\/therapists$/, auth: false, view: function (m, q) { return CN.views.therapistDirectory(parseQueryObj(q)); } },
  { re: /^\/therapists\/([^/]+)$/, auth: false, view: function (m) { return CN.views.therapistProfile(m[1]); } },

  { re: /^\/book$/, auth: false, view: function (m, q) { return CN.views.bookingStep1(q); } },
  { re: /^\/book\/datetime$/, auth: false, view: function () { return CN.views.bookingStep2(); } },
  { re: /^\/book\/details$/, auth: false, view: function () { return CN.views.bookingStep3(); } },
  { re: /^\/book\/confirmation$/, auth: false, view: function () { return CN.views.bookingConfirmation(); } },

  { re: /^\/login$/, auth: false, view: function () { return CN.views.login(); } },
  { re: /^\/mfa$/, auth: false, view: function () { return CN.views.mfa(); } },

  { re: /^\/app\/dashboard$/, auth: true, view: function () { return CN.views.dashboard(); } },
  { re: /^\/app\/schedule$/, auth: true, view: function (m, q) { return CN.views.schedule(q); } },
  { re: /^\/app\/clients\/([^/]+)\/note\/new$/, auth: true, view: function (m) { return CN.views.clinicalNoteEditor(m[1]); } },
  { re: /^\/app\/clients\/([^/]+)\/notes\/([^/]+)$/, auth: true, view: function (m) { return CN.views.signedNote(m[1], m[2]); } },
  { re: /^\/app\/clients\/([^/]+)$/, auth: true, view: function (m, q) { return CN.views.clientProfile(m[1], q); } }
];

CN.router.parseHash = function () {
  var hash = location.hash || "#/";
  hash = hash.replace(/^#/, "");
  var qIndex = hash.indexOf("?");
  var path = qIndex === -1 ? hash : hash.slice(0, qIndex);
  var query = qIndex === -1 ? "" : hash.slice(qIndex + 1);
  if (!path) path = "/";
  return { path: path, query: query };
};

CN.router.render = function () {
  var parsed = CN.router.parseHash();
  var matchedRoute = null, params = null;

  for (var i = 0; i < ROUTES.length; i++) {
    var m = parsed.path.match(ROUTES[i].re);
    if (m) { matchedRoute = ROUTES[i]; params = m; break; }
  }

  // Close any open overlay on every navigation — a modal/drawer should
  // never persist across a route change.
  CN.actions.closeModal();
  CN.actions.closeDrawer();

  if (!matchedRoute) {
    document.getElementById("app").innerHTML =
      CN.components.publicHeader("") +
      '<main id="main" class="container section">' +
      CN.components.emptyState({
        icon: "?", title: "Page not found",
        body: "This screen does not exist in this Phase 1 prototype.",
        ctaLabel: "Back to Homepage", ctaAction: "location.hash='#/'"
      }) + "</main>" + CN.components.publicFooter();
    CN.router.renderDemoPanel();
    return;
  }

  if (matchedRoute.auth && !(CN.state.auth.loggedIn && CN.state.auth.mfaVerified)) {
    location.hash = "#/login";
    return;
  }

  var html = matchedRoute.view(params, parsed.query) || "";
  document.getElementById("app").innerHTML = html;
  window.scrollTo(0, 0);
  CN.router.renderDemoPanel();
};

CN.router.renderDemoPanel = function () {
  var root = document.getElementById("demo-panel-root");
  if (!root) return;
  var parsed = CN.router.parseHash();
  var inStaffApp = /^\/app\//.test(parsed.path);
  root.innerHTML = (inStaffApp && CN.state.auth.loggedIn && CN.state.auth.mfaVerified) ? CN.components.demoPanel() : "";
};
