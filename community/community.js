const commentsPanel = document.getElementById("commentsPanel");
const activePostText = document.getElementById("activePostText");
const commentList = document.getElementById("commentList");

const newPostBtn = document.getElementById("newPostBtn");
const newPostBox = document.getElementById("newPostBox");
const postInput = document.getElementById("postInput");
const cancelPost = document.getElementById("cancelPost");
const submitPost = document.getElementById("submitPost");
const postsContainer = document.getElementById("postsContainer");

const commentInput = document.getElementById("commentInput");
const sendComment = document.getElementById("sendComment");

/* OPEN COMMENTS */
function openPost(el) {
  activePostText.innerText = el.querySelector("p").innerText;
  commentsPanel.classList.remove("hidden");
}

/* CLOSE COMMENTS */
function closeComments() {
  commentsPanel.classList.add("hidden");
}

/* NEW POST */
newPostBtn.onclick = () => {
  newPostBox.classList.remove("hidden");
};

cancelPost.onclick = () => {
  newPostBox.classList.add("hidden");
  postInput.value = "";
};

submitPost.onclick = () => {
  if (!postInput.value.trim()) return;

  const post = document.createElement("div");
  post.className = "post";
  post.onclick = () => openPost(post);
  post.innerHTML = `
    <small>Anonymous • just now</small>
    <p>${postInput.value}</p>
    <div class="meta">♡ 0 · 💬 0</div>
  `;

  postsContainer.prepend(post);
  postInput.value = "";
  newPostBox.classList.add("hidden");
};

/* ADD COMMENT */
sendComment.onclick = () => {
  if (!commentInput.value.trim()) return;

  const c = document.createElement("div");
  c.className = "comment";
  c.innerText = commentInput.value;

  commentList.appendChild(c);
  commentInput.value = "";
};
