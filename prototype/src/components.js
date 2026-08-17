/*
 * CareNexa Wireframe Prototype — Shared UI components.
 * Every function returns an HTML string (template-literal based rendering).
 * No framework — the router re-renders the relevant container on change.
 */
window.CN = window.CN || {};
CN.components = {};
CN.actions = CN.actions || {};

/* ---------- utilities ---------- */
CN.esc = function (str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
};

CN.util = {
  money: function (n) { return "$" + Number(n).toFixed(2); },
  prettyDate: function (iso) {
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  },
  time12: function (hhmm) {
    var parts = hhmm.split(":"); var h = parseInt(parts[0], 10); var m = parts[1];
    var ampm = h >= 12 ? "PM" : "AM"; var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ":" + m + " " + ampm;
  }
};

/* ---------- toast ---------- */
CN.actions.dismissToast = function () {
  CN.state.ui.toastMessage = "";
  var el = document.getElementById("toast-root");
  if (el) el.innerHTML = "";
};
CN.toast = function (message) {
  CN.state.ui.toastMessage = message;
  var el = document.getElementById("toast-root");
  if (!el) return;
  el.innerHTML = '<div class="toast" role="status" aria-live="polite">' + CN.esc(message) + "</div>";
  if (CN.state.ui.toastTimer) clearTimeout(CN.state.ui.toastTimer);
  CN.state.ui.toastTimer = setTimeout(CN.actions.dismissToast, 3200);
};

/* ---------- modal ---------- */
CN.actions.closeModal = function () {
  var el = document.getElementById("modal-root");
  if (el) el.innerHTML = "";
};
CN.modal = function (innerHtml) {
  var el = document.getElementById("modal-root");
  if (!el) return;
  el.innerHTML =
    '<div class="overlay" role="presentation" onclick="if(event.target===this){CN.actions.closeModal()}">' +
    '<div class="modal" role="dialog" aria-modal="true">' + innerHtml + "</div></div>";
  var firstBtn = el.querySelector(".modal button, .modal [href]");
  if (firstBtn) firstBtn.focus();
};

/* ---------- drawer ---------- */
CN.actions.closeDrawer = function () {
  var el = document.getElementById("drawer-root");
  if (el) el.innerHTML = "";
};
CN.drawer = function (innerHtml) {
  var el = document.getElementById("drawer-root");
  if (!el) return;
  el.innerHTML =
    '<div class="drawer-overlay" onclick="CN.actions.closeDrawer()"></div>' +
    '<aside class="drawer" role="dialog" aria-modal="true" aria-label="Details">' + innerHtml + "</aside>";
};

/* ---------- badges / status ---------- */
CN.components.badge = function (text, variant) {
  return '<span class="badge ' + (variant ? "badge-" + variant : "") + '">' + CN.esc(text) + "</span>";
};
CN.components.statusChip = function (status) {
  var key = String(status).toLowerCase().replace(/\s+/g, "");
  return '<span class="status status-' + key + '">' + CN.esc(status) + "</span>";
};

/* ---------- empty / loading / error state blocks ---------- */
CN.components.emptyState = function (opts) {
  opts = opts || {};
  return (
    '<div class="state-block">' +
    '<div class="glyph" aria-hidden="true">' + (opts.icon || "□") + "</div>" +
    "<h3>" + CN.esc(opts.title || "Nothing here yet") + "</h3>" +
    "<p>" + CN.esc(opts.body || "") + "</p>" +
    (opts.ctaLabel ? '<button class="btn btn-primary" onclick="' + opts.ctaAction + '">' + CN.esc(opts.ctaLabel) + "</button>" : "") +
    "</div>"
  );
};
CN.components.errorState = function (message, retryAction) {
  return (
    '<div class="banner banner-danger" role="alert">' +
    '<span class="banner-icon" aria-hidden="true">&#9888;</span>' +
    "<div><strong>Something went wrong</strong>" + CN.esc(message) +
    (retryAction ? '<div class="mt-2"><button class="btn btn-secondary btn-sm" onclick="' + retryAction + '">Retry</button></div>' : "") +
    "</div></div>"
  );
};
CN.components.skeleton = function (lines) {
  lines = lines || 3;
  var out = '<div aria-hidden="true">';
  for (var i = 0; i < lines; i++) {
    out += '<div class="skeleton skeleton-line" style="width:' + (95 - i * 12) + '%"></div>';
  }
  out += "</div>";
  return out;
};

/* ---------- banner / alert ---------- */
CN.components.banner = function (variant, title, body, icon) {
  return (
    '<div class="banner banner-' + variant + '" role="' + (variant === "danger" || variant === "warning" ? "alert" : "note") + '">' +
    '<span class="banner-icon" aria-hidden="true">' + (icon || "ℹ") + "</span>" +
    "<div>" + (title ? "<strong>" + CN.esc(title) + "</strong>" : "") + (body ? "<div>" + body + "</div>" : "") +
    "</div></div>"
  );
};

/* ---------- tabs ---------- */
CN.components.tabbar = function (tabs, activeId, onSelect) {
  var out = '<div class="tabbar" role="tablist">';
  tabs.forEach(function (t) {
    var selected = t.id === activeId;
    out += '<button role="tab" aria-selected="' + selected + '" onclick="' + onSelect + "('" + t.id + "')\">" + CN.esc(t.label) + "</button>";
  });
  out += "</div>";
  return out;
};

/* ---------- public site header / footer ---------- */
CN.components.publicHeader = function (activePath) {
  var clinic = CN.SEED.clinic;
  function navLink(href, label) {
    var current = activePath === href;
    return '<a href="' + href + '"' + (current ? ' aria-current="page"' : "") + ">" + label + "</a>";
  }
  return (
    '<header class="site-header">' +
    '<div class="container">' +
    '<a class="brand" href="#/">' +
    '<span class="brand-mark" aria-hidden="true">CN</span>' + CN.esc(clinic.name) +
    "</a>" +
    '<button class="btn btn-secondary nav-toggle" aria-expanded="false" aria-controls="site-nav" onclick="CN.actions.toggleSiteNav(this)">Menu</button>' +
    '<nav class="site-nav" id="site-nav" aria-label="Primary">' +
    navLink("#/", "Home") +
    navLink("#/services", "Services") +
    navLink("#/therapists", "Our Therapists") +
    '<a href="#/login">Staff Login</a>' +
    '<a class="btn btn-primary btn-sm" href="#/book">Book an Appointment</a>' +
    "</nav></div></header>"
  );
};
CN.actions.toggleSiteNav = function (btn) {
  var nav = document.getElementById("site-nav");
  var open = nav.getAttribute("data-open") === "true";
  nav.setAttribute("data-open", open ? "false" : "true");
  btn.setAttribute("aria-expanded", open ? "false" : "true");
};

CN.components.publicFooter = function () {
  var clinic = CN.SEED.clinic;
  return (
    '<footer class="site-footer"><div class="container">' +
    "<div><strong>" + CN.esc(clinic.name) + "</strong><br>" + CN.esc(clinic.address) + "<br>" + CN.esc(clinic.phone) + "</div>" +
    "<div>Hours: " + CN.esc(clinic.hours) + "<br><a href=\"#/login\">Staff Login</a></div>" +
    "</div></footer>"
  );
};

/* ---------- prototype banner (shown on every screen) ---------- */
CN.components.protoBanner = function () {
  return (
    '<div class="proto-banner">' +
    "<strong>CareNexa Wireframe Prototype</strong> — for internal review only. " +
    "Not final visual design. Fictional demo data only. No real authentication, APIs, or PHI." +
    "</div>"
  );
};

/* ---------- demo controls panel (staff-side) ---------- */
CN.components.demoPanel = function () {
  var d = CN.state.demo;
  return (
    '<div class="demo-panel" data-open="' + d.panelOpen + '">' +
    '<div class="demo-panel-head" onclick="CN.actions.toggleDemoPanel()">' +
    "<span>⚙ Prototype Demo Controls</span><span aria-hidden=\"true\">" + (d.panelOpen ? "−" : "+") + "</span>" +
    "</div>" +
    '<div class="demo-panel-body">' +
    '<div class="demo-field">' +
    '<label for="demo-role">View Client 360 as role</label>' +
    '<select id="demo-role" onchange="CN.actions.setDemoRole(this.value)">' +
    ["therapist", "receptionist", "billing"].map(function (r) {
      return '<option value="' + r + '"' + (d.role === r ? " selected" : "") + ">" + (r.charAt(0).toUpperCase() + r.slice(1)) + "</option>";
    }).join("") +
    "</select>" +
    '<p class="field-hint">Demonstrates role-based tab visibility (PR1): restricted tabs are removed, not just disabled.</p>' +
    "</div>" +
    '<div class="demo-field">' +
    '<label class="checkbox-row"><input type="checkbox" id="demo-restricted" ' + (d.showRestrictedCalendar ? "checked" : "") + ' onchange="CN.actions.setRestrictedCalendar(this.checked)">' +
    "<span>Show a colleague&rsquo;s appointment on Schedule (permission demo)</span></label>" +
    '<p class="field-hint">Shows a slot marked &ldquo;Booked&rdquo; only — no client name — per the approved permission model.</p>' +
    "</div>" +
    '<button class="btn btn-secondary btn-sm btn-block" onclick="CN.actions.resetDemo()">Reset demo data</button>' +
    "</div></div>"
  );
};
CN.actions.toggleDemoPanel = function () {
  CN.state.demo.panelOpen = !CN.state.demo.panelOpen;
  CN.router.renderDemoPanel();
};
CN.actions.setDemoRole = function (role) {
  CN.state.demo.role = role;
  CN.router.render();
};
CN.actions.setRestrictedCalendar = function (checked) {
  CN.state.demo.showRestrictedCalendar = checked;
  CN.router.render();
};
CN.actions.resetDemo = function () {
  CN.state.reset();
  CN.toast("Demo data reset.");
  location.hash = "#/";
};

/* ---------- app shell (staff/internal screens) ---------- */
CN.NAV_ITEMS = [
  { id: "dashboard", route: "#/app/dashboard", label: "Dashboard", icon: "⌂" },
  { id: "schedule", route: "#/app/schedule", label: "Schedule", icon: "▦" },
  { id: "clients", route: "#/app/clients/" + CN.SEED.clients[0].id, label: "Clients", icon: "☺" }
];

CN.components.appShell = function (activeId, contentHtml) {
  var user = CN.state.auth.user || CN.SEED.staffUser;
  var navHtml = CN.NAV_ITEMS.map(function (item) {
    return '<a href="' + item.route + '"' + (item.id === activeId ? ' aria-current="page"' : "") + ">" +
      '<span class="nav-icon" aria-hidden="true">' + item.icon + "</span>" + item.label + "</a>";
  }).join("");

  return (
    '<div class="app-shell">' +
    '<div class="sidebar-scrim hidden" id="sidebar-scrim" onclick="CN.actions.closeSidebar()"></div>' +
    '<aside class="app-sidebar" id="app-sidebar" data-open="false">' +
    '<a class="brand" href="#/app/dashboard"><span class="brand-mark" aria-hidden="true">CN</span>CareNexa</a>' +
    '<nav class="app-nav" aria-label="Primary">' +
    '<div class="app-nav-group-label">Workflow</div>' + navHtml +
    "</nav>" +
    '<div class="app-sidebar-footer">Signed in as<br><strong>' + CN.esc(user.name) + "</strong><br>" +
    '<a href="#/" onclick="CN.actions.logout()">Log out</a></div>' +
    "</aside>" +
    '<div class="app-main">' +
    '<div class="app-topbar">' +
    '<button class="btn btn-secondary sidebar-toggle" aria-label="Open navigation" onclick="CN.actions.openSidebar()">☰</button>' +
    "<h1 style=\"font-size:1.05rem;margin:0\">" + CN.esc((CN.NAV_ITEMS.filter(function(i){return i.id===activeId;})[0] || {}).label || "CareNexa") + "</h1>" +
    '<div class="user-chip"><span class="avatar" style="background:' + user.color + '" aria-hidden="true">' + (user.initials || "MH") + "</span>" + CN.esc(user.name) + "</div>" +
    "</div>" +
    '<div class="app-content">' + contentHtml + "</div>" +
    "</div></div>"
  );
};
CN.actions.openSidebar = function () {
  document.getElementById("app-sidebar").setAttribute("data-open", "true");
  document.getElementById("sidebar-scrim").classList.remove("hidden");
};
CN.actions.closeSidebar = function () {
  document.getElementById("app-sidebar").setAttribute("data-open", "false");
  document.getElementById("sidebar-scrim").classList.add("hidden");
};
CN.actions.logout = function () {
  CN.state.auth.loggedIn = false;
  CN.state.auth.mfaVerified = false;
  CN.toast("Signed out.");
};

/* ---------- risk / safety indicator ---------- */
CN.components.riskBanner = function (client, role) {
  if (!client.riskFlag) return "";
  if (role === "therapist") {
    return CN.components.banner("danger", "Safety consideration on file",
      CN.esc(client.riskNote) + ' <a href="#" onclick="return false;">View details in Clinical Notes</a>', "⚠");
  }
  // Restricted, indicator-only view for non-clinical roles (PR3)
  return CN.components.banner("warning", "Safety consideration on file",
    "Detail restricted to clinical staff. No further information is available in this view.", "⚠");
};
