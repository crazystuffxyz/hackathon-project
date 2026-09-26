const messages = {
    currentPerson: null,
    pollingTimer: null,

    conversationsEl: document.getElementById("conversations"),
    chatEmptyEl: document.getElementById("chat-empty"),
    chatRoomEl: document.getElementById("chat-room"),
    chatMessagesEl: document.getElementById("chat-messages"),
    shellEl: document.getElementById("messages-shell"),

    async start() {
        await app.ready;
        if (!app.user) return;
        await this.loadConversations();
        this.bindComposer();
        this.bindPrompts();
        this.bindMobileBack();

        this.pollingTimer = setInterval(() => {
            if (this.currentPerson && !document.hidden) {
                this.loadChat(this.currentPerson.handle, true);
            } else if (!document.hidden) {
                this.loadConversations();
            }
        }, 3500);
    },

    async loadConversations() {
        try {
            const list = await app.request("/api/messages");
            this.renderConversations(list);
        } catch (err) {
            app.toast(err.message);
        }
    },

    renderConversations(people) {
        if (!people.length) {
            this.conversationsEl.innerHTML = `
                <div style="padding: 24px; text-align: center; color: var(--muted); font-size: 13px;">
                    No chats yet.<br>Start one with the button above.
                </div>
            `;
            return;
        }

        this.conversationsEl.innerHTML = people.map(p => `
            <button class="conversation-card ${this.currentPerson?.handle === p.handle ? "active" : ""}" data-handle="${app.escape(p.handle)}">
                <div class="profile-avatar conversation-avatar">${app.initials(p.display_name)}</div>
                <div class="conversation-text">
                    <strong>${app.escape(p.display_name)}</strong>
                    <p>${app.escape(p.latest_message || "No messages yet")}</p>
                </div>
                <div class="conversation-meta">
                    <div>${app.timeAgo(p.latest_message_at)}</div>
                    ${p.unread_count > 0 ? `<span class="unread-badge">${p.unread_count}</span>` : ""}
                </div>
            </button>
        `).join("");

        this.conversationsEl.querySelectorAll(".conversation-card").forEach(card => {
            card.addEventListener("click", () => this.openPerson(card.dataset.handle));
        });
    },

    async openPerson(handle) {
        try {
            const users = await app.request("/api/users");
            const target = users.find(u => u.handle === handle);
            if (!target) return;

            this.currentPerson = target;
            document.getElementById("chat-name").textContent = target.display_name;
            document.getElementById("chat-handle").textContent = `@${target.handle}`;
            document.getElementById("chat-location").textContent = target.location || "";

            this.chatEmptyEl.classList.add("hidden");
            this.chatRoomEl.classList.remove("hidden");
            this.shellEl.classList.add("chat-active");

            const mobileBack = document.getElementById("mobile-back-btn");
            if (mobileBack) mobileBack.style.display = window.innerWidth <= 960 ? "inline-flex" : "none";

            await this.loadChat(handle);
            await this.loadConversations();
            app.loadNavProfile();
        } catch (err) {
            app.toast(err.message);
        }
    },

    async loadChat(handle, quiet = false) {
        try {
            const data = await app.request(`/api/messages?with=${encodeURIComponent(handle)}`);

            if (this.currentPerson && this.currentPerson.handle !== handle) return;

            const isScrolledToBottom = 
                this.chatMessagesEl.scrollHeight - this.chatMessagesEl.clientHeight <= this.chatMessagesEl.scrollTop + 60;

            this.chatMessagesEl.innerHTML = data.map(m => {
                const mine = m.sender === app.handle;
                return `
                    <div class="message-row ${mine ? "mine" : "theirs"}">
                        <div class="message-bubble">
                            <span>${app.escape(m.text)}</span>
                            <time>${app.timeAgo(m.created_at)}</time>
                        </div>
                    </div>
                `;
            }).join("");

            if (!quiet || isScrolledToBottom) {
                this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
            }
        } catch (err) {
            if (!quiet) app.toast(err.message);
        }
    },

    bindComposer() {
        const form = document.getElementById("message-form");
        const input = document.getElementById("message-input");

        form.addEventListener("submit", async e => {
            e.preventDefault();
            if (!this.currentPerson) return;
            const text = input.value.trim();
            if (!text) return;

            input.value = "";

            try {
                await app.request("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: this.currentPerson.handle,
                        text
                    })
                });

                await this.loadChat(this.currentPerson.handle);
                await this.loadConversations();
            } catch (err) {
                input.value = text;
                app.toast(err.message);
            }
        });

        document.getElementById("new-dialogue-btn")?.addEventListener("click", () => this.openPicker());
    },

    bindPrompts() {
        document.querySelectorAll(".prompt-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const input = document.getElementById("message-input");
                if (input) {
                    input.value = btn.dataset.text;
                    input.focus();
                }
            });
        });
    },

    bindMobileBack() {
        document.getElementById("mobile-back-btn")?.addEventListener("click", () => {
            this.shellEl.classList.remove("chat-active");
            this.chatEmptyEl.classList.remove("hidden");
            this.chatRoomEl.classList.add("hidden");
            this.currentPerson = null;
        });
    },

    async openPicker() {
        const backdrop = document.getElementById("picker-backdrop");
        const list = document.getElementById("people-picker");
        const close = document.getElementById("close-picker");

        try {
            const people = await app.request("/api/users");
            const filtered = people.filter(p => p.handle !== app.handle);

            list.innerHTML = filtered.map(p => `
                <button class="persona-option" data-handle="${app.escape(p.handle)}">
                    <div class="profile-avatar">${app.initials(p.display_name)}</div>
                    <div>
                        <strong>${app.escape(p.display_name)}</strong>
                        <span>@${app.escape(p.handle)} · ${app.escape(p.location)}</span>
                    </div>
                </button>
            `).join("");

            list.querySelectorAll(".persona-option").forEach(btn => {
                btn.addEventListener("click", () => {
                    backdrop.classList.add("hidden");
                    this.openPerson(btn.dataset.handle);
                });
            });

            backdrop.classList.remove("hidden");
            close.onclick = () => backdrop.classList.add("hidden");
            backdrop.onclick = e => { if (e.target === backdrop) backdrop.classList.add("hidden"); };
        } catch (err) {
            app.toast(err.message);
        }
    }
};

document.addEventListener("DOMContentLoaded", () => messages.start());