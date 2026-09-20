const gather = {
    defaultItems: [
        { id: "maple", title: "Spot the First Crimson Maple", text: "Locate one maple tree turning ahead of the valley canopy.", group: "outside", mark: "01" },
        { id: "acorn", title: "Retrieve an Anomalous Oak Specimen", text: "Not the symmetrical acorn; gather the twisted or galled oak leaf.", group: "outside", mark: "02" },
        { id: "market", title: "Support an Unmarked Orchard Stand", text: "Buy cider, squash, or honey crisps from an honor-system crate.", group: "outside", mark: "03" },
        { id: "soup", title: "Simmer Winter Squash Broth", text: "Roast seeds with coarse sea salt and simmer roots slowly.", group: "kitchen", mark: "04" },
        { id: "preserve", title: "Cold-Pack or Dry Autumn Herbs", text: "Hang bundled sage or jar quick pickled shallots for cellar storage.", group: "kitchen", mark: "05" },
        { id: "draw", title: "Make One High-Contrast Specimen Study", text: "A single clean botanical drawing or uncropped photo of raw bark.", group: "creative", mark: "06" },
        { id: "margin", title: "Record a Micro-Climate Temperature Shift", text: "Measure frost in the hollow versus the crest at dawn.", group: "creative", mark: "07" },
        { id: "seed", title: "Leave a Seed or Tool for a Stranger", text: "Affix seeds to a community board or lend a good pruning shear.", group: "creative", mark: "08" }
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
                <article class="gather-item-card ${isDone ? "gathered" : ""}">
                    <div class="item-index">${item.mark}</div>
                    <div>
                        <p class="eyebrow">${item.group}</p>
                        <h3>${app.escape(item.title)}</h3>
                        <p>${app.escape(item.text)}</p>
                    </div>
                    <button class="gather-toggle-btn" data-id="${item.id}">
                        ${isDone ? "Gathered" : "Harvest"}
                    </button>
                </article>
            `;
        }).join("");

        list.querySelectorAll(".gather-toggle-btn").forEach(btn => {
            btn.addEventListener("click", () => this.toggle(btn.dataset.id));
        });

        this.updateProgress(gathered.length, items.length);
    },

    toggle(id) {
        const key = `harvest-gathered-${app.handle}`;
        let gathered = this.getGathered();
        const index = gathered.indexOf(id);

        if (index >= 0) {
            gathered.splice(index, 1);
            app.toast("Returned to field ledger.");
        } else {
            gathered.push(id);
            app.toast("Gathered into seasonal yield.");
        }

        localStorage.setItem(key, JSON.stringify(gathered));
        this.render();
    },

    updateProgress(done, total) {
        const pct = total === 0 ? 0 : Math.round((done / total) * 100);
        const pctEl = document.getElementById("progress-pct");
        const statsEl = document.getElementById("gather-stats-text");

        if (pctEl) pctEl.textContent = `${pct}%`;
        if (statsEl) statsEl.textContent = `${done} of ${total} Gathered`;

        const canvas = document.getElementById("progress-canvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const size = 120;
        ctx.clearRect(0, 0, size, size);

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, 50, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(38, 56, 44, 0.12)";
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.beginPath();
        const start = -Math.PI / 2;
        const end = start + (Math.PI * 2 * (pct / 100));
        ctx.arc(size / 2, size / 2, 50, start, end);
        ctx.strokeStyle = "#9c4c34";
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.stroke();
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
            app.toast("Custom observation added to ledger.");
        });
    }
};

document.addEventListener("DOMContentLoaded", () => gather.start());