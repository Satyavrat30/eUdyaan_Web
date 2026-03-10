const base = "http://localhost:5000";

const languages = [
  { code: "english", message: "I feel stressed about exams. Please suggest two small steps.", regex: /[A-Za-z]/u },
  { code: "hinglish", message: "Mujhe exams ka pressure hai, do chhote steps batao.", regex: /[A-Za-z]/u },
  { code: "hindi", message: "मुझे पढ़ाई को लेकर तनाव है, दो छोटे कदम बताइए।", regex: /[\u0900-\u097F]/u },
  { code: "bengali", message: "আমার পড়াশোনা নিয়ে খুব চাপ লাগছে, দুটো ছোট পদক্ষেপ বলো।", regex: /[\u0980-\u09FF]/u },
  { code: "telugu", message: "నాకు చదువు గురించి చాలా టెన్షన్ ఉంది, రెండు చిన్న స్టెప్స్ చెప్పండి.", regex: /[\u0C00-\u0C7F]/u },
  { code: "marathi", message: "मला अभ्यासाबद्दल ताण वाटतो आहे, दोन छोटे उपाय सांगा.", regex: /[\u0900-\u097F]/u },
  { code: "tamil", message: "எனக்கு படிப்பைப் பற்றி அதிக அழுத்தம் உள்ளது, இரண்டு சிறிய படிகளை சொல்லுங்கள்.", regex: /[\u0B80-\u0BFF]/u },
  { code: "urdu", message: "مجھے پڑھائی کے بارے میں بہت دباؤ محسوس ہو رہا ہے، دو چھوٹے اقدامات بتائیں۔", regex: /[\u0600-\u06FF]/u },
  { code: "gujarati", message: "મને અભ્યાસ અંગે ઘણો તણાવ છે, બે નાના પગલા જણાવો.", regex: /[\u0A80-\u0AFF]/u },
  { code: "kannada", message: "ನನಗೆ ಓದಿನ ಬಗ್ಗೆ ತುಂಬಾ ಒತ್ತಡವಾಗಿದೆ, ಎರಡು ಚಿಕ್ಕ ಹೆಜ್ಜೆಗಳು ಹೇಳಿ.", regex: /[\u0C80-\u0CFF]/u },
  { code: "malayalam", message: "എനിക്ക് പഠനത്തെ കുറിച്ച് വളരെ സമ്മർദ്ദമുണ്ട്, രണ്ട് ചെറിയ ഘട്ടങ്ങൾ പറയൂ.", regex: /[\u0D00-\u0D7F]/u },
  { code: "odia", message: "ମୋତେ ପଢ଼ାଶୁଣା ନେଇ ବହୁତ ଚାପ ଲାଗୁଛି, ଦୁଇଟି ଛୋଟ ପଦକ୍ଷେପ କହନ୍ତୁ।", regex: /[\u0B00-\u0B7F]/u },
  { code: "punjabi", message: "ਮੈਨੂੰ ਪੜ੍ਹਾਈ ਬਾਰੇ ਬਹੁਤ ਤਣਾਅ ਹੈ, ਦੋ ਛੋਟੇ ਕਦਮ ਦੱਸੋ।", regex: /[\u0A00-\u0A7F]/u },
  { code: "assamese", message: "মোৰ পঢ়াশুনাক লৈ বহুত চাপ অনুভৱ হৈছে, দুটা সৰু পদক্ষেপ কওক।", regex: /[\u0980-\u09FF]/u }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

(async () => {
  const runId = Date.now();
  const email = `langtest_${runId}@example.com`;
  const password = "Aa!LangTest123";

  const signup = await postJson(`${base}/api/auth/signup`, {
    name: `Lang Test ${runId}`,
    email,
    password
  });

  if (!signup.response.ok && !signup.data?.success) {
    console.log("SIGNUP_FAILED", JSON.stringify(signup.data));
    process.exit(1);
  }

  const login = await postJson(`${base}/api/auth/login`, { email, password });
  if (!login.response.ok || !login.data?.success || !login.data?.sessionToken) {
    console.log("LOGIN_FAILED", JSON.stringify(login.data));
    process.exit(1);
  }

  const token = login.data.sessionToken;
  const results = [];

  for (let index = 0; index < languages.length; index += 1) {
    const language = languages[index];
    let attempt = 0;
    let ok = false;
    let status = 0;
    let error = "";
    let reply = "";

    while (attempt < 4 && !ok) {
      attempt += 1;
      const { response, data } = await postJson(
        `${base}/api/ai/support`,
        {
          message: language.message,
          history: [],
          preferredLanguage: language.code
        },
        {
          Authorization: `Bearer ${token}`,
          "x-forwarded-for": `10.0.0.${(index % 240) + 10}`
        }
      );

      status = response.status;
      if (response.ok && typeof data?.reply === "string" && data.reply.trim()) {
        ok = true;
        reply = data.reply.trim();
        error = "";
        break;
      }

      error = String(data?.error || data?.details || `HTTP_${response.status}`);
      if (status === 429) {
        const retryAfterHeader = Number(response.headers.get("retry-after") || 0);
        const waitMs = Math.max(1500, (Number.isFinite(retryAfterHeader) ? retryAfterHeader : 0) * 1000);
        await sleep(waitMs);
      }
    }

    const scriptOk = ok ? language.regex.test(reply) : false;

    results.push({
      language: language.code,
      httpOk: ok,
      scriptOk,
      status,
      attempts: attempt,
      error,
      replyPreview: reply ? reply.slice(0, 140).replace(/\s+/g, " ") : ""
    });

    await sleep(1200);
  }

  const httpPass = results.filter((item) => item.httpOk).length;
  const scriptPass = results.filter((item) => item.httpOk && item.scriptOk).length;

  console.log("\nLANGUAGE_TEST_SUMMARY");
  console.log(
    JSON.stringify(
      {
        total: results.length,
        httpPass,
        scriptPass,
        httpFail: results.length - httpPass,
        scriptFail: results.length - scriptPass
      },
      null,
      2
    )
  );

  console.log("\nLANGUAGE_TEST_RESULTS");
  console.table(results);
})();
