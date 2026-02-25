const path = require('path');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const HELPLINE_NUMBER = process.env.HELPLINE_NUMBER || "988 (US Suicide & Crisis Lifeline)";

function hasSeriousRiskSignal(text) {
    if (!text || typeof text !== "string") return false;
    const input = text.toLowerCase();
    const patterns = [
        /\bsuicide\b/,
        /\bkill myself\b/,
        /\bend my life\b/,
        /\bself[- ]?harm\b/,
        /\bi want to die\b/,
        /\bi do not want to live\b/,
        /\bhurt myself\b/,
        /\bno reason to live\b/,
        /\bend it all\b/,
        /\bquit life\b/,
        /\bquit living\b/
    ];
    return patterns.some((pattern) => pattern.test(input));
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
const communityRoutes = require("./routes/community");
const contactRoutes = require("./routes/contact");
app.use("/api/auth", authRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/contact", contactRoutes);

app.post("/api/ai/support", async (req, res) => {
    try {
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) {
            return res.status(500).json({ error: "GROQ_API_KEY is missing in backend/.env" });
        }

        const { message, history } = req.body || {};
        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "Message is required" });
        }
        const serious = hasSeriousRiskSignal(message);

        const safeHistory = Array.isArray(history)
            ? history
                .slice(-10)
                .map((msg) => ({
                    role: msg?.role === "assistant" ? "assistant" : "user",
                    content: String(msg?.content || "")
                }))
                .filter((msg) => msg.content.trim().length > 0)
            : [];
        const systemPrompt = `You are a warm and supportive mental wellness assistant for college students. Keep language simple, kind, and conversational. Keep replies short (2-5 lines), practical, and easy to act on. Let users chat freely. Validate feelings first, then suggest 1-2 small next steps. Do not diagnose conditions. If user mentions self-harm or immediate danger, clearly advise contacting local emergency services and a trusted person immediately. Use this helpline in crisis: ${HELPLINE_NUMBER}.`;
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
            try {
                const parsed = JSON.parse(raw);
                const msg = parsed?.error?.message || parsed?.message || raw;
                const code = parsed?.error?.code ? ` (code: ${parsed.error.code})` : "";
                details = `${msg}${code}`;
            } catch (_) {
                // Keep raw text when response is not JSON.
            }
            return res.status(502).json({
                error: "Groq request failed",
                details,
                status: groqResponse.status
            });
        }

        const data = await groqResponse.json();
        let reply = data?.choices?.[0]?.message?.content || "I was unable to generate a response.";
        if (serious) {
            reply += `\n\nThis seems serious. Please contact ${HELPLINE_NUMBER} now and reach out to a trusted person immediately.`;
        }
        return res.json({ reply, serious });
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
