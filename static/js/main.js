// main.js

const POSTS_KEY = "harvest-posts";
const LIKES_KEY = "harvest-likes";
const SAVED_KEY = "harvest-saved";
const DRAFT_KEY = "harvest-draft";

const backdrop = document.getElementById("composer-backdrop");
const openComposerButton = document.getElementById("open-composer");
const sidebarComposeButton = document.getElementById("sidebar-compose");
const closeComposerButton = document.getElementById("close-composer");

const postForm = document.getElementById("post-form");
const postContent = document.getElementById("post-content");
const postCategory = document.getElementById("post-category");

const postList = document.getElementById("post-list");
const emptyState = document.getElementById("empty-state");
const postCount = document.getElementById("post-count");
const filters = document.getElementById("filters");

let activeFilter = "all";
let activeView = "all";
let searchQuery = "";
let currentSort = "newest";

let posts = [];
let savedPosts = readStorageList(SAVED_KEY);
let likedPosts = readStorageList(LIKES_KEY);

let toastTimeout = null;
let lastFocusedElement = null;

function readStorageList(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStorageList(key, list) {
    try {
        localStorage.setItem(key, JSON.stringify(list));
    } catch {
        // Handle storage quota or private-browsing restrictions silently
    }
}

function persistPosts() {
    writeStorageList(POSTS_KEY, posts);
}

function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showToast(message) {
    let toast = document.getElementById("toast");

if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        toast.className =
            "fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 translate-y-3 rounded-full bg-[#17231d] px-5 py-3 text-xs font-bold tracking-[0.06em] text-[#f1ead9] opacity-0 shadow-xl transition-all duration-200 pointer-events-none";
        document.body.appendChild(toast);
    }

toast.textContent = message;
    clearTimeout(toastTimeout);

requestAnimationFrame(() => {
        toast.classList.remove("translate-y-3", "opacity-0");
    });

toastTimeout = setTimeout(() => {
        toast.classList.add("translate-y-3", "opacity-0");
    }, 2200);
}

function formatTime(timestamp) {
    const time = Number(timestamp) || Date.now();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((now - time) / 1000));

if (diff < 15) {
        return "just now";
    }
    if (diff < 60) {
        return `${diff}s ago`;
    }

const minutes = Math.floor(diff / 60);
    if (minutes < 60) {
        return `${minutes}m ago`;
    }

const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }

const days = Math.floor(hours / 24);
    if (days === 1) {
        return "yesterday";
    }
    if (days < 7) {
        return `${days}d ago`;
    }

return new Date(time).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
    });
}

function categoryColor(category) {
    if (category === "grown") {
        return "#607662";
    }
    if (category === "made") {
        return "#d4933a";
    }
    return "#8e3f45";
}

function categoryLabel(category) {
    if (category === "grown") {
        return "grown";
    }
    if (category === "made") {
        return "made";
    }
    return "found";
}

function showComposer() {
    if (!backdrop) return;

lastFocusedElement = document.activeElement;
    backdrop.classList.remove("hidden");
    backdrop.classList.add("flex");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

const draft = localStorage.getItem(DRAFT_KEY);
    if (draft && postContent && !postContent.value) {
        postContent.value = draft;
    }

updateCharacterCounter();

requestAnimationFrame(() => {
        if (postContent) {
            postContent.focus();
        }
    });
}

function hideComposer() {
    if (!backdrop) return;

backdrop.classList.add("hidden");
    backdrop.classList.remove("flex");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
    }
}

function setupComposerEvents() {
    if (openComposerButton) {
        openComposerButton.addEventListener("click", showComposer);
    }
    if (sidebarComposeButton) {
        sidebarComposeButton.addEventListener("click", showComposer);
    }
    if (closeComposerButton) {
        closeComposerButton.addEventListener("click", hideComposer);
    }

if (backdrop) {
        backdrop.addEventListener("click", (event) => {
            if (event.target === backdrop) {
                hideComposer();
            }
        });
    }

document.addEventListener("keydown", (event) => {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        const isEditing =
            activeTag === "input" ||
            activeTag === "textarea" ||
            activeTag === "select" ||
            document.activeElement?.isContentEditable;

if (event.key === "Escape" && backdrop && !backdrop.classList.contains("hidden")) {
            event.preventDefault();
            hideComposer();
            return;
        }

if (isEditing || event.metaKey || event.ctrlKey || event.altKey) {
            return;
        }

if (event.key.toLowerCase() === "n") {
            event.preventDefault();
            showComposer();
        } else if (event.key === "/") {
            event.preventDefault();
            const searchInput = document.getElementById("search-notes");
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
});
}

function updateCharacterCounter() {
    const counter = document.getElementById("composer-char-counter");
    if (!counter || !postContent) return;

const length = postContent.value.length;
    counter.textContent = `${length}/500`;

if (length >= 480) {
        counter.classList.add("text-[#8e3f45]");
        counter.classList.remove("text-[#756f61]");
    } else {
        counter.classList.remove("text-[#8e3f45]");
        counter.classList.add("text-[#756f61]");
    }
}

function addCharacterCounter(){
    if (!postContent || document.getElementById("composer-char-counter")) {
        return;
    }  

const counter = document.createElement("div");
    counter.id = "composer-char-counter";
    counter.className =
        "mt-2 text-right text-[10px] uppercase tracking-[0.14em] text-[#756f61] transition-colors";

postContent.parentElement.appendChild(counter);

postContent.addEventListener("input", () => {
        updateCharacterCounter();
        try {
            localStorage.setItem(DRAFT_KEY, postContent.value);
        } catch {}
    });

updateCharacterCounter();
}

function getCommentCountText(comments) {
    const count = Array.isArray(comments) ? comments.length : 0;
    if (count === 0) return "comment";
    if (count === 1) return "1 comment";
    return `${count} comments`;
}

function renderCommentItems(comments) {
    if (!Array.isArray(comments) || comments.length === 0) {
        return `
            <p class="text-xs italic text-[#756f61]/80 py-1">
                no comments yet. be the first. </p>
        `;
    }

return comments
        .map(
            (comment) => `
        <div class="text-sm text-[#756f61] leading-relaxed">
            <strong class="font-semibold text-[#17231d]">
                @${escapeHTML(comment.author || "someone")}
            </strong>
            <span class="ml-1">${escapeHTML(comment.text)}</span>
            <span class="ml-2 text-[10px] uppercase tracking-wider text-[#756f61]/60">
                ${formatTime(comment.createdAt || Date.now())}
            </span>
        </div>
    `
        )
        .join("");
}

function buildCardElement(post) {
    const article = document.createElement("article");
    article.className =
        "post post-card rounded-[1.4rem] border border-[#294438]/10 bg-[#f8f3e8] px-6 py-6 transition-all";
    article.dataset.id = post.id;
    article.dataset.category = post.category;
    article.dataset.time = String(post.createdAt);
    article.dataset.likes = String(post.likes || 0);

const color = categoryColor(post.category);
    const numberStr = String(post.number || 1).padStart(2, "0");
    const isLiked = likedPosts.includes(post.id);
    const isSaved = savedPosts.includes(post.id);

article.innerHTML = `
        <div class="flex gap-5">
            <div class="hidden w-9 shrink-0 pt-1 sm:block select-none" aria-hidden="true">
                <div class="display text-2xl font-serif" style="color: ${color}">
                    ${numberStr}
                </div>
            </div>

<div class="min-w-0 flex-1">
                <div class="mb-3 flex items-center justify-between gap-4">
                    <span
                        class="text-[10px] font-bold uppercase tracking-[0.18em]"
                        style="color: ${color}"
                    >
                        ${categoryLabel(post.category)}
                    </span>

<span class="post-time text-[10px] uppercase tracking-[0.14em] text-[#756f61]">
                        ${formatTime(post.createdAt)}
                    </span>
                </div>

<h3 class="post-title display text-2xl leading-tight text-[#17231d] font-serif break-words">
                    ${escapeHTML(post.content)}
                </h3>

<div class="mt-5 flex flex-wrap items-center gap-2">
                    <button
                        class="like-button action-button rounded-full border border-[#294438]/10 px-3 py-1.5 text-xs text-[#17231d] transition hover:bg-[#e5dbc4] ${
                            isLiked ? "bg-[#e5dbc4]" : ""
                        }"
                        type="button"
                        aria-label="Appreciate this note"
                    >
                        <span aria-hidden="true">${isLiked ? "" : ""}</span>
                        <span class="like-count ml-1 font-semibold">${post.likes || 0}</span>
                    </button>

<button
                        class="comment-button action-button rounded-full border border-[#294438]/10 px-3 py-1.5 text-xs text-[#17231d] transition hover:bg-[#e5dbc4]"
                        type="button"
                        aria-expanded="false"
                    >
                        ${getCommentCountText(post.comments)}
                    </button>

<button
                        class="save-button action-button rounded-full border border-[#294438]/10 px-3 py-1.5 text-xs text-[#17231d] transition hover:bg-[#e5dbc4] ${
                            isSaved ? "bg-[#e5dbc4] font-medium" : ""
                        }"
                        type="button"
                    >
                        ${isSaved ? "saved" : "save"}
                    </button>

<button
                        class="share-button action-button rounded-full border border-[#294438]/10 px-3 py-1.5 text-xs text-[#17231d] transition hover:bg-[#e5dbc4]"
                        type="button"
                    >
                        share
                    </button>

<span class="ml-auto px-1 text-xs text-[#756f61]">
                        @${escapeHTML(post.author || "you")}
                    </span>
                </div>

<div class="comment-drawer mt-4 hidden">
                    <div class="border-t border-[#294438]/10 pt-4">
                        <div class="comments mb-4 space-y-3 max-h-64 overflow-y-auto pr-1">
                            ${renderCommentItems(post.comments)}
                        </div>

<form class="comment-form flex gap-2">
                            <input
                                class="min-w-0 flex-1 rounded-full border border-[#294438]/15 bg-[#f1ead9] px-4 py-2 text-sm text-[#17231d] outline-none placeholder:text-[#756f61]/60 focus:border-[#294438]/40 transition"
                                placeholder="leave a thought..." maxlength="200"
                                required
                            />
                            <button
                                class="rounded-full bg-[#294438] px-4 py-2 text-xs font-bold text-[#f1ead9] transition hover:bg-[#1d3028]"
                                type="submit"
                            >
                                send
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

attachCardBehaviors(article, post);
    return article;
}

function attachCardBehaviors(article, post) {
    const likeBtn = article.querySelector(".like-button");
    const commentBtn = article.querySelector(".comment-button");
    const saveBtn = article.querySelector(".save-button");
    const shareBtn = article.querySelector(".share-button");
    const drawer = article.querySelector(".comment-drawer");
    const commentForm = article.querySelector(".comment-form");

if (likeBtn) {
        likeBtn.addEventListener("click", () => {
            const isLiked = likedPosts.includes(post.id);
            const countElem = article.querySelector(".like-count");
            const iconSpan = likeBtn.querySelector("span:first-child");

if (isLiked) {
                likedPosts = likedPosts.filter((id) => id !== post.id);
                post.likes = Math.max(0, (post.likes || 0) - 1);
                if (iconSpan) iconSpan.textContent = "";
                likeBtn.classList.remove("bg-[#e5dbc4]");
            } else {
                likedPosts.push(post.id);
                post.likes = (post.likes || 0) + 1;
                if (iconSpan) iconSpan.textContent = "";
                likeBtn.classList.add("bg-[#e5dbc4]");
            }

article.dataset.likes = String(post.likes);
            if (countElem) countElem.textContent = String(post.likes);

writeStorageList(LIKES_KEY, likedPosts);
            persistPosts();
            updateBoardMetrics();
        });
}

if (commentBtn && drawer) {
        commentBtn.addEventListener("click", () => {
            const isExpanded = !drawer.classList.contains("hidden");
            if (isExpanded) {
                drawer.classList.add("hidden");
                commentBtn.setAttribute("aria-expanded", "false");
            } else {
                drawer.classList.remove("hidden");
                commentBtn.setAttribute("aria-expanded", "true");
                const input = drawer.querySelector("input");
                if (input) input.focus();
            }
        });
    }

if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            const isSaved = savedPosts.includes(post.id);

if (isSaved) {
                savedPosts = savedPosts.filter((id) => id !== post.id);
                saveBtn.textContent = "save";
                saveBtn.classList.remove("bg-[#e5dbc4]", "font-medium");
                showToast("Removed from your basket");
            } else {
                savedPosts.push(post.id);
                saveBtn.textContent = "saved";
                saveBtn.classList.add("bg-[#e5dbc4]", "font-medium");
                showToast("Saved to your basket");
            }

writeStorageList(SAVED_KEY, savedPosts);
            updateSavedCounter();

if (activeView === "saved") {
                renderBoard();
            }
        });
}

if (shareBtn) {
        shareBtn.addEventListener("click", async () => {
            const title = "Harvest field note";
            const text = post.content || "A field note from Harvest";

try {
                if (navigator.share) {
                    await navigator.share({ title, text });
                    return;
                }
                await navigator.clipboard.writeText(text);
                showToast("Note copied to clipboard");
            } catch (err) {
                if (err && err.name !== "AbortError") {
                    try {
                        await navigator.clipboard.writeText(text);
                        showToast("Note copied to clipboard");
                    } catch {
                        showToast("Couldn't share note");
                    }
                }
            }
        });
}

if (commentForm && drawer) {
        commentForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const input = commentForm.querySelector("input");
            if (!input) return;

const text = input.value.trim();
            if (!text) return;

if (!Array.isArray(post.comments)) {
                post.comments = [];
            }

post.comments.push({
                author: "you",
                text,
                createdAt: Date.now()
            });

input.value = "";
            persistPosts();

const commentsContainer = drawer.querySelector(".comments");
            if (commentsContainer) {
                commentsContainer.innerHTML = renderCommentItems(post.comments);
            }

if (commentBtn) {
                commentBtn.textContent = getCommentCountText(post.comments);
            }

updateBoardMetrics();
            showToast("Comment added");
        });
}
}

function initializePostsState() {
    const existingCards = Array.from(document.querySelectorAll(".post-card"));
    const storedPosts = readStorageList(POSTS_KEY);

if (storedPosts.length > 0) {
        posts = storedPosts;
    } else {
        posts = existingCards.map((card, index) => {
            const id = card.dataset.id || `seed-${index + 1}`;
            const category = card.dataset.category || "found";
            const titleElem = card.querySelector(".post-title");
            const content = titleElem ? titleElem.textContent.trim() : "";
            const authorElem = card.querySelector(".ml-auto");
            const author = authorElem
                ? authorElem.textContent.trim().replace(/^@/, "")
                : "someone";

const likeCountElem = card.querySelector(".like-count");
            const likes = likeCountElem ? Number(likeCountElem.textContent) || 0 : 0;
            const ageInMinutes = (index + 1) * 23;
            const createdAt = Date.now() - ageInMinutes * 60 * 1000;

return {
                id,
                number: index + 1,
                content,
                category,
                author,
                likes,
                comments: [],
                createdAt
            };
        });
        persistPosts();
    }
}

function getSortedFilteredPosts() {
    let list = posts.slice();

if (activeView === "saved") {
        list = list.filter((p) => savedPosts.includes(p.id));
    }

if (activeFilter !== "all") {
        list = list.filter((p) => p.category === activeFilter);
    }

if (searchQuery) {
        const query = searchQuery.toLowerCase();
        list = list.filter(
            (p) =>
                p.content.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query) ||
                (p.author && p.author.toLowerCase().includes(query))
        );
    }

if (currentSort === "popular") {
        list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

return list;
}

function renderBoard() {
    if (!postList) return;

const visiblePosts = getSortedFilteredPosts();
    postList.innerHTML = "";

visiblePosts.forEach((post) => {
        const cardElement = buildCardElement(post);
        postList.appendChild(cardElement);
    });

if (emptyState) {
        if (visiblePosts.length === 0) {
            emptyState.classList.remove("hidden");
        } else {
            emptyState.classList.add("hidden");
        }
    }

if (postCount) {
        const count = visiblePosts.length;
        const total = posts.length;
        if (activeView === "saved") {
            postCount.textContent = `${count} in basket`;
        } else if (activeFilter !== "all" || searchQuery) {
            postCount.textContent = `${count} of ${total} notes`;
        } else {
            postCount.textContent = `${count} notes`;
        }
    }

updateSidebarCategoryTotals();
    updateBoardMetrics();
    updateSavedCounter();
}

function updateSidebarCategoryTotals() {
    const counts = {
        grown: 0,
        made: 0,
        found: 0
    };

posts.forEach((p) => {
        if (counts[p.category] !== undefined) {
            counts[p.category]++;
        }
    });

const categoryRows = document.querySelectorAll("aside .space-y-3 > div");
    categoryRows.forEach((row) => {
        const nameElem = row.querySelector("span:first-child");
        const countElem = row.querySelector("span:last-child");
        if (!nameElem || !countElem) return;

const cat = nameElem.textContent.trim().toLowerCase();
        if (counts[cat] !== undefined) {
            countElem.textContent = String(counts[cat]).padStart(2, "0");
        }
    });
}

function updateBoardMetrics() {
    const statsElem = document.getElementById("board-stats");
    if (!statsElem) return;

let totalLikes = 0;
    let totalReplies = 0;

posts.forEach((p) => {
        totalLikes += Number(p.likes) || 0;
        if (Array.isArray(p.comments)) {
            totalReplies += p.comments.length;
        }
    });

statsElem.textContent = `${totalLikes} gathered likes  ${totalReplies} replies`;
}

function updateSavedCounter() {
    const countElem = document.getElementById("saved-note-count");
    if (!countElem) return;

const count = savedPosts.length;
    if (count === 0) {
        countElem.textContent = "Nothing saved yet.";
    } else if (count === 1) {
        countElem.textContent = "1 note tucked away.";
    } else {
        countElem.textContent = `${count} notes tucked away.`;
    }
}

function createBoardControls() {
    if (!filters || document.getElementById("search-notes")) return;

const controls = document.createElement("div");
    controls.className =
        "mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";

controls.innerHTML = `
        <div class="relative min-w-0 flex-1">
            <input
                id="search-notes"
                type="search"
                placeholder="search the harvest..." autocomplete="off"
                class="w-full rounded-full border border-[#294438]/12 bg-[#f8f3e8] px-4 py-3 pr-12 text-sm text-[#17231d] outline-none transition placeholder:text-[#756f61]/55 focus:border-[#294438]/35"
            />
            <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.12em] text-[#756f61]/60 select-none">
                /
            </span>
        </div>

<select
            id="sort-notes"
            class="rounded-full border border-[#294438]/12 bg-[#f8f3e8] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#756f61] outline-none transition focus:border-[#294438]/35 cursor-pointer"
        >
            <option value="newest">newest first</option>
            <option value="popular">most gathered</option>
        </select>
    `;

filters.parentElement.insertBefore(controls, filters);

const searchInput = controls.querySelector("#search-notes");
    const sortSelect = controls.querySelector("#sort-notes");

if (searchInput) {
        searchInput.addEventListener("input", () => {
            searchQuery = searchInput.value.trim();
            renderBoard();
        });
    }

if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            currentSort = sortSelect.value;
            renderBoard();
        });
    }
}

function wireFilterPills() {
    const buttons = document.querySelectorAll(".filter-button");

buttons.forEach((button) => {
        button.addEventListener("click", () => {
            activeView = "all";
            activeFilter = button.dataset.filter || "all";

buttons.forEach((b) => {
                b.classList.remove("bg-[#294438]", "text-[#f1ead9]");
                b.classList.add("border", "border-[#294438]/15", "text-[#756f61]");
            });

button.classList.remove("border", "border-[#294438]/15", "text-[#756f61]");
            button.classList.add("bg-[#294438]", "text-[#f1ead9]");

renderBoard();
        });
});
}

function addEmptyStateAction() {
    if (!emptyState || emptyState.querySelector("button")) return;

const actionButton = document.createElement("button");
    actionButton.type = "button";
    actionButton.textContent = "+ add a field note";
    actionButton.className =
        "mt-6 rounded-full bg-[#294438] px-5 py-3 text-xs font-bold uppercase tracking-[0.13em] text-[#f1ead9] transition hover:bg-[#1d3028]";

actionButton.addEventListener("click", showComposer);
    emptyState.appendChild(actionButton);
}

function addSavedNotesSection() {
    const sidebar = document.querySelector("aside");
    if (!sidebar || document.getElementById("saved-notes")) return;

const section = document.createElement("div");
    section.id = "saved-notes";
    section.className =
        "rounded-[1.4rem] border border-[#294438]/12 bg-[#f8f3e8] p-6 transition-all";

section.innerHTML = `
        <div class="text-[9px] uppercase tracking-[0.25em] text-[#756f61] font-bold">
            your basket
        </div>
        <div class="mt-2 display text-2xl font-serif text-[#17231d]">
            Saved notes
        </div>
        <div id="saved-note-count" class="mt-1 text-xs text-[#756f61]">
            Nothing saved yet. </div>
        <button
            id="show-saved"
            type="button"
            class="mt-5 rounded-full border border-[#294438]/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#17231d] transition hover:bg-[#e5dbc4]"
        >
            show saved
        </button>
    `;

sidebar.appendChild(section);

const toggleSavedBtn = section.querySelector("#show-saved");
    if (toggleSavedBtn) {
        toggleSavedBtn.addEventListener("click", () => {
            if (activeView === "saved") {
                activeView = "all";
                toggleSavedBtn.textContent = "show saved";
                toggleSavedBtn.classList.remove("bg-[#294438]", "text-[#f1ead9]");
                showToast("Showing all notes");
            } else {
                if (savedPosts.length === 0) {
                    showToast("Your basket is empty");
                    return;
                }
                activeView = "saved";
                toggleSavedBtn.textContent = "show all notes";
                toggleSavedBtn.classList.add("bg-[#294438]", "text-[#f1ead9]");
                showToast("Viewing saved notes");
            }
            renderBoard();
        });
    }
}

function addQuickStats() {
    const boardHeading = document.querySelector("section.mt-8 h2");
    if (!boardHeading || document.getElementById("board-stats")) return;

const stats = document.createElement("span");
    stats.id = "board-stats";
    stats.className =
        "ml-3 inline-block align-middle text-[10px] font-sans font-bold uppercase tracking-[0.16em] text-[#756f61]";

boardHeading.appendChild(stats);
    updateBoardMetrics();
}

function addTodayNote() {
    const hero = document.querySelector("main > section");
    if (!hero || hero.querySelector(".today-stamp")) return;

const note = document.createElement("div");
    note.className =
        "today-stamp absolute bottom-4 right-5 hidden text-right text-[9px] uppercase tracking-[0.16em] text-[#f1ead9]/45 lg:block select-none pointer-events-none";

note.textContent = new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric"
    });

hero.appendChild(note);
}

function addFooterKeyboardHint() {
    const existing = document.getElementById("footer-keyboard-hint");
    if (existing) return;

const hint = document.createElement("div");
    hint.id = "footer-keyboard-hint";
    hint.className =
        "mx-auto max-w-[1380px] px-5 pb-10 pt-4 text-[9px] uppercase tracking-[0.18em] text-[#756f61]/60 select-none lg:px-8";
    hint.textContent = "press N for a new note  press / to search  ESC to close";

document.body.appendChild(hint);
}

function cleanBrokenLinks() {
    document.querySelectorAll("a[href='#']").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    });
}

function refreshTimestamps() {
    document.querySelectorAll(".post-time").forEach((timeElem) => {
        const card = timeElem.closest(".post-card");
        if (!card) return;
        const timestamp = Number(card.dataset.time);
        if (timestamp) {
            timeElem.textContent = formatTime(timestamp);
        }
    });
}

function restoreDraftPrompt() {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (!draft || !draft.trim()) return;

const promptBtn = document.createElement("button");
    promptBtn.type = "button";
    promptBtn.className =
        "fixed bottom-6 right-6 z-40 rounded-full border border-[#294438]/20 bg-[#f1ead9] px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#294438] shadow-lg transition hover:bg-[#e5dbc4]";
    promptBtn.textContent = "resume draft";

promptBtn.addEventListener("click", () => {
        showComposer();
        promptBtn.remove();
    });

document.body.appendChild(promptBtn);

setTimeout(() => {
        if (promptBtn.parentNode) {
            promptBtn.classList.add("opacity-0", "translate-y-2");
            promptBtn.style.transition = "all 0.3s ease";
            setTimeout(() => promptBtn.remove(), 300);
        }
    }, 7000);
}

function setupFormSubmission() {
    if (!postForm) return;

postForm.addEventListener("submit", (event) => {
        event.preventDefault();

const content = postContent ? postContent.value.trim() : "";
        const category = postCategory ? postCategory.value : "grown";

if (!content) {
            if (postContent) postContent.focus();
            return;
        }

const highestNumber = posts.reduce((max, p) => Math.max(max, Number(p.number) || 0), 0);

const newPost = {
            id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            number: highestNumber + 1,
            content,
            category,
            author: "you",
            likes: 0,
            comments: [],
            createdAt: Date.now()
        };

posts.unshift(newPost);
        persistPosts();

postForm.reset();
        localStorage.removeItem(DRAFT_KEY);
        updateCharacterCounter();
        hideComposer();

activeView = "all";
        activeFilter = "all";
        searchQuery = "";

const searchInput = document.getElementById("search-notes");
        if (searchInput) searchInput.value = "";

document.querySelectorAll(".filter-button").forEach((b) => {
            const isAll = (b.dataset.filter || "all") === "all";
            b.classList.toggle("bg-[#294438]", isAll);
            b.classList.toggle("text-[#f1ead9]", isAll);
            b.classList.toggle("border", !isAll);
            b.classList.toggle("text-[#756f61]", !isAll);
        });

renderBoard();
        showToast("Field note added");

requestAnimationFrame(() => {
            const newCard = document.querySelector(`.post-card[data-id="${CSS.escape(newPost.id)}"]`);
            if (newCard) {
                newCard.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
                newCard.animate(
                    [
                        { transform: "translateY(12px)", opacity: 0.2 },
                        { transform: "translateY(0)", opacity: 1 }
                    ],
                    {
                        duration: 350,
                        easing: "cubic-bezier(0.16, 1, 0.3, 1)"
                    }
                );
            }
        });
});
}

function startClock() {
    setInterval(() => {
        refreshTimestamps();
        updateBoardMetrics();
    }, 30000);
}

function start() {
    initializePostsState();
    setupComposerEvents();
    setupFormSubmission();

createBoardControls();
    wireFilterPills();

addCharacterCounter();
    addEmptyStateAction();
    addSavedNotesSection();
    addQuickStats();
    addTodayNote();
    addFooterKeyboardHint();
    cleanBrokenLinks();

renderBoard();
    restoreDraftPrompt();
    startClock();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
} else {
    start();
}