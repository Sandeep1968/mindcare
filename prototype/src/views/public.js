/*
 * CareNexa Wireframe Prototype — Public website views
 * Journey A, screens 1–4: Homepage, Services, Therapist Directory, Therapist Profile
 */
window.CN = window.CN || {};
CN.views = CN.views || {};

function publicPage(activePath, bodyHtml) {
  return (
    CN.components.publicHeader(activePath) +
    '<main id="main">' + bodyHtml + "</main>" +
    CN.components.publicFooter()
  );
}

/* ---------- 1. Homepage ---------- */
CN.views.home = function () {
  var services = CN.SEED.services.slice(0, 3);
  var therapists = CN.state.therapists.slice(0, 3);

  var serviceCards = services.map(function (s) {
    return (
      '<div class="card card-hover service-card">' +
      "<h3>" + CN.esc(s.name) + "</h3>" +
      '<p class="text-muted">' + CN.esc(s.blurb) + "</p>" +
      '<a class="btn btn-secondary btn-sm" href="#/book?service=' + s.id + '">Book this service</a>' +
      "</div>"
    );
  }).join("");

  var therapistCards = therapists.map(function (t) {
    return (
      '<div class="card card-hover therapist-card">' +
      '<div class="row"><span class="avatar avatar-lg" style="background:' + t.color + '" aria-hidden="true">' + t.initials + "</span>" +
      "<div><div class=\"name\">" + CN.esc(t.name) + ", " + CN.esc(t.credentials) + "</div>" +
      '<div class="creds">' + t.specialties.slice(0, 2).join(" · ") + "</div></div></div>" +
      '<a class="btn btn-ghost btn-sm" href="#/therapists/' + t.id + '">View profile →</a>' +
      "</div>"
    );
  }).join("");

  var body =
    '<section class="hero"><div class="container hero-inner">' +
    "<div><h1>Therapy that fits how you actually live.</h1>" +
    '<p class="lead">' + CN.esc(CN.SEED.clinic.tagline) + "</p>" +
    '<div class="hero-actions">' +
    '<a class="btn btn-primary" href="#/book">Book an Appointment</a>' +
    '<a class="btn btn-secondary" href="#/therapists">Meet Our Therapists</a>' +
    "</div></div>" +
    '<div class="hero-art" aria-hidden="true">[ Calming illustration placeholder ]</div>' +
    "</div></section>" +

    '<section class="section"><div class="container">' +
    '<div class="row-between section-head"><h2>Services</h2><a href="#/services">See all services →</a></div>' +
    '<div class="grid grid-3">' + serviceCards + "</div>" +
    "</div></section>" +

    '<section class="section section-muted"><div class="container">' +
    '<div class="row-between section-head"><h2>Our Therapists</h2><a href="#/therapists">See all therapists →</a></div>' +
    '<div class="grid grid-3">' + therapistCards + "</div>" +
    "</div></section>" +

    '<section class="section"><div class="container-narrow" style="text-align:center">' +
    "<h2>Ready to get started?</h2>" +
    '<p class="text-muted">Booking takes about two minutes — no account required.</p>' +
    '<a class="btn btn-primary" href="#/book">Book an Appointment</a>' +
    "</div></section>";

  return publicPage("#/", body);
};

/* ---------- 2. Services ---------- */
CN.views.services = function () {
  var cards = CN.SEED.services.map(function (s) {
    return (
      '<div class="card card-hover service-card">' +
      "<h3>" + CN.esc(s.name) + "</h3>" +
      '<div class="service-tags">' + CN.components.badge(s.duration + " min", "primary") + CN.components.badge(s.format, null) + "</div>" +
      "<p>" + CN.esc(s.blurb) + "</p>" +
      '<a class="btn btn-primary btn-sm" href="#/book?service=' + s.id + '">Book this service</a>' +
      "</div>"
    );
  }).join("");

  var body =
    '<section class="section"><div class="container">' +
    '<div class="section-head"><h1>Services</h1><p class="text-muted">Choose the type of care that fits your situation. Not sure? <a href="#/book">Start booking</a> and we\'ll help you pick.</p></div>' +
    '<div class="grid grid-3">' + cards + "</div>" +
    "</div></section>";

  return publicPage("#/services", body);
};

/* ---------- 3. Therapist Directory ---------- */
CN.views.therapistDirectory = function (query) {
  var filterFormat = (query && query.format) || "";
  var list = CN.state.therapists.filter(function (t) {
    return !filterFormat || t.formats.indexOf(filterFormat) !== -1;
  });

  function chip(label, value) {
    var pressed = filterFormat === value;
    return '<button class="chip chip-filter" aria-pressed="' + pressed + '" onclick="CN.actions.filterTherapists(\'' + value + '\')">' + label + "</button>";
  }

  var cards = list.map(function (t) {
    return (
      '<div class="card card-hover therapist-card">' +
      '<div class="row"><span class="avatar avatar-lg" style="background:' + t.color + '" aria-hidden="true">' + t.initials + "</span>" +
      "<div><div class=\"name\">" + CN.esc(t.name) + "</div><div class=\"creds\">" + CN.esc(t.credentials) + "</div></div></div>" +
      '<div class="service-tags">' + t.specialties.map(function (s) { return CN.components.badge(s, "primary"); }).join("") + "</div>" +
      '<p class="text-muted">Next available: ' + CN.esc(t.nextAvailable) + "</p>" +
      '<div class="row">' +
      '<a class="btn btn-secondary btn-sm" href="#/therapists/' + t.id + '">View Profile</a>' +
      '<a class="btn btn-primary btn-sm" href="#/book?therapist=' + t.id + '">Book with ' + t.name.split(" ")[1] + "</a>" +
      "</div></div>"
    );
  }).join("");

  var body =
    '<section class="section"><div class="container">' +
    '<div class="section-head"><h1>Our Therapists</h1><p class="text-muted">Every therapist listed here is currently accepting new clients.</p></div>' +
    '<div class="row wrap" style="margin-bottom:20px" role="group" aria-label="Filter by format">' +
    chip("All formats", "") + chip("In-person", "in-person") + chip("Virtual", "virtual") +
    "</div>" +
    (cards ? '<div class="grid grid-3">' + cards + "</div>" : CN.components.emptyState({
      icon: "○", title: "No therapists match this filter", body: "Try a different format, or contact us for help.",
      ctaLabel: "Clear filters", ctaAction: "CN.actions.filterTherapists('')"
    })) +
    "</div></section>";

  return publicPage("#/therapists", body);
};
CN.actions.filterTherapists = function (format) {
  location.hash = "#/therapists" + (format ? "?format=" + format : "");
};

/* ---------- 4. Therapist Profile ---------- */
CN.views.therapistProfile = function (id) {
  var t = CN.state.therapists.find(function (x) { return x.id === id; });
  if (!t) {
    return publicPage("#/therapists", '<div class="container section">' + CN.components.emptyState({
      icon: "?", title: "Therapist not found", body: "This profile may have moved.",
      ctaLabel: "Back to Directory", ctaAction: "location.hash='#/therapists'"
    }) + "</div>");
  }
  var services = t.services.map(function (sid) { return CN.lookup.service(sid); }).filter(Boolean);

  var body =
    '<section class="section"><div class="container">' +
    '<a href="#/therapists">&larr; Back to Directory</a>' +
    '<div class="row mt-4" style="align-items:flex-start;gap:24px">' +
    '<span class="avatar" style="background:' + t.color + ';width:96px;height:96px;font-size:1.6rem;border-radius:20px" aria-hidden="true">' + t.initials + "</span>" +
    "<div style=\"flex:1\"><h1 class=\"mb-0\">" + CN.esc(t.name) + "</h1>" +
    '<p class="text-muted mt-0">' + CN.esc(t.credentials) + "</p>" +
    '<div class="service-tags">' + t.specialties.map(function (s) { return CN.components.badge(s, "primary"); }).join("") +
    t.formats.map(function (f) { return CN.components.badge(f, "info"); }).join("") + "</div>" +
    '<a class="btn btn-primary mt-4" href="#/book?therapist=' + t.id + '">Book with ' + t.name.split(" ")[1] + "</a>" +
    "</div></div>" +

    '<div class="grid grid-2 mt-6">' +
    '<div class="card"><h2>About</h2><p>' + CN.esc(t.bio) + "</p></div>" +
    '<div class="card"><h2>Services offered</h2><div class="stack-sm">' +
    services.map(function (s) {
      return '<div class="row-between"><span>' + CN.esc(s.name) + "</span><span class=\"text-muted\">" + s.duration + " min</span></div>";
    }).join("") + "</div>" +
    '<p class="text-muted mt-4">Next available: ' + CN.esc(t.nextAvailable) + "</p></div>" +
    "</div></div></section>";

  return publicPage("#/therapists", body);
};
