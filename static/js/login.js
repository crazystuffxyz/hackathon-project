const loginPage = {
    errorEl: document.getElementById("auth-error"),
    async start() {
        await app.ready;
        if (app.user) {
            window.location.replace("/");
            return;
        }
        document.getElementById("tab-login").addEventListener("click", () => this.showForm("login"));
        document.getElementById("tab-signup").addEventListener("click", () => this.showForm("signup"));
        document.getElementById("login-form").addEventListener("submit", e => this.submit(e, "/api/login"));
        document.getElementById("signup-form").addEventListener("submit", e => this.submit(e, "/api/signup"));
    },
    showForm(which) {
        document.getElementById("tab-login").classList.toggle("active", which === "login");
        document.getElementById("tab-signup").classList.toggle("active", which === "signup");
        document.getElementById("login-form").classList.toggle("hidden", which !== "login");
        document.getElementById("signup-form").classList.toggle("hidden", which !== "signup");
        this.errorEl.classList.add("hidden");
    },
    async submit(event, url) {
        event.preventDefault();
        const form = event.target;
        const payload = {
            username: form.querySelector("[data-field='username']").value,
            password: form.querySelector("[data-field='password']").value
        };
        const displayNameField = form.querySelector("[data-field='displayName']");
        if (displayNameField) payload.displayName = displayNameField.value;
        try {
            await app.request(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            window.location.href = "/";
        } catch (err) {
            this.errorEl.textContent = err.message;
            this.errorEl.classList.remove("hidden");
        }
    }
};
loginPage.start();