const gather = {
    groupLabels: { outside: "Outside", kitchen: "Kitchen", creative: "Making" },

    defaultItems: [
        { id: "maple", title: "Find one maple that turned early", text: "Somewhere in the valley one tree always turns early. Be the one who spots it.", group: "outside", mark: "01" },
        { id: "acorn", title: "Pick up a weird leaf or acorn", text: "Not the perfect acorn. The galled, twisted, insect-bitten one.", group: "outside", mark: "02" },
        { id: "market", title: "Buy from an unmarked farm stand", text: "The kind of stand with crates, a cash box, and nobody watching.", group: "outside", mark: "03" },
        { id: "soup", title: "Make a pot of squash soup", text: "Roast the seeds with salt. Simmer the stock slow.", group: "kitchen", mark: "04" },
        { id: "preserve", title: "Dry or pickle some herbs", text: "Hang the sage to dry, or quick-pickle shallots while they're cheap.", group: "kitchen", mark: "05" },
        { id: "draw", title: "Draw or photograph one thing up close", text: "A leaf, a patch of bark, a seed head. One clean study.", group: "creative", mark: "06" },
        { id: "margin", title: "Check the temperature twice", text: "In the hollow, then on the ridge, the same morning.", group: "creative", mark: "07" },
        { id: "seed", title: "Leave something for a stranger", text: "Seeds on a community board, or a good tool lent out for the weekend.", group: "creative", mark: "08" }
    ],

    filter: "all",

    getItems() {
        const stored = localStorage.getItem("harvest-custom-tasks");
        const custom = stored ? JSON.parse(stored) : [];
        return [...this.defaultItems, ...custom];
    },

    getGathered() {
        const key = `harvest-gathered-${app.handle}`;
        return JSON.parse(localStorage.getItem(key) || "[]");
    },

    start() {
        this.render();
        this.bindFilters();
        this.bindCustomTaskModal();
    },

    render() {
        const items = this.getItems();
        const gathered = this.getGathered();
        const list = document.getElementById("gather-list");

        const filtered = this.filter === "all" ? items : items.filter(i => i.group === this.filter);

        list.innerHTML = filtered.map(item => {
            const isDone = gathered.includes(item.id);
            return `
                <label class="gather-item ${isDone ? "done" : ""}">
                    <input type="checkbox" data-id="${item.id}" ${isDone ? "checked" : ""}>
                    <div>
                        <h3>${app.escape(item.title)}</h3>
                        ${item.text ? `<p>${app.escape(item.text)}</p>` : ""}
                    </div>
                </label>
            `;
        }).join("");

        list.querySelectorAll("input[data-id]").forEach(box => {
            box.addEventListener("change", () => this.toggle(box.dataset.id, box.checked));
        });

        this.updateProgress(gathered.length, items.length);
    },

    toggle(id, checked) {
        const key = `harvest-gathered-${app.handle}`;
        let gathered = this.getGathered();
        const index = gathered.indexOf(id);

        if (index >= 0) {
            gathered.splice(index, 1);
            app.toast("Back on the list.");
        } else {
            gathered.push(id);
            app.toast("Marked done.");
        }

        localStorage.setItem(key, JSON.stringify(gathered));
        this.render();
    },

    updateProgress(done, total) {
        const statsEl = document.getElementById("gather-stats-text");
        if (statsEl) statsEl.textContent = `${done} of ${total} done`;
    },

    bindFilters() {
        document.querySelectorAll("#gather-filters .filter-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#gather-filters .filter-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.filter = btn.dataset.filter;
                this.render();
            });
        });
    },

    bindCustomTaskModal() {
        const btn = document.getElementById("add-custom-item-btn");
        const backdrop = document.getElementById("custom-task-backdrop");
        const close = document.getElementById("close-custom-task");
        const cancel = document.getElementById("cancel-custom-task");
        const form = document.getElementById("custom-task-form");

        if (!btn || !backdrop || !form) return;

        const open = () => backdrop.classList.remove("hidden");
        const shut = () => backdrop.classList.add("hidden");

        btn.addEventListener("click", open);
        close.addEventListener("click", shut);
        cancel.addEventListener("click", shut);
        backdrop.addEventListener("click", e => { if (e.target === backdrop) shut(); });

        form.addEventListener("submit", e => {
            e.preventDefault();
            const title = document.getElementById("task-title").value.trim();
            const desc = document.getElementById("task-desc").value.trim();
            const group = document.getElementById("task-group").value;
            if (!title) return;

            const stored = localStorage.getItem("harvest-custom-tasks");
            const custom = stored ? JSON.parse(stored) : [];
            const index = this.defaultItems.length + custom.length + 1;

            custom.push({
                id: `custom-${Date.now()}`,
                title,
                text: desc,
                group,
                mark: index < 10 ? `0${index}` : String(index)
            });

            localStorage.setItem("harvest-custom-tasks", JSON.stringify(custom));
            form.reset();
            shut();
            this.render();
            app.toast("Added to your list.");
        });
    }
};

document.addEventListener("DOMContentLoaded", () => gather.start());