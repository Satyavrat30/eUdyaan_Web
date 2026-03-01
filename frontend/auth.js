const backendHost = window.location.hostname || "localhost";
const API_BASE = window.location.port === "5000" ? "" : `http://${backendHost}:5000`;
const USER_KEY = "eudyaan_user_profile";

function makeAnonymousId(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const code = String(hash % 1000000).padStart(6, "0");
  return `ANON-${code}`;
}

function saveLoggedInProfile(user) {
  const name = user?.name || "Student";
  const email = user?.email || "";
  const seed = user?.id || email || name;
  const profile = {
    id: user?.id || "",
    name,
    email,
    anonymousId: makeAnonymousId(seed),
    lastLoginAt: new Date().toISOString()
  };
  localStorage.setItem(USER_KEY, JSON.stringify(profile));
}

function setMessage(text, isError = false) {
  const messageEl = document.getElementById("authMessage");
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.style.color = isError ? "#b91c1c" : "#166534";
}

function getSafeNextPath() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "";
  if (!next.startsWith("/") || next.startsWith("//")) {
    return "index.html";
  }
  return next;
}

// Password strength checker
function checkPasswordStrength(password) {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
}

function renderStrengthBar(password) {
  const bar = document.getElementById("passwordStrengthBar");
  const label = document.getElementById("passwordStrengthLabel");
  if (!bar || !label) return;

  const { score } = checkPasswordStrength(password);
  const levels = ["", "Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const colors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

  bar.style.width = `${(score / 5) * 100}%`;
  bar.style.background = colors[score] || "#e2e8f0";
  label.textContent = password.length > 0 ? levels[score] : "";
  label.style.color = colors[score] || "#94a3b8";
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const text = data?.error || data?.message || "Request failed";
    throw new Error(text);
  }
  return data;
}

// SIGNUP
const signupBtn = document.getElementById("signupBtn");
if (signupBtn) {
  // Attach strength bar listener
  const pwInput = document.getElementById("signupPassword");
  if (pwInput) {
    pwInput.addEventListener("input", () => renderStrengthBar(pwInput.value));
  }

  signupBtn.addEventListener("click", async () => {
    const firstName = document.getElementById("firstName")?.value.trim() || "";
    const lastName = document.getElementById("lastName")?.value.trim() || "";
    const email = document.getElementById("signupEmail")?.value.trim() || "";
    const password = document.getElementById("signupPassword")?.value || "";
    const confirmPassword = document.getElementById("confirmPassword")?.value || "";

    const name = `${firstName} ${lastName}`.trim();

    if (!name || !email || !password) {
      setMessage("Please fill name, email, and password.", true);
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      setMessage("Passwords do not match.", true);
      return;
    }

    try {
      const result = await postJson(`${API_BASE}/api/auth/signup`, { name, email, password });
      if (result.success) {
        if (result.emailSent) {
          setMessage("Account created! Please check your email to verify before logging in.");
        } else {
          setMessage("Signup successful! Redirecting to login...");
          setTimeout(() => { window.location.href = "login.html"; }, 1200);
        }
      } else {
        setMessage(result.message || "Signup failed.", true);
      }
    } catch (error) {
      setMessage(error.message || "Signup failed.", true);
    }
  });
}

// LOGIN
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail")?.value.trim() || "";
    const password = document.getElementById("loginPassword")?.value || "";

    if (!email || !password) {
      setMessage("Please enter email and password.", true);
      return;
    }

    try {
      const result = await postJson(`${API_BASE}/api/auth/login`, { email, password });
      if (result.success) {
        saveLoggedInProfile(result.user || { email, name: email.split("@")[0] });
        setMessage("Login successful! Redirecting...");
        setTimeout(() => { window.location.href = getSafeNextPath(); }, 800);
      } else {
        if (result.notRegistered) {
          const msgEl = document.getElementById("authMessage");
          if (msgEl) {
            msgEl.innerHTML = `No account found with this email. <a href="signup.html" style="color:#1d4ed8;font-weight:bold;">Register here</a>`;
            msgEl.style.color = "#b91c1c";
          }
        } else {
          setMessage(result.message || "Invalid credentials.", true);
        }
      }
    } catch (error) {
      setMessage(error.message || "Login failed.", true);
    }
  });
}

// FORGOT PASSWORD
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener("click", async () => {
    const email = document.getElementById("forgotEmail")?.value.trim() || "";
    if (!email) { setMessage("Please enter your email.", true); return; }
    try {
      const result = await postJson(`${API_BASE}/api/auth/forgot-password`, { email });
      setMessage(result.message || "Reset link sent.", false);
    } catch (error) {
      setMessage(error.message || "Request failed.", true);
    }
  });
}

// RESET PASSWORD
const resetPasswordBtn = document.getElementById("resetPasswordBtn");
if (resetPasswordBtn) {
  const pwInput = document.getElementById("newPassword");
  if (pwInput) pwInput.addEventListener("input", () => renderStrengthBar(pwInput.value));

  resetPasswordBtn.addEventListener("click", async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
    const newPassword = document.getElementById("newPassword")?.value || "";
    const confirmPassword = document.getElementById("confirmNewPassword")?.value || "";

    if (!token) { setMessage("Invalid reset link.", true); return; }
    if (!newPassword) { setMessage("Please enter a new password.", true); return; }
    if (confirmPassword && newPassword !== confirmPassword) { setMessage("Passwords do not match.", true); return; }

    try {
      const result = await postJson(`${API_BASE}/api/auth/reset-password`, { token, newPassword });
      if (result.success) {
        setMessage(result.message + " Redirecting to login...");
        setTimeout(() => { window.location.href = "login.html"; }, 1500);
      } else {
        setMessage(result.message || "Reset failed.", true);
      }
    } catch (error) {
      setMessage(error.message || "Reset failed.", true);
    }
  });
}

// Show verified banner on login page
if (window.location.pathname.includes("login.html")) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("verified") === "1") {
    setMessage("Email verified! You can now login.");
  }
}
