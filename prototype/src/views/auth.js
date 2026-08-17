/*
 * CareNexa Wireframe Prototype — Authentication views
 * Journey B, screens 9–10: Login, MFA Verification.
 * No real authentication — credentials are checked against local mock data only.
 */
window.CN = window.CN || {};
CN.views = CN.views || {};

function authPage(bodyHtml) {
  return (
    '<div class="auth-wrap"><div class="auth-card">' +
    '<a class="brand mb-0" href="#/" style="margin-bottom:20px"><span class="brand-mark" aria-hidden="true">CN</span>CareNexa</a>' +
    bodyHtml +
    "</div></div>"
  );
}

/* ---------- 9. Login ---------- */
CN.views.login = function () {
  var err = CN.state.auth.loginError;
  var body =
    "<h1>Staff Sign In</h1>" +
    '<p class="text-muted mt-0">Access your CareNexa workspace.</p>' +
    (err ? CN.components.banner("danger", "Incorrect email or password", "Double-check your details and try again.", "⚠") : "") +
    '<form onsubmit="return CN.actions.doLogin(event)" novalidate class="mt-4">' +
    '<div class="field"><label for="li-email">Email</label><input id="li-email" type="email" autocomplete="username" required></div>' +
    '<div class="field"><label for="li-pass">Password</label><input id="li-pass" type="password" autocomplete="current-password" required></div>' +
    '<button class="btn btn-primary btn-block" type="submit">Log In</button>' +
    '<p class="mt-4" style="text-align:center"><a href="#" onclick="CN.toast(\'Password reset is outside Phase 1 of this prototype.\'); return false;">Forgot password?</a></p>' +
    "</form>" +
    '<div class="demo-hint">' +
    "<strong>Prototype demo credentials</strong><br>" +
    "Email: " + CN.SEED.staffUser.email + "<br>Password: " + CN.SEED.staffUser.password +
    "</div>";
  return authPage(body);
};
CN.actions.doLogin = function (ev) {
  ev.preventDefault();
  var email = document.getElementById("li-email").value.trim();
  var pass = document.getElementById("li-pass").value;
  var u = CN.SEED.staffUser;
  if (email.toLowerCase() === u.email && pass === u.password) {
    CN.state.auth.loginError = "";
    CN.state.auth.user = { id: u.id, role: u.role, name: u.name, initials: "MH", color: "#4C7C74" };
    location.hash = "#/mfa";
  } else {
    CN.state.auth.loginError = "Incorrect email or password.";
    CN.router.render();
  }
  return false;
};

/* ---------- 10. MFA Verification ---------- */
CN.views.mfa = function () {
  if (!CN.state.auth.user) { location.hash = "#/login"; return ""; }
  var err = CN.state.auth.mfaError;
  var body =
    "<h1>Verify it's you</h1>" +
    '<p class="text-muted mt-0">Enter the 6-digit code sent to your phone ending in &bull;&bull;21.</p>' +
    (err ? CN.components.banner("danger", "Incorrect code", "You have attempts remaining. Please try again.", "⚠") : "") +
    '<form onsubmit="return CN.actions.doMfa(event)" novalidate class="mt-4">' +
    '<div class="field"><label for="mfa-code">Verification code</label>' +
    '<input id="mfa-code" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required></div>' +
    '<button class="btn btn-primary btn-block" type="submit">Verify</button>' +
    '<p class="mt-4" style="text-align:center"><a href="#" onclick="CN.toast(\'A new code has been sent (demo).\'); return false;">Resend code</a></p>' +
    "</form>" +
    '<div class="demo-hint">For this prototype, enter code <strong>' + CN.SEED.staffUser.mfaCode + "</strong></div>";
  return authPage(body);
};
CN.actions.doMfa = function (ev) {
  ev.preventDefault();
  var code = document.getElementById("mfa-code").value.trim();
  if (code === CN.SEED.staffUser.mfaCode) {
    CN.state.auth.loggedIn = true;
    CN.state.auth.mfaVerified = true;
    CN.state.auth.mfaError = "";
    CN.toast("Welcome back, " + CN.state.auth.user.name + ".");
    location.hash = "#/app/dashboard";
  } else {
    CN.state.auth.mfaError = "Incorrect code.";
    CN.router.render();
  }
  return false;
};
