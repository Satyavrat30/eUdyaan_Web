const loginBtn = document.getElementById("adminLoginBtn");
const emailInput = document.getElementById("adminEmail");
const passwordInput = document.getElementById("adminPassword");
const errorBox = document.getElementById("adminLoginError");

function setError(message) {
  errorBox.textContent = message || "";
}

loginBtn.addEventListener("click", async () => {
  setError("");
  const email = String(emailInput.value || "").trim();
  const password = String(passwordInput.value || "").trim();

  if (!email || !password) {
    setError("Email and password are required.");
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    const response = await fetch("/api/auth/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok || !data?.success || !data?.token) {
      setError(data?.error || "Invalid admin credentials.");
      return;
    }

    localStorage.setItem("eudyaan_admin_token", data.token);
    localStorage.setItem("eudyaan_admin_email", data?.admin?.email || email);
    window.location.href = "./admin-dashboard.html";
  } catch (error) {
    setError("Login failed. Please try again.");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
});
