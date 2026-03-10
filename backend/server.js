const path = require("path");
const dns = require("node:dns");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const User = require("./models/User");
const ChatSupportLog = require("./models/ChatSupportLog");
const RiskAlert = require("./models/RiskAlert");
const { hasSeriousRiskSignal, detectRiskSignal } = require("./utils/riskSignals");
const { requireUserSession } = require("./utils/userAuth");  // Fix #2
const { makeAnonymousId } = require("./utils/anonymousId");  // Fix #11

const app = express();
const HELPLINE_NUMBER = process.env.HELPLINE_NUMBER || "iCall: 9152987821 (Mon–Sat, 8am–10pm IST) | Vandrevala Foundation: 1860-2662-345 (24x7)";
const HELPLINE_PRIMARY_NUMBER = process.env.HELPLINE_PRIMARY_NUMBER || "9152987821";
const ALERT_EMAIL = process.env.ALERT_EMAIL || process.env.EMAIL_USER || "";
const AI_CLIENT_ALERT_SOURCES = new Set(["ai_support_client_block", "ai_support_reply_flag"]);
const aiRateWindowMs = 60 * 1000;
const aiRateMaxRequests = 10;
const aiRateBuckets = new Map();
const aiRiskAlertRateMaxRequests = 40;
const aiRiskAlertBuckets = new Map();
const aiRateMaxKeys = 5000;
let aiSupportLastCleanupAt = 0;
let aiRiskAlertLastCleanupAt = 0;

function configureCustomDnsServers() {
    const customServers = String(process.env.DNS_SERVERS || "")
        .split(",")
        .map((server) => server.trim())
        .filter(Boolean);

    if (!customServers.length) return;

    try {
        dns.setServers(customServers);
        console.log(`Using custom DNS servers: ${customServers.join(", ")}`);
    } catch (error) {
        console.warn(`Invalid DNS_SERVERS value. Falling back to system DNS. ${error.message}`);
    }
}

configureCustomDnsServers();

const LANGUAGE_INSTRUCTIONS = {
    english: "Respond in English.",
    hinglish: "Respond in Hinglish (Roman Hindi + simple English mix), matching the user's casual tone.",
    hindi: "Respond in Hindi (Devanagari script). Keep tone warm, simple, and culturally natural for Indian students.",
    bengali: "Respond in Bengali (Bangla script). Keep tone warm, simple, and culturally natural for Indian students.",
    telugu: "Respond in Telugu script. Keep tone warm, simple, and culturally natural for Indian students.",
    marathi: "Respond in Marathi (Devanagari script). Keep tone warm, simple, and culturally natural for Indian students.",
    tamil: "Respond in Tamil script. Keep tone warm, simple, and culturally natural for Indian students.",
    urdu: "Respond in Urdu script. Keep tone warm, simple, and culturally natural for Indian students.",
    gujarati: "Respond in Gujarati script. Keep tone warm, simple, and culturally natural for Indian students.",
    kannada: "Respond in Kannada script. Keep tone warm, simple, and culturally natural for Indian students.",
    malayalam: "Respond in Malayalam script. Keep tone warm, simple, and culturally natural for Indian students.",
    odia: "Respond in Odia script. Keep tone warm, simple, and culturally natural for Indian students.",
    punjabi: "Respond in Punjabi (Gurmukhi script). Keep tone warm, simple, and culturally natural for Indian students.",
    assamese: "Respond in Assamese script. Keep tone warm, simple, and culturally natural for Indian students."
};

const LANGUAGE_SCRIPT_REGEX = {
    english: /[A-Za-z]/u,
    hinglish: /[A-Za-z]/u,
    hindi: /[\u0900-\u097F]/u,
    marathi: /[\u0900-\u097F]/u,
    bengali: /[\u0980-\u09FF]/u,
    assamese: /[\u0980-\u09FF]/u,
    telugu: /[\u0C00-\u0C7F]/u,
    tamil: /[\u0B80-\u0BFF]/u,
    urdu: /[\u0600-\u06FF]/u,
    gujarati: /[\u0A80-\u0AFF]/u,
    kannada: /[\u0C80-\u0CFF]/u,
    malayalam: /[\u0D00-\u0D7F]/u,
    odia: /[\u0B00-\u0B7F]/u,
    punjabi: /[\u0A00-\u0A7F]/u
};

const SUPPORTED_CHAT_LANGUAGES = new Set(Object.keys(LANGUAGE_INSTRUCTIONS));

function inferConversationLanguage(text) {
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
        "mujhe","mujh","mera","meri","mere","hai","hoon","nahi","kyu","kyun","kya","kaise",
        "aap","tum","main","mai","kr","kar","raha","rahi","yaar","thik","theek","acha","accha"
    ];
    const hits = hinglishHints.reduce((count, token) => count + (lower.includes(token) ? 1 : 0), 0);
    return hits >= 2 ? "hinglish" : "english";
}

function resolveConversationLanguage(message, preferredLanguage) {
    const requested = String(preferredLanguage || "").trim().toLowerCase();
    if (SUPPORTED_CHAT_LANGUAGES.has(requested)) return requested;
    return inferConversationLanguage(message);
}

function getLanguageInstruction(language) {
    const baseInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.english;
    if (language === "english") return `${baseInstruction} Do not switch to other languages unless the user asks.`;
    if (language === "hinglish") return `${baseInstruction} Use Roman script only.`;
    return `${baseInstruction} Do not switch to English or another language unless the user asks.`;
}

function getLocalizedFallbackReply(language) {
    if (language === "hindi") return "मैं आपके साथ हूँ। अभी हम एक छोटा, संभालने लायक अगला कदम चुनते हैं।";
    if (language === "hinglish") return "Main aapke saath hoon. Chaliye abhi ek chhota sa next step choose karte hain.";
    if (language === "bengali") return "আমি তোমার পাশে আছি। এখন আমরা একসাথে একটি ছোট, সামলানো যায় এমন পরের পদক্ষেপ বেছে নিই।";
    if (language === "telugu") return "నేను నీతోనే ఉన్నాను. ఇప్పుడే కలిసి ఒక చిన్న, చేయగలిగే తదుపరి అడుగు ఎంచుకుందాం.";
    if (language === "marathi") return "मी तुझ्या सोबत आहे. आत्ता आपण एक छोटा, करता येईल असा पुढचा टप्पा निवडूया.";
    if (language === "tamil") return "நான் உன்னுடன் இருக்கிறேன். இப்போதே நாம் செய்யக்கூடிய ஒரு சிறிய அடுத்த படியை தேர்வு செய்வோம்.";
    if (language === "urdu") return "میں آپ کے ساتھ ہوں۔ آئیے ابھی ایک چھوٹا، قابلِ عمل اگلا قدم منتخب کرتے ہیں۔";
    if (language === "gujarati") return "હું તારી સાથે છું. ચાલ, અત્યારે આપણે એક નાનું અને કરી શકાય એવું આગળનું પગલું પસંદ કરીએ.";
    if (language === "kannada") return "ನಾನು ನಿನ್ನ ಜೊತೆ ಇದ್ದೇನೆ. ಈಗ ನಾವು ಮಾಡಬಹುದಾದ ಒಂದು ಚಿಕ್ಕ ಮುಂದಿನ ಹೆಜ್ಜೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡೋಣ.";
    if (language === "malayalam") return "ഞാൻ നിന്റെ കൂടെയുണ്ട്. ഇപ്പോൾ നമ്മുക്ക് ചെയ്യാനാകുന്ന ഒരു ചെറിയ അടുത്ത പടി തിരഞ്ഞെടുക്കാം.";
    if (language === "odia") return "ମୁଁ ତୁମ ସହିତ ଅଛି। ଏବେ ଆମେ କରିପାରିବା ଏକ ଛୋଟ ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ ବାଛିବା।";
    if (language === "punjabi") return "ਮੈਂ ਤੇਰੇ ਨਾਲ ਹਾਂ। ਚਲੋ ਹੁਣ ਇੱਕ ਛੋਟਾ ਤੇ ਆਸਾਨ ਅਗਲਾ ਕਦਮ ਚੁਣੀਏ।";
    if (language === "assamese") return "মই তোমাৰ লগত আছোঁ। এতিয়া আমি একেলগে এটা সৰু, কৰিব পৰা পৰৱৰ্তী পদক্ষেপ বাছি লওঁ।";
    return "I am here with you. Let's pick one small next step you can do right now.";
}

function getLocalizedCrisisAlert(language, riskCategory = "self_harm") {
    if (language === "hindi") {
        if (riskCategory === "violence") return `मैं किसी को नुकसान पहुँचाने में मदद नहीं कर सकता। अगर अभी गुस्सा या तनाव बहुत तेज़ है, तो तुरंत उस जगह से दूर हो जाएँ, 10 गहरी साँस लें, और किसी भरोसेमंद व्यक्ति या काउंसलर को कॉल करें। अगर लगे कि नियंत्रण छूट रहा है, तुरंत 112 पर कॉल करें। सहायता के लिए हेल्पलाइन: ${HELPLINE_NUMBER}.`;
        return `आप अभी बहुत भारी महसूस कर रहे हो सकते हैं, और इसे अकेले संभालना ज़रूरी नहीं है। अभी किसी भरोसेमंद दोस्त/परिवार के सदस्य या कॉलेज काउंसलर से तुरंत बात करें। हेल्पलाइन पर संपर्क करें: ${HELPLINE_NUMBER}. अगर तुरंत खतरा हो तो 112 पर कॉल करें।`;
    }
    if (language === "hinglish") {
        if (riskCategory === "violence") return `Main kisi ko nuksan pahunchane mein help nahi kar sakta. Agar gussa ya pressure bahut intense lag raha hai, abhi us jagah se thoda door ho jao, 10 deep breaths lo, aur turant kisi trusted person ya counsellor ko call karo. Control slip ho raha ho to 112 call karo. Helpline: ${HELPLINE_NUMBER}.`;
        return `Aap abhi bahut heavy feel kar rahe ho, aur aapko ye sab akela handle nahi karna hai. Abhi turant kisi trusted dost/family member ya college counsellor ko call karo. Helpline se bhi baat karo: ${HELPLINE_NUMBER}. Immediate danger ho to 112 call karo.`;
    }
    if (riskCategory === "violence") return `I can't help with harming anyone. If your anger or pressure feels intense, step away from the situation now, take 10 slow breaths, and call a trusted person or counsellor immediately. If you feel you may lose control, call 112 right now. Helpline: ${HELPLINE_NUMBER}.`;
    return `This sounds very heavy, and you do not have to handle it alone. Please contact a trusted person or college counsellor right now, and reach out to a helpline: ${HELPLINE_NUMBER}. If there is immediate danger, call 112 now.`;
}

function sanitizeAssistantReply(rawReply, language) {
    const neutralYou = language === "hindi" ? "आप" : (language === "hinglish" ? "aap" : "you");
    const slashPlaceholder = /\b(?:aurat|male|female|boy|girl)\s*\/\s*(?:aurat|male|female|boy|girl)\b/gi;
    const base = String(rawReply || "").replace(/\*\*/g, "").replace(slashPlaceholder, neutralYou).trim();
    if (!base) return getLocalizedFallbackReply(language);
    const normalize = (value) => String(value || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const lines = base.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
    const deduped = [];
    for (const line of lines) {
        const norm = normalize(line);
        const prev = normalize(deduped[deduped.length - 1] || "");
        if (norm && norm !== prev) deduped.push(line);
    }
    return deduped.join("\n").trim() || getLocalizedFallbackReply(language);
}

function isReplyInExpectedLanguage(reply, language) {
    const matcher = LANGUAGE_SCRIPT_REGEX[language];
    if (!matcher) return true;
    return matcher.test(String(reply || ""));
}

function enforceLanguageReply(reply, language) {
    const cleaned = String(reply || "").trim();
    if (!cleaned) return getLocalizedFallbackReply(language);
    if (!isReplyInExpectedLanguage(cleaned, language)) return getLocalizedFallbackReply(language);
    return cleaned;
}

function shouldAppendSafetyFollowup(reply, riskCategory) {
    const text = String(reply || "");
    const hasEmergencyDirection = /\b112\b|helpline|nimhans|i\s*call|trusted person|भरोसेमंद|हेल्पलाइन/i.test(text);
    if (!hasEmergencyDirection) return true;
    if (riskCategory === "violence") return !(/can'?t help|cannot help|nuksan|harm anyone|किसी को नुकसान/i.test(text));
    return false;
}

function getMailTransporter() {
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
}

async function notifyRiskAlertInBackground(payload) {
    const snapshot = {
        userId: String(payload?.userId || "unknown"),
        at: payload?.at || new Date().toISOString(),
        clientIp: String(payload?.clientIp || "unknown"),
        message: String(payload?.message || "").slice(0, 1000)
    };
    console.warn("[RISK_ALERT]", snapshot);
    if (!ALERT_EMAIL || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    try {
        const transporter = getMailTransporter();
        await transporter.sendMail({
            from: `"eUdyaan Alert" <${process.env.EMAIL_USER}>`,
            to: ALERT_EMAIL,
            subject: "[eUdyaan] Risk Alert Triggered",
            text: ["A high-risk message was detected.", `Time: ${snapshot.at}`, `User ID: ${snapshot.userId}`, `Client IP: ${snapshot.clientIp}`, "Message:", snapshot.message].join("\n")
        });
    } catch (error) {
        console.error("Risk alert email failed:", error.message);
    }
}

function getClientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = Array.isArray(forwarded) ? forwarded[0] : (typeof forwarded === "string" ? forwarded.split(",")[0] : req.ip);
    return String(ip || "unknown").trim();
}

function aiSupportRateLimiter(req, res, next) {
    const key = getClientIp(req);
    const now = Date.now();
    if (now - aiSupportLastCleanupAt > aiRateWindowMs) {
        aiSupportLastCleanupAt = now;
        for (const [k, b] of aiRateBuckets.entries()) { if (now >= b.resetAt) aiRateBuckets.delete(k); }
    }
    if (!aiRateBuckets.has(key) && aiRateBuckets.size >= aiRateMaxKeys) return res.status(503).json({ error: "Server is busy. Please try again in a moment." });
    const current = aiRateBuckets.get(key);
    if (!current || now >= current.resetAt) { aiRateBuckets.set(key, { count: 1, resetAt: now + aiRateWindowMs }); return next(); }
    current.count += 1;
    if (current.count > aiRateMaxRequests) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))));
        return res.status(429).json({ error: "Too many requests. Please wait and try again." });
    }
    return next();
}

function aiRiskAlertRateLimiter(req, res, next) {
    const key = getClientIp(req);
    const now = Date.now();
    if (now - aiRiskAlertLastCleanupAt > aiRateWindowMs) {
        aiRiskAlertLastCleanupAt = now;
        for (const [k, b] of aiRiskAlertBuckets.entries()) { if (now >= b.resetAt) aiRiskAlertBuckets.delete(k); }
    }
    if (!aiRiskAlertBuckets.has(key) && aiRiskAlertBuckets.size >= aiRateMaxKeys) return res.status(503).json({ error: "Server is busy. Please try again in a moment." });
    const current = aiRiskAlertBuckets.get(key);
    if (!current || now >= current.resetAt) { aiRiskAlertBuckets.set(key, { count: 1, resetAt: now + aiRateWindowMs }); return next(); }
    current.count += 1;
    if (current.count > aiRiskAlertRateMaxRequests) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))));
        return res.status(429).json({ error: "Too many risk alert events. Please wait and try again." });
    }
    return next();
}

// Fix #9: Restrict CORS with allow-list, while always allowing same-host frontend/backend traffic.
const configuredOrigins = [
    process.env.ALLOWED_ORIGINS,
    process.env.FRONTEND_URL,
    process.env.RENDER_EXTERNAL_URL,
    "http://localhost:5000",
    "http://127.0.0.1:5000"
]
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);
const allowedOrigins = new Set(configuredOrigins);

function getRequestHost(req) {
    const raw = req.headers["x-forwarded-host"] || req.headers.host || "";
    return String(Array.isArray(raw) ? raw[0] : raw).split(",")[0].trim().toLowerCase();
}

function isSameHostOrigin(origin, req) {
    if (!origin) return true;
    try {
        const originHost = new URL(origin).host.toLowerCase();
        const requestHost = getRequestHost(req);
        return Boolean(requestHost) && originHost === requestHost;
    } catch (_) {
        return false;
    }
}

app.use(cors((req, callback) => {
    const origin = String(req.header("Origin") || "").trim();
    if (!origin || allowedOrigins.has(origin) || isSameHostOrigin(origin, req)) {
        return callback(null, { origin: true, credentials: true });
    }
    return callback(new Error(`Not allowed by CORS for origin: ${origin}`));
}));
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
const communityRoutes = require("./routes/community");
const contactRoutes = require("./routes/contact");
const appointmentRoutes = require("./routes/appointments");
const adminRoutes = require("./routes/admin");
app.use("/api/auth", authRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin", adminRoutes);

// Fix #2: AI risk-alert route now uses requireUserSession
app.post("/api/ai/risk-alert", requireUserSession, aiRiskAlertRateLimiter, async (req, res) => {
    try {
        const { source = "ai_support_client_block", message = "", triggerTerm = "", metadata = {} } = req.body || {};
        const normalizedSource = String(source || "").trim().toLowerCase();
        if (!AI_CLIENT_ALERT_SOURCES.has(normalizedSource)) return res.status(400).json({ error: "Invalid source" });
        const normalizedMessage = String(message || "").trim().slice(0, 2000);
        if (!normalizedMessage) return res.status(400).json({ error: "Message is required" });
        const normalizedTrigger = String(triggerTerm || "").trim();
        if (!hasSeriousRiskSignal(normalizedMessage) && !normalizedTrigger) return res.status(422).json({ error: "Risk signal not detected" });

        // Fix #11: use shared makeAnonymousId
        const anonymousId = makeAnonymousId(req.authUserId);

        await RiskAlert.create({
            source: normalizedSource,
            userId: req.authUserId,
            anonymousId,
            clientIp: getClientIp(req),
            message: normalizedMessage,
            triggerTerm: normalizedTrigger || "risk_pattern",
            metadata: (metadata && typeof metadata === "object" && !Array.isArray(metadata)) ? metadata : {}
        });
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Fix #2: AI support route now uses requireUserSession
app.post("/api/ai/support", requireUserSession, aiSupportRateLimiter, async (req, res) => {
    try {
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) return res.status(500).json({ error: "GROQ_API_KEY is missing in backend/.env" });

        const { message, history, preferredLanguage } = req.body || {};
        if (!message || typeof message !== "string") return res.status(400).json({ error: "Message is required" });

        const conversationLanguage = resolveConversationLanguage(message, preferredLanguage);
        const riskSignal = detectRiskSignal(message);
        const serious = riskSignal.matched;

        if (serious) {
            void notifyRiskAlertInBackground({ userId: req.authUserId, clientIp: getClientIp(req), at: new Date().toISOString(), message });
            await RiskAlert.create({
                source: "ai_support",
                userId: req.authUserId,
                anonymousId: makeAnonymousId(req.authUserId),  // Fix #11
                clientIp: getClientIp(req),
                message: String(message || ""),
                triggerTerm: riskSignal.term || "risk_pattern",
                metadata: { language: conversationLanguage, riskCategory: riskSignal.category }
            });
        }

        const safeHistory = Array.isArray(history)
            ? history.slice(-10).map((msg) => ({ role: msg?.role === "assistant" ? "assistant" : "user", content: String(msg?.content || "") })).filter((msg) => msg.content.trim().length > 0)
            : [];

        const systemPrompt = `You are a warm, human-sounding mental wellness assistant for Indian college students. Sound like a caring person in chat, not like a template warning bot. Keep language simple, kind, and conversational. Keep replies short (2-5 lines), practical, and easy to act on. Validate feelings first, then suggest 1-2 small next steps. Never use placeholders like "AURAT/MALE" and never repeat the same sentence. Do not diagnose conditions. If user expresses intent to self-harm or to harm others (weapons, bombing, attacking), refuse any harmful guidance, de-escalate calmly, and strongly advise contacting emergency services (112) plus a trusted person immediately. Reference Indian support systems like college counsellor, NIMHANS, or iCall when relevant. Helpline details: ${HELPLINE_NUMBER}. ${getLanguageInstruction(conversationLanguage)} Follow this language rule strictly for the final answer.`;
        const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model, temperature: 0.3, max_tokens: 160, messages: [{ role: "system", content: systemPrompt }, ...safeHistory, { role: "user", content: message }] })
        });

        if (!groqResponse.ok) {
            const raw = await groqResponse.text();
            let details = raw, parsedCode = "";
            try {
                const parsed = JSON.parse(raw);
                const msg = parsed?.error?.message || parsed?.message || raw;
                parsedCode = String(parsed?.error?.code || "");
                details = `${msg}${parsedCode ? ` (code: ${parsedCode})` : ""}`;
            } catch (_) {}
            const isUpstreamRateLimit = groqResponse.status === 429 || parsedCode === "rate_limit_exceeded" || /rate limit|too many requests|rate_limit_exceeded/i.test(details);
            if (isUpstreamRateLimit) {
                const waitMatch = details.match(/try again in\s*([0-9]+(?:\.[0-9]+)?)s/i);
                const retryAfter = waitMatch ? Math.max(1, Math.ceil(Number(waitMatch[1]))) : 5;
                res.setHeader("Retry-After", String(retryAfter));
                return res.status(429).json({ error: "Too many requests. Please wait a moment and try again.", details, status: 429 });
            }
            return res.status(502).json({ error: "Groq request failed", details, status: groqResponse.status });
        }

        const data = await groqResponse.json();
        let reply = data?.choices?.[0]?.message?.content || "";
        reply = sanitizeAssistantReply(reply, conversationLanguage);
        reply = enforceLanguageReply(reply, conversationLanguage);
        if (serious && shouldAppendSafetyFollowup(reply, riskSignal.category)) {
            reply += `\n\n${getLocalizedCrisisAlert(conversationLanguage, riskSignal.category)}`;
        }

        // Fix #7: log riskCategory in ChatSupportLog
        await ChatSupportLog.create({
            userId: req.authUserId,
            clientIp: getClientIp(req),
            language: conversationLanguage,
            message: String(message || ""),
            reply: String(reply || ""),
            serious: Boolean(serious),
            riskCategory: serious ? riskSignal.category : "none"
        });

        return res.json({ reply, serious, riskCategory: serious ? riskSignal.category : "none" });
    } catch (error) {
        return res.status(500).json({ error: "AI support error", details: error.message });
    }
});

app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "../frontend", "index.html")); });

app.use((err, req, res, next) => {
    if (err && /Not allowed by CORS/i.test(String(err.message || ""))) {
        return res.status(403).json({ error: err.message });
    }
    return next(err);
});

if (!process.env.MONGO_URI) { console.error("Missing MONGO_URI in backend/.env"); process.exit(1); }

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 })
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => {
        console.log(err);
        if (String(process.env.MONGO_URI || "").startsWith("mongodb+srv://")) {
            console.error("MongoDB DNS SRV lookup failed. Set DNS_SERVERS=8.8.8.8,1.1.1.1 in backend/.env if your local DNS blocks SRV queries.");
        }
    });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    const baseUrl = `http://localhost:${PORT}`;
    console.log(`Server running on port ${PORT}`);
    console.log(`Open app: ${baseUrl}`);
    console.log(`Open login: ${baseUrl}/login.html`);
    console.log(`Open admin: ${baseUrl}/admin/admin-login.html`);
});
