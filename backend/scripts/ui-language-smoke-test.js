const base = "http://localhost:5000";

const testCases = [
  {
    language: "odia",
    message: "ମୋତେ ପଢ଼ାଶୁଣା ନେଇ ଚାପ ଲାଗୁଛି, ଦୁଇଟି ଛୋଟ ପଦକ୍ଷେପ କହନ୍ତୁ।",
    scriptRegex: /[\u0B00-\u0B7F]/u
  },
  {
    language: "hindi",
    message: "मुझे पढ़ाई को लेकर तनाव है, दो छोटे कदम बताइए।",
    scriptRegex: /[\u0900-\u097F]/u
  },
  {
    language: "tamil",
    message: "எனக்கு படிப்பைப் பற்றி அழுத்தம் உள்ளது, இரண்டு சிறிய படிகள் சொல்லுங்கள்.",
    scriptRegex: /[\u0B80-\u0BFF]/u
  }
];

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
  const email = `uismoke_${runId}@example.com`;
  const password = "Aa!UiSmoke123";

  await postJson(`${base}/api/auth/signup`, {
    name: `UI Smoke ${runId}`,
    email,
    password
  });

  const login = await postJson(`${base}/api/auth/login`, { email, password });
  if (!login.response.ok || !login.data?.sessionToken) {
    console.log("LOGIN_FAILED", login.response.status, login.data);
    process.exit(1);
  }

  const token = login.data.sessionToken;
  const results = [];

  for (const item of testCases) {
    const { response, data } = await postJson(
      `${base}/api/ai/support`,
      {
        message: item.message,
        history: [],
        preferredLanguage: item.language
      },
      { Authorization: `Bearer ${token}` }
    );

    const reply = String(data?.reply || "").trim();
    results.push({
      language: item.language,
      httpOk: response.ok,
      status: response.status,
      scriptOk: response.ok ? item.scriptRegex.test(reply) : false,
      replyPreview: reply.slice(0, 120).replace(/\s+/g, " "),
      error: data?.error || data?.details || ""
    });
  }

  console.log("\nUI_LANGUAGE_SMOKE_RESULTS");
  console.table(results);
})();
