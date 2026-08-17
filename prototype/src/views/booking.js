/*
 * CareNexa Wireframe Prototype — Public booking wizard
 * Journey A, screens 5–8: Booking Step 1 (Service/Therapist), Step 2 (Date & Time),
 * Step 3 (Patient Details), Step 4 (Confirmation). Includes an inline demo of the
 * booking-conflict recovery state (approved wireframe spec, screen 14 / ERR4).
 */
window.CN = window.CN || {};
CN.views = CN.views || {};

function bookingPage(stepIndex, bodyHtml) {
  var steps = ["Service & Therapist", "Date & Time", "Your Details", "Confirmation"];
  var stepper = '<div class="stepper" aria-label="Booking progress">';
  steps.forEach(function (label, i) {
    var state = i < stepIndex ? "done" : i === stepIndex ? "active" : "";
    stepper += '<div class="step ' + state + '"><span class="dot">' + (i < stepIndex ? "✓" : i + 1) + "</span><span class=\"label\">" + label + "</span></div>";
    if (i < steps.length - 1) stepper += '<span class="sep" aria-hidden="true"></span>';
  });
  stepper += "</div>";

  return (
    CN.components.publicHeader("#/book") +
    '<main id="main"><section class="section"><div class="container-narrow">' +
    stepper + bodyHtml +
    "</div></section></main>" +
    CN.components.publicFooter()
  );
}

function parseQuery(q) {
  var out = {};
  if (!q) return out;
  q.split("&").forEach(function (pair) {
    var kv = pair.split("=");
    if (kv[0]) out[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
  });
  return out;
}

/* ---------- 5. Step 1: Service & Therapist ---------- */
CN.views.bookingStep1 = function (query) {
  var q = parseQuery(query);
  var b = CN.state.booking;
  if (q.service && !b.serviceId) b.serviceId = q.service;
  if (q.therapist && !b.therapistId) b.therapistId = q.therapist;

  var services = CN.SEED.services;
  var eligibleTherapists = CN.state.therapists.filter(function (t) {
    return !b.serviceId || t.services.indexOf(b.serviceId) !== -1;
  });

  var serviceCards = services.map(function (s) {
    var selected = b.serviceId === s.id;
    return (
      '<label class="radio-card" data-selected="' + selected + '">' +
      '<input type="radio" name="service" value="' + s.id + '" ' + (selected ? "checked" : "") +
      ' onchange="CN.actions.bookingSetService(\'' + s.id + '\')">' +
      "<strong>" + CN.esc(s.name) + "</strong> — " + s.duration + " min<br>" +
      '<span class="text-muted">' + CN.esc(s.blurb) + "</span>" +
      "</label>"
    );
  }).join("");

  var therapistCards = "";
  if (b.serviceId) {
    therapistCards = eligibleTherapists.map(function (t) {
      var selected = b.therapistId === t.id;
      return (
        '<label class="radio-card" data-selected="' + selected + '">' +
        '<input type="radio" name="therapist" value="' + t.id + '" ' + (selected ? "checked" : "") +
        ' onchange="CN.actions.bookingSetTherapist(\'' + t.id + '\')">' +
        '<span class="row"><span class="avatar" style="background:' + t.color + '" aria-hidden="true">' + t.initials + "</span>" +
        "<span><strong>" + CN.esc(t.name) + "</strong><br><span class=\"text-muted\">" + t.specialties.join(", ") + "</span></span></span>" +
        "</label>"
      );
    }).join("") + '<label class="radio-card" data-selected="' + (b.therapistId === "any") + '">' +
      '<input type="radio" name="therapist" value="any" ' + (b.therapistId === "any" ? "checked" : "") +
      ' onchange="CN.actions.bookingSetTherapist(\'any\')">' +
      "<strong>No preference</strong> — match me with the next available therapist</label>";
  }

  var canContinue = b.serviceId && b.therapistId;

  var body =
    "<h1>Choose a service</h1>" +
    '<div class="stack">' + serviceCards + "</div>" +
    (b.serviceId ? "<h2 class=\"mt-6\">Choose a therapist</h2><div class=\"stack\">" + therapistCards + "</div>" : "") +
    '<div class="row-between mt-6">' +
    '<a class="btn btn-secondary" href="#/services">Not sure — see all services</a>' +
    '<button class="btn btn-primary" ' + (canContinue ? "" : "disabled") + ' onclick="CN.actions.bookingGoStep2()">Continue</button>' +
    "</div>";

  return bookingPage(0, body);
};
CN.actions.bookingSetService = function (id) { CN.state.booking.serviceId = id; CN.state.booking.therapistId = null; CN.router.render(); };
CN.actions.bookingSetTherapist = function (id) { CN.state.booking.therapistId = id; CN.router.render(); };
CN.actions.bookingGoStep2 = function () {
  if (!CN.state.booking.serviceId || !CN.state.booking.therapistId) return;
  location.hash = "#/book/datetime";
};

/* ---------- 6. Step 2: Date & Time ---------- */
function hashSlot(str) {
  var h = 0;
  for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 97;
  return h;
}
function generateSlots(dateStr) {
  var times = ["09:00", "09:30", "10:00", "10:30", "11:00", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
  return times.map(function (t) {
    var available = hashSlot(dateStr + t) % 3 !== 0;
    return { time: t, available: available };
  });
}
function next7Days(startIso) {
  var out = []; var d = new Date(startIso + "T00:00:00");
  for (var i = 0; i < 7; i++) {
    var dd = new Date(d); dd.setDate(d.getDate() + i);
    out.push(dd.toISOString().slice(0, 10));
  }
  return out;
}

CN.views.bookingStep2 = function () {
  var b = CN.state.booking;
  if (!b.serviceId || !b.therapistId) { location.hash = "#/book"; return ""; }
  var therapist = b.therapistId === "any" ? null : CN.lookup.therapist(b.therapistId);
  var service = CN.lookup.service(b.serviceId);
  var days = next7Days(CN.SEED.today);
  if (!b.date) b.date = days[1]; // default to "tomorrow" for a friendlier demo

  var dateStrip = days.map(function (d, i) {
    var dt = new Date(d + "T00:00:00");
    var selected = b.date === d;
    return (
      '<button class="date-btn" aria-pressed="' + selected + '" onclick="CN.actions.bookingSetDate(\'' + d + '\')">' +
      '<span class="d">' + dt.toLocaleDateString(undefined, { weekday: "short" }) + "</span>" +
      '<span class="n">' + dt.getDate() + "</span></button>"
    );
  }).join("");

  var slots = generateSlots(b.date);
  if (b.conflictActive && b.conflictTimeWasted) {
    slots = slots.map(function (s) { return s.time === b.conflictTimeWasted ? { time: s.time, available: false } : s; });
  }
  var slotGrid = slots.map(function (s) {
    var selected = b.time === s.time && !b.conflictActive;
    if (!s.available) return '<button class="slot-btn" disabled title="Unavailable">' + CN.util.time12(s.time) + "</button>";
    return '<button class="slot-btn" aria-pressed="' + selected + '" onclick="CN.actions.bookingSetTime(\'' + s.time + '\')">' + CN.util.time12(s.time) + "</button>";
  }).join("");

  var conflictBanner = "";
  if (b.conflictActive) {
    var alt = slots.filter(function (s) { return s.available && s.time !== b.conflictTimeWasted; }).slice(0, 3);
    conflictBanner = CN.components.banner("danger",
      "That time was just booked by someone else",
      "It happens — someone booked this slot moments ago. Here are the nearest open times:" +
      '<div class="row wrap mt-2">' + alt.map(function (s) {
        return '<button class="btn btn-secondary btn-sm" onclick="CN.actions.bookingSetTime(\'' + s.time + '\')">' + CN.util.time12(s.time) + "</button>";
      }).join("") + "</div>", "⚠");
  }

  var summary =
    '<div class="card mt-4 mb-4"><div class="row-between">' +
    "<div><strong>" + CN.esc(service.name) + "</strong> with " + (therapist ? CN.esc(therapist.name) : "next available therapist") + "</div>" +
    '<a href="#/book">Change</a></div></div>';

  var canContinue = !!b.time && !b.conflictActive;

  var body =
    "<h1>Pick a date &amp; time</h1>" + summary +
    conflictBanner +
    '<h2 class="mt-4">Date</h2><div class="date-strip">' + dateStrip + "</div>" +
    '<h2 class="mt-4">Available times</h2><div class="slot-grid">' + slotGrid + "</div>" +
    '<p class="field-hint mt-2">All times shown in your local time zone.</p>' +
    (!b.conflictActive ? '<p class="mt-4"><button class="btn btn-ghost btn-sm" onclick="CN.actions.bookingSimulateConflict()">Demo: simulate this slot becoming unavailable</button></p>' : "") +
    '<div class="row-between mt-6">' +
    '<a class="btn btn-secondary" href="#/book">Back</a>' +
    '<button class="btn btn-primary" ' + (canContinue ? "" : "disabled") + ' onclick="CN.actions.bookingGoStep3()">Continue</button>' +
    "</div>";

  return bookingPage(1, body);
};
CN.actions.bookingSetDate = function (d) { CN.state.booking.date = d; CN.state.booking.time = null; CN.state.booking.conflictActive = false; CN.router.render(); };
CN.actions.bookingSetTime = function (t) { CN.state.booking.time = t; CN.state.booking.conflictActive = false; CN.router.render(); };
CN.actions.bookingSimulateConflict = function () {
  if (!CN.state.booking.time) { CN.toast("Select a time first."); return; }
  CN.state.booking.conflictTimeWasted = CN.state.booking.time;
  CN.state.booking.conflictActive = true;
  CN.state.booking.time = null;
  CN.router.render();
};
CN.actions.bookingGoStep3 = function () {
  if (!CN.state.booking.time) return;
  location.hash = "#/book/details";
};

/* ---------- 7. Step 3: Patient Details ---------- */
CN.views.bookingStep3 = function () {
  var b = CN.state.booking;
  if (!b.time) { location.hash = "#/book/datetime"; return ""; }
  var therapist = b.therapistId === "any" ? null : CN.lookup.therapist(b.therapistId);
  var service = CN.lookup.service(b.serviceId);

  var summary =
    '<div class="card mt-4 mb-5"><div class="stack-sm">' +
    "<div class=\"row-between\"><span>Service</span><strong>" + CN.esc(service.name) + '</strong></div>' +
    "<div class=\"row-between\"><span>Therapist</span><strong>" + (therapist ? CN.esc(therapist.name) : "Next available") + '</strong></div>' +
    "<div class=\"row-between\"><span>When</span><strong>" + CN.util.prettyDate(b.date) + " at " + CN.util.time12(b.time) + '</strong></div>' +
    '<div><a href="#/book/datetime">Change date/time</a> · <a href="#/book">Change service/therapist</a></div>' +
    "</div></div>";

  var body =
    "<h1>Your details</h1>" + summary +
    '<form onsubmit="return CN.actions.bookingSubmitDetails(event)" novalidate>' +
    '<div class="field"><label for="bd-name">Full name</label><input id="bd-name" type="text" value="' + CN.esc(b.contact.name) + '" required></div>' +
    '<div class="grid grid-2">' +
    '<div class="field"><label for="bd-email">Email</label><input id="bd-email" type="email" value="' + CN.esc(b.contact.email) + '" required></div>' +
    '<div class="field"><label for="bd-phone">Phone</label><input id="bd-phone" type="tel" value="' + CN.esc(b.contact.phone) + '" required></div>' +
    "</div>" +
    '<div class="field"><label for="bd-payer">How will you be paying?</label>' +
    '<select id="bd-payer">' +
    ["Self-Pay", "Insurance", "Other"].map(function (p) { return '<option ' + (b.payerType === p ? "selected" : "") + ">" + p + "</option>"; }).join("") +
    "</select><p class=\"field-hint\">Basic billing info only — no insurance claims are processed at booking.</p></div>" +
    '<div class="checkbox-row field"><input type="checkbox" id="bd-consent" required>' +
    '<label for="bd-consent">I understand this form is for contact and scheduling only, and that no clinical or health information should be entered here.</label></div>' +
    '<div id="bd-error" role="alert"></div>' +
    '<div class="row-between mt-4">' +
    '<a class="btn btn-secondary" href="#/book/datetime">Back</a>' +
    '<button class="btn btn-primary" type="submit">Confirm Booking</button>' +
    "</div></form>";

  return bookingPage(2, body);
};
CN.actions.bookingSubmitDetails = function (ev) {
  ev.preventDefault();
  var name = document.getElementById("bd-name").value.trim();
  var email = document.getElementById("bd-email").value.trim();
  var phone = document.getElementById("bd-phone").value.trim();
  var payer = document.getElementById("bd-payer").value;
  var consent = document.getElementById("bd-consent").checked;
  var errBox = document.getElementById("bd-error");
  var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  var problems = [];
  if (!name) problems.push("Full name is required.");
  if (!emailOk) problems.push("Enter a valid email address.");
  if (!phone) problems.push("Phone number is required.");
  if (!consent) problems.push("Please confirm the checkbox to continue.");

  if (problems.length) {
    errBox.innerHTML = CN.components.banner("danger", "Please fix the following", problems.map(CN.esc).join("<br>"), "⚠");
    return false;
  }
  CN.state.booking.contact = { name: name, email: email, phone: phone, newClient: true };
  CN.state.booking.payerType = payer;
  location.hash = "#/book/confirmation";
  return false;
};

/* ---------- 8. Confirmation ---------- */
CN.views.bookingConfirmation = function () {
  var b = CN.state.booking;
  if (!b.contact.name) { location.hash = "#/book"; return ""; }
  var therapist = b.therapistId === "any" ? null : CN.lookup.therapist(b.therapistId);
  var service = CN.lookup.service(b.serviceId);

  var body =
    '<div style="text-align:center">' +
    '<div class="modal-danger-icon" style="background:var(--success-tint);color:var(--success);margin:0 auto 12px" aria-hidden="true">✓</div>' +
    "<h1>You're booked!</h1>" +
    '<p class="text-muted">A confirmation has been sent to ' + CN.esc(b.contact.email) + ".</p></div>" +
    '<div class="card mt-5 stack-sm">' +
    "<div class=\"row-between\"><span>Service</span><strong>" + CN.esc(service.name) + "</strong></div>" +
    "<div class=\"row-between\"><span>Therapist</span><strong>" + (therapist ? CN.esc(therapist.name) : "To be assigned") + "</strong></div>" +
    "<div class=\"row-between\"><span>When</span><strong>" + CN.util.prettyDate(b.date) + " at " + CN.util.time12(b.time) + "</strong></div>" +
    "<div class=\"row-between\"><span>Format</span><strong>" + (therapist ? (therapist.formats.indexOf("in-person") !== -1 ? "In-person" : "Virtual") : "In-person") + "</strong></div>" +
    "</div>" +
    '<div class="row wrap mt-4">' +
    '<button class="btn btn-secondary" onclick="CN.toast(\'Added to your calendar (demo).\')">Add to Calendar</button>' +
    "</div>" +
    '<div class="card mt-6">' +
    "<h2>What's next</h2>" +
    '<p>Before your first session, please complete a short intake questionnaire and review our consent form. You&rsquo;ll receive a secure link by email.</p>' +
    '<button class="btn btn-primary" onclick="CN.toast(\'Intake forms are outside Phase 1 of this prototype.\')">Complete Intake Forms</button>' +
    "</div>" +
    '<p class="mt-6" style="text-align:center"><a href="#/" onclick="CN.actions.resetBooking()">Back to Homepage</a></p>';

  return bookingPage(3, body);
};
CN.actions.resetBooking = function () {
  CN.state.booking.serviceId = null; CN.state.booking.therapistId = null;
  CN.state.booking.date = null; CN.state.booking.time = null;
  CN.state.booking.contact = { name: "", email: "", phone: "", newClient: true };
  CN.state.booking.conflictActive = false;
};
