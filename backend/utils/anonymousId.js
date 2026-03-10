const crypto = require("crypto");

/**
 * Generates a stable anonymous ID from a user's MongoDB ObjectId.
 * Uses HMAC-SHA256 for collision resistance and non-reversibility.
 * Output: "ANON-<8 hex chars>" (e.g. ANON-3f2a1b4c)
 */
function makeAnonymousId(seed) {
  const secret = process.env.ANON_ID_SECRET || "eudyaan_anon_secret_change_me";
  const hash = crypto.createHmac("sha256", secret).update(String(seed || "")).digest("hex");
  return `ANON-${hash.slice(0, 8)}`;
}

module.exports = { makeAnonymousId };
