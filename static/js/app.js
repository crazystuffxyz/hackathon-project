const app = {
    handle: null,
    user: null,
    toastTimer: null,
    usersCache: [],

    async request(url, options = {}) {
        const response = await fetch(url, options);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || "Something went wrong. Try again.");
        }

        return data;
    },

    initials(name) {
        return String(name || "You")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part[0])
            .join("")
            .toUpperCase();
    },

    weatherLabel(value) {
        const labels = { mist: "misty", brisk: "brisk", frost: "frost", clear: "clear", sun: "sunny" };
        return labels[value] || value || "";
    },

    timeAgo(timestamp) {
        const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
        if (seconds < 20) return "just now";
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;

        return new Date(timestamp).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric"
        });
    },

    escape(text) {
        const node = document.createElement("div");
        node.textContent = text == null ? "" : String(text);
        return node.innerHTML;
    },

    toast(message) {
        let toast = document.querySelector(".toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.className = "toast";
            document.body.appendChild(toast);
        }

        clearTimeout(app.toastTimer);
        toast.textContent = message;
        toast.classList.add("show");

        app.toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 2600);
    },

    async loadSession() {
        try {
            const data = await app.request("/api/me");
            app.user = data.user;
            app.handle = data.user ? data.user.handle : null;
        } catch {
            app.user = null;
            app.handle = null;
        }
    },

    async loadNavProfile() {
        if (!app.user) return;

        try {
            const handleEl = document.getElementById("nav-handle");
            const avatarEl = document.getElementById("nav-avatar");
            const nameEl = document.getElementById("nav-display-name");

            if (handleEl) handleEl.textContent = `@${app.user.handle}`;
            if (nameEl) nameEl.textContent = app.user.display_name;
            if (avatarEl) avatarEl.textContent = app.initials(app.user.display_name);

            const unreadData = await app.request("/api/messages");
            const unreadTotal = unreadData.reduce((acc, c) => acc + (c.unread_count || 0), 0);

            const badge = document.getElementById("message-badge");
            const mobileBadge = document.getElementById("mobile-message-badge");

            if (badge) {
                badge.textContent = unreadTotal;
                badge.classList.toggle("hidden", unreadTotal === 0);
            }
            if (mobileBadge) {
                mobileBadge.textContent = unreadTotal;
                mobileBadge.classList.toggle("hidden", unreadTotal === 0);
            }
        } catch {
            // Keep working even if offline
        }
    },

    async setupAccountPanel() {
        const btn = document.getElementById("open-persona-switcher");
        const backdrop = document.getElementById("persona-backdrop");
        const list = document.getElementById("persona-list");
        const closeBtn = document.getElementById("close-persona");

        if (!btn || !backdrop || !list || !app.user) return;

        btn.addEventListener("click", () => {
            list.innerHTML = `
                <div class="persona-option current">
                    <div class="profile-avatar">${app.initials(app.user.display_name)}</div>
                    <div style="flex: 1;">
                        <strong>${app.escape(app.user.display_name)}</strong>
                        <span>@${app.escape(app.user.handle)} · ${app.escape(app.user.location)}</span>
                    </div>
                    <span style="font-family: var(--font-mono); font-size: 10px; color: var(--foxglove);">ACTIVE</span>
                </div>
                <button class="persona-option" id="logout-btn">
                    <div class="profile-avatar">→</div>
                    <div style="flex: 1;">
                        <strong>Log out</strong>
                        <span>Back to the login screen</span>
                    </div>
                </button>
            `;

            document.getElementById("logout-btn").addEventListener("click", async () => {
                try {
                    await app.request("/api/logout", { method: "POST" });
                    window.location.href = "/login.html";
                } catch (err) {
                    app.toast(err.message);
                }
            });

            backdrop.classList.remove("hidden");
        });

        if (closeBtn) {
            closeBtn.addEventListener("click", () => backdrop.classList.add("hidden"));
        }

        backdrop.addEventListener("click", e => {
            if (e.target === backdrop) backdrop.classList.add("hidden");
        });
    },

    setupMobileNav() {
        const btn = document.getElementById("mobile-menu-btn");
        const drawer = document.getElementById("mobile-drawer");
        if (!btn || !drawer) return;

        btn.addEventListener("click", () => {
            drawer.classList.toggle("open");
        });
    },

    async init() {
        await app.ready;

        const onLoginPage = window.location.pathname.endsWith("/login.html");
        if (!onLoginPage && !app.user) {
            window.location.replace("/login.html");
            return;
        }

        if (app.user) {
            app.loadNavProfile();
            app.setupAccountPanel();
        }
        app.setupMobileNav();

        document.addEventListener("keydown", e => {
            if (e.key === "Escape") {
                document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.add("hidden"));
                document.body.classList.remove("modal-open");
            }
        });
    }
};

app.ready = app.loadSession();

document.addEventListener("DOMContentLoaded", app.init);