const profile = {
    user: null,
    currentTab: "basket",
    posts: [],

    async start() {
        await app.ready;
        if (!app.user) return;
        await this.loadProfile();
        await this.loadPosts();
        this.bindEditor();
        this.bindTabs();

        if (window.location.hash === "#authored") {
            document.getElementById("tab-authored")?.click();
        }
    },

    async loadProfile() {
        try {
            const data = await app.request("/api/profile");
            this.user = data.user;

            document.getElementById("profile-name").textContent = data.user.display_name;
            document.getElementById("profile-handle").textContent = `@${data.user.handle}`;
            document.getElementById("profile-bio").textContent = data.user.bio || "No bio yet.";
            document.getElementById("profile-location").textContent = data.user.location || "";

            document.getElementById("profile-avatar").textContent = app.initials(data.user.display_name);
            document.getElementById("profile-posts").textContent = data.stats.posts;
            document.getElementById("profile-likes").textContent = data.stats.likes;
            document.getElementById("profile-saved").textContent = data.stats.saved;
        } catch (err) {
            app.toast(err.message);
        }
    },

    async loadPosts() {
        try {
            this.posts = await app.request("/api/posts");
            this.renderRecords();
        } catch (err) {
            app.toast(err.message);
        }
    },

    renderRecords() {
        const list = document.getElementById("profile-records-list");
        const empty = document.getElementById("profile-empty");

        let displayed = [];
        if (this.currentTab === "basket") {
            displayed = this.posts.filter(p => p.saved);
        } else {
            displayed = this.posts.filter(p => p.handle === app.handle);
        }

        empty.classList.toggle("hidden", displayed.length > 0);

        list.innerHTML = displayed.map(post => `
            <article class="post-card" data-id="${post.id}">
                <div class="post-card-top">
                    <span class="specimen-tag category-${post.category}">
                        ${app.escape(post.specimen_no || "SPECIMEN")} · ${app.escape(post.category)}
                    </span>
                    <div class="post-meta-details">
                        <span>${app.escape(post.weather || "brisk")}</span>
                        <span>·</span>
                        <time>${app.timeAgo(post.created_at)}</time>
                    </div>
                </div>

                <div class="post-body">
                    <div class="post-author-row">
                        <div class="author-chip">
                            <div class="profile-avatar">${app.initials(post.display_name)}</div>
                            <div>
                                <strong>${app.escape(post.display_name)}</strong>
                                <span>@${app.escape(post.handle)}</span>
                            </div>
                        </div>
                    </div>

                    <p class="post-text">${app.escape(post.text)}</p>

                    ${post.image ? `
                        <div class="post-specimen-frame">
                            <img src="${app.escape(post.image)}" alt="Specimen" loading="lazy">
                        </div>
                    ` : ""}

                    <div class="post-actions">
                        ${this.currentTab === "basket" ? `
                            <button class="action-pill active" data-action="unsave">
                                <span>Remove</span>
                            </button>
                        ` : `
                            <button class="delete-action" data-action="delete">Delete</button>
                        `}
                    </div>
                </div>
            </article>
        `).join("");

        list.querySelectorAll("[data-action='unsave']").forEach(btn => {
            btn.addEventListener("click", async () => {
                const card = btn.closest(".post-card");
                const id = Number(card.dataset.id);
                try {
                    await app.request(`/api/posts/${id}/save`, {
                        method: "POST"
                    });
                    const target = this.posts.find(p => p.id === id);
                    if (target) target.saved = 0;
                    this.renderRecords();
                    await this.loadProfile();
                    app.toast("Removed.");
                } catch (err) {
                    app.toast(err.message);
                }
            });
        });

        list.querySelectorAll("[data-action='delete']").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm("Delete this note for good?")) return;
                const card = btn.closest(".post-card");
                const id = Number(card.dataset.id);
                try {
                    await app.request(`/api/posts/${id}`, {
                        method: "DELETE"
                    });
                    this.posts = this.posts.filter(p => p.id !== id);
                    this.renderRecords();
                    await this.loadProfile();
                    app.toast("Review deleted.");
                } catch (err) {
                    app.toast(err.message);
                }
            });
        });
    },

    bindTabs() {
        const basketTab = document.getElementById("tab-basket");
        const authoredTab = document.getElementById("tab-authored");

        basketTab.addEventListener("click", () => {
            basketTab.classList.add("active");
            authoredTab.classList.remove("active");
            this.currentTab = "basket";
            this.renderRecords();
        });

        authoredTab.addEventListener("click", () => {
            authoredTab.classList.add("active");
            basketTab.classList.remove("active");
            this.currentTab = "authored";
            this.renderRecords();
        });
    },

    bindEditor() {
        const backdrop = document.getElementById("profile-backdrop");
        const editBtn = document.getElementById("edit-profile");
        const closeBtn = document.getElementById("close-profile");
        const cancelBtn = document.getElementById("cancel-profile");
        const form = document.getElementById("profile-form");

        const open = () => {
            document.getElementById("display-name").value = this.user?.display_name || "";
            document.getElementById("bio").value = this.user?.bio || "";
            document.getElementById("location").value = this.user?.location || "";
            backdrop.classList.remove("hidden");
        };

        const close = () => backdrop.classList.add("hidden");

        editBtn.addEventListener("click", open);
        closeBtn.addEventListener("click", close);
        cancelBtn.addEventListener("click", close);
        backdrop.addEventListener("click", e => { if (e.target === backdrop) close(); });

        form.addEventListener("submit", async e => {
            e.preventDefault();
            try {
                const res = await app.request("/api/profile", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        displayName: document.getElementById("display-name").value,
                        bio: document.getElementById("bio").value,
                        location: document.getElementById("location").value
                    })
                });

                this.user = res.user;
                await this.loadProfile();
                app.loadNavProfile();
                close();
                app.toast("Profile saved.");
            } catch (err) {
                app.toast(err.message);
            }
        });
    }
};

document.addEventListener("DOMContentLoaded", () => profile.start());