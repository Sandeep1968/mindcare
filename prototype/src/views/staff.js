/*
 * CareNexa Wireframe Prototype — Staff application views
 * Journey B, screens 11–17: Therapist Dashboard, Schedule, Appointment Detail,
 * Client 360, Clinical Note, Sign Clinical Note, Signed Note / Addendum.
 */
window.CN = window.CN || {};
CN.views = CN.views || {};

/* Small helper: simulate a brief loading state the first time a "heavy"
   screen is visited this session, then re-render with real content. */
CN.state.ui.loadedOnce = CN.state.ui.loadedOnce || {};
CN.simulateLoad = function (key, skeletonHtml) {
  if (CN.state.ui.loadedOnce[key]) return null; // already loaded — caller renders real content
  setTimeout(function () {
    CN.state.ui.loadedOnce[key] = true;
    CN.router.render();
  }, 350);
  return skeletonHtml;
};

function todayAppointments(therapistId) {
  return CN.state.appointments.filter(function (a) { return a.therapistId === therapistId && a.date === CN.SEED.today; })
    .sort(function (a, b) { return a.time.localeCompare(b.time); });
}

/* ---------- 11. Therapist Dashboard ---------- */
CN.views.dashboard = function () {
  var user = CN.state.auth.user;
  var skeleton = CN.simulateLoad("dashboard", '<div class="grid grid-2">' +
    '<div class="widget">' + CN.components.skeleton(4) + '</div><div class="widget">' + CN.components.skeleton(4) + "</div></div>");
  if (skeleton) return CN.components.appShell("dashboard", "<h1>Good morning, " + CN.esc(user.name.split(" ")[1]) + ".</h1>" + skeleton);

  var today = todayAppointments(user.id);
  var sessionRows = today.length ? today.map(function (a) {
    var c = CN.lookup.client(a.clientId);
    var svc = CN.lookup.service(a.service);
    return (
      '<div class="list-row">' +
      '<span class="avatar" style="background:' + c.color + '" aria-hidden="true">' + c.initials + "</span>" +
      '<div class="meta"><div class="title">' + CN.esc(c.name) + " — " + CN.esc(svc.name) + "</div>" +
      '<div class="sub">' + CN.util.time12(a.time) + " · " + a.format + "</div></div>" +
      CN.components.statusChip(a.status) +
      '<button class="btn btn-secondary btn-sm" onclick="CN.actions.openApptDrawer(\'' + a.id + '\')">View</button>' +
      "</div>"
    );
  }).join("") : CN.components.emptyState({ icon: "☺", title: "No sessions today", body: "Enjoy the quiet — check tomorrow's schedule any time.", ctaLabel: "View Full Schedule", ctaAction: "location.hash='#/app/schedule'" });

  // Pending clinical notes: completed appointments with no matching signed note.
  var pending = [];
  CN.state.clients.forEach(function (c) {
    if (c.assignedTherapist !== user.id) return;
    CN.state.appointments.forEach(function (a) {
      if (a.clientId !== c.id || a.status !== "Completed") return;
      var hasNote = c.notes.some(function (n) { return n.apptDate === a.date; });
      if (!hasNote) pending.push({ client: c, appt: a });
    });
  });
  var pendingHtml = pending.length ? pending.map(function (p) {
    return '<div class="list-row"><span class="avatar" style="background:' + p.client.color + '" aria-hidden="true">' + p.client.initials + "</span>" +
      '<div class="meta"><div class="title">' + CN.esc(p.client.name) + "</div><div class=\"sub\">Session on " + CN.util.prettyDate(p.appt.date) + "</div></div>" +
      '<button class="btn btn-primary btn-sm" onclick="CN.actions.newClinicalNote(\'' + p.client.id + '\',\'' + p.appt.id + '\')">Write Note</button></div>';
  }).join("") : CN.components.emptyState({ icon: "✓", title: "You're caught up", body: "No clinical notes are pending." });

  var virtualToday = today.filter(function (a) { return a.format === "Virtual"; });
  var virtualHtml = virtualToday.length ? virtualToday.map(function (a) {
    var c = CN.lookup.client(a.clientId);
    return '<div class="list-row"><span class="avatar" style="background:' + c.color + '" aria-hidden="true">' + c.initials + "</span>" +
      '<div class="meta"><div class="title">' + CN.esc(c.name) + "</div><div class=\"sub\">" + CN.util.time12(a.time) + "</div></div>" +
      '<button class="btn btn-secondary btn-sm" onclick="CN.toast(\'Joining virtual session (demo) — full telehealth flow is outside this Phase 1 prototype.\')">Join</button></div>';
  }).join("") : CN.components.emptyState({ icon: "○", title: "No virtual sessions today", body: "" });

  var reviews = [];
  CN.state.clients.forEach(function (c) {
    if (c.assignedTherapist !== user.id) return;
    c.treatmentPlans.filter(function (p) { return p.status === "Active"; }).forEach(function (p) {
      reviews.push('<div class="list-row"><div class="meta"><div class="title">' + CN.esc(c.name) + "</div><div class=\"sub\">Plan review due " + CN.util.prettyDate(p.reviewDate) + "</div></div>" +
        '<button class="btn btn-secondary btn-sm" onclick="location.hash=\'#/app/clients/' + c.id + '?tab=plan\'">Review</button></div>');
    });
  });

  var body =
    "<h1>Good morning, " + CN.esc(user.name.split(" ")[1]) + ".</h1>" +
    '<p class="text-muted mt-0">Here&rsquo;s what today looks like.</p>' +
    '<div class="grid grid-2 mt-4">' +
    '<div class="widget"><div class="widget-head"><h2>Today&rsquo;s Sessions</h2>' + CN.components.badge(today.length + " today", "primary") + "</div>" + sessionRows + "</div>" +
    '<div class="widget"><div class="widget-head"><h2>Pending Clinical Notes</h2></div>' + pendingHtml + "</div>" +
    '<div class="widget"><div class="widget-head"><h2>Virtual Sessions</h2></div>' + virtualHtml + "</div>" +
    '<div class="widget"><div class="widget-head"><h2>Treatment Plan Reviews</h2></div>' + (reviews.join("") || CN.components.emptyState({ icon: "✓", title: "Nothing due this week", body: "" })) + "</div>" +
    "</div>";

  return CN.components.appShell("dashboard", body);
};

/* ---------- 12. Schedule ---------- */
CN.views.schedule = function (query) {
  var q = (query || "").replace("date=", "") || CN.SEED.today;
  var date = q || CN.SEED.today;
  var user = CN.state.auth.user;

  var skeleton = CN.simulateLoad("schedule-" + date, '<div class="widget">' + CN.components.skeleton(6) + "</div>");
  var head = "<h1>Schedule</h1>";
  if (skeleton) return CN.components.appShell("schedule", head + skeleton);

  var days = next7ScheduleDays(CN.SEED.today);
  var dateNav =
    '<div class="calendar-toolbar">' +
    '<div class="date-strip">' + days.map(function (d) {
      var dt = new Date(d + "T00:00:00");
      return '<button class="date-btn" aria-pressed="' + (d === date) + '" onclick="location.hash=\'#/app/schedule?date=' + d + '\'">' +
        '<span class="d">' + dt.toLocaleDateString(undefined, { weekday: "short" }) + "</span><span class=\"n\">" + dt.getDate() + "</span></button>";
    }).join("") + "</div>" +
    '<div><span class="text-muted">Viewing: My Schedule (Dr. Hayes)</span></div>' +
    "</div>";

  var events = CN.state.appointments.filter(function (a) { return a.therapistId === user.id && a.date === date; });
  var restrictedEvents = [];
  if (CN.state.demo.showRestrictedCalendar) {
    restrictedEvents = CN.state.appointments.filter(function (a) { return a.therapistId !== user.id && a.date === date; });
  }

  var gridStartMin = 8 * 60, rowH = 56;
  var hourRows = "";
  for (var h = 8; h <= 17; h++) {
    hourRows += '<div class="slot">' + (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? "AM" : "PM") + "</div>";
  }
  var slotRows = "";
  for (var i = 8; i <= 17; i++) slotRows += '<div class="slot-row"></div>';

  function eventBlock(a, restricted) {
    var startMin = toMin(a.time), endMin = toMin(a.endTime);
    var top = ((startMin - gridStartMin) / 60) * rowH;
    var height = ((endMin - startMin) / 60) * rowH - 2;
    if (restricted) {
      return '<button class="calendar-event ev-booked-only" style="top:' + top + "px;height:" + height + 'px" ' +
        'onclick="CN.toast(\'You don\\\'t have access to this appointment.\')">' +
        '<span class="t">Booked</span>' + CN.util.time12(a.time) + "</button>";
    }
    var c = CN.lookup.client(a.clientId);
    var svc = CN.lookup.service(a.service);
    var cls = a.status === "Confirmed" ? "ev-confirmed" : a.status === "Pending" ? "ev-pending" : "ev-completed";
    return '<button class="calendar-event ' + cls + '" style="top:' + top + "px;height:" + height + 'px" ' +
      'onclick="CN.actions.openApptDrawer(\'' + a.id + '\')">' +
      '<span class="t">' + CN.esc(c.name) + "</span>" + CN.util.time12(a.time) + " · " + CN.esc(svc.name) + " · " + a.format + "</button>";
  }

  var eventsHtml = events.map(function (a) { return eventBlock(a, false); }).join("") +
    restrictedEvents.map(function (a) { return eventBlock(a, true); }).join("");

  var calendar =
    '<div class="day-grid">' +
    '<div class="time-col">' + hourRows + "</div>" +
    '<div class="events-col" style="position:relative">' + slotRows + eventsHtml + "</div>" +
    "</div>" +
    '<div class="legend">' +
    '<span><span class="sw" style="background:var(--info)"></span>Confirmed</span>' +
    '<span><span class="sw" style="background:var(--warning)"></span>Pending</span>' +
    '<span><span class="sw" style="background:var(--success)"></span>Completed</span>' +
    '<span><span class="sw" style="background:var(--text-faint)"></span>Booked (restricted — another provider)</span>' +
    "</div>";

  var body = head + dateNav + (events.length + restrictedEvents.length ? calendar :
    CN.components.emptyState({ icon: "○", title: "No appointments this day", body: "" }));

  return CN.components.appShell("schedule", body);
};
function toMin(hhmm) { var p = hhmm.split(":"); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
function next7ScheduleDays(startIso) {
  var out = []; var d = new Date(startIso + "T00:00:00");
  for (var i = 0; i < 5; i++) { var dd = new Date(d); dd.setDate(d.getDate() + i); out.push(dd.toISOString().slice(0, 10)); }
  return out;
}

/* ---------- 13. Appointment Detail (drawer) ---------- */
CN.actions.openApptDrawer = function (apptId) {
  var a = CN.lookup.appointment(apptId);
  if (!a) return;
  var c = CN.lookup.client(a.clientId);
  var svc = CN.lookup.service(a.service);
  var html =
    '<div class="row-between"><h2 class="mb-0">Appointment</h2><button class="btn btn-ghost btn-sm" onclick="CN.actions.closeDrawer()" aria-label="Close">✕</button></div>' +
    '<div class="row mt-4"><span class="avatar" style="background:' + c.color + '" aria-hidden="true">' + c.initials + "</span>" +
    "<div><strong>" + CN.esc(c.name) + "</strong><br><span class=\"text-muted\">" + CN.esc(svc.name) + "</span></div></div>" +
    '<div class="stack-sm mt-4">' +
    "<div class=\"row-between\"><span>Status</span>" + CN.components.statusChip(a.status) + "</div>" +
    "<div class=\"row-between\"><span>Date</span><strong>" + CN.util.prettyDate(a.date) + "</strong></div>" +
    "<div class=\"row-between\"><span>Time</span><strong>" + CN.util.time12(a.time) + " – " + CN.util.time12(a.endTime) + "</strong></div>" +
    "<div class=\"row-between\"><span>Format</span><strong>" + a.format + "</strong></div>" +
    "</div>" +
    '<div class="stack mt-5">' +
    (a.format === "Virtual" ? '<button class="btn btn-primary btn-block" onclick="CN.toast(\'Joining virtual session (demo).\')">Join Session</button>' :
      '<button class="btn btn-primary btn-block" onclick="CN.actions.startSession(\'' + a.id + '\')">Check In &amp; Start Session</button>') +
    '<button class="btn btn-secondary btn-block" onclick="location.hash=\'#/app/clients/' + c.id + '\'; CN.actions.closeDrawer()">View Client Profile</button>' +
    '<div class="row">' +
    '<button class="btn btn-secondary btn-sm" onclick="CN.toast(\'Reschedule flow is outside this Phase 1 prototype.\')">Reschedule</button>' +
    '<button class="btn btn-secondary btn-sm" onclick="CN.toast(\'Cancel flow is outside this Phase 1 prototype.\')">Cancel</button>' +
    "</div></div>";
  CN.drawer(html);
};
CN.actions.startSession = function (apptId) {
  CN.actions.closeDrawer();
  var a = CN.lookup.appointment(apptId);
  CN.toast("Checked in. Opening client record…");
  location.hash = "#/app/clients/" + a.clientId;
};

/* ---------- 14. Client 360 ---------- */
function roleTabs(role) {
  if (role === "billing") return ["overview", "appointments", "billing"];
  if (role === "receptionist") return ["overview", "timeline", "appointments", "forms", "consent", "documents", "messages", "billing"];
  return ["overview", "timeline", "appointments", "notes", "assessments", "plan", "forms", "consent", "documents", "messages", "billing"];
}
var TAB_LABELS = {
  overview: "Overview", timeline: "Timeline", appointments: "Appointments", notes: "Clinical Notes",
  assessments: "Assessments", plan: "Treatment Plan", forms: "Forms", consent: "Consent",
  documents: "Documents", messages: "Messages", billing: "Billing"
};

CN.views.clientProfile = function (id, query) {
  var c = CN.lookup.client(id);
  if (!c) return CN.components.appShell("clients", CN.components.emptyState({ icon: "?", title: "Client not found", body: "" }));

  var skeleton = CN.simulateLoad("client-" + id, '<div class="widget">' + CN.components.skeleton(5) + "</div>");
  if (skeleton) return CN.components.appShell("clients", "<h1>" + CN.esc(c.name) + "</h1>" + skeleton);

  var role = CN.state.demo.role;
  var tabs = roleTabs(role);
  var qp = {}; (query || "").split("&").forEach(function (p) { var kv = p.split("="); if (kv[0]) qp[kv[0]] = kv[1]; });
  var activeTab = tabs.indexOf(qp.tab) !== -1 ? qp.tab : tabs[0];

  var header =
    '<div class="row-between">' +
    '<div class="row"><span class="avatar avatar-lg" style="background:' + c.color + '" aria-hidden="true">' + c.initials + "</span>" +
    "<div><h1 class=\"mb-0\">" + CN.esc(c.name) + "</h1>" +
    '<div class="row" style="margin-top:4px">' + CN.components.statusChip(c.status) +
    '<span class="text-muted">Assigned: ' + CN.esc(CN.lookup.therapist(c.assignedTherapist).name) + "</span></div></div></div>" +
    '<a class="btn btn-secondary btn-sm" href="#/app/clients/' + c.id + '">Refresh</a>' +
    "</div>" +
    CN.components.riskBanner(c, role);

  var tabbar = '<div class="tabbar mt-5" role="tablist">' + tabs.map(function (t) {
    return '<button role="tab" aria-selected="' + (t === activeTab) + '" onclick="location.hash=\'#/app/clients/' + c.id + "?tab=" + t + '\'">' + TAB_LABELS[t] + "</button>";
  }).join("") + "</div>";

  var panel = '<div class="tab-panel">' + renderClientTab(c, activeTab, role) + "</div>";

  return CN.components.appShell("clients", header + tabbar + panel);
};

function renderClientTab(c, tab, role) {
  if (tab === "overview") return tabOverview(c, role);
  if (tab === "timeline") return tabTimeline(c, role);
  if (tab === "appointments") return tabAppointments(c);
  if (tab === "notes") return tabNotes(c);
  if (tab === "assessments") return tabAssessments(c);
  if (tab === "plan") return tabPlan(c);
  if (tab === "forms") return tabForms(c);
  if (tab === "consent") return tabConsent(c);
  if (tab === "documents") return tabDocuments(c);
  if (tab === "messages") return tabMessages(c);
  if (tab === "billing") return tabBilling(c, role);
  return "";
}

function tabOverview(c, role) {
  var full = role === "therapist";
  var rows = [
    ["Status", CN.components.statusChip(c.status)],
    ["Assigned Therapist", CN.esc(CN.lookup.therapist(c.assignedTherapist).name)],
    ["Service", CN.esc(CN.lookup.service(c.service).name)],
    ["Next Appointment", c.nextAppointment ? CN.esc(c.nextAppointment) : "None scheduled"]
  ];
  if (full) {
    rows.push(["Payer Type", CN.esc(c.payerType)]);
    rows.push(["Active Diagnoses", c.diagnoses.length ? c.diagnoses.map(CN.esc).join(", ") : "None on file"]);
    var activePlan = c.treatmentPlans.filter(function (p) { return p.status === "Active"; })[0];
    rows.push(["Active Treatment Plan", activePlan ? activePlan.goals.length + " goal(s) — reviewed " + CN.util.prettyDate(activePlan.reviewDate) : "No active plan"]);
    rows.push(["Client Since", CN.esc(c.source)]);
  }
  return '<div class="card"><div class="stack-sm">' + rows.map(function (r) {
    return '<div class="row-between"><span class="text-muted">' + r[0] + "</span><span>" + r[1] + "</span></div>";
  }).join("") + "</div></div>" +
    (!full ? '<p class="field-hint mt-3">Clinical details (diagnosis, treatment plan) are not shown for this role.</p>' : "");
}

function tabTimeline(c, role) {
  var events = [];
  c.notes.forEach(function (n) { if (role === "therapist") events.push({ date: n.apptDate, label: "Clinical note signed", icon: "📝" }); });
  CN.state.appointments.filter(function (a) { return a.clientId === c.id; }).forEach(function (a) {
    events.push({ date: a.date, label: "Appointment " + a.status.toLowerCase(), icon: "📅" });
  });
  c.forms.forEach(function (f) { if (f.status === "Complete") events.push({ date: c.source.split(", ")[1] || CN.SEED.today, label: f.name + " completed", icon: "🗒" }); });
  if (c.billing && c.billing.invoices) c.billing.invoices.forEach(function (i) { events.push({ date: i.date, label: "Invoice " + i.status.toLowerCase() + " — " + CN.util.money(i.amount), icon: "💳" }); });
  events.sort(function (a, b) { return b.date.localeCompare(a.date); });
  if (!events.length) return CN.components.emptyState({ icon: "○", title: "No activity yet", body: "" });
  return '<div class="card"><div class="stack-sm">' + events.map(function (e) {
    return '<div class="list-row"><span aria-hidden="true">' + e.icon + '</span><div class="meta"><div class="title">' + CN.esc(e.label) + "</div><div class=\"sub\">" + CN.util.prettyDate(e.date) + "</div></div></div>";
  }).join("") + "</div></div>";
}

function tabAppointments(c) {
  var appts = CN.state.appointments.filter(function (a) { return a.clientId === c.id; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
  var rows = appts.map(function (a) {
    var svc = CN.lookup.service(a.service);
    return '<tr><td data-label="Date">' + CN.util.prettyDate(a.date) + " " + CN.util.time12(a.time) + '</td><td data-label="Service">' + CN.esc(svc.name) + '</td>' +
      '<td data-label="Format">' + a.format + '</td><td data-label="Status">' + CN.components.statusChip(a.status) + "</td></tr>";
  }).join("");
  return '<div class="row-between mb-4"><h2 class="mb-0">Appointments</h2><button class="btn btn-primary btn-sm" onclick="CN.toast(\'Staff booking flow is outside this Phase 1 prototype.\')">Book Appointment</button></div>' +
    (appts.length ? '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Service</th><th>Format</th><th>Status</th></tr></thead><tbody>' + rows + "</tbody></table></div>" :
      CN.components.emptyState({ icon: "○", title: "No appointments yet", body: "" }));
}

function tabNotes(c) {
  var rows = c.notes.map(function (n) {
    return '<div class="list-row"><div class="meta"><div class="title">' + CN.util.prettyDate(n.apptDate) + " — " + n.template + "</div>" +
      '<div class="sub">' + (n.status === "signed" ? "Signed by " + CN.esc(n.author) + " · " + n.signedAt : "Draft") + "</div></div>" +
      CN.components.statusChip(n.status === "signed" ? "Signed" : "Draft") +
      '<button class="btn btn-secondary btn-sm" onclick="location.hash=\'#/app/clients/' + c.id + "/notes/" + n.id + '\'">View</button></div>';
  }).join("");
  return '<div class="row-between mb-4"><h2 class="mb-0">Clinical Notes</h2><button class="btn btn-primary btn-sm" onclick="CN.actions.newClinicalNote(\'' + c.id + '\')">New Note</button></div>' +
    (c.notes.length ? rows : CN.components.emptyState({ icon: "○", title: "No clinical notes yet", body: "", ctaLabel: "New Note", ctaAction: "CN.actions.newClinicalNote('" + c.id + "')" }));
}

function tabAssessments(c) {
  if (!c.assessments.length) return CN.components.emptyState({ icon: "○", title: "No assessments assigned yet", body: "" });
  return c.assessments.map(function (as) {
    var max = Math.max.apply(null, as.history.map(function (h) { return h.score; }));
    var bars = as.history.map(function (h) {
      var pct = Math.round((h.score / (max || 1)) * 100);
      return '<div class="bar" style="height:' + pct + '%"><span>' + h.score + "</span></div>";
    }).join("");
    return '<div class="card mb-4"><h3>' + as.instrument + '</h3><div class="spark mt-3">' + bars + "</div>" +
      '<div class="row wrap mt-2 text-muted" style="font-size:.78rem">' + as.history.map(function (h) { return "<span>" + CN.util.prettyDate(h.date) + "</span>"; }).join("") + "</div></div>";
  }).join("");
}

function tabPlan(c) {
  var sub = CN.state.ui.planSubview || "plan";
  var active = c.treatmentPlans.filter(function (p) { return p.status === "Active"; });
  var history = c.treatmentPlans.filter(function (p) { return p.status !== "Active"; });

  var subTabs = '<div class="row" style="gap:6px" role="tablist">' +
    '<button class="chip chip-filter" aria-pressed="' + (sub === "plan") + '" onclick="CN.actions.setPlanSubview(\'plan\')">Plan</button>' +
    '<button class="chip chip-filter" aria-pressed="' + (sub === "progress") + '" onclick="CN.actions.setPlanSubview(\'progress\')">Progress &amp; Outcomes</button>' +
    "</div>";

  if (!active.length && !history.length) return CN.components.emptyState({ icon: "○", title: "No treatment plan yet", body: "", ctaLabel: "New Treatment Plan", ctaAction: "CN.toast('Treatment plan authoring is outside this Phase 1 prototype.')" });

  if (!active.length) {
    return subTabs + '<div class="mt-4">' + CN.components.emptyState({ icon: "○", title: "No active treatment plan", body: "This client has no plan currently active. See plan history below." }) + "</div>" +
      ('<details class="mt-4" open><summary style="cursor:pointer;font-weight:600">Plan History (' + history.length + ")</summary>" +
        '<div class="stack mt-3">' + history.map(function (p) {
          return '<div class="card"><div class="row-between"><strong>' + CN.esc(p.label) + "</strong>" + CN.components.statusChip(p.status) + "</div></div>";
        }).join("") + "</div></details>");
  }

  var body = active.map(function (p) {
    if (sub === "plan") {
      return '<div class="card mb-4"><div class="row-between"><h3 class="mb-0">' + CN.esc(p.label) + "</h3>" + CN.components.statusChip(p.status) + "</div>" +
        '<p class="text-muted">Target: ' + CN.util.prettyDate(p.targetDate) + " · Review: " + CN.util.prettyDate(p.reviewDate) + "</p>" +
        '<div class="stack-sm mt-3">' + p.goals.map(function (g) {
          return '<div><div class="row-between"><strong>' + CN.esc(g.text) + "</strong>" + CN.components.statusChip(g.status) + "</div>" +
            '<ul style="margin:4px 0 0;padding-left:18px;color:var(--text-muted);font-size:.88rem">' + g.objectives.map(function (o) { return "<li>" + CN.esc(o) + "</li>"; }).join("") + "</ul></div>";
        }).join("") + "</div></div>";
    }
    return '<div class="card mb-4"><h3>' + CN.esc(p.label) + " — Progress</h3>" +
      '<div class="stack-sm">' + p.goals.map(function (g) {
        return '<div class="row-between"><span>' + CN.esc(g.text) + "</span>" + CN.components.statusChip(g.status) + "</div>";
      }).join("") + "</div>" +
      '<p class="field-hint mt-3">See the Assessments tab for linked outcome-score trends.</p></div>';
  }).join("");

  var historyHtml = history.length ? ('<details class="mt-4"><summary style="cursor:pointer;font-weight:600">Plan History (' + history.length + ")</summary>" +
    '<div class="stack mt-3">' + history.map(function (p) {
      return '<div class="card"><div class="row-between"><strong>' + CN.esc(p.label) + "</strong>" + CN.components.statusChip(p.status) + "</div></div>";
    }).join("") + "</div></details>") : "";

  return subTabs + '<div class="mt-4">' + body + "</div>" + historyHtml;
}
CN.actions.setPlanSubview = function (v) { CN.state.ui.planSubview = v; CN.router.render(); };

function tabForms(c) {
  var outstanding = c.forms.filter(function (f) { return f.status !== "Complete"; });
  var complete = c.forms.filter(function (f) { return f.status === "Complete"; });
  function row(f) {
    return '<div class="list-row"><div class="meta"><div class="title">' + CN.esc(f.name) + "</div><div class=\"sub\">" + CN.esc(f.cycle) + "</div></div>" + CN.components.statusChip(f.status) + "</div>";
  }
  if (!c.forms.length) return CN.components.emptyState({ icon: "○", title: "No forms assigned yet", body: "" });
  return (outstanding.length ? "<h3>Outstanding</h3><div class=\"card mb-4\">" + outstanding.map(row).join("") + "</div>" : "") +
    (complete.length ? "<h3>Completed</h3><div class=\"card\">" + complete.map(row).join("") + "</div>" : "");
}

function tabConsent(c) {
  return '<div class="card"><div class="row-between"><div><strong>' + c.consent.status + " · " + c.consent.version + '</strong>' +
    '<div class="text-muted">Signed ' + CN.util.prettyDate(c.consent.date) + "</div></div>" +
    (c.consent.status !== "Signed" ? '<button class="btn btn-primary btn-sm" onclick="CN.toast(\'Signature request sent (demo).\')">Request Signature</button>' : "") +
    "</div></div>";
}

function tabDocuments(c) {
  if (!c.documents.length) return CN.components.emptyState({ icon: "○", title: "No documents yet", body: "Upload a document to get started.", ctaLabel: "Upload Document", ctaAction: "CN.toast('Upload is outside this Phase 1 prototype.')" });
  return '<div class="card">' + c.documents.map(function (d) {
    return '<div class="list-row"><div class="meta"><div class="title">' + CN.esc(d.name) + "</div><div class=\"sub\">Uploaded by " + CN.esc(d.uploadedBy) + " · " + CN.util.prettyDate(d.date) + "</div></div></div>";
  }).join("") + "</div>";
}

function tabMessages(c) {
  var thread = c.messages.map(function (m) {
    return '<div class="list-row" style="' + (m.from === "staff" ? "flex-direction:row-reverse;text-align:right" : "") + '"><div class="meta"><div class="title">' + CN.esc(m.text) + "</div><div class=\"sub\">" + m.time + "</div></div></div>";
  }).join("");
  return '<div class="card">' + (c.messages.length ? thread : CN.components.emptyState({ icon: "○", title: "No messages yet", body: "" })) +
    '<form class="row mt-4" onsubmit="return CN.actions.sendMessage(event, \'' + c.id + '\')">' +
    '<input type="text" id="msg-input" placeholder="Write a secure message…" aria-label="Message" style="flex:1">' +
    '<button class="btn btn-primary" type="submit">Send</button></form></div>';
}
CN.actions.sendMessage = function (ev, clientId) {
  ev.preventDefault();
  var input = document.getElementById("msg-input");
  var text = input.value.trim();
  if (!text) return false;
  var c = CN.lookup.client(clientId);
  c.messages.push({ id: "m" + Date.now(), from: "staff", text: text, time: "Just now" });
  CN.toast("Message sent.");
  CN.router.render();
  return false;
};

function tabBilling(c, role) {
  if (role === "therapist") {
    return '<div class="card"><div class="row-between"><span class="text-muted">Current balance</span><strong style="font-size:1.3rem">' + CN.util.money(c.billing.balance) + "</strong></div>" +
      '<p class="field-hint mt-2">Invoice detail and editing are limited to Billing Staff and Admin.</p></div>';
  }
  return '<div class="card row-between mb-4"><span class="text-muted">Current balance</span><strong style="font-size:1.3rem">' + CN.util.money(c.billing.balance) + "</strong></div>" +
    '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Service</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>' +
    c.billing.invoices.map(function (i) {
      return '<tr><td data-label="Date">' + CN.util.prettyDate(i.date) + '</td><td data-label="Service">' + CN.esc(i.service) + '</td><td data-label="Amount">' + CN.util.money(i.amount) + '</td>' +
        '<td data-label="Status">' + CN.components.statusChip(i.status) + '</td><td>' + (i.status !== "Paid" ? '<button class="btn btn-secondary btn-sm" onclick="CN.toast(\'Payment recorded (demo).\')">Record Payment</button>' : "") + "</td></tr>";
    }).join("") + "</tbody></table></div>";
}

/* ---------- 15. Clinical Note editor ---------- */
var NOTE_TEMPLATES = {
  SOAP: ["Subjective", "Objective", "Assessment", "Plan"],
  DAP: ["Data", "Assessment", "Plan"],
  BIRP: ["Behavior", "Intervention", "Response", "Plan"],
  GIRP: ["Goal", "Intervention", "Response", "Plan"],
  Narrative: ["Narrative Note"],
  Custom: ["Summary", "Additional Notes"]
};

CN.actions.newClinicalNote = function (clientId, apptId) {
  CN.state.noteDraft = { clientId: clientId, apptId: apptId || null, template: "SOAP", fields: {}, linkedGoals: [] };
  location.hash = "#/app/clients/" + clientId + "/note/new";
};

CN.views.clinicalNoteEditor = function (clientId) {
  var c = CN.lookup.client(clientId);
  if (!CN.state.noteDraft || CN.state.noteDraft.clientId !== clientId) {
    CN.state.noteDraft = { clientId: clientId, apptId: null, template: "SOAP", fields: {}, linkedGoals: [] };
  }
  var draft = CN.state.noteDraft;
  var fields = NOTE_TEMPLATES[draft.template];

  var templatePicker = '<div class="template-picker" role="group" aria-label="Documentation style">' +
    Object.keys(NOTE_TEMPLATES).map(function (t) {
      return '<button class="template-chip" aria-pressed="' + (draft.template === t) + '" onclick="CN.actions.setNoteTemplate(\'' + t + '\')">' + t + "</button>";
    }).join("") + "</div>";

  var fieldInputs = fields.map(function (f) {
    return '<div class="field"><label for="nf-' + f + '">' + f + '</label><textarea id="nf-' + f + '" data-field="' + f + '">' + CN.esc(draft.fields[f] || "") + "</textarea></div>";
  }).join("");

  var activePlan = c.treatmentPlans.filter(function (p) { return p.status === "Active"; })[0];
  var goalsPanel = "";
  if (activePlan) {
    goalsPanel = '<div class="card mt-5"><h3>Link goals from this client&rsquo;s treatment plan</h3>' +
      activePlan.goals.map(function (g) {
        var checked = draft.linkedGoals.indexOf(g.id) !== -1;
        return '<label class="goal-link-row"><input type="checkbox" ' + (checked ? "checked" : "") + ' onchange="CN.actions.toggleGoalLink(\'' + g.id + '\')"> ' + CN.esc(g.text) + "</label>";
      }).join("") + "</div>";
  }

  var body =
    '<div class="row-between"><h1 class="mb-0">New Clinical Note — ' + CN.esc(c.name) + "</h1>" +
    '<a href="#/app/clients/' + c.id + '?tab=notes">Cancel</a></div>' +
    '<p class="text-muted">Choose a documentation style, then complete the note.</p>' +
    templatePicker +
    '<form onsubmit="return false" id="note-form">' + fieldInputs + "</form>" +
    goalsPanel +
    '<div class="row mt-6">' +
    '<button class="btn btn-secondary" onclick="CN.actions.saveNoteDraft()">Save Draft</button>' +
    '<button class="btn btn-primary" onclick="CN.actions.openSignModal()">Sign &amp; Lock</button>' +
    "</div>";

  return CN.components.appShell("clients", body);
};
CN.actions.setNoteTemplate = function (t) {
  CN.actions.captureNoteFields();
  CN.state.noteDraft.template = t;
  CN.state.noteDraft.fields = {};
  CN.router.render();
};
CN.actions.captureNoteFields = function () {
  var form = document.getElementById("note-form");
  if (!form) return;
  form.querySelectorAll("textarea").forEach(function (t) {
    CN.state.noteDraft.fields[t.getAttribute("data-field")] = t.value;
  });
};
CN.actions.toggleGoalLink = function (goalId) {
  CN.actions.captureNoteFields();
  var idx = CN.state.noteDraft.linkedGoals.indexOf(goalId);
  if (idx === -1) CN.state.noteDraft.linkedGoals.push(goalId); else CN.state.noteDraft.linkedGoals.splice(idx, 1);
};
CN.actions.saveNoteDraft = function () {
  CN.actions.captureNoteFields();
  CN.toast("Draft saved.");
};

/* ---------- 16. Sign Clinical Note (confirmation modal) ---------- */
CN.actions.openSignModal = function () {
  CN.actions.captureNoteFields();
  var html =
    '<h2>Sign &amp; lock this note?</h2>' +
    '<p>Signing locks this note permanently — it cannot be edited afterward, by you or anyone else. If something needs to be added later, you&rsquo;ll create a separate, independently-signed addendum.</p>' +
    '<div class="row mt-5">' +
    '<button class="btn btn-secondary" onclick="CN.actions.closeModal()">Keep Editing</button>' +
    '<button class="btn btn-primary" onclick="CN.actions.confirmSignNote()">Sign &amp; Lock Note</button>' +
    "</div>";
  CN.modal(html);
};
CN.actions.confirmSignNote = function () {
  var draft = CN.state.noteDraft;
  var c = CN.lookup.client(draft.clientId);
  var user = CN.state.auth.user;
  var note = {
    id: "note-" + Date.now(), apptDate: CN.SEED.today, template: draft.template, status: "signed",
    author: user.name, signedAt: CN.util.prettyDate(CN.SEED.today) + ", just now",
    fields: draft.fields, linkedGoals: draft.linkedGoals.slice(), addenda: []
  };
  c.notes.unshift(note);
  CN.state.noteDraft = null;
  CN.actions.closeModal();
  CN.toast("Note signed and locked.");
  location.hash = "#/app/clients/" + c.id + "/notes/" + note.id;
};

/* ---------- 17. Signed Note / Addendum state ---------- */
CN.views.signedNote = function (clientId, noteId) {
  var c = CN.lookup.client(clientId);
  var note = c.notes.find(function (n) { return n.id === noteId; });
  if (!note) return CN.components.appShell("clients", CN.components.emptyState({ icon: "?", title: "Note not found", body: "" }));

  var fieldsHtml = Object.keys(note.fields).map(function (k) {
    return "<h3>" + k + "</h3><p>" + CN.esc(note.fields[k]).replace(/\n/g, "<br>") + "</p>";
  }).join("");

  var goalsHtml = "";
  if (note.linkedGoals && note.linkedGoals.length) {
    var activePlan = c.treatmentPlans.filter(function (p) { return p.status === "Active"; })[0];
    var names = (activePlan ? activePlan.goals : []).filter(function (g) { return note.linkedGoals.indexOf(g.id) !== -1; }).map(function (g) { return g.text; });
    goalsHtml = '<div class="mt-4"><strong>Linked goals:</strong> ' + names.map(function (n) { return CN.components.badge(n, "primary"); }).join(" ") + "</div>";
  }

  var addendaHtml = (note.addenda || []).map(function (a) {
    return '<div class="addendum-block"><div class="meta">Addendum · Signed by ' + CN.esc(a.author) + " · " + CN.esc(a.timestamp) + "</div><p class=\"mb-0\">" + CN.esc(a.text) + "</p></div>";
  }).join("");

  var addForm = CN.state.ui.addendumOpen ?
    '<div class="card mt-4"><h3>New addendum</h3>' +
    '<textarea id="addendum-text" placeholder="Add clarifying information…"></textarea>' +
    '<div class="row mt-3"><button class="btn btn-secondary" onclick="CN.actions.cancelAddendum()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="CN.actions.addAddendum(\'' + c.id + '\',\'' + note.id + '\')">Add &amp; Sign Addendum</button></div></div>' :
    '<button class="btn btn-secondary mt-4" onclick="CN.actions.startAddendum()">Add Addendum</button>';

  var body =
    '<div class="row-between"><h1 class="mb-0">' + note.template + " Note — " + CN.esc(c.name) + "</h1>" +
    '<a href="#/app/clients/' + c.id + '?tab=notes">Back to Notes</a></div>' +
    '<div class="row mt-2">' + CN.components.statusChip("Signed") +
    '<span class="text-muted">Signed by ' + CN.esc(note.author) + " on " + CN.esc(note.signedAt) + "</span></div>" +
    CN.components.banner("info", "This note is permanently locked.", "The content below cannot be edited by anyone, including the author. Corrections are added as a separate, independently-signed addendum.", "🔒") +
    '<div class="card mt-4">' + fieldsHtml + goalsHtml + "</div>" +
    "<h2 class=\"mt-6\">Addenda</h2>" +
    (addendaHtml || '<p class="text-muted">No addenda yet.</p>') +
    addForm;

  return CN.components.appShell("clients", body);
};
CN.actions.startAddendum = function () { CN.state.ui.addendumOpen = true; CN.router.render(); };
CN.actions.cancelAddendum = function () { CN.state.ui.addendumOpen = false; CN.router.render(); };
CN.actions.addAddendum = function (clientId, noteId) {
  var text = document.getElementById("addendum-text").value.trim();
  if (!text) { CN.toast("Enter addendum text first."); return; }
  var c = CN.lookup.client(clientId);
  var note = c.notes.find(function (n) { return n.id === noteId; });
  note.addenda.push({ id: "add-" + Date.now(), author: CN.state.auth.user.name, timestamp: "Just now", text: text });
  CN.state.ui.addendumOpen = false;
  CN.toast("Addendum signed and added.");
  CN.router.render();
};
