const token = localStorage.getItem("eudyaan_admin_token") || "";
const adminEmail = localStorage.getItem("eudyaan_admin_email") || "";

if (!token) {
  window.location.href = "./admin-login.html";
}

const identityNode = document.getElementById("adminIdentity");
const summaryGrid = document.getElementById("summaryGrid");
const riskAlertsBody = document.getElementById("riskAlertsBody");
const chatsBody = document.getElementById("chatsBody");
const communityBody = document.getElementById("communityBody");
const contactsBody = document.getElementById("contactsBody");
const appointmentsBody = document.getElementById("appointmentsBody");
const riskSourceFilter = document.getElementById("riskSourceFilter");
const refreshBtn = document.getElementById("adminRefreshBtn");
const logoutBtn = document.getElementById("adminLogoutBtn");
const updatedAtNode = document.getElementById("dashboardUpdatedAt");
const RISK_SOURCE_FILTER_KEY = "eudyaan_admin_risk_source_filter";

identityNode.textContent = adminEmail ? `Signed in as ${adminEmail}` : "Signed in as admin";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function userLabel(user, userId, anonymousId) {
  if (user?.name || user?.email) {
    return `${user.name || ""}${user.email ? ` (${user.email})` : ""}`.trim();
  }
  if (userId) return `UserID: ${userId}`;
  if (anonymousId) return `Anon: ${anonymousId}`;
  return "-";
}

async function apiGet(path) {
  const separator = path.includes("?") ? "&" : "?";
  const freshPath = `${path}${separator}_=${Date.now()}`;
  const response = await fetch(freshPath, { headers: authHeaders(), cache: "no-store" });
  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    data = {};
  }
  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

function setTableLoading(tableBody, colCount) {
  tableBody.innerHTML = `<tr><td colspan="${colCount}">Loading...</td></tr>`;
}

function setUpdatedNow() {
  if (!updatedAtNode) return;
  updatedAtNode.textContent = `Last updated: ${new Date().toLocaleString()}`;
}

function updateRiskFilterLabels(summary) {
  if (!riskSourceFilter) return;
  const totalCount = Number(summary?.riskAlerts || 0);
  const aiCount = Number(summary?.riskAlertsAiAssistantChatbot || 0);
  const communityCount = Number(summary?.riskAlertsCommunity || 0);
  const options = Array.from(riskSourceFilter.options || []);
  const allOption = options.find((opt) => opt.value === "all");
  const aiOption = options.find((opt) => opt.value === "ai_assistant_chatbot");
  const communityOption = options.find((opt) => opt.value === "community");
  if (allOption) allOption.textContent = `All Sources (${totalCount})`;
  if (aiOption) aiOption.textContent = `AI Assistant Chatbot (${aiCount})`;
  if (communityOption) communityOption.textContent = `Community (${communityCount})`;
}

function renderSummary(summary) {
  const entries = [
    ["Users", summary.users],
    ["Community Posts", summary.communityPosts],
    ["Chats", summary.chats],
    ["Serious Chats", summary.seriousChats],
    ["Risk Alerts", summary.riskAlerts],
    ["Risk Alerts (AI)", summary.riskAlertsAiAssistantChatbot],
    ["Risk Alerts (Community)", summary.riskAlertsCommunity],
    ["Contact Messages", summary.contactMessages],
    ["Appointments", summary.appointments]
  ];

  summaryGrid.innerHTML = entries
    .map(([label, value]) => `
      <div class="stat-box">
        <div class="stat-label">${esc(label)}</div>
        <div class="stat-value">${esc(value)}</div>
      </div>
    `)
    .join("");
}

function renderRiskAlerts(items) {
  if (!items.length) {
    const selected = riskSourceFilter?.value === "community"
      ? "Community"
      : (riskSourceFilter?.value === "ai_assistant_chatbot" ? "AI Assistant Chatbot" : "All Sources");
    riskAlertsBody.innerHTML = `<tr><td colspan="7">No risk alerts found for ${esc(selected)}.</td></tr>`;
    return;
  }

  const riskTypeLabel = (item) => {
    const category = String(item?.riskCategory || "").toLowerCase();
    if (category === "violence") return "VIOLENCE";
    if (category === "self_harm") return "SELF_HARM";
    return "HIGH_RISK";
  };

  const sourceLabel = (item) => item.sourceType === "ai_assistant_chatbot" ? "AI Assistant Chatbot" : "Community";
  riskAlertsBody.innerHTML = items
    .map((item) => `
      <tr>
        <td>${esc(formatDate(item.createdAt))}</td>
        <td>${esc(sourceLabel(item))}</td>
        <td>${esc(userLabel(item.user, item.userId, item.anonymousId))}</td>
        <td>${esc(item.anonymousId || "-")}</td>
        <td>${esc(item.triggerTerm || "risk_pattern")}</td>
        <td>${esc(riskTypeLabel(item))}</td>
        <td>${esc(item.message || "")}</td>
      </tr>
    `)
    .join("");
}

function renderChats(items) {
  chatsBody.innerHTML = items
    .map((item) => `
      <tr>
        <td>${esc(formatDate(item.createdAt))}</td>
        <td>${esc(userLabel(item.user, item.userId, ""))}</td>
        <td>${esc(item.language || "english")}</td>
        <td>
          <span class="badge ${item.serious ? "red" : "green"}">
            ${item.serious ? "Yes" : "No"}
          </span>
        </td>
        <td>${esc(item.message || "")}</td>
        <td>${esc(item.reply || "")}</td>
      </tr>
    `)
    .join("");
}

function renderCommunity(items) {
  communityBody.innerHTML = items
    .map((item) => {
      const rowId = item.type === "reply" ? item.replyId : item.postId;
      return `
        <tr>
          <td>${esc(formatDate(item.createdAt))}</td>
          <td>${esc(item.type || "-")}</td>
          <td>${esc(userLabel(item.user, item.userId, item.anonymousId))}</td>
          <td>${esc(item.anonymousId || "-")}</td>
          <td>${esc(rowId || "-")}</td>
          <td>${esc(item.content || item.title || "")}</td>
        </tr>
      `;
    })
    .join("");
}

function renderContacts(items) {
  contactsBody.innerHTML = items
    .map((item) => `
      <tr>
        <td>${esc(formatDate(item.createdAt))}</td>
        <td>${esc(`${item.firstName || ""} ${item.lastName || ""}`.trim())}</td>
        <td>${esc(item.email || "-")}</td>
        <td>${esc(item.phone || "-")}</td>
        <td>${esc(item.message || "")}</td>
      </tr>
    `)
    .join("");
}

function renderAppointments(items) {
  appointmentsBody.innerHTML = items
    .map((item) => `
      <tr>
        <td>${esc(formatDate(item.createdAt))}</td>
        <td>${esc(userLabel(item.user, item.userId, ""))}</td>
        <td>${esc(item.consultantName || "-")}</td>
        <td>${esc(item.consultantRole || "-")}</td>
        <td>${esc(item.sessionType || "-")}</td>
        <td>${esc(item.date || "-")}</td>
        <td>${esc(item.time || "-")}</td>
      </tr>
    `)
    .join("");
}

async function verifySession() {
  try {
    await apiGet("/api/auth/admin/me");
    return true;
  } catch (error) {
    localStorage.removeItem("eudyaan_admin_token");
    localStorage.removeItem("eudyaan_admin_email");
    window.location.href = "./admin-login.html";
    return false;
  }
}

async function loadDashboard() {
  const valid = await verifySession();
  if (!valid) return;

  refreshBtn.disabled = true;
  refreshBtn.textContent = "Refreshing...";
  setTableLoading(riskAlertsBody, 7);
  setTableLoading(chatsBody, 6);
  setTableLoading(communityBody, 6);
  setTableLoading(contactsBody, 5);
  setTableLoading(appointmentsBody, 7);

  try {
    const selectedRiskSource = riskSourceFilter?.value || "all";
    const [summaryData, chatsData, riskData, communityData, contactsData, appointmentsData] = await Promise.all([
      apiGet("/api/admin/dashboard/summary"),
      apiGet("/api/admin/dashboard/chats?limit=200"),
      apiGet(`/api/admin/dashboard/risk-alerts?limit=200&sourceType=${encodeURIComponent(selectedRiskSource)}`),
      apiGet("/api/admin/dashboard/community?limit=200"),
      apiGet("/api/admin/dashboard/contacts?limit=200"),
      apiGet("/api/admin/dashboard/appointments?limit=200")
    ]);

    renderSummary(summaryData.summary || {});
    updateRiskFilterLabels(summaryData.summary || {});
    renderChats(chatsData.chats || []);
    renderRiskAlerts(riskData.riskAlerts || []);
    renderCommunity(communityData.community || []);
    renderContacts(contactsData.contacts || []);
    renderAppointments(appointmentsData.appointments || []);
    setUpdatedNow();
  } catch (error) {
    alert(error.message || "Failed to load dashboard data.");
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Refresh";
  }
}

const savedRiskSourceFilter = localStorage.getItem(RISK_SOURCE_FILTER_KEY);
if (savedRiskSourceFilter === "all" || savedRiskSourceFilter === "ai_assistant_chatbot" || savedRiskSourceFilter === "community") {
  riskSourceFilter.value = savedRiskSourceFilter;
}

refreshBtn.addEventListener("click", loadDashboard);
riskSourceFilter?.addEventListener("change", () => {
  localStorage.setItem(RISK_SOURCE_FILTER_KEY, riskSourceFilter.value);
  loadDashboard();
});

logoutBtn.addEventListener("click", async () => {
  try {
    await fetch("/api/auth/admin/logout", {
      method: "POST",
      headers: authHeaders()
    });
  } catch (error) {
  } finally {
    localStorage.removeItem("eudyaan_admin_token");
    localStorage.removeItem("eudyaan_admin_email");
    window.location.href = "./admin-login.html";
  }
});

loadDashboard();
