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
const CHAT_STORAGE_KEY_BASE = "eudyaan_student_chat_state";
const WELLNESS_REPORT_KEY_BASE = "eudyaan_student_wellness_report";

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
const assistantLanguageSelect = document.getElementById("assistant-language");
const moodQuick = document.getElementById("mood-quick");
const assistantStatus = document.getElementById("assistant-status");
const reportBtn = document.getElementById("report-btn");
const downloadReportBtn = document.getElementById("download-report-btn");
const downloadReportJsonBtn = document.getElementById("download-report-json-btn");
const clearChatBtn = document.getElementById("clear-chat-btn");
const reportView = document.getElementById("report-view");

const backendHost = window.location.hostname || "localhost";
const API_BASE = (window.location.port === "5000" || window.location.protocol === "file:")
  ? (window.location.protocol === "file:" ? "http://localhost:5000" : "")
  : `http://${backendHost}:5000`;
const HELPLINE_CALL_NUMBER = "9152987821";
const CONSULT_DOCTOR_LINK = "../appointment/appointment.html";
const profile = window.EudyaanSession?.getProfile?.() || null;
const currentUserId = profile?.id || "";
const CHAT_STORAGE_KEY = `${CHAT_STORAGE_KEY_BASE}:${currentUserId || "guest"}`;
const WELLNESS_REPORT_KEY = `${WELLNESS_REPORT_KEY_BASE}:${currentUserId || "guest"}`;

const CHAT_LABELS = {
  english: {
    welcome: "Hey, I am here with you. Talk freely in your own words, and we will handle one step at a time.",
    sessionCleared: "Session cleared. How is your mood right now?",
    crisisGuidance: "This sounds very heavy, and you do not have to handle it alone. Please call a trusted person or your college counsellor right now, then contact a helpline immediately.",
    violenceGuidance: "I cannot help with hurting anyone. Please step away from the situation now, take 10 slow breaths, and call a trusted person or counsellor immediately. If you may lose control, call 112 right now.",
    tooFast: "You are sending requests too fast. Please wait a moment and try again.",
    serverBusy: "Server is currently busy. Please try again in a minute.",
    cannotReach: "I cannot connect to server. Start backend: cd backend && npm start",
    keyMissing: "Groq key missing. Add GROQ_API_KEY in backend/.env and restart server.",
    groqFailedPrefix: "Groq API failed.",
    groqFailedFallback: "Check key, model, internet, or Groq quota.",
    temporaryIssue: "Temporary issue. Please try again.",
    fallbackReply: "I could not generate a response right now."
  },
  hinglish: {
    welcome: "Hey, main aapke saath hoon. Aap apne words mein freely baat karo, hum step by step handle karenge.",
    sessionCleared: "Session clear ho gaya. Abhi aapka mood kaisa hai?",
    crisisGuidance: "Aap abhi bahut heavy feel kar rahe ho, aur aapko ye akela handle nahi karna hai. Abhi turant kisi trusted person ya college counsellor ko call karo, phir helpline se baat karo.",
    violenceGuidance: "Main kisi ko nuksan pahunchane mein help nahi kar sakta. Abhi situation se thoda door ho jao, 10 deep breaths lo, aur turant trusted person ya counsellor ko call karo. Control slip ho raha ho to 112 call karo.",
    tooFast: "Aap bahut fast requests bhej rahe ho. Thoda wait karke phir try karo.",
    serverBusy: "Server abhi busy hai. Ek minute baad try karo.",
    cannotReach: "Main server se connect nahi kar pa raha. Backend start karo: cd backend && npm start",
    keyMissing: "Groq key missing hai. backend/.env me GROQ_API_KEY add karke server restart karo.",
    groqFailedPrefix: "Groq API fail hua.",
    groqFailedFallback: "Key, model, internet, ya Groq quota check karo.",
    temporaryIssue: "Temporary issue aaya hai. Please dobara try karo.",
    fallbackReply: "Abhi response generate nahi ho paaya."
  },
  hindi: {
    welcome: "मैं आपके साथ हूँ। आप अपने शब्दों में खुलकर बात करें, हम एक-एक कदम साथ में संभालेंगे।",
    sessionCleared: "सेशन साफ़ हो गया। अभी आपका मूड कैसा है?",
    crisisGuidance: "यह बहुत भारी लग सकता है, और आपको इसे अकेले नहीं संभालना है। अभी किसी भरोसेमंद व्यक्ति या कॉलेज काउंसलर को कॉल करें, फिर तुरंत हेल्पलाइन से बात करें।",
    violenceGuidance: "मैं किसी को नुकसान पहुँचाने में मदद नहीं कर सकता। कृपया तुरंत स्थिति से दूर जाएँ, 10 गहरी साँस लें, और किसी भरोसेमंद व्यक्ति या काउंसलर को कॉल करें। अगर नियंत्रण छूटने का डर हो तो तुरंत 112 पर कॉल करें।",
    tooFast: "आप बहुत तेज़ी से रिक्वेस्ट भेज रहे हैं। कृपया थोड़ा रुककर फिर कोशिश करें।",
    serverBusy: "सर्वर अभी व्यस्त है। कृपया एक मिनट बाद फिर कोशिश करें।",
    cannotReach: "मैं सर्वर से कनेक्ट नहीं कर पा रहा हूँ। बैकएंड शुरू करें: cd backend && npm start",
    keyMissing: "Groq key नहीं मिली। backend/.env में GROQ_API_KEY जोड़कर सर्वर रीस्टार्ट करें।",
    groqFailedPrefix: "Groq API विफल हुई।",
    groqFailedFallback: "Key, model, internet, या Groq quota जाँचें।",
    temporaryIssue: "अस्थायी समस्या आई है। कृपया फिर कोशिश करें।",
    fallbackReply: "अभी जवाब तैयार नहीं हो पाया।"
  }
};

const SUPPORTED_CHAT_LANGUAGES = new Set([
  "english",
  "hinglish",
  "hindi",
  "bengali",
  "telugu",
  "marathi",
  "tamil",
  "urdu",
  "gujarati",
  "kannada",
  "malayalam",
  "odia",
  "punjabi",
  "assamese"
]);

function requireLoginForFeature() {
  if (currentUserId) return true;
  window.EudyaanSession?.redirectToLogin?.();
  return false;
}

function detectConversationLanguage(text) {
  const value = String(text || "");

  if (/[\u0C00-\u0C7F]/.test(value)) return "telugu";
  if (/[\u0B80-\u0BFF]/.test(value)) return "tamil";
  if (/[\u0C80-\u0CFF]/.test(value)) return "kannada";
  if (/[\u0D00-\u0D7F]/.test(value)) return "malayalam";
  if (/[\u0A80-\u0AFF]/.test(value)) return "gujarati";
  if (/[\u0A00-\u0A7F]/.test(value)) return "punjabi";
  if (/[\u0B00-\u0B7F]/.test(value)) return "odia";
  if (/[\u0600-\u06FF]/.test(value)) return "urdu";

  if (/[\u0980-\u09FF]/.test(value)) {
    const assameseHints = /[\u09F0\u09F1]|(মই|আপুনি|তুমি|আছে|নাই|নহয়|হয়|হে)/;
    return assameseHints.test(value) ? "assamese" : "bengali";
  }

  if (/[\u0900-\u097F]/.test(value)) {
    const marathiHints = /(आहे|आहोत|आहेत|करतो|करते|मला|तुला|तुम्हाला|झालं|झाले|काय|नाही)/;
    return marathiHints.test(value) ? "marathi" : "hindi";
  }

  const lower = value.toLowerCase();
  const hinglishHints = [
    "mujhe", "mujh", "mera", "meri", "mere", "hai", "hoon", "nahi", "kya", "kyu", "kyun", "kaise",
    "aap", "tum", "main", "mai", "kr", "kar", "raha", "rahi", "yaar", "thik", "theek", "acha", "accha"
  ];
  const hits = hinglishHints.reduce((count, token) => count + (lower.includes(token) ? 1 : 0), 0);
  return hits >= 2 ? "hinglish" : "english";
}

function labelsForLanguage(language) {
  return CHAT_LABELS[language] || CHAT_LABELS.english;
}

function detectInitialLanguage() {
  const browserLang = String(window.navigator?.language || "").toLowerCase();
  const base = browserLang.split("-")[0];
  const languageByBrowserCode = {
    hi: "hindi",
    bn: "bengali",
    te: "telugu",
    mr: "marathi",
    ta: "tamil",
    ur: "urdu",
    gu: "gujarati",
    kn: "kannada",
    ml: "malayalam",
    or: "odia",
    pa: "punjabi",
    as: "assamese",
    en: "english"
  };
  if (languageByBrowserCode[base]) return languageByBrowserCode[base];
  return "english";
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

const SELF_HARM_PATTERNS = [
  /\b(kms|kys)\b/i,
  /\bsuicide\b/i,
  /\bkill\s*my\s*self\b/i,
  /\btake\s*my\s*life\b/i,
  /\btake\s*my\s*own\s*life\b/i,
  /\bwant\s*to\s*die\b/i,
  /\bdon'?t\s*want\s*to\s*live\b/i,
  /\bdo\s*not\s*want\s*to\s*live\b/i,
  /\bno\s*reason\s*to\s*live\b/i,
  /\bbetter\s*off\s*dead\b/i,
  /\bwish\s*i\s*was\s*dead\b/i,
  /\bcan'?t\s*go\s*on\b/i,
  /\bnot\s*worth\s*living\b/i,
  /\bend\s*my\s*life\b/i,
  /\bend\s*it\s*all\b/i,
  /\bself[- ]?harm\b/i,
  /\bhurt\s*myself\b/i,
  /\bquit life\b/i,
  /\bquit living\b/i,
  /\bend it all\b/i,
  /\bmarna\b/i,
  /\bmar\s*jana\b/i,
  /\bjeena\s*nahi\b/i,
  /\bjeena\s*nahi\s*(hai|chahta|chahti)\b/i,
  /\bmujhe\s*marna\s*hai\b/i,
  /\bmujhe\s*mar\s*jana\s*hai\b/i,
  /\bjaan\s*dena\b/i,
  /\bapni\s*jaan\s*lena\b/i,
  /\bkhud\s*ko\s*mar(na|\s*dena)\b/i,
  /\bsuicidal\b/i,
  /\bfansi\b/i,
  /\bfasi\b/i,
  /\bfaansi\b/i,
  /\bphansi\b/i,
  /\bphaansi\b/i,
  /\bf[ae]?a?n?s[iy]\s*(lagana|lgana|lagaana|lagane|lgane)\b/i,
  /\blatakna\b/i,
  /\bphanda\b/i,
  /\bzeher\b/i,
  /\boverdose\b/i,
  /i want to die/i,
  /आत्महत्या/i,
  /खुदकुशी/i,
  /फांसी/i,
  /फाँसी/i,
  /फंदा/i,
  /मर\s*जाना/i,
  /मरना\s*है/i,
  /जीना\s*नहीं/i,
  /जान\s*दे\s*(दूंगा|दूँगा|दूंगी|दूँगी|दूंगी|दुंगी|देना)/i,
  /खुद\s*को\s*मार/i,
  /मर\s*डाल/i,
  /मुझे\s*मरना\s*है/i
];

const VIOLENCE_PATTERNS = [
  /\bplan\s*(a|an)?\s*(bomb|blast|attack)\b/i,
  /\bplant\s*(a|an)?\s*bomb\b/i,
  /\buse\s*(a|an)?\s*bomb\b/i,
  /\bbomb\s*(the|this|a|my)?\s*(campus|college|school|building|class|hostel)\b/i,
  /\b(blast|explode|blow\s*up)\s*(the|this|a|my)?\s*(campus|college|school|building|class|hostel|bus)\b/i,
  /\bshoot\s*(them|him|her|people|everyone|students?|classmates?|teacher|teachers)\b/i,
  /\bstab\s*(them|him|her|someone|people)\b/i,
  /\bkill\s*(them|him|her|everyone|people|students?|classmates?|teacher|teachers)\b/i,
  /\bi\s*want\s*to\s*murder\b/i,
  /\bmurder\s*(them|him|her|someone|people|everyone|students?|classmates?|teacher|teachers|professor|family|parents?)\b/i,
  /\bmaar\s*do\b/i,
  /\bmar\s*do\b/i,
  /\bcampus\s*ko\s*bomb\s*se\s*udaa?\s*(du|dun|dunga|dungi)\b/i,
  /\bbomb\s*(se)?\s*udaa?\s*(du|dun|dunga|dungi)\b/i,
  /\bbomb\s*rakh\s*(du|dun|dunga|dungi)\b/i,
  /\b(campus|college|school|hostel|class)\s*ko\s*(udaa?|jala)\s*(du|dun|dunga|dungi)\b/i,
  /\b(sabko|logon\s*ko|students?|classmates?|teacher|teachers)\s*maar\s*(du|dun|dunga|dungi)\b/i,
  /बम\s*(से)?\s*(उड़ा|फोड़)/i,
  /कैंपस\s*को\s*बम\s*से\s*उड़ा/i,
  /(सबको|लोगों\s*को|छात्रों\s*को|टीचर\s*को)\s*मार\s*(दूंगा|दूँगा|दूंगी|दूँगी|दू)/i
];

function detectPatternMatch(text, patterns) {
  const value = String(text || "");
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[0];
  }
  return "";
}

function detectRiskSignal(text) {
  const selfHarmTerm = detectPatternMatch(text, SELF_HARM_PATTERNS);
  if (selfHarmTerm) {
    return { category: "self_harm", term: selfHarmTerm };
  }

  const violenceTerm = detectPatternMatch(text, VIOLENCE_PATTERNS);
  if (violenceTerm) {
    return { category: "violence", term: violenceTerm };
  }

  return null;
}

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
    const raw = localStorage.getItem(CHAT_STORAGE_KEY) || localStorage.getItem(CHAT_STORAGE_KEY_BASE);
    if (!raw) return getEmptyState();
    const parsed = JSON.parse(raw);
    return { ...getEmptyState(), ...parsed };
  } catch {
    return getEmptyState();
  }
}

let state = loadState();
let isAssistantBusy = false;
let typingIndicatorEl = null;
let preferredConversationLanguage = detectInitialLanguage();

if (state.history.length) {
  const lastUserMessage = [...state.history]
    .reverse()
    .find((item) => item.role === "user" && item.content);

  if (lastUserMessage?.content) {
    preferredConversationLanguage = detectConversationLanguage(lastUserMessage.content);
  }
}

if (assistantLanguageSelect) {
  const initialLanguage = SUPPORTED_CHAT_LANGUAGES.has(preferredConversationLanguage)
    ? preferredConversationLanguage
    : detectInitialLanguage();
  assistantLanguageSelect.value = initialLanguage;
  assistantLanguageSelect.addEventListener("change", () => {
    const selected = String(assistantLanguageSelect.value || "").trim().toLowerCase();
    if (SUPPORTED_CHAT_LANGUAGES.has(selected)) {
      preferredConversationLanguage = selected;
    }
  });
}

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

function getGuidanceByCategory(textLabel, category) {
  return category === "violence"
    ? (textLabel.violenceGuidance || textLabel.crisisGuidance)
    : textLabel.crisisGuidance;
}

function formatRiskTypeLabel(category) {
  if (category === "violence") return "VIOLENCE";
  if (category === "self_harm") return "SELF_HARM";
  return "HIGH_RISK";
}

function registerCriticalEvent(source, text, term, category = "") {
  state.criticalEvents.push({
    at: new Date().toISOString(),
    source,
    category,
    term,
    text
  });
  if (state.criticalEvents.length > 20) {
    state.criticalEvents = state.criticalEvents.slice(-20);
  }
  saveState();
}

function renderMessage(role, text, critical = false, criticalType = "") {
  const div = document.createElement("div");
  div.className = `msg ${role}${critical ? " critical" : ""}`;
  const typeLabel = formatRiskTypeLabel(String(criticalType || "").toLowerCase());
  div.textContent = critical ? `[RED ALERT - ${typeLabel}] ${text}` : text;

  if (critical && role === "ai") {
    const actionRow = document.createElement("div");
    actionRow.className = "alert-actions";
    actionRow.innerHTML = `
      <a class="alert-btn" href="tel:${HELPLINE_CALL_NUMBER}">Call Helpline</a>
      <a class="alert-btn secondary" href="${CONSULT_DOCTOR_LINK}">Consult Doctor</a>
    `;
    div.appendChild(actionRow);
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function ensureTypingIndicator() {
  if (typingIndicatorEl) return;
  typingIndicatorEl = document.createElement("div");
  typingIndicatorEl.className = "msg ai typing";
  typingIndicatorEl.textContent = "AI is thinking...";
  chatBox.appendChild(typingIndicatorEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTypingIndicator() {
  if (!typingIndicatorEl) return;
  typingIndicatorEl.remove();
  typingIndicatorEl = null;
}

function setAssistantBusy(busy) {
  isAssistantBusy = busy;

  const submitBtn = assistantForm?.querySelector("button[type='submit']");
  if (submitBtn) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? "Thinking..." : "Ask AI";
  }

  if (assistantInput) {
    assistantInput.disabled = busy;
  }

  if (assistantLanguageSelect) {
    assistantLanguageSelect.disabled = busy;
  }

  moodQuick?.querySelectorAll("button").forEach((button) => {
    button.disabled = busy;
  });

  [reportBtn, downloadReportBtn, downloadReportJsonBtn, clearChatBtn].forEach((button) => {
    if (button) button.disabled = busy;
  });

  if (assistantStatus) {
    assistantStatus.classList.toggle("hidden", !busy);
    assistantStatus.textContent = busy ? "Generating supportive response..." : "";
  }

  if (busy) {
    ensureTypingIndicator();
  } else {
    removeTypingIndicator();
  }
}

function appendMessage(role, text, persist = true, critical = false, criticalType = "") {
  renderMessage(role, text, critical, criticalType);

  if (persist && (role === "user" || role === "ai")) {
    const mappedRole = role === "ai" ? "assistant" : "user";
    state.history.push({ role: mappedRole, content: text, critical, criticalType: String(criticalType || "") });
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
    ? report.criticalEvents.map((a, i) => `${i + 1}. [${a.source}] type: ${formatRiskTypeLabel(String(a.category || "").toLowerCase())} term: "${a.term}" at ${a.at}\n   text: ${a.text}`).join("\n")
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
  saveReportSnapshot();
  const datePart = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const userPart = currentUserId ? `user-${String(currentUserId).slice(-6)}` : "guest";
  const blob = new Blob([formatReportText(report)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wellness-report-${userPart}-${datePart}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadReportJson() {
  const report = generateReportData();
  saveReportSnapshot();
  const datePart = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const userPart = currentUserId ? `user-${String(currentUserId).slice(-6)}` : "guest";
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wellness-report-${userPart}-${datePart}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function clearSession() {
  state = getEmptyState();
  const selectedLanguage = String(assistantLanguageSelect?.value || "").trim().toLowerCase();
  preferredConversationLanguage = SUPPORTED_CHAT_LANGUAGES.has(selectedLanguage)
    ? selectedLanguage
    : detectInitialLanguage();
  localStorage.removeItem(CHAT_STORAGE_KEY);
  localStorage.removeItem(WELLNESS_REPORT_KEY);
  chatBox.innerHTML = "";
  reportView.classList.add("hidden");
  reportView.textContent = "";
  appendMessage("ai", labelsForLanguage(preferredConversationLanguage).sessionCleared, false);
}

function isClearCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === "clear" || normalized === "delete" || normalized === "exit";
}

async function askAi(message, preferredLanguage) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/ai/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, message, history: state.history, preferredLanguage })
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

async function reportAiRiskAlert({ source, message, triggerTerm, metadata = {} }) {
  if (!currentUserId) return;
  try {
    const response = await fetch(`${API_BASE}/api/ai/risk-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        source,
        message,
        triggerTerm,
        metadata
      })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error || `Risk alert logging failed (${response.status})`);
    }
  } catch (_) {
    return false;
  }
  return true;
}

async function handleUserMessage(message) {
  if (!message) return;
  if (isAssistantBusy) return;

  if (isClearCommand(message)) {
    clearSession();
    return;
  }

  const selectedLanguage = String(assistantLanguageSelect?.value || "").trim().toLowerCase();
  preferredConversationLanguage = SUPPORTED_CHAT_LANGUAGES.has(selectedLanguage)
    ? selectedLanguage
    : detectConversationLanguage(message);
  const userLanguage = preferredConversationLanguage;
  const textLabel = labelsForLanguage(userLanguage);

  const userRiskSignal = detectRiskSignal(message);
  const userCriticalTerm = userRiskSignal?.term || "";
  const userRiskCategory = userRiskSignal?.category || "";
  appendMessage("user", message, true, Boolean(userRiskSignal), userRiskCategory);
  if (userRiskSignal) {
    registerCriticalEvent("user", message, userCriticalTerm, userRiskCategory);
    await reportAiRiskAlert({
      source: "ai_support_client_block",
      message,
      triggerTerm: userCriticalTerm,
      metadata: {
        conversationLanguage: userLanguage,
        phase: "user_input_block",
        riskCategory: userRiskSignal.category
      }
    });
    appendMessage(
      "ai",
      getGuidanceByCategory(textLabel, userRiskSignal.category),
      true,
      true,
      userRiskCategory
    );
    state.seriousCount += 1;
    saveState();
    saveReportSnapshot();
    return;
  }
  trackStudentState(message);
  saveReportSnapshot();

  try {
    setAssistantBusy(true);
    const result = await askAi(message, userLanguage);
    const reply = result.reply || textLabel.fallbackReply;
    const aiRiskSignal = detectRiskSignal(reply);
    const aiCriticalTerm = aiRiskSignal?.term || "";
    const aiCriticalCategory = aiRiskSignal?.category || (result.serious ? String(result.riskCategory || "self_harm") : "none");
    const aiCritical = Boolean(result.serious || aiRiskSignal);
    appendMessage("ai", reply, true, aiCritical, aiCriticalCategory);
    if (aiCriticalTerm) {
      registerCriticalEvent("assistant", reply, aiCriticalTerm, aiCriticalCategory);
      await reportAiRiskAlert({
        source: "ai_support_reply_flag",
        message: reply,
        triggerTerm: aiCriticalTerm,
        metadata: {
          conversationLanguage: userLanguage,
          phase: "assistant_reply_flag",
          riskCategory: aiCriticalCategory
        }
      });
    }

    if (aiCritical) {
      state.seriousCount += 1;
      saveState();
    }
    saveReportSnapshot();
  } catch (error) {
    const text = String(error.message || "");
    if (text.includes("Too many requests")) {
      appendMessage("ai", textLabel.tooFast);
    } else if (text.includes("Server is busy")) {
      appendMessage("ai", textLabel.serverBusy);
    } else
    if (text.includes("Cannot reach backend")) {
      appendMessage("ai", textLabel.cannotReach);
    } else if (text.includes("GROQ_API_KEY")) {
      appendMessage("ai", textLabel.keyMissing);
    } else if (text.includes("Groq request failed")) {
      const cleaned = text.replace("Groq request failed", "").trim();
      appendMessage("ai", `${textLabel.groqFailedPrefix} ${cleaned || textLabel.groqFailedFallback}`);
    } else {
      appendMessage("ai", textLabel.temporaryIssue);
    }
  } finally {
    setAssistantBusy(false);
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
  if (isAssistantBusy) return;
  const message = assistantInput.value.trim();
  assistantInput.value = "";
  await handleUserMessage(message);
});

moodQuick.addEventListener("click", async (event) => {
  if (!requireLoginForFeature()) return;
  if (isAssistantBusy) return;
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
downloadReportJsonBtn.addEventListener("click", () => {
  if (!requireLoginForFeature()) return;
  downloadReportJson();
});
clearChatBtn.addEventListener("click", () => {
  if (!requireLoginForFeature()) return;
  clearSession();
});

if (window.location.hash === "#report") {
  if (!requireLoginForFeature()) {
    // Redirect triggered by session helper.
  } else {
  const existingReport = localStorage.getItem(WELLNESS_REPORT_KEY) || localStorage.getItem(WELLNESS_REPORT_KEY_BASE);
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
    renderMessage(role, item.content, Boolean(item.critical), String(item.criticalType || ""));
  });
} else {
  appendMessage("ai", labelsForLanguage(preferredConversationLanguage).welcome, false);
}

