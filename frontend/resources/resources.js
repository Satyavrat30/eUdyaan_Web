const RESOURCE_DATA = {
  articles: [
    {
      type: "article",
      badge: "Article",
      time: "WHO Resource",
      title: "Anxiety Disorders (WHO Fact Sheet)",
      action: "Read More",
      content: "Anxiety disorders are common and treatable. Signs include constant worry, panic, fear in social settings, and physical symptoms like fast heartbeat. Early support, routine sleep, movement, and talking to a professional can reduce symptoms."
    },
    {
      type: "article",
      badge: "Article",
      time: "WHO Resource",
      title: "Depression (WHO Fact Sheet)",
      action: "Read More",
      content: "Depression is more than feeling low for a day. It can affect mood, motivation, sleep, appetite, and concentration. Helpful first steps: keep a simple daily routine, stay connected, and seek support early when symptoms continue."
    },
    {
      type: "article",
      badge: "Article",
      time: "6 min read",
      title: "Exam Stress: What To Do 7 Days Before",
      action: "Read More",
      content: "Use a 7-day plan: divide topics, practice timed revision, sleep consistently, and avoid last-night cramming. Keep 2 short breaks per study block. Reduce anxiety by focusing on the next small task, not the full syllabus."
    },
    {
      type: "article",
      badge: "Article",
      time: "5 min read",
      title: "Loneliness in College: Small Daily Fixes",
      action: "Read More",
      content: "Loneliness improves with tiny repeat actions: greet one classmate, join one club event weekly, and message one trusted person daily. Build low-pressure social contact first, deep friendships later."
    },
    {
      type: "article",
      badge: "Article",
      time: "7 min read",
      title: "Healthy Relationship Boundaries on Campus",
      action: "Read More",
      content: "Say needs clearly, avoid silent resentment, and set digital boundaries during study time. If conflict rises, pause and return when calm. Respectful boundaries reduce stress and improve trust."
    },
    {
      type: "article",
      badge: "Article",
      time: "4 min read",
      title: "Sleep Reset for Overthinking Nights",
      action: "Read More",
      content: "Try a fixed sleep window, no heavy scrolling 30 minutes before bed, and a simple wind-down ritual. Keep a short worry list on paper, then return to slow breathing."
    }
  ],
  videos: [
    {
      type: "video",
      badge: "Video",
      time: "8 min",
      title: "Breathing for Anxiety Relief",
      action: "Watch Now",
      embedUrl: "https://www.youtube.com/embed/aNXKjGFUlMs"
    },
    {
      type: "video",
      badge: "Video",
      time: "10 min",
      title: "5-4-3-2-1 Grounding Technique",
      action: "Watch Now",
      embedUrl: "https://www.youtube.com/embed/30VMIEmA114"
    },
    {
      type: "video",
      badge: "Video",
      time: "9 min",
      title: "Progressive Muscle Relaxation",
      action: "Watch Now",
      embedUrl: "https://www.youtube.com/embed/1nZEdqcGVzo"
    },
    {
      type: "video",
      badge: "Video",
      time: "7 min",
      title: "Quick Calm Routine Before Exams",
      action: "Watch Now",
      embedUrl: "https://www.youtube.com/embed/hnpQrMqDoqE"
    },
    {
      type: "video",
      badge: "Video",
      time: "11 min",
      title: "Sleep Meditation for Students",
      action: "Watch Now",
      embedUrl: "https://www.youtube.com/embed/ZToicYcHIOU"
    },
    {
      type: "video",
      badge: "Video",
      time: "6 min",
      title: "How to Stop Overthinking",
      action: "Watch Now",
      embedUrl: "https://www.youtube.com/embed/xN_lA6hJx7E"
    }
  ],
  audios: [
    {
      type: "audio",
      badge: "Exercise",
      time: "3 min",
      title: "Box Breathing (4-4-4-4)",
      action: "Try Now",
      content: "Sit comfortably. Inhale 4 counts, hold 4, exhale 4, hold 4. Repeat for 8 rounds. Keep shoulders relaxed and jaw soft."
    },
    {
      type: "audio",
      badge: "Exercise",
      time: "5 min",
      title: "5-4-3-2-1 Grounding",
      action: "Try Now",
      content: "Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, and 1 you taste. This helps pull your mind out of panic spirals."
    },
    {
      type: "audio",
      badge: "Exercise",
      time: "4 min",
      title: "Thought Dump for Overthinking",
      action: "Try Now",
      content: "Write all worries fast for 2 minutes. Circle only one issue you can act on today. Pick one small step and do it now."
    },
    {
      type: "audio",
      badge: "Exercise",
      time: "6 min",
      title: "Mini Body Scan Reset",
      action: "Try Now",
      content: "Close your eyes. Move attention slowly from head to toes. Notice tension areas and release each with a long exhale."
    },
    {
      type: "audio",
      badge: "Exercise",
      time: "5 min",
      title: "Relationship Conflict Cool-Down",
      action: "Try Now",
      content: "Pause 10 breaths. Write: what happened, what I felt, what I need. Then send one calm message using 'I feel... I need...'."
    },
    {
      type: "audio",
      badge: "Exercise",
      time: "4 min",
      title: "Study Restart After Burnout",
      action: "Try Now",
      content: "Set a 15-minute timer. Study only one micro-topic. Take a 5-minute break. Repeat twice. Small consistency beats long pressure."
    }
  ]
};
const CHAT_STORAGE_KEY = "eudyaan_student_chat_state";
const WELLNESS_REPORT_KEY = "eudyaan_student_wellness_report";

const articleCards = document.getElementById("article-cards");
const videoCards = document.getElementById("video-cards");
const audioCards = document.getElementById("audio-cards");

const modal = document.getElementById("resource-modal");
const modalTitle = document.getElementById("modal-title");
const modalContent = document.getElementById("modal-content");
const modalClose = document.getElementById("modal-close");

const chatBox = document.getElementById("assistant-chat");
const assistantForm = document.getElementById("assistant-form");
const assistantInput = document.getElementById("assistant-input");
const moodQuick = document.getElementById("mood-quick");
const reportBtn = document.getElementById("report-btn");
const downloadReportBtn = document.getElementById("download-report-btn");
const clearChatBtn = document.getElementById("clear-chat-btn");
const reportView = document.getElementById("report-view");

const backendHost = window.location.hostname || "localhost";
const API_BASE = (window.location.port === "5000" || window.location.protocol === "file:")
  ? (window.location.protocol === "file:" ? "http://localhost:5000" : "")
  : `http://${backendHost}:5000`;
const profile = window.EudyaanSession?.getProfile?.() || null;
const currentUserId = profile?.id || "";

function requireLoginForFeature() {
  if (currentUserId) return true;
  window.EudyaanSession?.redirectToLogin?.();
  return false;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeEmbedUrl(url) {
  try {
    const parsed = new URL(String(url || ""));
    const allowedHosts = new Set(["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"]);
    if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname) || !parsed.pathname.startsWith("/embed/")) {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

const MOOD_PATTERNS = {
  happy: ["happy", "good", "fine", "better", "calm"],
  sad: ["sad", "down", "low", "cry", "empty"],
  anxious: ["anxious", "anxiety", "panic", "overthink", "nervous"],
  stressed: ["stress", "stressed", "pressure", "burnout", "overwhelmed"],
  angry: ["angry", "frustrated", "irritated", "mad"],
  confused: ["confused", "lost", "unclear", "stuck"],
  tired: ["tired", "exhausted", "drained", "sleepy"]
};

const ISSUE_PATTERNS = {
  academics: ["exam", "assignment", "grades", "study", "attendance"],
  depression: ["depress", "hopeless", "worthless", "no interest"],
  anxiety: ["anxious", "panic", "worry", "fear"],
  relationship: ["breakup", "relationship", "partner", "boyfriend", "girlfriend"],
  family: ["family", "parents", "home"],
  loneliness: ["alone", "lonely", "isolated"],
  sleep: ["sleep", "insomnia", "night", "rest"],
  self_esteem: ["confidence", "self-esteem", "not enough", "compare"]
};

const CRISIS_PATTERNS = [
  /\bquit life\b/i,
  /\bquit living\b/i,
  /\bend it all\b/i,
  /no reason to live/i,
  /kill myself/i,
  /end my life/i,
  /self[- ]?harm/i,
  /i want to die/i,
  /hurt myself/i,
  /suicide/i
];

function getEmptyState() {
  return {
    createdAt: new Date().toISOString(),
    history: [],
    moodTimeline: [],
    issueCounts: {},
    keyPoints: [],
    seriousCount: 0,
    criticalEvents: []
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return getEmptyState();
    const parsed = JSON.parse(raw);
    return { ...getEmptyState(), ...parsed };
  } catch {
    return getEmptyState();
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
}

function renderCards(list, container, badgeClass) {
  container.innerHTML = list
    .map((item, index) => {
      return `
      <div class="card">
        <span class="badge ${escapeHtml(badgeClass)}">${escapeHtml(item.badge)}</span>
        <span class="time">${escapeHtml(item.time)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <button type="button" data-group="${escapeHtml(container.id)}" data-index="${index}">-> ${escapeHtml(item.action)}</button>
      </div>`;
    })
    .join("");
}

function getItemBySource(groupId, index) {
  const map = {
    "article-cards": RESOURCE_DATA.articles,
    "video-cards": RESOURCE_DATA.videos,
    "audio-cards": RESOURCE_DATA.audios
  };

  const source = map[groupId];
  if (!source || index < 0 || index >= source.length) return null;
  return source[index];
}

function openResource(item) {
  if (!item) return;
  modalTitle.textContent = item.title;

  if (item.embedUrl) {
    const embedUrl = sanitizeEmbedUrl(item.embedUrl);
    modalContent.innerHTML = embedUrl
      ? `<iframe class="embed-frame" src="${embedUrl}" allowfullscreen></iframe>`
      : `<p class="resource-text">Video is unavailable right now.</p>`;
  } else {
    modalContent.innerHTML = `<p class="resource-text">${escapeHtml(item.content || "Content will be added soon.")}</p>`;
  }

  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  modalContent.innerHTML = "";
}

function detectCriticalTerm(text) {
  const value = String(text || "");
  for (const pattern of CRISIS_PATTERNS) {
    const match = value.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function registerCriticalEvent(source, text, term) {
  state.criticalEvents.push({
    at: new Date().toISOString(),
    source,
    term,
    text
  });
  if (state.criticalEvents.length > 20) {
    state.criticalEvents = state.criticalEvents.slice(-20);
  }
  saveState();
}

function renderMessage(role, text, critical = false) {
  const div = document.createElement("div");
  div.className = `msg ${role}${critical ? " critical" : ""}`;
  div.textContent = critical ? `[RED ALERT] ${text}` : text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMessage(role, text, persist = true, critical = false) {
  renderMessage(role, text, critical);

  if (persist && (role === "user" || role === "ai")) {
    const mappedRole = role === "ai" ? "assistant" : "user";
    state.history.push({ role: mappedRole, content: text, critical });
    if (state.history.length > 20) {
      state.history = state.history.slice(-20);
    }
    saveState();
  }
}

function includesAny(text, list) {
  return list.some((word) => text.includes(word));
}

function extractMoods(message) {
  const text = message.toLowerCase();
  const moods = [];

  Object.entries(MOOD_PATTERNS).forEach(([mood, words]) => {
    if (includesAny(text, words)) {
      moods.push(mood);
    }
  });

  return moods;
}

function extractIssues(message) {
  const text = message.toLowerCase();
  const issues = [];

  Object.entries(ISSUE_PATTERNS).forEach(([issue, words]) => {
    if (includesAny(text, words)) {
      issues.push(issue);
    }
  });

  return issues;
}

function trackStudentState(message) {
  const moods = extractMoods(message);
  const issues = extractIssues(message);

  moods.forEach((mood) => {
    state.moodTimeline.push({ mood, at: new Date().toISOString() });
  });

  issues.forEach((issue) => {
    state.issueCounts[issue] = (state.issueCounts[issue] || 0) + 1;
  });

  if (moods.length || issues.length) {
    state.keyPoints.push({
      at: new Date().toISOString(),
      message,
      moods,
      issues
    });
  }

  if (state.keyPoints.length > 30) {
    state.keyPoints = state.keyPoints.slice(-30);
  }

  saveState();
}

function generateReportData() {
  const topIssues = Object.entries(state.issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, count]) => `${issue} (${count})`);

  const recentMoods = state.moodTimeline.slice(-8).map((m) => `${m.mood} @ ${m.at}`);
  const importantPoints = state.keyPoints.slice(-8).map((item) => ({
    at: item.at,
    moods: item.moods,
    issues: item.issues,
    userText: item.message
  }));

  return {
    createdAt: state.createdAt,
    updatedAt: new Date().toISOString(),
    totalMessages: state.history.length,
    seriousCount: state.seriousCount,
    topIssues,
    recentMoods,
    importantPoints,
    criticalEvents: state.criticalEvents.slice(-10)
  };
}

function saveReportSnapshot() {
  const report = generateReportData();
  localStorage.setItem(WELLNESS_REPORT_KEY, JSON.stringify(report));
}

function formatReportText(report) {
  const topIssuesText = report.topIssues.length ? report.topIssues.join(", ") : "No clear issue pattern yet";
  const moodsText = report.recentMoods.length ? report.recentMoods.join("\n- ") : "No mood trend captured yet";
  const importantPointsText = report.importantPoints.length
    ? report.importantPoints.map((p, i) => `${i + 1}. ${p.userText}`).join("\n")
    : "No key points captured yet";
  const alertText = report.criticalEvents.length
    ? report.criticalEvents.map((a, i) => `${i + 1}. [${a.source}] term: "${a.term}" at ${a.at}\n   text: ${a.text}`).join("\n")
    : "No red alerts detected.";

  return `THIS IS REPORT
Created: ${report.createdAt}
Updated: ${report.updatedAt}

Summary
- Total messages: ${report.totalMessages}
- Serious alerts count: ${report.seriousCount}
- Top issues: ${topIssuesText}

Mood Timeline
- ${moodsText}

Important Chat Points
${importantPointsText}

RED ALERT EVENTS
${alertText}
`;
}

function showReport() {
  const report = generateReportData();
  saveReportSnapshot();
  reportView.classList.remove("hidden");
  reportView.textContent = formatReportText(report);
  reportView.classList.toggle("report-critical", report.seriousCount > 0);
}

function downloadReport() {
  const report = generateReportData();
  const blob = new Blob([formatReportText(report)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wellness-report-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function clearSession() {
  state = getEmptyState();
  localStorage.removeItem(CHAT_STORAGE_KEY);
  localStorage.removeItem(WELLNESS_REPORT_KEY);
  chatBox.innerHTML = "";
  reportView.classList.add("hidden");
  reportView.textContent = "";
  appendMessage("ai", "Session cleared. How is your mood right now?", false);
}

function isClearCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === "clear" || normalized === "delete" || normalized === "exit";
}

async function askAi(message) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/ai/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, message, history: state.history })
    });
  } catch {
    throw new Error("Cannot reach backend server.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.error || "AI request failed";
    const details = data?.details ? ` ${data.details}` : "";
    throw new Error(`${errorMessage}${details}`);
  }

  return data;
}

async function handleUserMessage(message) {
  if (!message) return;

  if (isClearCommand(message)) {
    clearSession();
    return;
  }

  const userCriticalTerm = detectCriticalTerm(message);
  appendMessage("user", message, true, Boolean(userCriticalTerm));
  if (userCriticalTerm) {
    registerCriticalEvent("user", message, userCriticalTerm);
  }
  trackStudentState(message);
  saveReportSnapshot();

  try {
    const result = await askAi(message);
    const reply = result.reply || "I could not generate a response right now.";
    const aiCriticalTerm = detectCriticalTerm(reply);
    const aiCritical = Boolean(result.serious || aiCriticalTerm);
    appendMessage("ai", reply, true, aiCritical);
    if (aiCriticalTerm) {
      registerCriticalEvent("assistant", reply, aiCriticalTerm);
    }

    if (aiCritical) {
      state.seriousCount += 1;
      saveState();
    }
    saveReportSnapshot();
  } catch (error) {
    const text = String(error.message || "");
    if (text.includes("Too many requests")) {
      appendMessage("ai", "You are sending requests too fast. Please wait a moment and try again.");
    } else if (text.includes("Server is busy")) {
      appendMessage("ai", "Server is currently busy. Please try again in a minute.");
    } else
    if (text.includes("Cannot reach backend")) {
      appendMessage("ai", "I cannot connect to server. Start backend: cd backend && npm start");
    } else if (text.includes("GROQ_API_KEY")) {
      appendMessage("ai", "Groq key missing. Add GROQ_API_KEY in backend/.env and restart server.");
    } else if (text.includes("Groq request failed")) {
      const cleaned = text.replace("Groq request failed", "").trim();
      appendMessage("ai", `Groq API failed. ${cleaned || "Check key, model, internet, or Groq quota."}`);
    } else {
      appendMessage("ai", "Temporary issue. Please try again.");
    }
  }
}

renderCards(RESOURCE_DATA.articles, articleCards, "article");
renderCards(RESOURCE_DATA.videos, videoCards, "video");
renderCards(RESOURCE_DATA.audios, audioCards, "audio");

[articleCards, videoCards, audioCards].forEach((container) => {
  container.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-index]");
    if (!button) return;

    const index = Number(button.dataset.index);
    const item = getItemBySource(button.dataset.group, index);
    openResource(item);
  });
});

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

assistantForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireLoginForFeature()) return;
  const message = assistantInput.value.trim();
  assistantInput.value = "";
  await handleUserMessage(message);
});

moodQuick.addEventListener("click", async (event) => {
  if (!requireLoginForFeature()) return;
  const button = event.target.closest("button[data-mood]");
  if (!button) return;
  const mood = button.getAttribute("data-mood");
  await handleUserMessage(`My mood is ${mood}.`);
});

reportBtn.addEventListener("click", () => {
  if (!requireLoginForFeature()) return;
  showReport();
});
downloadReportBtn.addEventListener("click", () => {
  if (!requireLoginForFeature()) return;
  downloadReport();
});
clearChatBtn.addEventListener("click", () => {
  if (!requireLoginForFeature()) return;
  clearSession();
});

if (window.location.hash === "#report") {
  if (!requireLoginForFeature()) {
    // Redirect triggered by session helper.
  } else {
  const existingReport = localStorage.getItem(WELLNESS_REPORT_KEY);
  if (existingReport) {
    try {
      reportView.classList.remove("hidden");
      const parsed = JSON.parse(existingReport);
      reportView.textContent = formatReportText(parsed);
      reportView.classList.toggle("report-critical", parsed.seriousCount > 0);
    } catch {
      showReport();
    }
  } else {
    showReport();
  }
  }
}

if (state.history.length) {
  state.history.forEach((item) => {
    const role = item.role === "assistant" ? "ai" : "user";
    renderMessage(role, item.content, Boolean(item.critical));
  });
} else {
  appendMessage("ai", "Hey, I am here with you. Talk freely in your own words, and we will handle one step at a time.", false);
}

