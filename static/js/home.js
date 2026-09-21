const home = {
    posts: [],
    filter: "all",
    difficulty: "all",
    takeAgain: "all",
    ratingFilter: "all",
    query: "",
    sort: "newest",
    debounceTimer: null,

    list: document.getElementById("post-list"),
    empty: document.getElementById("empty-state"),

    async start() {
        this.bindComposer();
        this.bindFilters();
        this.bindDifficulty();
        this.bindSearch();
        this.bindSort();
        this.bindTakeAgain();
        this.bindRatingFilter();

        await this.loadPosts();
        await this.loadStats();

        setInterval(() => this.refreshTimes(), 30000);

        const params = new URLSearchParams(window.location.search);
        if (params.get("compose") === "1") {
            setTimeout(() => document.getElementById("new-note")?.click(), 200);
        }
    },

    async loadPosts() {
        try {
            this.posts = await app.request(
                `/api/posts?handle=${encodeURIComponent(app.handle)}&sort=${this.sort}`
            );
            this.render();
        } catch (err) {
            app.toast(err.message);
        }
    },

    async loadStats() {
        try {
            const stats = await app.request("/api/stats");
            const peopleEl = document.getElementById("stat-people");
            const postsEl = document.getElementById("stat-posts");
            if (peopleEl) peopleEl.textContent = stats.people;
            if (postsEl) postsEl.textContent = stats.posts;
        } catch {
            // Non-critical
        }
    },

    render() {
        let filtered = [...this.posts];

        if (this.filter !== "all") {
            filtered = filtered.filter(p => p.category === this.filter);
        }

        if (this.difficulty !== "all") {
            filtered = filtered.filter(p => p.difficulty === this.difficulty);
        }

        if (this.takeAgain !== "all") {
            filtered = filtered.filter(p => p.take_again === this.takeAgain);
        }

        if (this.ratingFilter !== "all") {
            const minimumRating = Number(this.ratingFilter);

            filtered = filtered.filter(
                p => Number(p.rating) >= minimumRating
            );
        }

        if (this.query) {
            const q = this.query.toLowerCase();
            filtered = filtered.filter(p =>
                p.text.toLowerCase().includes(q) ||
                p.display_name.toLowerCase().includes(q) ||
                p.handle.toLowerCase().includes(q) ||
                (p.teacher && p.teacher.toLowerCase().includes(q)) ||
                (p.course && p.course.toLowerCase().includes(q)) ||
                (p.rating && p.rating.toString() === q)
            );
        }

        this.list.innerHTML = filtered.map(post => this.renderCard(post)).join("");
        this.empty.classList.toggle("hidden", filtered.length > 0);

        const countEl = document.getElementById("post-count");
        if (countEl) countEl.textContent = this.posts.length;

        this.renderBasketPreview();
    },

    renderCard(post) {
        const comments = post.comments || [];
        const isAuthor = post.handle === app.handle;

        return `
            <article class="post-card" data-id="${post.id}">
                <div class="post-card-top">
                    <div class="post-meta-details">
                        <time data-time="${post.created_at}">
                            ${app.timeAgo(post.created_at)}
                        </time>
                    </div>
                </div>

                <div class="post-body">

                    <div class="review-heading">
                        <h3>${app.escape(post.teacher || "Unknown Teacher")}</h3>
                        <p>${app.escape(post.course || "Unknown Course")}</p>
                    </div>

                    <div class="review-meta">
                        <div>
                            Difficulty: ${app.escape(
                                (post.difficulty || "medium").replace(/^\w/, c => c.toUpperCase())
                            )}
                        </div>

                        <div>
                            Workload: ${app.escape(
                                (post.workload || "average").replace(/^\w/, c => c.toUpperCase())
                            )}
                        </div>
                        <div>
                            Would Take Again: ${post.take_again === "yes" ? "Yes" : "No"}
                        </div>
                        <div class="review-rating">
                            Rating:
                            ${"★".repeat(Number(post.rating) || 3)}
                            ${"☆".repeat(5 - (Number(post.rating) || 3))}
                        </div>
                    </div>

                    <div class="post-author-row">
                        <div class="author-chip">
                            <div class="profile-avatar">${app.initials(post.display_name)}</div>
                            <div>
                                <strong>${app.escape(post.display_name)}</strong>
                                <span>@${app.escape(post.handle)}</span>
                            </div>
                        </div>
                        ${post.location ? `<span class="author-location">${app.escape(post.location)}</span>` : ""}
                    </div>

                    <p class="post-text">${app.escape(post.text)}</p>

                    ${post.image ? `
                        <div class="post-specimen-frame">
                            <img src="${app.escape(post.image)}" alt="Photo from this note" loading="lazy">
                        </div>
                    ` : ""}

                    <div class="post-actions">
                        <button class="action-pill ${post.liked ? "active" : ""}" data-action="like" title="Like this note">
                            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            <span>${post.likes} likes</span>
                        </button>

                        <button class="action-pill" data-action="comments">
                            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            <span>${comments.length ? `${comments.length} comments` : "Comment"}</span>
                        </button>

                        <button class="action-pill ${post.saved ? "active" : ""}" data-action="save">
                            <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                            <span>${post.saved ? "Saved" : "Save"}</span>
                        </button>

                        ${isAuthor ? `
                            <button class="delete-action" data-action="delete">Delete</button>
                        ` : ""}
                    </div>

                    <div class="comment-drawer">
                        <div class="comment-stream">
                            ${comments.map(c => `
                                <div class="comment-node">
                                    <strong>@${app.escape(c.handle)} · <small style="font-weight: normal; color: var(--muted);">${app.timeAgo(c.created_at)}</small></strong>
                                    <span>${app.escape(c.text)}</span>
                                </div>
                            `).join("")}
                        </div>

                        <form class="comment-form">
                            <input maxlength="500" placeholder="Add a comment..." required>
                            <button type="submit">Reply</button>
                        </form>
                    </div>
                </div>
            </article>
        `;
    },

    bindFilters() {
        document.querySelectorAll("#category-filters .filter-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#category-filters .filter-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.filter = btn.dataset.filter;
                this.render();
            });
        });

        document.getElementById("reset-filters")?.addEventListener("click", () => {
            this.filter = "all";
            this.query = "";
            this.difficulty = "all";
            this.takeAgain = "all";
            this.ratingFilter = "all";

            const ratingSelect = document.getElementById("rating-filter");
            if (ratingSelect) ratingSelect.value = "all";

            const search = document.getElementById("post-search");
            if (search) search.value = "";

            const difficultySelect = document.getElementById("difficulty-filter");
            if (difficultySelect) difficultySelect.value = "all";

            const takeAgainSelect = document.getElementById("take-again-filter");
            if (takeAgainSelect) takeAgainSelect.value = "all";

            document.querySelectorAll("#category-filters .filter-btn").forEach(b => {
                b.classList.toggle("active", b.dataset.filter === "all");
            });

            this.render();
        });
    },

    bindDifficulty() {
    const select = document.getElementById("difficulty-filter");

    if (!select) return;

    select.addEventListener("change", () => {
        this.difficulty = select.value;
        this.render();
    });
},

    bindSearch() {
        const input = document.getElementById("post-search");
        if (!input) return;

        input.addEventListener("input", () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.query = input.value.trim();
                this.render();
            }, 140);
        });

        document.addEventListener("keydown", e => {
            if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
                e.preventDefault();
                input.focus();
            }
        });
    },
    bindTakeAgain() {
        const select = document.getElementById("take-again-filter");

        if (!select) return;

        select.addEventListener("change", () => {
            this.takeAgain = select.value;
            this.render();
        });
    },

    bindRatingFilter() {
    const select = document.getElementById("rating-filter");

    if (!select) return;

    select.addEventListener("change", () => {
        this.ratingFilter = select.value;
        this.render();
    });
},

    bindSort() {
        const select = document.getElementById("sort-posts");
        select?.addEventListener("change", async () => {
            this.sort = select.value;
            await this.loadPosts();
        });
    },

    bindComposer() {
        const backdrop = document.getElementById("composer-backdrop");
        const form = document.getElementById("post-form");
        const text = document.getElementById("post-text");
        const file = document.getElementById("post-image");
        const preview = document.getElementById("image-preview");
        const previewWrap = document.getElementById("image-preview-wrap");
        const clearBtn = document.getElementById("clear-upload");

        const open = () => {
            backdrop.classList.remove("hidden");
            document.body.classList.add("modal-open");
            text.focus();
        };

        const close = () => {
            backdrop.classList.add("hidden");
            document.body.classList.remove("modal-open");
        };

        document.getElementById("new-note")?.addEventListener("click", open);
        document.getElementById("close-composer")?.addEventListener("click", close);
        document.getElementById("cancel-composer")?.addEventListener("click", close);

        backdrop.addEventListener("click", e => {
            if (e.target === backdrop) close();
        });

        text.addEventListener("input", () => {
            document.getElementById("post-characters").textContent = `${text.value.length} / 1400`;
        });

        file.addEventListener("change", () => {
            const selected = file.files[0];
            if (!selected) return;

            if (selected.size > 5 * 1024 * 1024) {
                app.toast("That image is over 5MB.");
                file.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = e => {
                preview.src = e.target.result;
                previewWrap.classList.remove("hidden");
            };
            reader.readAsDataURL(selected);
        });

        clearBtn?.addEventListener("click", () => {
            file.value = "";
            preview.src = "";
            previewWrap.classList.add("hidden");
        });

        form.addEventListener("submit", async e => {
            e.preventDefault();
            const submitBtn = document.getElementById("submit-post-btn");
            submitBtn.disabled = true;
            submitBtn.textContent = "Posting...";

            const formData = new FormData(form);
            formData.append("handle", app.handle);

            try {
                const newPost = await app.request("/api/posts", {
                    method: "POST",
                    body: formData
                });

                this.posts.unshift(newPost);
                this.render();
                form.reset();
                previewWrap.classList.add("hidden");
                document.getElementById("post-characters").textContent = "0 / 1400";
                close();
                app.toast("Posted.");
            } catch (err) {
                app.toast(err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Post it";
            }
        });
    },

    renderBasketPreview() {
        const saved = this.posts.filter(p => p.saved);
        const container = document.getElementById("saved-preview-list");
        if (!container) return;

        if (saved.length === 0) {
            container.innerHTML = `<div style="color: var(--muted); font-size: 13px;">Nothing saved yet.</div>`;
            return;
        }

        container.innerHTML = saved.slice(0, 3).map(p => `
            <div class="basket-preview-item">
                <strong>${app.escape(p.specimen_no || p.category)} · @${app.escape(p.handle)}</strong>
                <span>${app.escape(p.text.slice(0, 80))}${p.text.length > 80 ? "…" : ""}</span>
            </div>
        `).join("");
    },

    refreshTimes() {
        this.list.querySelectorAll("time[data-time]").forEach(el => {
            el.textContent = app.timeAgo(Number(el.dataset.time));
        });
    }
};

document.addEventListener("click", async e => {
    const actionBtn = e.target.closest("[data-action]");
    if (!actionBtn) return;

    const card = actionBtn.closest(".post-card");
    const id = Number(card?.dataset.id);
    const post = home.posts.find(p => p.id === id);
    if (!post) return;

    const action = actionBtn.dataset.action;

    if (action === "comments") {
        card.classList.toggle("comments-open");
        return;
    }

    if (action === "like") {
        try {
            const res = await app.request(`/api/posts/${id}/like`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ handle: app.handle })
            });
            post.likes = res.likes;
            post.liked = Boolean(res.liked);
            
            actionBtn.classList.toggle("active", post.liked);
            actionBtn.querySelector("span").textContent = `${post.likes} likes`;
            app.toast(post.liked ? "Liked." : "Like removed.");
        } catch (err) {
            app.toast(err.message);
        }
        return;
    }

    if (action === "save") {
        try {
            const res = await app.request(`/api/posts/${id}/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ handle: app.handle })
            });
            post.saved = res.saved;
            actionBtn.classList.toggle("active", post.saved);
            actionBtn.querySelector("span").textContent = post.saved ? "Saved" : "Save";
            home.renderBasketPreview();
            app.toast(post.saved ? "Saved." : "Removed from saved.");
        } catch (err) {
            app.toast(err.message);
        }
        return;
    }

    if (action === "delete") {
        if (!confirm("Delete this note for good?")) return;
        try {
            await app.request(`/api/posts/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ handle: app.handle })
            });
            home.posts = home.posts.filter(p => p.id !== id);
            home.render();
            app.toast("Note deleted.");
        } catch (err) {
            app.toast(err.message);
        }
    }
});

document.addEventListener("submit", async e => {
    if (!e.target.matches(".comment-form")) return;
    e.preventDefault();

    const form = e.target;
    const card = form.closest(".post-card");
    const id = Number(card?.dataset.id);
    const input = form.querySelector("input");
    const text = input.value.trim();
    if (!text) return;

    try {
        const comment = await app.request(`/api/posts/${id}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ handle: app.handle, text })
        });

        const post = home.posts.find(p => p.id === id);
        post.comments.push(comment);

        const stream = card.querySelector(".comment-stream");
        const node = document.createElement("div");
        node.className = "comment-node";
        node.innerHTML = `
            <strong>@${app.escape(comment.handle)} · <small style="font-weight: normal; color: var(--muted);">just now</small></strong>
            <span>${app.escape(comment.text)}</span>
        `;
        stream.appendChild(node);
        input.value = "";

        const commentBtn = card.querySelector('[data-action="comments"] span');
        if (commentBtn) commentBtn.textContent = `${post.comments.length} comments`;

        app.toast("Comment posted.");
    } catch (err) {
        app.toast(err.message);
    }
});

document.addEventListener("DOMContentLoaded", () => home.start());