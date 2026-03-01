const USER_KEY = "eudyaan_user_profile";
const REPORT_KEY = "eudyaan_student_wellness_report";

function parseJson(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function makeAnonymousId(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const code = String(hash % 1000000).padStart(6, "0");
  return `ANON-${code}`;
}

function getProfile() {
  const profile = parseJson(localStorage.getItem(USER_KEY), null);
  if (!profile) return null;

  if (!profile.anonymousId) {
    const seed = profile.email || profile.name || "student";
    profile.anonymousId = makeAnonymousId(seed);
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
  }

  return profile;
}

function getReportLink() {
  const inSubdir = /\/(resources|community|appointment|about|contact)\//.test(window.location.pathname);
  const prefix = inSubdir ? "../" : "./";
  return `${prefix}resources/resources.html#report`;
}

function getHomeLink() {
  const inSubdir = /\/(resources|community|appointment|about|contact)\//.test(window.location.pathname);
  return inSubdir ? "../index.html" : "./index.html";
}

function getLoginLink() {
  const inSubdir = /\/(resources|community|appointment|about|contact)\//.test(window.location.pathname);
  return inSubdir ? "../login.html" : "./login.html";
}

function getCurrentRelativePath() {
  const path = `${window.location.pathname || "/"}${window.location.search || ""}${window.location.hash || ""}`;
  return path.startsWith("/") ? path : `/${path}`;
}

function redirectToLogin() {
  const loginLink = getLoginLink();
  const next = encodeURIComponent(getCurrentRelativePath());
  window.location.href = `${loginLink}?next=${next}`;
}

function requireLogin(options = {}) {
  const profile = getProfile();
  if (profile?.id) return profile;
  if (options.redirect !== false) {
    redirectToLogin();
  }
  return null;
}

function renderAuthArea() {
  const authEl = document.querySelector(".auth");
  if (!authEl) return;

  const profile = getProfile();
  if (!profile) return;

  const report = parseJson(localStorage.getItem(REPORT_KEY), null);
  const reportCount = report?.importantPoints?.length || 0;
  const firstLetter = (profile.name || "U").trim().charAt(0).toUpperCase();

  authEl.classList.add("profile-auth");
  authEl.innerHTML = `
    <button class="profile-toggle" id="profileToggle" type="button">
      <span class="profile-avatar">${firstLetter}</span>
      <span>Profile</span>
    </button>
    <div class="profile-menu hidden" id="profileMenu">
      <h4>${profile.name || "Student"}</h4>
      <p>${profile.email || "No email"}</p>
      <p><strong>Anonymous ID:</strong> ${profile.anonymousId}</p>
      <a href="${getReportLink()}">View Chat Report (${reportCount})</a>
      <button id="logoutBtn" type="button" class="logout-btn">Logout</button>
    </div>
  `;

  const toggle = document.getElementById("profileToggle");
  const menu = document.getElementById("profileMenu");
  const logoutBtn = document.getElementById("logoutBtn");

  toggle.addEventListener("click", () => {
    menu.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!authEl.contains(event.target)) {
      menu.classList.add("hidden");
    }
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(USER_KEY);
    window.location.href = getHomeLink();
  });
}

function injectStyles() {
  if (document.getElementById("profile-auth-style")) return;

  const style = document.createElement("style");
  style.id = "profile-auth-style";
  style.textContent = `
    .profile-auth { position: relative; }
    .profile-toggle {
      border: none;
      background: #5f6f52;
      color: #fff;
      border-radius: 20px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .profile-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #ffffff;
      color: #334155;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
    }
    .profile-menu {
      position: absolute;
      right: 0;
      top: 42px;
      width: 260px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
      padding: 12px;
      z-index: 2000;
    }
    .profile-menu h4 {
      margin: 0 0 6px;
      color: #111827;
    }
    .profile-menu p {
      margin: 5px 0;
      font-size: 13px;
      color: #475569;
      word-break: break-word;
    }
    .profile-menu a {
      display: inline-block;
      margin-top: 8px;
      color: #1d4ed8;
      text-decoration: none;
      font-size: 13px;
    }
    .logout-btn {
      display: block;
      margin-top: 10px;
      border: none;
      background: #fee2e2;
      color: #b91c1c;
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

injectStyles();
renderAuthArea();

window.EudyaanSession = {
  getProfile,
  requireLogin,
  redirectToLogin
};
