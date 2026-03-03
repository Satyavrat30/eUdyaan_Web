/* eslint-disable no-console */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "admin@eudyaan.local").trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || "").trim();

const state = {
  pass: 0,
  fail: 0,
  createdRiskAlertId: "",
  createdPostId: "",
  createdAppointmentId: "",
  createdUserId: "",
  createdAnonymousId: ""
};

function ok(condition, label, details = "") {
  if (condition) {
    state.pass += 1;
    console.log(`✅ ${label}${details ? ` - ${details}` : ""}`);
  } else {
    state.fail += 1;
    console.error(`❌ ${label}${details ? ` - ${details}` : ""}`);
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    data = {};
  }
  return { status: res.status, data, headers: res.headers };
}

function getRequired(value, fallback = "") {
  return String(value || fallback).trim();
}

function makeAnonId(seed) {
  const source = String(seed || "");
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return `ANON-${String(hash % 1000000).padStart(6, "0")}`;
}

async function run() {
  if (!ADMIN_PASSWORD) {
    console.error("❌ Missing ADMIN_PASSWORD/ADMIN_KEY in environment.");
    process.exit(1);
  }

  console.log(`Running hardcore API tests against ${BASE_URL}`);

  const runId = Date.now();
  const userEmail = `hardcore.user.${runId}@example.com`;
  const userPassword = "Hardcore@123";

  const signup = await request("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Hardcore User ${runId}`,
      email: userEmail,
      password: userPassword
    })
  });
  ok(signup.status === 200 && signup.data?.success === true, "User signup succeeds");

  const loginWrong = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userEmail, password: "wrong-password" })
  });
  ok(loginWrong.status === 200 && loginWrong.data?.success === false, "User login rejects wrong password");

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userEmail, password: userPassword })
  });
  state.createdUserId = getRequired(login.data?.user?.id);
  ok(login.status === 200 && login.data?.success === true && /^[a-fA-F0-9]{24}$/.test(state.createdUserId), "User login returns valid id", state.createdUserId);
  state.createdAnonymousId = makeAnonId(state.createdUserId);

  const forgot = await request("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userEmail })
  });
  ok(forgot.status === 200 && forgot.data?.success === true, "Forgot password endpoint responds safely");

  const resetInvalid = await request("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "invalid-token", newPassword: "Hardcore@124" })
  });
  ok(resetInvalid.status === 200 && resetInvalid.data?.success === false, "Reset password rejects invalid token");

  const contactUnauthorized = await request("/api/contact/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Hard",
      lastName: "Core",
      email: userEmail,
      message: "Unauthorized check"
    })
  });
  ok(contactUnauthorized.status === 401, "Contact endpoint requires login");

  const contactAuthorized = await request("/api/contact/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.createdUserId,
      firstName: "Hard",
      lastName: "Core",
      email: userEmail,
      phone: "9999999999",
      message: "Hardcore contact message"
    })
  });
  ok(contactAuthorized.status === 201 && contactAuthorized.data?.success === true, "Contact endpoint accepts authenticated submission");

  const appointmentUnauthorized = await request("/api/appointments", {
    method: "GET"
  });
  ok(appointmentUnauthorized.status === 401, "Appointments list requires login");

  const appointmentCreate = await request("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.createdUserId,
      consultantName: "Dr. Hardcore",
      consultantRole: "Clinical Psychologist",
      appointmentType: "Video Call",
      appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      appointmentTime: "11:30 AM"
    })
  });
  state.createdAppointmentId = getRequired(appointmentCreate.data?.appointment?.id);
  ok(appointmentCreate.status === 201 && /^[a-fA-F0-9]{24}$/.test(state.createdAppointmentId), "Create appointment works", state.createdAppointmentId);

  const appointmentList = await request(`/api/appointments?userId=${encodeURIComponent(state.createdUserId)}`);
  ok(appointmentList.status === 200 && Array.isArray(appointmentList.data?.appointments), "Appointments list works for user");
  ok((appointmentList.data?.appointments || []).some((item) => String(item.id) === state.createdAppointmentId), "Appointments list contains created appointment");

  const appointmentCancel = await request(`/api/appointments/${state.createdAppointmentId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: state.createdUserId })
  });
  ok(appointmentCancel.status === 200 && appointmentCancel.data?.appointment?.status === "cancelled", "Cancel appointment works");

  const communityPostsBefore = await request(`/api/community/posts?sort=recent&category=all&days=all&tag=all&userId=${encodeURIComponent(state.createdUserId)}&anonymousId=${encodeURIComponent(state.createdAnonymousId)}`);
  ok(communityPostsBefore.status === 200 && Array.isArray(communityPostsBefore.data?.posts), "Community posts query works");

  const createPostValidationFail = await request("/api/community/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.createdUserId,
      anonymousId: state.createdAnonymousId,
      title: "Missing tags test",
      content: "This should fail because tags are missing",
      tags: []
    })
  });
  ok(createPostValidationFail.status === 400, "Community post validates required fields");

  const createPost = await request("/api/community/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.createdUserId,
      anonymousId: state.createdAnonymousId,
      title: `Hardcore post ${runId}`,
      content: "This is a normal community test post",
      tags: ["stress", "testing"]
    })
  });
  state.createdPostId = getRequired(createPost.data?.post?.id);
  ok(createPost.status === 201 && /^[a-fA-F0-9]{24}$/.test(state.createdPostId), "Community post creation works", state.createdPostId);

  const addReply = await request(`/api/community/posts/${state.createdPostId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.createdUserId,
      anonymousId: state.createdAnonymousId,
      content: "Supportive reply for hardcore test"
    })
  });
  ok(addReply.status === 200 && addReply.data?.success === true, "Community reply creation works");

  const riskyPostBlocked = await request("/api/community/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.createdUserId,
      anonymousId: state.createdAnonymousId,
      title: "Risk post",
      content: "mujhe marna hai",
      tags: ["help"]
    })
  });
  ok(riskyPostBlocked.status === 422, "Community risky post is blocked");

  const riskyReplyBlocked = await request(`/api/community/posts/${state.createdPostId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.createdUserId,
      anonymousId: state.createdAnonymousId,
      content: "I want to die"
    })
  });
  ok(riskyReplyBlocked.status === 422, "Community risky reply is blocked");

  const voteUp = await request(`/api/community/posts/${state.createdPostId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.createdUserId,
      anonymousId: state.createdAnonymousId,
      direction: "up"
    })
  });
  ok(voteUp.status === 200 && typeof voteUp.data?.likes === "number", "Community vote up works");

  const voteDown = await request(`/api/community/posts/${state.createdPostId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.createdUserId,
      anonymousId: state.createdAnonymousId,
      direction: "down"
    })
  });
  ok(voteDown.status === 200 && typeof voteDown.data?.likes === "number", "Community vote down works");

  const aiUnauthorized = await request("/api/ai/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "hello" })
  });
  ok(aiUnauthorized.status === 401, "AI support requires authenticated user");

  const aiMissingMessage = await request("/api/ai/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: state.createdUserId })
  });
  ok(aiMissingMessage.status === 400, "AI support validates message presence");

  const aiCall = await request("/api/ai/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.createdUserId,
      message: "I am stressed because of exams. Give me 2 short steps.",
      preferredLanguage: "english",
      history: []
    })
  });
  ok([200, 429, 502, 500].includes(aiCall.status), "AI support runtime call handled", `status=${aiCall.status}`);

  const adminLogin = await request("/api/auth/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  ok(adminLogin.status === 200 && !!adminLogin.data.token, "Admin login succeeds");
  const adminToken = String(adminLogin.data.token || "");

  const adminMeNoToken = await request("/api/auth/admin/me");
  ok(adminMeNoToken.status === 401, "Admin /me rejects unauthenticated requests");

  const adminMe = await request("/api/auth/admin/me", {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  ok(adminMe.status === 200 && adminMe.data?.authenticated === true, "Admin /me accepts valid token");

  const adminLookup = await request(`/api/auth/admin/lookup-anonymous?anonymousId=${encodeURIComponent(state.createdAnonymousId)}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  ok(adminLookup.status === 200 && adminLookup.data?.found === true, "Admin anonymous lookup works for created user");

  const badLogin = await request("/api/auth/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: `${ADMIN_PASSWORD}_wrong` })
  });
  ok(badLogin.status === 401, "Admin login rejects invalid password");

  const invalidSourceAlert = await request("/api/community/risk-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.createdUserId,
      anonymousId: "ANON-TEST",
      source: "totally_invalid_source",
      message: "mujhe marna hai",
      triggerTerm: "marna"
    })
  });
  ok(invalidSourceAlert.status === 400, "Risk-alert endpoint rejects invalid source");

  const noRiskAlert = await request("/api/community/risk-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.createdUserId,
      anonymousId: "ANON-TEST",
      source: "community_post_client_block",
      message: "I am feeling a little stressed but okay.",
      triggerTerm: "none"
    })
  });
  ok(noRiskAlert.status === 422, "Risk-alert endpoint rejects non-risk content");

  const validRiskAlert = await request("/api/community/risk-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.createdUserId,
      anonymousId: "ANON-TEST",
      source: "community_post_client_block",
      message: "mujhe marna hai hardcore test",
      triggerTerm: "marna",
      metadata: { kind: "hardcore-test" }
    })
  });
  ok(validRiskAlert.status === 200 && validRiskAlert.data?.success === true, "Risk-alert endpoint accepts valid risky content");

  const chatsEndpoint = await request("/api/admin/dashboard/chats?limit=20&offset=0", {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  ok(chatsEndpoint.status === 200 && Array.isArray(chatsEndpoint.data?.chats), "Admin chats endpoint works");

  const communityEndpoint = await request("/api/admin/dashboard/community?limit=20&offset=0", {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  ok(communityEndpoint.status === 200 && Array.isArray(communityEndpoint.data?.community), "Admin community endpoint works");

  const contactsEndpoint = await request("/api/admin/dashboard/contacts?limit=20&offset=0", {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  ok(contactsEndpoint.status === 200 && Array.isArray(contactsEndpoint.data?.contacts), "Admin contacts endpoint works");

  const appointmentsEndpoint = await request("/api/admin/dashboard/appointments?limit=20&offset=0", {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  ok(appointmentsEndpoint.status === 200 && Array.isArray(appointmentsEndpoint.data?.appointments), "Admin appointments endpoint works");

  const summary = await request("/api/admin/dashboard/summary", {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  ok(summary.status === 200, "Dashboard summary endpoint works");
  ok(
    Object.prototype.hasOwnProperty.call(summary.data?.summary || {}, "riskAlertsAiAssistantChatbot") &&
      Object.prototype.hasOwnProperty.call(summary.data?.summary || {}, "riskAlertsCommunity"),
    "Summary includes split risk-alert counters"
  );

  const riskCommunity = await request("/api/admin/dashboard/risk-alerts?limit=50&sourceType=community", {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  ok(riskCommunity.status === 200 && Array.isArray(riskCommunity.data?.riskAlerts), "Community risk-alert filter endpoint works");

  const foundCommunityTestAlert = (riskCommunity.data?.riskAlerts || []).find(
    (item) => String(item.message || "").includes("hardcore test") && item.sourceType === "community"
  );
  state.createdRiskAlertId = String(foundCommunityTestAlert?.id || "");
  ok(!!state.createdRiskAlertId, "Community filter contains newly logged alert", state.createdRiskAlertId || "not found");

  const riskAi = await request("/api/admin/dashboard/risk-alerts?limit=50&sourceType=ai_assistant_chatbot", {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  ok(riskAi.status === 200 && Array.isArray(riskAi.data?.riskAlerts), "AI risk-alert filter endpoint works");
  const aiTypeConsistent = (riskAi.data?.riskAlerts || []).every((item) => item.sourceType === "ai_assistant_chatbot");
  ok(aiTypeConsistent, "AI filter returns only AI sourceType alerts");

  const paged0 = await request("/api/admin/dashboard/risk-alerts?limit=1&sourceType=community&offset=0", {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const paged1 = await request("/api/admin/dashboard/risk-alerts?limit=1&sourceType=community&offset=1", {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  ok(paged0.status === 200 && paged1.status === 200, "Risk-alert pagination endpoints work");
  ok((paged0.data?.riskAlerts || []).length <= 1 && (paged1.data?.riskAlerts || []).length <= 1, "Risk-alert pagination respects limit");

  let saw429 = false;
  const limiterProbeEmail = `brute-force-probe-${Date.now()}@example.com`;
  for (let i = 0; i < 10; i += 1) {
    const attempt = await request("/api/auth/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: limiterProbeEmail,
        password: "wrong-password"
      })
    });
    if (attempt.status === 429) {
      saw429 = true;
      break;
    }
  }
  ok(saw429, "Admin login brute-force protection returns 429");

  const adminLogout = await request("/api/auth/admin/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  ok(adminLogout.status === 200 && adminLogout.data?.success === true, "Admin logout works");

  console.log("\n===== HARDCORE API TEST SUMMARY =====");
  console.log(`Passed: ${state.pass}`);
  console.log(`Failed: ${state.fail}`);

  if (state.fail > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error("❌ Fatal test runner error:", error.message);
  process.exit(1);
});
