const base = "http://localhost:5000";

const languages = [
  { code: "telugu", message: "నాకు చదువు గురించి చాలా టెన్షన్ ఉంది, రెండు చిన్న స్టెప్స్ చెప్పండి.", regex: /[\u0C00-\u0C7F]/u },
  { code: "tamil", message: "எனக்கு படிப்பைப் பற்றி அதிக அழுத்தம் உள்ளது, இரண்டு சிறிய படிகளை சொல்லுங்கள்.", regex: /[\u0B80-\u0BFF]/u },
  { code: "urdu", message: "مجھے پڑھائی کے بارے میں بہت دباؤ محسوس ہو رہا ہے، دو چھوٹے اقدامات بتائیں۔", regex: /[\u0600-\u06FF]/u },
  { code: "gujarati", message: "મને અભ્યાસ અંગે ઘણો તણાવ છે, બે નાના પગલા જણાવો.", regex: /[\u0A80-\u0AFF]/u },
  { code: "kannada", message: "ನನಗೆ ಓದಿನ ಬಗ್ಗೆ ತುಂಬಾ ಒತ್ತಡವಾಗಿದೆ, ಎರಡು ಚಿಕ್ಕ ಹೆಜ್ಜೆಗಳು ಹೇಳಿ.", regex: /[\u0C80-\u0CFF]/u },
  { code: "malayalam", message: "എനിക്ക് പഠനത്തെ കുറിച്ച് വളരെ സമ്മർദ്ദമുണ്ട്, രണ്ട് ചെറിയ ഘട്ടങ്ങൾ പറയൂ.", regex: /[\u0D00-\u0D7F]/u },
  { code: "odia", message: "ମୋତେ ପଢ଼ାଶୁଣା ନେଇ ବହୁତ ଚାପ ଲାଗୁଛି, ଦୁଇଟି ଛୋଟ ପଦକ୍ଷେପ କହନ୍ତୁ।", regex: /[\u0B00-\u0B7F]/u },
  { code: "assamese", message: "মোৰ পঢ়াশুনাক লৈ বহুত চাপ অনুভৱ হৈছে, দুটা সৰু পদক্ষেপ কওক।", regex: /[\u0980-\u09FF]/u }
];

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

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
  const email = `langretest_${runId}@example.com`;
  const password = "Aa!LangRetest123";

  const signup = await postJson(`${base}/api/auth/signup`, {
    name: `Lang Retest ${runId}`,
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

  for (const language of languages) {
    const { response, data } = await postJson(
      `${base}/api/ai/support`,
      { message: language.message, history: [], preferredLanguage: language.code },
      { Authorization: `Bearer ${token}` }
    );

    const reply = String(data?.reply || "").trim();
    results.push({
      language: language.code,
      httpOk: response.ok,
      scriptOk: response.ok ? language.regex.test(reply) : false,
      status: response.status,
      error: String(data?.error || data?.details || ""),
      replyPreview: reply.slice(0, 140).replace(/\s+/g, " ")
    });

    await sleep(500);
  }

  console.log("\nLANGUAGE_RETEST_RESULTS");
  console.table(results);
})();
