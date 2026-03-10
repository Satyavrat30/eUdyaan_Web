/* eslint-disable no-console */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const PasswordResetToken = require("../models/PasswordResetToken");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "admin@eudyaan.local").trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_TEST_PASSWORD || process.env.ADMIN_PASSWORD || "").trim();

const runId = Date.now();
const seed = Math.floor(Math.random() * 150) + 50;
const ip = (last) => `10.66.${seed}.${last}`;

const results = [];

function record(id, pass, note = "") {
  results.push({ id, pass, note });
  const mark = pass ? "✅" : "❌";
  console.log(`${mark} #${id}${note ? ` - ${note}` : ""}`);
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

function includesText(value, text) {
  return String(value || "").toLowerCase().includes(String(text || "").toLowerCase());
}

(async () => {
  let shouldFail = false;
  let userEmail = `batch.user.${runId}@example.com`;
  let currentPassword = "Batch@123";
  let userId = "";
  let sessionToken = "";

  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const signup1 = await request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Batch User ${runId}`, email: userEmail, password: currentPassword })
      },
      ip(11)
    );
    record(1, signup1.status === 200 && signup1.data?.success === true);

    const signupDup = await request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Dup", email: userEmail, password: currentPassword })
      },
      ip(11)
    );
    record(2, signupDup.status === 200 && signupDup.data?.success === false && includesText(signupDup.data?.message, "already exists"));

    const signupWeak = await request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Weak", email: `weak.${runId}@example.com`, password: "hello" })
      },
      ip(12)
    );
    record(3, signupWeak.status === 200 && signupWeak.data?.success === false && includesText(signupWeak.data?.message, "Password must contain"));

    const signupBlank = await request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "", email: "", password: "abc" })
      },
      ip(13)
    );
    record(4, signupBlank.status === 200 && signupBlank.data?.success === false && includesText(signupBlank.data?.message, "required"));

    let signupRateLimited = false;
    for (let i = 0; i < 6; i += 1) {
      const attempt = await request(
        "/api/auth/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Rate ${i}`,
            email: `rate.${runId}.${i}@example.com`,
            password: "Rate@123A"
          })
        },
        ip(14)
      );
      if (i === 5 && attempt.status === 429) {
        signupRateLimited = true;
      }
    }
    record(5, signupRateLimited);

    const loginOk = await request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: currentPassword })
      },
      ip(15)
    );
    userId = String(loginOk.data?.user?.id || "");
    sessionToken = String(loginOk.data?.sessionToken || "");
    record(10, loginOk.status === 200 && loginOk.data?.success === true && !!sessionToken);

    const loginNoAccount = await request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `missing.${runId}@example.com`, password: "Any@1234" })
      },
      ip(16)
    );
    record(12, loginNoAccount.status === 200 && loginNoAccount.data?.success === false && includesText(loginNoAccount.data?.message, "No account found"));

    let userLoginRateLimited = false;
    const loginProbeEmail = `probe.${runId}@example.com`;
    for (let i = 0; i < 11; i += 1) {
      const probe = await request(
        "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginProbeEmail, password: "Wrong@123" })
        },
        ip(17)
      );
      if (probe.status === 429) {
        userLoginRateLimited = true;
        break;
      }
    }
    record(14, userLoginRateLimited);

    const forgotUnknown = await request(
      "/api/auth/forgot-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `forgot-unknown.${runId}@example.com` })
      },
      ip(18)
    );
    record(18, forgotUnknown.status === 200 && forgotUnknown.data?.success === true);

    const forgotKnownForWeak = await request(
      "/api/auth/forgot-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail })
      },
      ip(19)
    );

    let resetTokenDoc = null;
    if (forgotKnownForWeak.status === 200 && userId) {
      resetTokenDoc = await PasswordResetToken.findOne({ userId: String(userId) }).lean();
    }

    const resetWeak = await request(
      "/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: String(resetTokenDoc?.token || ""), newPassword: "abc" })
      },
      ip(20)
    );
    record(21, resetWeak.status === 200 && resetWeak.data?.success === false && includesText(resetWeak.data?.message, "Password must contain"));

    const newStrongPassword = "Batch@124";
    const resetValid = await request(
      "/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: String(resetTokenDoc?.token || ""), newPassword: newStrongPassword })
      },
      ip(20)
    );
    const resetValidPass = resetValid.status === 200 && resetValid.data?.success === true;
    record(19, resetValidPass);
    if (resetValidPass) currentPassword = newStrongPassword;

    const forgotKnownForExpiry = await request(
      "/api/auth/forgot-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail })
      },
      ip(21)
    );

    let expiredTokenDoc = null;
    if (forgotKnownForExpiry.status === 200 && userId) {
      expiredTokenDoc = await PasswordResetToken.findOne({ userId: String(userId) });
      if (expiredTokenDoc) {
        expiredTokenDoc.expiresAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
        await expiredTokenDoc.save();
      }
    }

    const resetExpired = await request(
      "/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: String(expiredTokenDoc?.token || ""), newPassword: "Batch@125" })
      },
      ip(21)
    );
    record(23, resetExpired.status === 200 && resetExpired.data?.success === false && includesText(resetExpired.data?.message, "invalid or has expired"));

    const loginAfterReset = await request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: currentPassword })
      },
      ip(22)
    );
    sessionToken = String(loginAfterReset.data?.sessionToken || sessionToken);
    userId = String(loginAfterReset.data?.user?.id || userId);

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`
    };

    const logout = await request(
      "/api/auth/logout",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` }
      },
      ip(22)
    );
    const postLogoutUse = await request(
      "/api/appointments",
      { method: "GET", headers: { Authorization: `Bearer ${sessionToken}` } },
      ip(22)
    );
    record(16, logout.status === 200 && logout.data?.success === true && postLogoutUse.status === 401);
    record(101, postLogoutUse.status === 401);

    const relogin = await request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: currentPassword })
      },
      ip(23)
    );
    sessionToken = String(relogin.data?.sessionToken || "");

    const noAuthBook = await request(
      "/api/appointments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantName: "Dr A",
          consultantRole: "Role",
          appointmentType: "Video",
          appointmentDate: new Date(Date.now() + 86400000).toISOString(),
          appointmentTime: "10:00 AM"
        })
      },
      ip(24)
    );
    record(75, noAuthBook.status === 401);
    record(97, noAuthBook.status === 401);

    const fakeTokenBook = await request(
      "/api/appointments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer fake-or-expired-token"
        },
        body: JSON.stringify({
          consultantName: "Dr A",
          consultantRole: "Role",
          appointmentType: "Video",
          appointmentDate: new Date(Date.now() + 86400000).toISOString(),
          appointmentTime: "10:00 AM"
        })
      },
      ip(24)
    );
    record(98, fakeTokenBook.status === 401 && includesText(fakeTokenBook.data?.error, "Session expired"));

    const missingConsultant = await request(
      "/api/appointments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          consultantRole: "Role",
          appointmentType: "Video",
          appointmentDate: new Date(Date.now() + 86400000).toISOString(),
          appointmentTime: "10:00 AM"
        })
      },
      ip(24)
    );
    record(76, missingConsultant.status === 400);

    const pastDateBook = await request(
      "/api/appointments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          consultantName: "Dr Past",
          consultantRole: "Role",
          appointmentType: "Video",
          appointmentDate: new Date(Date.now() - 86400000).toISOString(),
          appointmentTime: "10:00 AM"
        })
      },
      ip(24)
    );
    record(74, pastDateBook.status === 400 && includesText(pastDateBook.data?.error, "cannot be in the past"));

    const contactMissing = await request(
      "/api/contact/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ firstName: "A", lastName: "B", email: userEmail })
      },
      ip(25)
    );
    record(83, contactMissing.status === 400);

    const contactHtml = await request(
      "/api/contact/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          firstName: "<b>Hard</b>",
          lastName: "<i>Core</i>",
          email: userEmail,
          message: "<b>hello</b>",
          phone: "99999"
        })
      },
      ip(25)
    );

    let contactSanitized = contactHtml.status === 201;
    if (contactHtml.status === 201 && ADMIN_PASSWORD) {
      const adminLogin = await request(
        "/api/auth/admin/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        },
        ip(26)
      );
      const adminToken = String(adminLogin.data?.token || "");
      if (adminToken) {
        const contacts = await request(
          "/api/admin/dashboard/contacts?limit=100&offset=0",
          { headers: { Authorization: `Bearer ${adminToken}` } },
          ip(26)
        );
        const row = (contacts.data?.contacts || []).find((item) => String(item.id) === String(contactHtml.data?.id));
        if (row) {
          contactSanitized = !includesText(row.firstName, "<") && !includesText(row.lastName, "<") && !includesText(row.message, "<");
        }
      }
    }
    record(82, contactSanitized);

    const adminSummaryNoToken = await request("/api/admin/dashboard/summary", { method: "GET" }, ip(27));
    record(86, adminSummaryNoToken.status === 401);

    const forgedUserPost = await request(
      "/api/community/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          userId: "000000000000000000000000",
          title: `Forged Body User ${runId}`,
          content: "Body userId should be ignored by server",
          tags: ["testing"]
        })
      },
      ip(28)
    );
    const forgedPostPass = forgedUserPost.status === 201 && String(forgedUserPost.data?.post?.userId || "") === String(userId);
    record(99, forgedPostPass);

    const loginSession1 = await request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: currentPassword })
      },
      ip(29)
    );
    const loginSession2 = await request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: currentPassword })
      },
      ip(30)
    );

    const token1 = String(loginSession1.data?.sessionToken || "");
    const token2 = String(loginSession2.data?.sessionToken || "");

    let anonStable = false;
    if (token1 && token2) {
      const post1 = await request(
        "/api/community/posts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token1}`
          },
          body: JSON.stringify({
            title: `Anon check A ${runId}`,
            content: "anon check A",
            tags: ["testing"]
          })
        },
        ip(31)
      );

      const post2 = await request(
        "/api/community/posts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token2}`
          },
          body: JSON.stringify({
            title: `Anon check B ${runId}`,
            content: "anon check B",
            tags: ["testing"]
          })
        },
        ip(32)
      );

      const a1 = String(post1.data?.post?.anonymousId || "");
      const a2 = String(post2.data?.post?.anonymousId || "");
      anonStable = post1.status === 201 && post2.status === 201 && !!a1 && a1 === a2;
    }
    record(105, anonStable);

    const failed = results.filter((item) => !item.pass);
    console.log("\nCHECKLIST_BATCH_2_SUMMARY");
    console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length }, null, 2));
    if (failed.length) {
      console.log("\nFAILED_IDS:", failed.map((item) => item.id).join(", "));
      shouldFail = true;
    }
  } catch (error) {
    console.error("BATCH_FATAL_ERROR", error.message);
    shouldFail = true;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    if (shouldFail) {
      process.exitCode = 1;
    }
  }
})();
