const path = require('path');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const User = require("./models/User");
const ChatSupportLog = require("./models/ChatSupportLog");
const RiskAlert = require("./models/RiskAlert");
const { hasSeriousRiskSignal, detectRiskSignal } = require("./utils/riskSignals");

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

const SUPPORTED_CHAT_LANGUAGES = new Set(["english", "hinglish", "hindi"]);

function inferConversationLanguage(text) {
    const value = String(text || "");

    if (/[\u0900-\u097F]/.test(value)) {
        return "hindi";
    }

    const lower = value.toLowerCase();
    const hinglishHints = [
        "mujhe", "mujh", "mera", "meri", "mere", "hai", "hoon", "nahi", "kyu", "kyun", "kya", "kaise",
        "aap", "tum", "main", "mai", "kr", "kar", "raha", "rahi", "yaar", "thik", "theek", "acha", "accha"
    ];
    const hits = hinglishHints.reduce((count, token) => count + (lower.includes(token) ? 1 : 0), 0);

    return hits >= 2 ? "hinglish" : "english";
}

function resolveConversationLanguage(message, preferredLanguage) {
    const requested = String(preferredLanguage || "").trim().toLowerCase();
    if (SUPPORTED_CHAT_LANGUAGES.has(requested)) {
        return requested;
    }
    return inferConversationLanguage(message);
}

function getLanguageInstruction(language) {
    if (language === "hindi") {
        return "Respond in Hindi (Devanagari script). Keep tone warm, simple, and culturally natural for Indian students.";
    }
    if (language === "hinglish") {
        return "Respond in Hinglish (Roman Hindi + simple English mix), matching the user's casual tone.";
    }
    return "Respond in English.";
}

function getLocalizedFallbackReply(language) {
    if (language === "hindi") {
        return "मैं आपके साथ हूँ। अभी हम एक छोटा, संभालने लायक अगला कदम चुनते हैं।";
    }
    if (language === "hinglish") {
        return "Main aapke saath hoon. Chaliye abhi ek chhota sa next step choose karte hain.";
    }
    return "I am here with you. Let’s pick one small next step you can do right now.";
}

function getLocalizedCrisisAlert(language, riskCategory = "self_harm") {
    if (language === "hindi") {
        if (riskCategory === "violence") {
            return `मैं किसी को नुकसान पहुँचाने में मदद नहीं कर सकता। अगर अभी गुस्सा या तनाव बहुत तेज़ है, तो तुरंत उस जगह से दूर हो जाएँ, 10 गहरी साँस लें, और किसी भरोसेमंद व्यक्ति या काउंसलर को कॉल करें। अगर लगे कि नियंत्रण छूट रहा है, तुरंत 112 पर कॉल करें। सहायता के लिए हेल्पलाइन: ${HELPLINE_NUMBER}.`;
        }
        return `आप अभी बहुत भारी महसूस कर रहे हो सकते हैं, और इसे अकेले संभालना ज़रूरी नहीं है। अभी किसी भरोसेमंद दोस्त/परिवार के सदस्य या कॉलेज काउंसलर से तुरंत बात करें। हेल्पलाइन पर संपर्क करें: ${HELPLINE_NUMBER}. अगर तुरंत खतरा हो तो 112 पर कॉल करें।`;
    }

    if (language === "hinglish") {
        if (riskCategory === "violence") {
            return `Main kisi ko nuksan pahunchane mein help nahi kar sakta. Agar gussa ya pressure bahut intense lag raha hai, abhi us jagah se thoda door ho jao, 10 deep breaths lo, aur turant kisi trusted person ya counsellor ko call karo. Control slip ho raha ho to 112 call karo. Helpline: ${HELPLINE_NUMBER}.`;
        }
        return `Aap abhi bahut heavy feel kar rahe ho, aur aapko ye sab akela handle nahi karna hai. Abhi turant kisi trusted dost/family member ya college counsellor ko call karo. Helpline se bhi baat karo: ${HELPLINE_NUMBER}. Immediate danger ho to 112 call karo.`;
    }

    if (riskCategory === "violence") {
        return `I can’t help with harming anyone. If your anger or pressure feels intense, step away from the situation now, take 10 slow breaths, and call a trusted person or counsellor immediately. If you feel you may lose control, call 112 right now. Helpline: ${HELPLINE_NUMBER}.`;
    }

    return `This sounds very heavy, and you do not have to handle it alone. Please contact a trusted person or college counsellor right now, and reach out to a helpline: ${HELPLINE_NUMBER}. If there is immediate danger, call 112 now.`;
}

function sanitizeAssistantReply(rawReply, language) {
    const neutralYou = language === "hindi" ? "आप" : (language === "hinglish" ? "aap" : "you");
    const slashPlaceholder = /\b(?:aurat|male|female|boy|girl)\s*\/\s*(?:aurat|male|female|boy|girl)\b/gi;

    const base = String(rawReply || "")
        .replace(/\*\*/g, "")
        .replace(slashPlaceholder, neutralYou)
        .trim();

    if (!base) {
        return getLocalizedFallbackReply(language);
    }

    const lines = base
        .split(/\r?\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

    const deduped = [];
    for (const line of lines) {
        const normalized = line.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/gi, " ").trim();
        const prevLine = deduped[deduped.length - 1] || "";
        const prevNormalized = prevLine.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/gi, " ").trim();
        if (normalized && normalized !== prevNormalized) {
            deduped.push(line);
        }
    }

    const cleaned = deduped.join("\n").trim();
    return cleaned || getLocalizedFallbackReply(language);
}

function shouldAppendSafetyFollowup(reply, riskCategory) {
    const text = String(reply || "");
    const hasEmergencyDirection = /\b112\b|helpline|nimhans|i\s*call|trusted person|भरोसेमंद|हेल्पलाइन/i.test(text);
    if (!hasEmergencyDirection) {
        return true;
    }

    if (riskCategory === "violence") {
        return !(/can'?t help|cannot help|nuksan|harm anyone|किसी को नुकसान/i.test(text));
    }

    return false;
}

function getMailTransporter() {
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
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

    if (!ALERT_EMAIL || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return;
    }

    try {
        const transporter = getMailTransporter();
        await transporter.sendMail({
            from: `"eUdyaan Alert" <${process.env.EMAIL_USER}>`,
            to: ALERT_EMAIL,
            subject: "[eUdyaan] Risk Alert Triggered",
            text: [
                "A high-risk message was detected.",
                `Time: ${snapshot.at}`,
                `User ID: ${snapshot.userId}`,
                `Client IP: ${snapshot.clientIp}`,
                "Message:",
                snapshot.message
            ].join("\n")
        });
    } catch (error) {
        console.error("Risk alert email failed:", error.message);
    }
}

function getClientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = Array.isArray(forwarded)
        ? forwarded[0]
        : (typeof forwarded === "string" ? forwarded.split(",")[0] : req.ip);
    return String(ip || "unknown").trim();
}

function aiSupportRateLimiter(req, res, next) {
    const key = getClientIp(req);
    const now = Date.now();

    if (now - aiSupportLastCleanupAt > aiRateWindowMs) {
        aiSupportLastCleanupAt = now;
        for (const [bucketKey, bucket] of aiRateBuckets.entries()) {
            if (now >= bucket.resetAt) {
                aiRateBuckets.delete(bucketKey);
            }
        }
    }

    if (!aiRateBuckets.has(key) && aiRateBuckets.size >= aiRateMaxKeys) {
        return res.status(503).json({ error: "Server is busy. Please try again in a moment." });
    }

    const current = aiRateBuckets.get(key);

    if (!current || now >= current.resetAt) {
        aiRateBuckets.set(key, { count: 1, resetAt: now + aiRateWindowMs });
        return next();
    }

    current.count += 1;
    if (current.count > aiRateMaxRequests) {
        const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
        res.setHeader("Retry-After", String(Math.max(retryAfterSeconds, 1)));
        return res.status(429).json({ error: "Too many requests. Please wait and try again." });
    }

    return next();
}

function aiRiskAlertRateLimiter(req, res, next) {
    const key = getClientIp(req);
    const now = Date.now();

    if (now - aiRiskAlertLastCleanupAt > aiRateWindowMs) {
        aiRiskAlertLastCleanupAt = now;
        for (const [bucketKey, bucket] of aiRiskAlertBuckets.entries()) {
            if (now >= bucket.resetAt) {
                aiRiskAlertBuckets.delete(bucketKey);
            }
        }
    }

    if (!aiRiskAlertBuckets.has(key) && aiRiskAlertBuckets.size >= aiRateMaxKeys) {
        return res.status(503).json({ error: "Server is busy. Please try again in a moment." });
    }

    const current = aiRiskAlertBuckets.get(key);

    if (!current || now >= current.resetAt) {
        aiRiskAlertBuckets.set(key, { count: 1, resetAt: now + aiRateWindowMs });
        return next();
    }

    current.count += 1;
    if (current.count > aiRiskAlertRateMaxRequests) {
        const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
        res.setHeader("Retry-After", String(Math.max(retryAfterSeconds, 1)));
        return res.status(429).json({ error: "Too many risk alert events. Please wait and try again." });
    }

    return next();
}

async function requireAuthenticatedUser(req, res, next) {
    try {
        const userId = String(req.body?.userId || "").trim();
        if (!/^[a-fA-F0-9]{24}$/.test(userId)) {
            return res.status(401).json({ error: "Login required" });
        }

        const user = await User.findById(userId, { _id: 1 }).lean();
        if (!user?._id) {
            return res.status(401).json({ error: "Login required" });
        }

        req.authUserId = String(user._id);
        return next();
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

// Middleware
app.use(cors());
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

app.post("/api/ai/risk-alert", requireAuthenticatedUser, aiRiskAlertRateLimiter, async (req, res) => {
    try {
        const { source = "ai_support_client_block", message = "", triggerTerm = "", metadata = {} } = req.body || {};
        const normalizedSource = String(source || "").trim().toLowerCase();
        if (!AI_CLIENT_ALERT_SOURCES.has(normalizedSource)) {
            return res.status(400).json({ error: "Invalid source" });
        }

        const normalizedMessage = String(message || "").trim().slice(0, 2000);
        if (!normalizedMessage) {
            return res.status(400).json({ error: "Message is required" });
        }

        const normalizedTrigger = String(triggerTerm || "").trim();
        if (!hasSeriousRiskSignal(normalizedMessage) && !normalizedTrigger) {
            return res.status(422).json({ error: "Risk signal not detected" });
        }

        await RiskAlert.create({
            source: normalizedSource,
            userId: req.authUserId,
            anonymousId: "",
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

app.post("/api/ai/support", requireAuthenticatedUser, aiSupportRateLimiter, async (req, res) => {
    try {
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) {
            return res.status(500).json({ error: "GROQ_API_KEY is missing in backend/.env" });
        }

        const { message, history, preferredLanguage } = req.body || {};
        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "Message is required" });
        }
        const conversationLanguage = resolveConversationLanguage(message, preferredLanguage);
        const riskSignal = detectRiskSignal(message);
        const serious = riskSignal.matched;
        if (serious) {
            void notifyRiskAlertInBackground({
                userId: req.authUserId,
                clientIp: getClientIp(req),
                at: new Date().toISOString(),
                message
            });
            await RiskAlert.create({
                source: "ai_support",
                userId: req.authUserId,
                anonymousId: "",
                clientIp: getClientIp(req),
                message: String(message || ""),
                triggerTerm: riskSignal.term || "risk_pattern",
                metadata: {
                    language: conversationLanguage,
                    riskCategory: riskSignal.category
                }
            });
        }

        const safeHistory = Array.isArray(history)
            ? history
                .slice(-10)
                .map((msg) => ({
                    role: msg?.role === "assistant" ? "assistant" : "user",
                    content: String(msg?.content || "")
                }))
                .filter((msg) => msg.content.trim().length > 0)
            : [];
        const systemPrompt = `You are a warm, human-sounding mental wellness assistant for Indian college students. Sound like a caring person in chat, not like a template warning bot. Keep language simple, kind, and conversational. Keep replies short (2-5 lines), practical, and easy to act on. Validate feelings first, then suggest 1-2 small next steps. Never use placeholders like "AURAT/MALE" and never repeat the same sentence. Do not diagnose conditions. If user expresses intent to self-harm or to harm others (weapons, bombing, attacking), refuse any harmful guidance, de-escalate calmly, and strongly advise contacting emergency services (112) plus a trusted person immediately. Reference Indian support systems like college counsellor, NIMHANS, or iCall when relevant. Helpline details: ${HELPLINE_NUMBER}. ${getLanguageInstruction(conversationLanguage)} Always match the user's current conversation language and style. If the user switches language, switch too.`;
        const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model,
                temperature: 0.3,
                max_tokens: 160,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...safeHistory,
                    { role: "user", content: message }
                ]
            })
        });

        if (!groqResponse.ok) {
            const raw = await groqResponse.text();
            let details = raw;
            let parsedCode = "";
            try {
                const parsed = JSON.parse(raw);
                const msg = parsed?.error?.message || parsed?.message || raw;
                const code = parsed?.error?.code ? ` (code: ${parsed.error.code})` : "";
                parsedCode = String(parsed?.error?.code || "");
                details = `${msg}${code}`;
            } catch (_) {
                // Keep raw text when response is not JSON.
            }

            const isUpstreamRateLimit = groqResponse.status === 429 ||
                parsedCode === "rate_limit_exceeded" ||
                /rate limit|too many requests|rate_limit_exceeded/i.test(details);

            if (isUpstreamRateLimit) {
                const waitMatch = details.match(/try again in\s*([0-9]+(?:\.[0-9]+)?)s/i);
                const retryAfter = waitMatch ? Math.max(1, Math.ceil(Number(waitMatch[1]))) : 5;
                res.setHeader("Retry-After", String(retryAfter));
                return res.status(429).json({
                    error: "Too many requests. Please wait a moment and try again.",
                    details,
                    status: 429
                });
            }

            return res.status(502).json({
                error: "Groq request failed",
                details,
                status: groqResponse.status
            });
        }

        const data = await groqResponse.json();
        let reply = data?.choices?.[0]?.message?.content || "";
        reply = sanitizeAssistantReply(reply, conversationLanguage);
        if (serious) {
            if (shouldAppendSafetyFollowup(reply, riskSignal.category)) {
                reply += `\n\n${getLocalizedCrisisAlert(conversationLanguage, riskSignal.category)}`;
            }
        }

        await ChatSupportLog.create({
            userId: req.authUserId,
            clientIp: getClientIp(req),
            language: conversationLanguage,
            message: String(message || ""),
            reply: String(reply || ""),
            serious: Boolean(serious)
        });

        return res.json({ reply, serious, riskCategory: serious ? riskSignal.category : "none" });
    } catch (error) {
        return res.status(500).json({ error: "AI support error", details: error.message });
    }
});

// --- NEW CODE STARTS HERE ---

// 1. Serve static files (CSS, Images, JS) from the frontend folder
app.use(express.static(path.join(__dirname, "../frontend")));

// 2. Serve the HTML file when someone visits the homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// --- NEW CODE ENDS HERE ---

// Connect MongoDB
if (!process.env.MONGO_URI) {
    console.error("Missing MONGO_URI in backend/.env");
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
