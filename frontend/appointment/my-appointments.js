const API_BASE = window.location.protocol === "file:" ? "http://localhost:5000" : "";

const appointmentsList = document.getElementById("appointmentsList");

function getProfileOrRedirect() {
  const profile = window.EudyaanSession?.getProfile?.() || null;
  if (profile?.id) return profile;
  window.EudyaanSession?.redirectToLogin?.();
  return null;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

function formatDate(dateValue) {
  const value = new Date(dateValue);
  if (Number.isNaN(value.getTime())) return "";
  return value.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function renderAppointments(items) {
  if (!items.length) {
    appointmentsList.innerHTML = "<p>You have no appointments yet.</p>";
    return;
  }

  appointmentsList.innerHTML = items.map((item) => {
    const cancelled = item.status === "cancelled";
    const bookedOn = formatDate(item.createdAt);
    return `
      <article class="appointment-card" data-appointment-id="${item.id}">
        <h3>${item.consultantName}</h3>
        <p>${item.consultantRole}</p>
        <p>${item.appointmentType} • ${formatDate(item.appointmentDate)} at ${item.appointmentTime}</p>
        <p>Status: ${cancelled ? "Cancelled" : "Scheduled"}</p>
        <p>Booked on: ${bookedOn}</p>
        <div class="card-actions">
          ${cancelled ? "" : '<button type="button" class="cancel-btn">Cancel Appointment</button>'}
        </div>
      </article>
    `;
  }).join("");
}

async function loadAppointments() {
  const profile = getProfileOrRedirect();
  if (!profile?.id) return;

  appointmentsList.innerHTML = "<p>Loading appointments...</p>";

  try {
    const data = await fetchJson(`${API_BASE}/api/appointments?userId=${encodeURIComponent(profile.id)}`);
    renderAppointments(data.appointments || []);
  } catch (error) {
    appointmentsList.innerHTML = `<p>Unable to load appointments: ${error.message}</p>`;
  }
}

appointmentsList.addEventListener("click", async (event) => {
  const button = event.target.closest(".cancel-btn");
  if (!button) return;

  const row = button.closest("[data-appointment-id]");
  const appointmentId = row?.dataset.appointmentId || "";
  if (!appointmentId) return;

  const profile = getProfileOrRedirect();
  if (!profile?.id) return;

  try {
    await fetchJson(`${API_BASE}/api/appointments/${appointmentId}?userId=${encodeURIComponent(profile.id)}`, {
      method: "DELETE"
    });
    await loadAppointments();
  } catch (error) {
    alert(`Unable to cancel appointment: ${error.message}`);
  }
});

loadAppointments();
