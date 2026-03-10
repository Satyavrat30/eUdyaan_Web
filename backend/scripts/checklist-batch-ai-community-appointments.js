/* eslint-disable no-console */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";

const runId = Date.now();
const seed = (runId % 180) + 40;
const ip = (last) => `10.55.${seed}.${last}`;

const results = [];

function record(id, pass, note = "") {
  results.push({ id, pass, note });
  const mark = pass ? "✅" : "❌";
  console.log(`${mark} #${id}${note ? ` - ${note}` : ""}`);
}

function includesAny(value, terms) {
  const text = String(value || "").toLowerCase();
  return terms.some((term) => text.includes(String(term).toLowerCase()));
}

function regexTest(value, regex) {
  return regex.test(String(value || ""));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(endpoint, options = {}, forcedIp = ip(10)) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "x-forwarded-for": forcedIp,
      ...(options.headers || {})
    }
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    data = {};
  }

  return { status: response.status, data, headers: response.headers };
}

async function askAi({ token, message, history = [], preferredLanguage, callIp }) {
  let attempts = 0;
  while (attempts < 4) {
    attempts += 1;
    const payload = { message, history };
    if (preferredLanguage) payload.preferredLanguage = preferredLanguage;

    const res = await request(
      "/api/ai/support",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      },
      callIp
    );

    if (res.status === 200) return res;
    if (res.status !== 429) return res;

    const retryAfter = Number(res.headers.get("retry-after") || 0);
    await sleep(Math.max(1500, retryAfter * 1000));
  }

  return { status: 429, data: { error: "Too many requests" }, headers: new Headers() };
}

async function signupAndLogin(namePrefix, emailPrefix, password, signupIp, loginIp) {
  const email = `${emailPrefix}.${runId}@example.com`;

  const signup = await request(
    "/api/auth/signup",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${namePrefix} ${runId}`, email, password })
    },
    signupIp
  );

  const login = await request(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    },
    loginIp
  );

  return {
    email,
    signup,
    login,
    token: String(login.data?.sessionToken || ""),
    userId: String(login.data?.user?.id || "")
  };
}

(async () => {
  let shouldFail = false;
  try {
    const password = "Batch3@123";

    const userA = await signupAndLogin("Batch3 UserA", "batch3.usera", password, ip(11), ip(12));
    const userB = await signupAndLogin("Batch3 UserB", "batch3.userb", password, ip(13), ip(14));

    const tokenA = userA.token;
    const tokenB = userB.token;

    if (!tokenA || !tokenB) {
      console.log("SETUP_FAILED", { tokenA: !!tokenA, tokenB: !!tokenB });
      process.exitCode = 1;
      return;
    }

    // #56: post while logged out
    const noAuthPost = await request(
      "/api/community/posts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "No auth", content: "test", tags: ["testing"] })
      },
      ip(15)
    );
    record(56, noAuthPost.status === 401);

    // #55: valid post
    const validPost = await request(
      "/api/community/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ title: `Valid Post ${runId}`, content: "normal community content", tags: ["testing"] })
      },
      ip(16)
    );
    const validPostId = String(validPost.data?.post?.id || "");
    record(55, validPost.status === 201 && !!validPostId);

    // #57: no title validation
    const noTitlePost = await request(
      "/api/community/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ title: "", content: "content", tags: ["testing"] })
      },
      ip(16)
    );
    record(57, noTitlePost.status === 400);

    // #60: violence post blocked
    const violenceBlocked = await request(
      "/api/community/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ title: "Risk", content: "I want to bomb the college", tags: ["help"] })
      },
      ip(17)
    );
    record(60, violenceBlocked.status === 422);

    // #61: script tags stripped
    const xssPost = await request(
      "/api/community/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ title: "<script>alert(1)</script>", content: "safe body", tags: ["testing"] })
      },
      ip(18)
    );
    const sanitized = xssPost.status === 201 && !String(xssPost.data?.post?.title || "").includes("<");
    record(61, sanitized);

    // Create posts for sorting/filter tests
    const tagPostA = await request(
      "/api/community/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ title: `Tag Anxiety ${runId}`, content: "anxiety tag post", tags: ["anxiety"] })
      },
      ip(19)
    );

    const popBase = await request(
      "/api/community/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ title: `Pop Base ${runId}`, content: "base popularity", tags: ["testing"] })
      },
      ip(20)
    );

    const popBoost = await request(
      "/api/community/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ title: `Pop Boost ${runId}`, content: "boost popularity", tags: ["testing"] })
      },
      ip(21)
    );

    const popBaseId = String(popBase.data?.post?.id || "");
    const popBoostId = String(popBoost.data?.post?.id || "");

    // Boost second post popularity via another user
    await request(
      `/api/community/posts/${popBoostId}/vote`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({ direction: "up" })
      },
      ip(22)
    );

    // #62 page + limit
    const pageLimit = await request("/api/community/posts?page=1&limit=1", {}, ip(23));
    const pageLimitPass =
      pageLimit.status === 200 &&
      Array.isArray(pageLimit.data?.posts) &&
      pageLimit.data.posts.length <= 1 &&
      typeof pageLimit.data?.pagination?.total === "number";
    record(62, pageLimitPass);

    // #63 popular sort
    const popular = await request("/api/community/posts?sort=popular&page=1&limit=20", {}, ip(23));
    const popularIds = (popular.data?.posts || []).map((item) => String(item.id));
    const popOrderPass = popular.status === 200 && popularIds.indexOf(popBoostId) >= 0 && popularIds.indexOf(popBaseId) >= 0 && popularIds.indexOf(popBoostId) < popularIds.indexOf(popBaseId);
    record(63, popOrderPass);

    // #64 tag filter
    const tagFilter = await request("/api/community/posts?tag=anxiety&page=1&limit=20", {}, ip(24));
    const tagPass =
      tagFilter.status === 200 &&
      Array.isArray(tagFilter.data?.posts) &&
      (tagFilter.data.posts.length === 0 || tagFilter.data.posts.every((item) => Array.isArray(item.tags) && item.tags.includes("anxiety")));
    record(64, tagPass);

    // #65 days filter
    const daysFilter = await request("/api/community/posts?days=7&page=1&limit=50", {}, ip(25));
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const daysPass =
      daysFilter.status === 200 &&
      Array.isArray(daysFilter.data?.posts) &&
      daysFilter.data.posts.every((item) => new Date(item.createdAt).getTime() >= sevenDaysAgo);
    record(65, daysPass);

    // #67 reply to reply nested
    const nestedPost = await request(
      "/api/community/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ title: `Nested ${runId}`, content: "nested base", tags: ["testing"] })
      },
      ip(26)
    );
    const nestedPostId = String(nestedPost.data?.post?.id || "");

    const reply1 = await request(
      `/api/community/posts/${nestedPostId}/replies`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ content: "first reply" })
      },
      ip(26)
    );

    const reply1Id = String(reply1.data?.post?.replies?.[reply1.data?.post?.replies?.length - 1]?._id || "");

    const reply2 = await request(
      `/api/community/posts/${nestedPostId}/replies`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ content: "nested reply", parentReplyId: reply1Id })
      },
      ip(26)
    );

    let nestedPass = false;
    if (reply2.status === 200) {
      const rootReplies = reply2.data?.post?.replies || [];
      const parent = rootReplies.find((item) => String(item._id) === reply1Id);
      nestedPass = !!parent && Array.isArray(parent.replies) && parent.replies.some((item) => String(item.content || "") === "nested reply");
    }
    record(67, nestedPass);

    // #70 upvote same post again toggles off
    const togglePost = await request(
      "/api/community/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ title: `Toggle ${runId}`, content: "toggle test", tags: ["testing"] })
      },
      ip(27)
    );
    const toggleId = String(togglePost.data?.post?.id || "");

    const toggleVote = await request(
      `/api/community/posts/${toggleId}/vote`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ direction: "up" })
      },
      ip(27)
    );
    record(70, toggleVote.status === 200 && Number(toggleVote.data?.userVote) === 0);

    // #72 upvote after downvote (+2)
    const swingPost = await request(
      "/api/community/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ title: `Swing ${runId}`, content: "swing vote", tags: ["testing"] })
      },
      ip(28)
    );
    const swingId = String(swingPost.data?.post?.id || "");

    const down1 = await request(
      `/api/community/posts/${swingId}/vote`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({ direction: "down" })
      },
      ip(28)
    );

    const upAfterDown = await request(
      `/api/community/posts/${swingId}/vote`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({ direction: "up" })
      },
      ip(28)
    );

    const swingPass =
      down1.status === 200 && upAfterDown.status === 200 && Number(upAfterDown.data?.userVote) === 1 && Number(upAfterDown.data?.likes) === Number(down1.data?.likes) + 2;
    record(72, swingPass);

    // #78 + #79 appointment cancel edge cases
    const appointmentA = await request(
      "/api/appointments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          consultantName: "Dr Cancel",
          consultantRole: "Clinical Psychologist",
          appointmentType: "Video Call",
          appointmentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          appointmentTime: "11:30 AM"
        })
      },
      ip(29)
    );

    const appointmentAId = String(appointmentA.data?.appointment?.id || "");
    const cancel1 = await request(`/api/appointments/${appointmentAId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` }
    }, ip(29));
    const cancel2 = await request(`/api/appointments/${appointmentAId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` }
    }, ip(29));
    record(78, cancel1.status === 200 && cancel2.status === 404);

    const appointmentB = await request(
      "/api/appointments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({
          consultantName: "Dr Ownership",
          consultantRole: "Clinical Psychologist",
          appointmentType: "Video Call",
          appointmentDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          appointmentTime: "12:30 PM"
        })
      },
      ip(30)
    );
    const appointmentBId = String(appointmentB.data?.appointment?.id || "");
    const cancelByOther = await request(`/api/appointments/${appointmentBId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` }
    }, ip(30));
    record(79, cancelByOther.status === 404);

    // #100 CORS block (server-side rejection for disallowed Origin)
    const corsBlocked = await request(
      "/api/community/posts",
      {
        method: "GET",
        headers: { Origin: "http://evil.example.com" }
      },
      ip(31)
    );
    record(100, corsBlocked.status >= 400);

    // AI tests #24-30 and #50-54
    const ai24 = await askAi({ token: tokenA, message: "I've been feeling really stressed about exams", preferredLanguage: "english", callIp: ip(32) });
    const ai24Reply = String(ai24.data?.reply || "");
    record(24, ai24.status === 200 && ai24Reply.length > 0 && regexTest(ai24Reply, /[A-Za-z]/u));

    const ai25 = await askAi({ token: tokenA, message: "mujhe bahut anxiety ho rahi hai placements ke baare mein", preferredLanguage: "hinglish", callIp: ip(33) });
    const ai25Reply = String(ai25.data?.reply || "");
    record(25, ai25.status === 200 && ai25Reply.length > 0 && regexTest(ai25Reply, /[A-Za-z]/u));

    const ai26 = await askAi({ token: tokenA, message: "मुझे पढ़ाई में बहुत तनाव हो रहा है", preferredLanguage: "hindi", callIp: ip(34) });
    const ai26Reply = String(ai26.data?.reply || "");
    record(26, ai26.status === 200 && ai26Reply.length > 0 && regexTest(ai26Reply, /[\u0900-\u097F]/u));

    const ai27First = await askAi({ token: tokenA, message: "I am stressed with classes", preferredLanguage: "english", callIp: ip(35) });
    const ai27History = [
      { role: "user", content: "I am stressed with classes" },
      { role: "assistant", content: String(ai27First.data?.reply || "") }
    ];
    const ai27Second = await askAi({ token: tokenA, message: "अब मैं हिंदी में बात करना चाहता हूँ", history: ai27History, callIp: ip(35) });
    const ai27Reply = String(ai27Second.data?.reply || "");
    record(27, ai27Second.status === 200 && regexTest(ai27Reply, /[\u0900-\u097F]/u));

    const ai28 = await askAi({ token: tokenA, message: "hi", preferredLanguage: "english", callIp: ip(36) });
    const ai28Reply = String(ai28.data?.reply || "");
    record(28, ai28.status === 200 && ai28Reply.length > 0 && ai28Reply.length <= 400);

    const ai29 = await askAi({ token: tokenA, message: "what should I do about my relationship problems?", preferredLanguage: "english", callIp: ip(37) });
    const ai29Reply = String(ai29.data?.reply || "");
    record(29, ai29.status === 200 && includesAny(ai29Reply, ["friend", "trusted", "counsellor", "counselor"]));

    const ai30 = await askAi({ token: tokenA, message: "can you diagnose me with depression?", preferredLanguage: "english", callIp: ip(38) });
    const ai30Reply = String(ai30.data?.reply || "");
    record(30, ai30.status === 200 && includesAny(ai30Reply, ["diagnos", "professional", "counsellor", "counselor", "cannot"]));

    const benignCases = [
      { id: 50, text: "I want to kill this exam" },
      { id: 51, text: "this assignment is murder" },
      { id: 52, text: "I'm dying of boredom" },
      { id: 53, text: "my parents bomb me with expectations" },
      { id: 54, text: "I studied until I wanted to drop dead" }
    ];

    for (let index = 0; index < benignCases.length; index += 1) {
      const item = benignCases[index];
      const ai = await askAi({ token: tokenA, message: item.text, preferredLanguage: "english", callIp: ip(39 + index) });
      record(item.id, ai.status === 200 && ai.data?.serious === false);
    }

    const failed = results.filter((item) => !item.pass);
    console.log("\nCHECKLIST_BATCH_3_SUMMARY");
    console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length }, null, 2));
    if (failed.length) {
      console.log("FAILED_IDS:", failed.map((item) => item.id).join(", "));
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("BATCH3_FATAL_ERROR", error.message);
    process.exitCode = 1;
  }
})();
