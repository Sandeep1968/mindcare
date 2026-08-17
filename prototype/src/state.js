/*
 * CareNexa Wireframe Prototype — In-memory application state.
 * No localStorage/cookies/network — everything resets on page reload.
 * This is intentional: the prototype demonstrates flow and layout only.
 */
window.CN = window.CN || {};

CN.state = {};

CN.state.reset = function () {
  CN.state.clients = CN.clone(CN.SEED.clients);
  CN.state.appointments = CN.clone(CN.SEED.appointments);
  CN.state.therapists = CN.clone(CN.SEED.therapists);

  CN.state.booking = {
    serviceId: null,
    format: null,
    therapistId: null,
    date: null,
    time: null,
    contact: { name: "", email: "", phone: "", newClient: true },
    payerType: "Self-Pay",
    conflictDemoUsed: false
  };

  CN.state.auth = {
    loggedIn: false,
    mfaVerified: false,
    user: null,
    loginError: "",
    mfaError: ""
  };

  CN.state.demo = {
    role: "therapist",          // therapist | receptionist | billing
    showRestrictedCalendar: false,
    panelOpen: false
  };

  CN.state.ui = {
    toastMessage: "",
    toastTimer: null,
    loadedOnce: {},      // tracks which "heavy" screens have shown their loading-state demo this session
    planSubview: "plan",
    addendumOpen: false
  };

  CN.state.noteDraft = null; // in-progress clinical note being authored
};

CN.state.reset();
