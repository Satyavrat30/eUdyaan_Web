const API_BASE = "";

const steps = document.querySelectorAll(".step");
const indicators = document.querySelectorAll(".steps span");
const bookingSummary = document.getElementById("bookingSummary");
const appointmentHistory = document.getElementById("appointmentHistory");

let currentStep = 0;
let calendarDate = new Date();
let selectedDateIso = "";
let selectedDateLabel = "";
let isSubmittingBooking = false;

function getProfileOrRedirect() {
  const profile = window.EudyaanSession?.getProfile?.() || null;
  const sessionToken = window.EudyaanSession?.getSessionToken?.() || "";
  if (profile?.id && sessionToken) return profile;
  window.EudyaanSession?.redirectToLogin?.();
  return null;
}

async function fetchJson(url, options = {}) {
  const authHeaders = window.EudyaanSession?.getAuthHeaders?.() || {};
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...authHeaders
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

function showStep(index) {
  steps.forEach((step) => step.classList.remove("active"));
  indicators.forEach((indicator) => indicator.classList.remove("active"));
  steps[index].classList.add("active");
  indicators[index].classList.add("active");
  currentStep = index;
}

function getSelectedTherapist() {
  const selected = document.querySelector(".doctor-grid .doctor-card.selected");
  if (!selected) return null;

  return {
    consultantName: selected.dataset.therapistName || selected.querySelector("h4")?.textContent?.trim() || "",
    consultantRole: selected.dataset.therapistRole || selected.querySelector("p")?.textContent?.trim() || ""
  };
}

function getSelectedTime() {
  const selected = document.querySelector(".times .time.selected");
  return selected?.dataset.time || selected?.textContent?.trim() || "";
}

function getSelectedAppointmentType() {
  const selected = document.querySelector(".type-grid .type-card.selected");
  return selected?.dataset.appointmentType || selected?.querySelector("h4")?.textContent?.trim() || "";
}

function formatDateForDisplay(isoValue) {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function renderHistoryItems(items) {
  if (!appointmentHistory) return;

  if (!items.length) {
    appointmentHistory.innerHTML = "<p>No appointments found yet.</p>";
    return;
  }

  appointmentHistory.innerHTML = items.map((item) => {
    const when = `${formatDateForDisplay(item.appointmentDate)} • ${item.appointmentTime}`;
    const cancelled = item.status === "cancelled";
    return `
      <article class="history-item" data-appointment-id="${item.id}">
        <h4>${item.consultantName}</h4>
        <p>${item.consultantRole}</p>
        <p>${item.appointmentType} • ${when}</p>
        <p>Status: ${cancelled ? "Cancelled" : "Scheduled"}</p>
        ${cancelled ? "" : '<button type="button" class="cancel-booking">Cancel Appointment</button>'}
      </article>
    `;
  }).join("");
}

async function loadAppointmentHistory() {
  const profile = getProfileOrRedirect();
  if (!profile?.id || !appointmentHistory) return;

  appointmentHistory.innerHTML = "<p>Loading your appointments...</p>";

  try {
    const data = await fetchJson(`${API_BASE}/api/appointments`);
    renderHistoryItems(data.appointments || []);
  } catch (error) {
    appointmentHistory.innerHTML = `<p>Unable to load appointments: ${error.message}</p>`;
  }
}

async function createBooking() {
  const profile = getProfileOrRedirect();
  if (!profile?.id) return null;

  const therapist = getSelectedTherapist();
  const appointmentTime = getSelectedTime();
  const appointmentType = getSelectedAppointmentType();

  if (!therapist?.consultantName || !therapist.consultantRole) {
    alert("Please choose a therapist before confirming.");
    return null;
  }

  if (!selectedDateIso) {
    alert("Please choose a date before continuing.");
    return null;
  }

  if (!appointmentTime) {
    alert("Please choose a time slot before continuing.");
    return null;
  }

  if (!appointmentType) {
    alert("Please choose appointment type before confirming.");
    return null;
  }

  if (isSubmittingBooking) return null;
  isSubmittingBooking = true;

  try {
    const data = await fetchJson(`${API_BASE}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consultantName: therapist.consultantName,
        consultantRole: therapist.consultantRole,
        appointmentType,
        appointmentDate: selectedDateIso,
        appointmentTime
      })
    });

    const booked = data.appointment;
    if (bookingSummary && booked) {
      bookingSummary.textContent = `${booked.consultantName} (${booked.consultantRole}) • ${booked.appointmentType} • ${formatDateForDisplay(booked.appointmentDate)} at ${booked.appointmentTime}`;
    }

    return booked || null;
  } catch (error) {
    alert(`Unable to confirm booking: ${error.message}`);
    return null;
  } finally {
    isSubmittingBooking = false;
  }
}

document.querySelectorAll(".next").forEach((btn) => {
  btn.onclick = async () => {
    const targetStep = currentStep + 1;

    if (currentStep === 0 && targetStep === 1) {
      const therapist = getSelectedTherapist();
      if (!therapist) {
        alert("Please choose a therapist before continuing.");
        return;
      }

      if (!getProfileOrRedirect()) {
        return;
      }
    }

    if (currentStep === 1 && targetStep === 2) {
      if (!selectedDateIso) {
        alert("Please choose a date before continuing.");
        return;
      }

      if (!getSelectedTime()) {
        alert("Please choose a time slot before continuing.");
        return;
      }
    }

    if (currentStep === 2 && targetStep === 3) {
      if (!getProfileOrRedirect()) {
        return;
      }

      const booked = await createBooking();
      if (!booked) {
        return;
      }
      showStep(targetStep);
      await loadAppointmentHistory();
      return;
    }

    showStep(targetStep);
  };
});

document.querySelectorAll(".back").forEach((btn) => {
  btn.onclick = () => showStep(currentStep - 1);
});

document.querySelectorAll(".selectable").forEach((element) => {
  element.onclick = () => {
    element.parentElement
      .querySelectorAll(".selectable")
      .forEach((item) => item.classList.remove("selected"));
    element.classList.add("selected");
  };
});

const monthYear = document.getElementById("monthYear");
const datesContainer = document.getElementById("calendarDates");

function renderCalendar() {
  datesContainer.innerHTML = "";
  selectedDateIso = "";
  selectedDateLabel = "";

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  monthYear.innerText = calendarDate.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i += 1) {
    datesContainer.innerHTML += "<span></span>";
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const span = document.createElement("span");
    const iso = new Date(year, month, day).toISOString();
    span.innerText = String(day);
    span.dataset.dateIso = iso;
    span.onclick = () => {
      document.querySelectorAll(".dates span")
        .forEach((item) => item.classList.remove("active"));
      span.classList.add("active");
      selectedDateIso = span.dataset.dateIso || "";
      selectedDateLabel = formatDateForDisplay(selectedDateIso);
    };
    datesContainer.appendChild(span);
  }
}

renderCalendar();

document.getElementById("prevMonth").onclick = () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
};

appointmentHistory?.addEventListener("click", async (event) => {
  const button = event.target.closest(".cancel-booking");
  if (!button) return;

  const row = button.closest("[data-appointment-id]");
  const appointmentId = row?.dataset.appointmentId || "";
  if (!appointmentId) return;

  const profile = getProfileOrRedirect();
  if (!profile?.id) return;

  try {
    await fetchJson(`${API_BASE}/api/appointments/${appointmentId}`, {
      method: "DELETE"
    });
    await loadAppointmentHistory();
  } catch (error) {
    alert(`Unable to cancel appointment: ${error.message}`);
  }
});
