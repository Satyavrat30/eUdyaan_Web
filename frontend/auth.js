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

const signupBtn = document.getElementById("signupBtn");
if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const firstName = document.getElementById("firstName")?.value.trim() || "";
    const lastName = document.getElementById("lastName")?.value.trim() || "";
    const email = document.getElementById("signupEmail")?.value.trim() || "";
    const password = document.getElementById("signupPassword")?.value.trim() || "";

    const name = `${firstName} ${lastName}`.trim();

    if (!name || !email || !password) {
      setMessage("Please fill name, email, and password.", true);
      return;
    }

    try {
      const result = await postJson(`${API_BASE}/api/auth/signup`, { name, email, password });
      if (result.success) {
        setMessage("Signup successful. Redirecting to login...");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 800);
      } else {
        setMessage(result.message || "Signup failed.", true);
      }
    } catch (error) {
      setMessage(error.message || "Signup failed.", true);
    }
  });
}

const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail")?.value.trim() || "";
    const password = document.getElementById("loginPassword")?.value.trim() || "";

    if (!email || !password) {
      setMessage("Please enter email and password.", true);
      return;
    }

    try {
      const result = await postJson(`${API_BASE}/api/auth/login`, { email, password });
      if (result.success) {
        saveLoggedInProfile(result.user || { email, name: email.split("@")[0] });
        setMessage("Login successful. Redirecting to home...");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 800);
      } else {
        setMessage(result.message || "Invalid credentials.", true);
      }
    } catch (error) {
      setMessage(error.message || "Login failed.", true);
    }
  });
}
