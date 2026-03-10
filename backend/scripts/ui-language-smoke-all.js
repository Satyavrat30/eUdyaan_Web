const base = "http://localhost:5000";

const testCases = [
  { language: "english", message: "I feel stressed about exams. Please suggest two small steps.", scriptRegex: /[A-Za-z]/u },
  { language: "hinglish", message: "Mujhe exams ka pressure hai, do chhote steps batao.", scriptRegex: /[A-Za-z]/u },
  { language: "hindi", message: "मुझे पढ़ाई को लेकर तनाव है, दो छोटे कदम बताइए।", scriptRegex: /[\u0900-\u097F]/u },
  { language: "bengali", message: "আমার পড়াশোনা নিয়ে খুব চাপ লাগছে, দুটো ছোট পদক্ষেপ বলো।", scriptRegex: /[\u0980-\u09FF]/u },
  { language: "telugu", message: "నాకు చదువు గురించి చాలా టెన్షన్ ఉంది, రెండు చిన్న స్టెప్స్ చెప్పండి.", scriptRegex: /[\u0C00-\u0C7F]/u },
  { language: "marathi", message: "मला अभ्यासाबद्दल ताण वाटतो आहे, दोन छोटे उपाय सांगा.", scriptRegex: /[\u0900-\u097F]/u },
  { language: "tamil", message: "எனக்கு படிப்பைப் பற்றி அழுத்தம் உள்ளது, இரண்டு சிறிய படிகள் சொல்லுங்கள்.", scriptRegex: /[\u0B80-\u0BFF]/u },
  { language: "urdu", message: "مجھے پڑھائی کے بارے میں بہت دباؤ محسوس ہو رہا ہے، دو چھوٹے اقدامات بتائیں۔", scriptRegex: /[\u0600-\u06FF]/u },
  { language: "gujarati", message: "મને અભ્યાસ અંગે ઘણો તણાવ છે, બે નાના પગલા જણાવો.", scriptRegex: /[\u0A80-\u0AFF]/u },
  { language: "kannada", message: "ನನಗೆ ಓದಿನ ಬಗ್ಗೆ ತುಂಬಾ ಒತ್ತಡವಾಗಿದೆ, ಎರಡು ಚಿಕ್ಕ ಹೆಜ್ಜೆಗಳು ಹೇಳಿ.", scriptRegex: /[\u0C80-\u0CFF]/u },
  { language: "malayalam", message: "എനിക്ക് പഠനത്തെ കുറിച്ച് വളരെ സമ്മർദ്ദമുണ്ട്, രണ്ട് ചെറിയ ഘട്ടങ്ങൾ പറയൂ.", scriptRegex: /[\u0D00-\u0D7F]/u },
  { language: "odia", message: "ମୋତେ ପଢ଼ାଶୁଣା ନେଇ ବହୁତ ଚାପ ଲାଗୁଛି, ଦୁଇଟି ଛୋଟ ପଦକ୍ଷେପ କହନ୍ତୁ।", scriptRegex: /[\u0B00-\u0B7F]/u },
  { language: "punjabi", message: "ਮੈਨੂੰ ਪੜ੍ਹਾਈ ਬਾਰੇ ਬਹੁਤ ਤਣਾਅ ਹੈ, ਦੋ ਛੋਟੇ ਕਦਮ ਦੱਸੋ।", scriptRegex: /[\u0A00-\u0A7F]/u },
  { language: "assamese", message: "মোৰ পঢ়াশুনাক লৈ বহুত চাপ অনুভৱ হৈছে, দুটা সৰু পদক্ষেপ কওক।", scriptRegex: /[\u0980-\u09FF]/u }
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
  const email = `uismokeall_${runId}@example.com`;
  const password = "Aa!UiSmokeAll123";
  const baseIpOctet = 20 + (runId % 180);

  const signup = await postJson(
    `${base}/api/auth/signup`,
    {
      name: `UI Smoke All ${runId}`,
      email,
      password
    },
    { "x-forwarded-for": `10.88.${baseIpOctet}.10` }
  );

  if (!signup.response.ok || !signup.data?.success) {
    console.log("SIGNUP_FAILED", signup.response.status, signup.data);
    process.exit(1);
  }

  const login = await postJson(
    `${base}/api/auth/login`,
    { email, password },
    { "x-forwarded-for": `10.88.${baseIpOctet}.11` }
  );
  if (!login.response.ok || !login.data?.sessionToken) {
    console.log("LOGIN_FAILED", login.response.status, login.data);
    process.exit(1);
  }

  const token = login.data.sessionToken;
  const results = [];

  for (const item of testCases) {
    let attempts = 0;
    let done = false;
    let status = 0;
    let error = "";
    let reply = "";

    while (!done && attempts < 4) {
      attempts += 1;
      const { response, data } = await postJson(
        `${base}/api/ai/support`,
        {
          message: item.message,
          history: [],
          preferredLanguage: item.language
        },
        {
          Authorization: `Bearer ${token}`,
          "x-forwarded-for": `10.88.${baseIpOctet}.${30 + attempts}`
        }
      );

      status = response.status;
      if (response.ok && typeof data?.reply === "string" && data.reply.trim()) {
        done = true;
        reply = data.reply.trim();
        error = "";
        break;
      }

      error = String(data?.error || data?.details || "");
      if (status === 429) {
        const retryAfter = Number(response.headers.get("retry-after") || 0);
        await sleep(Math.max(1500, retryAfter * 1000));
      } else {
        done = true;
      }
    }

    const httpOk = Boolean(reply);
    const scriptOk = httpOk ? item.scriptRegex.test(reply) : false;

    results.push({
      language: item.language,
      httpOk,
      scriptOk,
      status,
      attempts,
      error,
      replyPreview: reply.slice(0, 120).replace(/\s+/g, " ")
    });

    await sleep(1000);
  }

  const httpPass = results.filter((r) => r.httpOk).length;
  const scriptPass = results.filter((r) => r.httpOk && r.scriptOk).length;

  console.log("\nUI_LANGUAGE_SMOKE_ALL_SUMMARY");
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

  console.log("\nUI_LANGUAGE_SMOKE_ALL_RESULTS");
  console.table(results);
})();
