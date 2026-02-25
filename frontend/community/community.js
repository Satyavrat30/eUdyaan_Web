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
const threadContainer = document.getElementById("threadContainer");
const replyCountBadge = document.getElementById("replyCountBadge");

const replyForm = document.getElementById("replyForm");
const replyInput = document.getElementById("replyInput");
const replyContext = document.getElementById("replyContext");
const cancelReplyTarget = document.getElementById("cancelReplyTarget");

const backendHost = window.location.hostname || "localhost";
const API_BASE = window.location.port === "5000" ? "" : `http://${backendHost}:5000`;

const profile = window.EudyaanSession?.getProfile?.() || null;
let currentAnonymousId = profile?.anonymousId || "";

function getGuestAnonymousId() {
  const existing = localStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;
  const generated = `Anonymous_${Math.floor(1000 + Math.random() * 9000)}`;
  localStorage.setItem(GUEST_ID_KEY, generated);
  return generated;
}

if (!currentAnonymousId) {
  currentAnonymousId = getGuestAnonymousId();
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
    options.push(`<option value=\"${tag}\">Tag: ${tag}</option>`);
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
    ? top.map(([tag, count]) => `<li>#${tag} <strong>(${count})</strong></li>`).join("")
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
      const preview = post.content.length > 220 ? `${post.content.slice(0, 220)}...` : post.content;
      const tags = (post.tags || []).map((tag) => `<span class=\"post-tag\">#${tag}</span>`).join("");
      const replies = Number(post.replyCount ?? countReplies(post.replies || []));
      return `
      <button class=\"post-card\" data-post-id=\"${post.id}\" type=\"button\" aria-label=\"Open discussion for ${post.title}\">
        <div class=\"post-head\">
          <span>${post.anonymousId}</span>
          <span>${formatRelativeTime(post.createdAt)}</span>
        </div>
        <h3 class=\"post-title\">${post.title}</h3>
        <p class=\"post-preview\">${preview}</p>
        <div class=\"post-tags\">${tags}</div>
        <div class=\"post-meta\">
          <span>Replies: ${replies}</span>
          <span>Likes: ${post.likes || 0}</span>
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
        <div class=\"reply-meta\">${reply.anonymousId} • ${formatRelativeTime(reply.createdAt)}</div>
        <div class=\"reply-body\">${reply.content}</div>
        <div class=\"reply-tools\">
          <button type=\"button\" data-reply-action=\"reply\" data-reply-id=\"${replyId}\">Reply</button>
          ${childCount ? `<button type=\"button\" data-reply-action=\"toggle\" data-reply-id=\"${replyId}\">${isCollapsed ? "Expand" : "Collapse"} (${childCount})</button>` : ""}
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
  replyContext.textContent = `Replying to ${target.anonymousId}`;
}

function openDrawer(postId) {
  const post = findPost(postId);
  if (!post) return;

  activePostId = postId;
  drawerTitle.textContent = post.title;
  drawerMeta.textContent = `${post.anonymousId} • ${formatRelativeTime(post.createdAt)}`;
  drawerBody.textContent = post.content;
  drawerStats.textContent = `Replies: ${post.replyCount ?? countReplies(post.replies || [])} • Likes: ${post.likes || 0}`;
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
      tag: tagFilter.value
    });
    const data = await fetchJson(`${API_BASE}/api/community/posts?${query.toString()}`);
    posts = data.posts || [];
    renderFeed();
    if (activePostId && findPost(activePostId)) {
      openDrawer(activePostId);
    }
  } catch (error) {
    postsContainer.innerHTML = `<div class=\"post-card\"><p>Unable to load posts: ${error.message}</p></div>`;
  }
}

createPrompt.addEventListener("click", () => showComposer(true));
cancelCreate.addEventListener("click", () => {
  resetCreateForm();
  showComposer(false);
});

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = postTitleInput.value.trim();
  const content = postContentInput.value.trim();
  if (!title || !content) return;

  const tags = postTagsInput.value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);

  try {
    const data = await fetchJson(`${API_BASE}/api/community/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymousId: currentAnonymousId,
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

replyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activePostId) return;

  const content = replyInput.value.trim();
  if (!content) return;

  try {
    const data = await fetchJson(`${API_BASE}/api/community/posts/${activePostId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymousId: currentAnonymousId,
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
    alert(`Failed to add reply: ${error.message}`);
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
