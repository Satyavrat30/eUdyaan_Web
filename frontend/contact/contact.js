const API_BASE = window.location.protocol === "file:" ? "http://localhost:5000" : "";

const form = document.getElementById("contactForm");
const statusEl = document.getElementById("contactMessage");

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b91c1c" : "#166534";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const profile = window.EudyaanSession?.getProfile?.() || null;
  if (!profile?.id) {
    setStatus("Please login to send a message.", true);
    window.EudyaanSession?.redirectToLogin?.();
    return;
  }

  const payload = {
    userId: profile.id,
    firstName: document.getElementById("firstName").value.trim(),
    lastName: document.getElementById("lastName").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    message: document.getElementById("message").value.trim()
  };

  if (!payload.firstName || !payload.lastName || !payload.email || !payload.message) {
    setStatus("Please fill all required fields.", true);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/contact/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Failed to send message");
    }
    form.reset();
    setStatus("Message sent successfully. We will reach out soon.");
  } catch (error) {
    setStatus(error.message || "Unable to submit message right now.", true);
  }
});
