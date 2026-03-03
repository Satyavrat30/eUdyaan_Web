const GUEST_ID_KEY = "eudyaan_guest_anon_id";

const postsContainer = document.getElementById("postsContainer");
const trendingList = document.getElementById("trendingList");

const createPrompt = document.getElementById("createPrompt");
const createForm = document.getElementById("createForm");
const cancelCreate = document.getElementById("cancelCreate");
const postTitleInput = document.getElementById("postTitle");
const postContentInput = document.getElementById("postContent");
const postTagsInput = document.getElementById("postTags");
const postMediaInput = document.getElementById("postMedia");

const sortTabs = Array.from(document.querySelectorAll(".sort-tab"));
const sortSelect = document.getElementById("sortSelect");
const categoryFilter = document.getElementById("categoryFilter");
const dateFilter = document.getElementById("dateFilter");
const tagFilter = document.getElementById("tagFilter");

const postDrawer = document.getElementById("postDrawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const closeDrawerBtn = document.getElementById("closeDrawer");
const drawerTitle = document.getElementById("drawerTitle");
const drawerMeta = document.getElementById("drawerMeta");
const drawerBody = document.getElementById("drawerBody");
const drawerStats = document.getElementById("drawerStats");
const voteUpBtn = document.getElementById("voteUpBtn");
const voteDownBtn = document.getElementById("voteDownBtn");
const voteScore = document.getElementById("voteScore");
const threadContainer = document.getElementById("threadContainer");
const replyCountBadge = document.getElementById("replyCountBadge");

const replyForm = document.getElementById("replyForm");
const replyInput = document.getElementById("replyInput");
const replyContext = document.getElementById("replyContext");
const cancelReplyTarget = document.getElementById("cancelReplyTarget");
const redAlertModal = document.getElementById("redAlertModal");
const redAlertText = document.getElementById("redAlertText");
const redAlertCall = document.getElementById("redAlertCall");
const redAlertConsult = document.getElementById("redAlertConsult");
const redAlertClose = document.getElementById("redAlertClose");

const backendHost = window.location.hostname || "localhost";
// If served directly by the backend (port 5000) use relative URLs, otherwise point to backend
const API_BASE = (window.location.port === "5000" || window.location.protocol === "file:") 
  ? (window.location.protocol === "file:" ? "http://localhost:5000" : "")
  : `http://${backendHost}:5000`;
const HELPLINE_CALL_NUMBER = "9152987821";
const CONSULT_DOCTOR_LINK = "../appointment/appointment.html";

const profile = window.EudyaanSession?.getProfile?.() || null;
const currentUserId = profile?.id || "";
const fallbackAnonymousId = profile?.anonymousId || getGuestAnonymousId();

function requireLoginForFeature() {
  if (currentUserId) return true;
  if (window.EudyaanSession?.redirectToLogin) {
    window.EudyaanSession.redirectToLogin();
  } else {
    alert("Please login to use this feature.");
  }
  return false;
}

// If user is logged in, anonymousId is derived from their userId (deterministic, reversible by admin)
// If not logged in, use a guest anonymous ID stored in localStorage
function getGuestAnonymousId() {
  const existing = localStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;
  const generated = `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
  localStorage.setItem(GUEST_ID_KEY, generated);
  return generated;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COMMUNITY_CRISIS_PATTERNS = [
  /\b(kms|kys)\b/i,
  /\bsuicide\b/i,
  /\bkill\s*my\s*self\b/i,
  /\btake\s*my\s*life\b/i,
  /\btake\s*my\s*own\s*life\b/i,
  /\bwant\s*to\s*die\b/i,
  /\bdon'?t\s*want\s*to\s*live\b/i,
  /\bdo\s*not\s*want\s*to\s*live\b/i,
  /\bno\s*reason\s*to\s*live\b/i,
  /\bbetter\s*off\s*dead\b/i,
  /\bwish\s*i\s*was\s*dead\b/i,
  /\bcan'?t\s*go\s*on\b/i,
  /\bnot\s*worth\s*living\b/i,
  /\bend\s*my\s*life\b/i,
  /\bend\s*it\s*all\b/i,
  /\bself[- ]?harm\b/i,
  /\bhurt\s*myself\b/i,
  /\bquit\s*life\b/i,
  /\bquit\s*living\b/i,
  /\bmurder\b/i,
  /\bkill\b/i,
  /\bmarna\b/i,
  /\bmar\s*jana\b/i,
  /\bjeena\s*nahi\b/i,
  /\bmujhe\s*marna\s*hai\b/i,
  /\bmujhe\s*mar\s*jana\s*hai\b/i,
  /\bjaan\s*dena\b/i,
  /\bapni\s*jaan\s*lena\b/i,
  /\bkhud\s*ko\s*mar(na|\s*dena)\b/i,
  /\bsuicidal\b/i,
  /\bfansi\b/i,
  /\bfasi\b/i,
  /\bfaansi\b/i,
  /\bphansi\b/i,
  /\bphaansi\b/i,
  /\bf[ae]?a?n?s[iy]\s*(lagana|lgana|lagaana|lagane|lgane)\b/i,
  /\blatakna\b/i,
  /\bphanda\b/i,
  /\bzeher\b/i,
  /\boverdose\b/i,
  /\bmaar\s*do\b/i,
  /\bmar\s*do\b/i,
  /आत्महत्या/i,
  /खुदकुशी/i,
  /फांसी/i,
  /फाँसी/i,
  /फंदा/i,
  /मर\s*जाना/i,
  /मरना\s*है/i,
  /जीना\s*नहीं/i,
  /जान\s*दे\s*(दूंगा|दूँगा|दूंगी|दूँगी|दुंगी|देना)/i,
  /खुद\s*को\s*मार/i,
  /मर\s*डाल/i,
  /मुझे\s*मरना\s*है/i
];

function detectCommunityRiskTerm(text) {
  const value = String(text || "");
  for (const pattern of COMMUNITY_CRISIS_PATTERNS) {
    const match = value.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function openRedAlertPopup(triggerText) {
  if (redAlertText) {
    redAlertText.textContent = `RED ALERT TRIGGERED. This content may indicate immediate self-harm risk and cannot be posted. Triggered phrase: "${triggerText}". Please use immediate support options.`;
  }

  if (redAlertCall) {
    redAlertCall.href = `tel:${HELPLINE_CALL_NUMBER}`;
  }
  if (redAlertConsult) {
    redAlertConsult.href = CONSULT_DOCTOR_LINK;
  }

  redAlertModal?.classList.remove("hidden");
}

function closeRedAlertPopup() {
  redAlertModal?.classList.add("hidden");
}

let posts = [];
let activePostId = null;
let replyTargetId = null;
let activeSort = "recent";
let collapsedReplyIds = new Set();

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

function formatRelativeTime(isoTime) {
  const diffMs = Date.now() - new Date(isoTime).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function countReplies(replies = []) {
  let count = 0;
  replies.forEach((reply) => {
    count += 1 + countReplies(reply.replies || []);
  });
  return count;
}

function getReplyId(reply) {
  return String(reply.id || reply._id);
}

function updateTagFilterOptions() {
  const tags = new Set();
  posts.forEach((post) => {
    (post.tags || []).forEach((tag) => tags.add(tag.toLowerCase()));
  });

  const previous = tagFilter.value;
  const options = ["<option value=\"all\">Tag: All</option>"];
  Array.from(tags).sort().forEach((tag) => {
    const safeTag = escapeHtml(tag);
    options.push(`<option value="${safeTag}">Tag: ${safeTag}</option>`);
  });
  tagFilter.innerHTML = options.join("");
  if (Array.from(tagFilter.options).some((opt) => opt.value === previous)) {
    tagFilter.value = previous;
  }
}

function renderTrending() {
  const counts = {};
  posts.forEach((post) => {
    (post.tags || []).forEach((tag) => {
      const key = tag.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
  });

  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  trendingList.innerHTML = top.length
     ? top.map(([tag, count]) => `<li>#${escapeHtml(tag)} <strong>(${count})</strong></li>`).join("")
    : "<li>No trending topics yet.</li>";
}

function renderFeed() {
  updateTagFilterOptions();
  renderTrending();

  if (!posts.length) {
    postsContainer.innerHTML = "<div class=\"post-card\"><p>No posts yet. Be the first to post.</p></div>";
    return;
  }

  postsContainer.innerHTML = posts
    .map((post) => {
        const postTitle = escapeHtml(post.title);
        const postContent = String(post.content || "");
        const preview = postContent.length > 220 ? `${postContent.slice(0, 220)}...` : postContent;
        const tags = (post.tags || []).map((tag) => `<span class="post-tag">#${escapeHtml(tag)}</span>`).join("");
      const replies = Number(post.replyCount ?? countReplies(post.replies || []));
      return `
        <button class="post-card" data-post-id="${escapeHtml(post.id)}" type="button" aria-label="Open discussion for ${postTitle}">
        <div class=\"post-head\">
            <span>Anonymous</span>
          <span>${formatRelativeTime(post.createdAt)}</span>
        </div>
          <h3 class="post-title">${postTitle}</h3>
          <p class="post-preview">${escapeHtml(preview)}</p>
        <div class=\"post-tags\">${tags}</div>
        <div class=\"post-meta\">
          <span>Replies: ${replies}</span>
          <span>Votes: ${post.likes || 0}</span>
        </div>
      </button>`;
    })
    .join("");
}

function findPost(postId) {
  return posts.find((post) => post.id === postId) || null;
}

function findReplyById(list, id) {
  for (const item of list) {
    if (getReplyId(item) === id) return item;
    const nested = findReplyById(item.replies || [], id);
    if (nested) return nested;
  }
  return null;
}

function renderThread(list, depth = 0) {
  return list
    .map((reply) => {
      const replyId = getReplyId(reply);
      const childCount = (reply.replies || []).length;
      const isCollapsed = collapsedReplyIds.has(replyId);
      const children = childCount && !isCollapsed ? renderThread(reply.replies, depth + 1) : "";
      return `
      <div class=\"thread-item\" style=\"--depth:${depth}\">
          <div class="reply-meta">Anonymous • ${formatRelativeTime(reply.createdAt)}</div>
          <div class="reply-body">${escapeHtml(reply.content)}</div>
        <div class=\"reply-tools\">
            <button type="button" data-reply-action="reply" data-reply-id="${escapeHtml(replyId)}">Reply</button>
            ${childCount ? `<button type="button" data-reply-action="toggle" data-reply-id="${escapeHtml(replyId)}">${isCollapsed ? "Expand" : "Collapse"} (${childCount})</button>` : ""}
        </div>
        ${children}
      </div>`;
    })
    .join("");
}

function setReplyContextLabel(post) {
  if (!replyTargetId) {
    replyContext.classList.add("hidden");
    cancelReplyTarget.classList.add("hidden");
    replyContext.textContent = "";
    return;
  }

  const target = findReplyById(post.replies || [], replyTargetId);
  if (!target) {
    replyTargetId = null;
    setReplyContextLabel(post);
    return;
  }

  replyContext.classList.remove("hidden");
  cancelReplyTarget.classList.remove("hidden");
  replyContext.textContent = "Replying to Anonymous";
}

function openDrawer(postId) {
  const post = findPost(postId);
  if (!post) return;

  activePostId = postId;
  drawerTitle.textContent = post.title;
  drawerMeta.textContent = `Anonymous • ${formatRelativeTime(post.createdAt)}`;
  drawerBody.textContent = post.content;
  drawerStats.textContent = `Replies: ${post.replyCount ?? countReplies(post.replies || [])} • Votes: ${post.likes || 0}`;
  if (voteScore) voteScore.textContent = String(post.likes || 0);
  const currentVote = Number(post.userVote || 0);
  voteUpBtn?.classList.toggle("active-up", currentVote === 1);
  voteDownBtn?.classList.toggle("active-down", currentVote === -1);
  replyCountBadge.textContent = String(post.replyCount ?? countReplies(post.replies || []));

  threadContainer.innerHTML = renderThread(post.replies || []);
  setReplyContextLabel(post);

  postDrawer.classList.add("open");
  postDrawer.setAttribute("aria-hidden", "false");
  drawerBackdrop.classList.add("show");
  drawerBackdrop.classList.remove("hidden");

  const targetHash = `#post-${post.id}`;
  if (window.location.hash !== targetHash) {
    history.pushState(null, "", targetHash);
  }
}

function closeDrawer() {
  activePostId = null;
  replyTargetId = null;
  postDrawer.classList.remove("open");
  postDrawer.setAttribute("aria-hidden", "true");
  drawerBackdrop.classList.remove("show");
  setTimeout(() => {
    drawerBackdrop.classList.add("hidden");
  }, 220);

  if (window.location.hash.startsWith("#post-")) {
    history.pushState(null, "", window.location.pathname + window.location.search);
  }
}

async function voteOnActivePost(direction) {
  if (!activePostId) return;
  if (!requireLoginForFeature()) return;

  try {
    const payload = {
      userId: currentUserId,
      anonymousId: fallbackAnonymousId,
      direction
    };

    const data = await fetchJson(`${API_BASE}/api/community/posts/${activePostId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const upvotes = Number(data?.upvotes ?? data?.likes ?? 0);
    const userVote = Number(data?.userVote ?? 0);
    posts = posts.map((post) => (
      post.id === activePostId ? { ...post, likes: upvotes, userVote } : post
    ));

    renderFeed();
    const active = findPost(activePostId);
    if (active) {
      drawerStats.textContent = `Replies: ${active.replyCount ?? countReplies(active.replies || [])} • Votes: ${active.likes || 0}`;
      if (voteScore) voteScore.textContent = String(active.likes || 0);
      const currentVote = Number(active.userVote || 0);
      voteUpBtn?.classList.toggle("active-up", currentVote === 1);
      voteDownBtn?.classList.toggle("active-down", currentVote === -1);
    }
  } catch (error) {
    alert(`Failed to vote post: ${error.message}`);
  }
}

function applySort(sortValue) {
  activeSort = sortValue;
  sortSelect.value = sortValue;
  sortTabs.forEach((btn) => {
    const isActive = btn.dataset.sort === sortValue;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  loadPosts();
}

function resetCreateForm() {
  postTitleInput.value = "";
  postContentInput.value = "";
  postTagsInput.value = "";
  postMediaInput.value = "";
}

function showComposer(show) {
  createForm.classList.toggle("hidden", !show);
  createPrompt.setAttribute("aria-expanded", show ? "true" : "false");
  if (show) postTitleInput.focus();
}

async function loadPosts() {
  try {
    const query = new URLSearchParams({
      sort: activeSort,
      category: categoryFilter.value,
      days: dateFilter.value,
      tag: tagFilter.value,
      userId: currentUserId,
      anonymousId: fallbackAnonymousId
    });
    const data = await fetchJson(`${API_BASE}/api/community/posts?${query.toString()}`);
    posts = data.posts || [];
    renderFeed();
    if (activePostId && findPost(activePostId)) {
      openDrawer(activePostId);
    }
  } catch (error) {
    postsContainer.innerHTML = `<div class=\"post-card\"><p>Unable to load posts: ${escapeHtml(error.message)}</p></div>`;
  }
}

createPrompt.addEventListener("click", () => {
  if (!requireLoginForFeature()) return;
  showComposer(true);
});
cancelCreate.addEventListener("click", () => {
  resetCreateForm();
  showComposer(false);
});

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireLoginForFeature()) return;

  const title = postTitleInput.value.trim();
  const content = postContentInput.value.trim();
  const tags = postTagsInput.value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);

  if (!title || !content || !tags.length) {
    const missingField = !title ? postTitleInput : (!content ? postContentInput : postTagsInput);
    missingField.focus();
    if (typeof missingField.reportValidity === "function") {
      missingField.reportValidity();
    }
    return;
  }

  const postRiskTerm = detectCommunityRiskTerm(`${title}\n${content}\n${tags.join(" ")}`);
  if (postRiskTerm) {
    openRedAlertPopup(postRiskTerm);
    return;
  }

  try {
    const data = await fetchJson(`${API_BASE}/api/community/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        anonymousId: fallbackAnonymousId,
        title,
        content,
        tags,
        mediaName: postMediaInput.files?.[0]?.name || ""
      })
    });

    resetCreateForm();
    showComposer(false);
    await loadPosts();
    openDrawer(data.post.id);
  } catch (error) {
    if (String(error.message || "").includes("RED_ALERT_TRIGGERED")) {
      openRedAlertPopup("self-harm risk");
      return;
    }
    alert(`Failed to create post: ${error.message}`);
  }
});

sortTabs.forEach((tab) => {
  tab.addEventListener("click", () => applySort(tab.dataset.sort));
});

sortSelect.addEventListener("change", () => applySort(sortSelect.value));
categoryFilter.addEventListener("change", loadPosts);
dateFilter.addEventListener("change", loadPosts);
tagFilter.addEventListener("change", loadPosts);

postsContainer.addEventListener("click", (event) => {
  const card = event.target.closest("[data-post-id]");
  if (!card) return;
  openDrawer(card.dataset.postId);
});

threadContainer.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-reply-action]");
  if (!btn || !activePostId) return;

  const post = findPost(activePostId);
  if (!post) return;

  const id = btn.dataset.replyId;
  if (btn.dataset.replyAction === "reply") {
    replyTargetId = id;
    setReplyContextLabel(post);
    replyInput.focus();
  } else if (btn.dataset.replyAction === "toggle") {
    if (collapsedReplyIds.has(id)) {
      collapsedReplyIds.delete(id);
    } else {
      collapsedReplyIds.add(id);
    }
    threadContainer.innerHTML = renderThread(post.replies || []);
    setReplyContextLabel(post);
  }
});

replyInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    replyForm.requestSubmit();
  }
});

replyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activePostId) return;
  if (!requireLoginForFeature()) return;

  const content = replyInput.value.trim();
  if (!content) return;

  const replyRiskTerm = detectCommunityRiskTerm(content);
  if (replyRiskTerm) {
    openRedAlertPopup(replyRiskTerm);
    return;
  }

  try {
    const data = await fetchJson(`${API_BASE}/api/community/posts/${activePostId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        anonymousId: fallbackAnonymousId,
        content,
        parentReplyId: replyTargetId
      })
    });

    const updated = data.post;
    posts = posts.map((p) => (p.id === updated.id ? updated : p));
    replyInput.value = "";
    replyTargetId = null;
    openDrawer(updated.id);
    renderFeed();
  } catch (error) {
    if (String(error.message || "").includes("RED_ALERT_TRIGGERED")) {
      openRedAlertPopup("self-harm risk");
      return;
    }
    alert(`Failed to add reply: ${error.message}`);
  }
});

redAlertClose?.addEventListener("click", closeRedAlertPopup);
redAlertModal?.addEventListener("click", (event) => {
  if (event.target === redAlertModal) {
    closeRedAlertPopup();
  }
});

cancelReplyTarget.addEventListener("click", () => {
  replyTargetId = null;
  if (activePostId) {
    const post = findPost(activePostId);
    if (post) setReplyContextLabel(post);
  }
});

closeDrawerBtn.addEventListener("click", closeDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);
voteUpBtn?.addEventListener("click", () => voteOnActivePost("up"));
voteDownBtn?.addEventListener("click", () => voteOnActivePost("down"));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && postDrawer.classList.contains("open")) {
    closeDrawer();
  }
});

function restorePostFromHash() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#post-")) return;
  const id = hash.replace("#post-", "");
  if (findPost(id)) {
    openDrawer(id);
  }
}

window.addEventListener("popstate", restorePostFromHash);
window.addEventListener("hashchange", restorePostFromHash);

loadPosts().then(restorePostFromHash);
