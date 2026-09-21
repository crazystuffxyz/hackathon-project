const app = {
    handle: localStorage.getItem("harvest-handle") || "you",
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

    setHandle(newHandle) {
        app.handle = newHandle || "you";
        localStorage.setItem("harvest-handle", app.handle);
        app.loadNavProfile();
    },

    async loadNavProfile() {
        try {
            const data = await app.request(`/api/profile?handle=${encodeURIComponent(app.handle)}`);
            const handleEl = document.getElementById("nav-handle");
            const avatarEl = document.getElementById("nav-avatar");
            const nameEl = document.getElementById("nav-display-name");

            if (handleEl) handleEl.textContent = `@${data.user.handle}`;
            if (nameEl) nameEl.textContent = data.user.display_name;
            if (avatarEl) avatarEl.textContent = app.initials(data.user.display_name);

            const unreadData = await app.request(`/api/messages?handle=${encodeURIComponent(app.handle)}`);
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

    async setupPersonaSwitcher() {
        const btn = document.getElementById("open-persona-switcher");
        const backdrop = document.getElementById("persona-backdrop");
        const list = document.getElementById("persona-list");
        const closeBtn = document.getElementById("close-persona");

        if (!btn || !backdrop || !list) return;

        btn.addEventListener("click", async () => {
            try {
                const users = await app.request(`/api/users?handle=${encodeURIComponent(app.handle)}`);
                app.usersCache = users;

                list.innerHTML = users.map(u => `
                    <button class="persona-option ${u.handle === app.handle ? "current" : ""}" data-handle="${app.escape(u.handle)}">
                        <div class="profile-avatar">${app.initials(u.display_name)}</div>
                        <div style="flex: 1;">
                            <strong>${app.escape(u.display_name)}</strong>
                            <span>@${app.escape(u.handle)} · ${app.escape(u.location)}</span>
                        </div>
                        ${u.handle === app.handle ? `<span style="font-family: var(--font-mono); font-size: 10px; color: var(--foxglove);">ACTIVE</span>` : ""}
                    </button>
                `).join("");

                list.querySelectorAll(".persona-option").forEach(item => {
                    item.addEventListener("click", () => {
                        app.setHandle(item.dataset.handle);
                        backdrop.classList.add("hidden");
                        app.toast(`Switched to @${item.dataset.handle}`);
                        setTimeout(() => window.location.reload(), 200);
                    });
                });

                backdrop.classList.remove("hidden");
            } catch (err) {
                app.toast(err.message);
            }
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

    init() {
        app.loadNavProfile();
        app.setupPersonaSwitcher();
        app.setupMobileNav();

        document.addEventListener("keydown", e => {
            if (e.key === "Escape") {
                document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.add("hidden"));
                document.body.classList.remove("modal-open");
            }
        });
    }
};

document.addEventListener("DOMContentLoaded", app.init);