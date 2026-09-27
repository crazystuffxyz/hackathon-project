// static/js/explorer.js

(function () {
    "use strict";

    const STORAGE_KEY_SCHEDULE = "harvest-academic-schedule";
    const STORAGE_KEY_SAVED_TEACHERS = "harvest-saved-teachers";

    const DEPARTMENTS = {
        stem: {
            name: "Natural Sciences & Math",
            tag: "STEM",
            color: "#5a735c",
            keywords: ["bio", "biology", "chem", "chemistry", "physics", "math", "calculus", "algebra", "lab", "dissection", "science"]
        },
        humanities: {
            name: "Humanities & History",
            tag: "HUMANITIES",
            color: "#9c4c34",
            keywords: ["history", "world", "civics", "government", "social", "literature", "english", "essay", "reading", "lecture"]
        },
        engineering: {
            name: "Applied Engineering & Shop",
            tag: "ENGINEERING",
            color: "#b87c38",
            keywords: ["engineering", "shop", "robotics", "intro", "build", "circuit", "lamp", "scanner", "tools", "bench", "design"]
        },
        arts: {
            name: "Writing, Arts & Studio",
            tag: "ARTS & LETTERS",
            color: "#5e526c",
            keywords: ["writing", "creative", "poetry", "art", "studio", "workshop", "music", "portfolio", "journal"]
        }
    };

    const WORKLOAD_HOURS = {
        light: 2.5,
        average: 5.5,
        heavy: 9.5
    };

    function escapeHtml(str) {
        if (str == null) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalizeName(name) {
        return String(name || "")
            .trim()
            .toLowerCase()
            .replace(/^(mr|mrs|ms|dr)\.?\s+/i, "");
    }

    function formatCanonicalName(name) {
        const raw = String(name || "").trim();
        if (!raw) return "Unknown Teacher";
        return raw;
    }

    function detectDepartment(courseName, textContent) {
        const hay = `${courseName || ""} ${textContent || ""}`.toLowerCase();
        for (const [key, dept] of Object.entries(DEPARTMENTS)) {
            for (const kw of dept.keywords) {
                if (hay.includes(kw)) {
                    return key;
                }
            }
        }
        return "humanities";
    }

    function safePlaySound(soundVarName) {
        try {
            if (typeof window[soundVarName] !== "undefined" && window[soundVarName] && typeof window[soundVarName].play === "function") {
                window[soundVarName].currentTime = 0;
                window[soundVarName].play().catch(() => { });
            }
        } catch (_) { }
    }

    const HarvestExplorer = {
        posts: [],
        teachers: new Map(),
        activeTab: "directory",
        currentDossierTeacherKey: null,
        compareTeacherA: null,
        compareTeacherB: null,
        schedule: [],
        savedTeacherKeys: [],
        searchQuery: "",
        departmentFilter: "all",
        isOpen: false,
        domInjected: false,

        async init() {
            this.loadStoredData();
            this.injectStyles();
            this.injectDomShell();
            this.bindGlobalKeyboard();
            this.bindSidebarIntegration();
            await this.refreshData();
        },

        loadStoredData() {
            try {
                const schedRaw = localStorage.getItem(STORAGE_KEY_SCHEDULE);
                this.schedule = schedRaw ? JSON.parse(schedRaw) : [];
                if (!Array.isArray(this.schedule)) this.schedule = [];
            } catch (_) {
                this.schedule = [];
            }

            try {
                const savedRaw = localStorage.getItem(STORAGE_KEY_SAVED_TEACHERS);
                this.savedTeacherKeys = savedRaw ? JSON.parse(savedRaw) : [];
                if (!Array.isArray(this.savedTeacherKeys)) this.savedTeacherKeys = [];
            } catch (_) {
                this.savedTeacherKeys = [];
            }
        },

        saveStoredSchedule() {
            try {
                localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(this.schedule));
            } catch (_) { }
            this.updateScheduleCounter();
        },

        saveStoredTeachers() {
            try {
                localStorage.setItem(STORAGE_KEY_SAVED_TEACHERS, JSON.stringify(this.savedTeacherKeys));
            } catch (_) { }
        },

        async refreshData() {
            try {
                if (window.home && Array.isArray(window.home.posts) && window.home.posts.length > 0) {
                    this.posts = window.home.posts;
                } else if (typeof window.app !== "undefined" && window.app.request) {
                    this.posts = await window.app.request("/api/posts?sort=popular");
                } else {
                    const res = await fetch("/api/posts?sort=popular");
                    this.posts = await res.json();
                }
            } catch (_) {
                this.posts = [];
            }

            this.compileTeacherDossiers();
            if (this.isOpen) {
                this.renderActiveView();
            }
        },

        compileTeacherDossiers() {
            this.teachers.clear();

            for (const post of this.posts) {
                if (!post.teacher) continue;

                const canonical = formatCanonicalName(post.teacher);
                const key = normalizeName(canonical);

                if (!this.teachers.has(key)) {
                    this.teachers.set(key, {
                        key,
                        displayName: canonical,
                        courses: new Set(),
                        posts: [],
                        ratings: [],
                        difficultyCounts: { easy: 0, medium: 0, hard: 0 },
                        workloadCounts: { light: 0, average: 0, heavy: 0 },
                        takeAgainCount: 0,
                        departments: new Set(),
                        keywords: new Set(),
                        totalLikes: 0,
                        commentCount: 0,
                        specimenNo: post.specimen_no || `CAT. T-${Math.floor(100 + Math.random() * 899)}`
                    });
                }

                const dossier = this.teachers.get(key);
                dossier.posts.push(post);
                if (post.course) dossier.courses.add(post.course);
                if (post.rating) dossier.ratings.push(Number(post.rating));

                const diff = (post.difficulty || "medium").toLowerCase();
                if (dossier.difficultyCounts[diff] !== undefined) {
                    dossier.difficultyCounts[diff]++;
                } else {
                    dossier.difficultyCounts.medium++;
                }

                const work = (post.workload || "average").toLowerCase();
                if (dossier.workloadCounts[work] !== undefined) {
                    dossier.workloadCounts[work]++;
                } else {
                    dossier.workloadCounts.average++;
                }

                if (post.take_again === "yes") {
                    dossier.takeAgainCount++;
                }

                dossier.totalLikes += Number(post.likes) || 0;
                if (Array.isArray(post.comments)) {
                    dossier.commentCount += post.comments.length;
                }

                const deptKey = detectDepartment(post.course, post.text);
                dossier.departments.add(deptKey);

                const words = (post.text || "").toLowerCase().match(/\b[a-z]{4,}\b/g) || []; for (const w of words) {
                    if (["this", "that", "with", "have", "from", "they", "will", "been", "were", "when", "what"].includes(w)) continue;
                    dossier.keywords.add(w);
                }
            }
        },

        getAggregatedStats(dossier) {
            const total = dossier.posts.length || 1;
            const avgRating = dossier.ratings.length
                ? dossier.ratings.reduce((a, b) => a + b, 0) / dossier.ratings.length
                : 3.0;

            const takeAgainPct = Math.round((dossier.takeAgainCount / total) * 100);

            const diffScore = (
                (dossier.difficultyCounts.easy * 1) +
                (dossier.difficultyCounts.medium * 2) +
                (dossier.difficultyCounts.hard * 3)
            ) / total;

            const workloadScore = (
                (dossier.workloadCounts.light * WORKLOAD_HOURS.light) +
                (dossier.workloadCounts.average * WORKLOAD_HOURS.average) +
                (dossier.workloadCounts.heavy * WORKLOAD_HOURS.heavy)
            ) / total;

            const diffLabel = diffScore > 2.3 ? "Challenging" : (diffScore < 1.7 ? "Approachable" : "Moderate");
            const workLabel = workloadScore > 7.0 ? "Demanding" : (workloadScore < 4.0 ? "Breezy" : "Standard");

            const primaryDeptKey = Array.from(dossier.departments)[0] || "stem";
            const deptInfo = DEPARTMENTS[primaryDeptKey] || DEPARTMENTS.stem;

            return {
                total,
                avgRating,
                takeAgainPct,
                diffScore,
                diffLabel,
                workloadHours: workloadScore,
                workLabel,
                primaryDeptKey,
                deptInfo
            };
        },

        injectStyles() {
            if (document.getElementById("harvest-explorer-styles")) return;

            const style = document.createElement("style");
            style.id = "harvest-explorer-styles";
            style.textContent = `
                .hx-dock-trigger {
                    position: fixed;
                    left: 24px;
                    bottom: 24px;
                    z-index: 40;
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: var(--pine-deep, #1b2920);
                    color: var(--paper, #f6f2e8);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    padding: 8px 16px;
                    border-radius: 40px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
                }
                .hx-dock-trigger:hover {
                    transform: translateY(-2px);
                    background: var(--pine-resin, #26382c);
                    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
                }
                .hx-dock-badge {
                    background: var(--ochre, #b87c38);
                    color: #fff;
                    font-family: var(--font-mono, monospace);
                    font-size: 10px;
                    padding: 1px 7px;
                    border-radius: 10px;
                }
                .hx-dock-keyhint {
                    color: rgba(246, 242, 232, 0.5);
                    font-family: var(--font-mono, monospace);
                    font-size: 10px;
                    border: 1px solid rgba(246, 242, 232, 0.25);
                    padding: 0 5px;
                    border-radius: 3px;
                }

.hx-drawer-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 110;
                    background: rgba(23, 35, 29, 0.65);
                    backdrop-filter: blur(10px);
                    display: flex;
                    justify-content: flex-end;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 220ms ease;
                }
                .hx-drawer-backdrop.active {
                    opacity: 1;
                    pointer-events: auto;
                }

.hx-drawer-panel {
                    width: min(940px, 100vw);
                    height: 100%;
                    background: var(--paper-card, #fdfbf7);
                    border-left: 2px solid var(--pine-resin, #26382c);
                    box-shadow: -15px 0 45px rgba(0, 0, 0, 0.25);
                    display: flex;
                    flex-direction: column;
                    transform: translateX(100%);
                    transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
                    overflow: hidden;
                }
                .hx-drawer-backdrop.active .hx-drawer-panel {
                    transform: translateX(0);
                }

.hx-drawer-header {
                    padding: 20px 28px;
                    background: var(--paper, #f6f2e8);
                    border-bottom: 1px solid var(--line, rgba(38, 56, 44, 0.16));
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                }
                .hx-drawer-title-group h2 {
                    margin: 0;
                    font-family: var(--font-serif, Georgia, serif);
                    font-size: 26px;
                    font-weight: 600;
                    color: var(--ink, #19211c);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .hx-drawer-title-group p {
                    margin: 2px 0 0;
                    font-size: 12px;
                    color: var(--muted, #6b756d);
                }

.hx-drawer-tabs {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 10px 28px 0;
                    background: var(--paper, #f6f2e8);
                    border-bottom: 1px solid var(--line, rgba(38, 56, 44, 0.16));
                    overflow-x: auto;
                    flex-shrink: 0;
                }
                .hx-tab-btn {
                    background: none;
                    border: none;
                    border-bottom: 2px solid transparent;
                    padding: 8px 14px;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--muted, #6b756d);
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 140ms ease;
                    white-space: nowrap;
                }
                .hx-tab-btn:hover {
                    color: var(--ink, #19211c);
                }
                .hx-tab-btn.active {
                    color: var(--foxglove, #9c4c34);
                    border-bottom-color: var(--foxglove, #9c4c34);
                }
                .hx-tab-pill {
                    font-family: var(--font-mono, monospace);
                    font-size: 10px;
                    background: var(--paper-tint, #ede6d6);
                    color: var(--ink-soft, #3f4741);
                    padding: 1px 6px;
                    border-radius: 10px;
                }

.hx-drawer-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 28px;
                    background: var(--paper-card, #fdfbf7);
                }

.hx-search-strip {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 22px;
                    flex-wrap: wrap;
                }
                .hx-input-search {
                    flex: 1;
                    min-width: 220px;
                    height: 40px;
                    padding: 0 14px;
                    background: var(--paper, #f6f2e8);
                    border: 1px solid var(--line, rgba(38, 56, 44, 0.16));
                    border-radius: 4px;
                    font-size: 13px;
                    color: var(--ink, #19211c);
                    outline: none;
                }
                .hx-input-search:focus {
                    border-color: var(--pine-resin, #26382c);
                }
                .hx-dept-pills {
                    display: flex;
                    gap: 6px;
                    overflow-x: auto;
                    align-items: center;
                }
                .hx-dept-pill-btn {
                    background: var(--paper, #f6f2e8);
                    border: 1px solid var(--line, rgba(38, 56, 44, 0.16));
                    border-radius: 20px;
                    padding: 4px 12px;
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    color: var(--ink-soft, #3f4741);
                    white-space: nowrap;
                }
                .hx-dept-pill-btn.active {
                    background: var(--pine-deep, #1b2920);
                    color: #fff;
                    border-color: var(--pine-deep, #1b2920);
                }

.hx-dossier-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 18px;
                }
                .hx-teacher-tile {
                    background: var(--paper, #f6f2e8);
                    border: 1px solid var(--line, rgba(38, 56, 44, 0.16));
                    border-radius: 4px;
                    padding: 18px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-shadow: 0 2px 8px rgba(27, 41, 32, 0.04);
                    transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
                    cursor: pointer;
                }
                .hx-teacher-tile:hover {
                    border-color: var(--pine-resin, #26382c);
                    box-shadow: 0 6px 20px rgba(27, 41, 32, 0.09);
                    transform: translateY(-2px);
                }
                .hx-tile-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                .hx-specimen-badge {
                    font-family: var(--font-mono, monospace);
                    font-size: 10px;
                    color: var(--muted, #6b756d);
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                }
                .hx-dept-badge {
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 3px;
                    color: #fff;
                    letter-spacing: 0.04em;
                }
                .hx-tile-name {
                    font-family: var(--font-serif, Georgia, serif);
                    font-size: 19px;
                    font-weight: 600;
                    margin: 0 0 4px;
                    color: var(--ink, #19211c);
                }
                .hx-tile-courses {
                    font-size: 12px;
                    color: var(--ink-soft, #3f4741);
                    margin-bottom: 14px;
                    line-height: 1.4;
                }
                .hx-tile-metrics {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    padding-top: 12px;
                    border-top: 1px dashed var(--line, rgba(38, 56, 44, 0.16));
                    text-align: center;
                }
                .hx-tile-metric-value {
                    font-family: var(--font-serif, Georgia, serif);
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--ink, #19211c);
                }
                .hx-tile-metric-label {
                    font-size: 9px;
                    text-transform: uppercase;
                    color: var(--muted, #6b756d);
                    font-family: var(--font-mono, monospace);
                }

.hx-dossier-full {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                .hx-dossier-hero {
                    background: var(--paper, #f6f2e8);
                    border: 1px solid var(--line, rgba(38, 56, 44, 0.16));
                    padding: 24px;
                    border-radius: 4px;
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 260px;
                    gap: 24px;
                    align-items: center;
                }
                .hx-dossier-hero-left h1 {
                    margin: 6px 0 8px;
                    font-family: var(--font-serif, Georgia, serif);
                    font-size: 34px;
                    font-weight: 500;
                    line-height: 1.1;
                }
                .hx-radar-card {
                    background: var(--paper-card, #fdfbf7);
                    border: 1px solid var(--line, rgba(38, 56, 44, 0.16));
                    border-radius: 4px;
                    padding: 14px;
                    text-align: center;
                }
                .hx-radar-svg {
                    width: 100%;
                    max-width: 220px;
                    height: auto;
                    display: block;
                    margin: 0 auto;
                }

.hx-advice-box {
                    background: var(--pine-deep, #1b2920);
                    color: var(--cream, #fffdf9);
                    padding: 20px;
                    border-radius: 4px;
                    font-size: 13px;
                    line-height: 1.6;
                }
                .hx-advice-box strong {
                    color: var(--specimen-gold, #c79247);
                    display: block;
                    font-family: var(--font-serif, Georgia, serif);
                    font-size: 18px;
                    margin-bottom: 6px;
                }

.hx-compare-container {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 20px;
                    margin-top: 16px;
                }
                .hx-compare-col {
                    background: var(--paper, #f6f2e8);
                    border: 1px solid var(--line, rgba(38, 56, 44, 0.16));
                    padding: 20px;
                    border-radius: 4px;
                }
                .hx-compare-picker {
                    width: 100%;
                    height: 38px;
                    padding: 0 10px;
                    background: var(--paper-card, #fdfbf7);
                    border: 1px solid var(--line, rgba(38, 56, 44, 0.16));
                    border-radius: 4px;
                    font-size: 13px;
                    color: var(--ink, #19211c);
                    margin-bottom: 16px;
                }

.hx-meter-wrap {
                    background: var(--paper-tint, #ede6d6);
                    height: 8px;
                    border-radius: 4px;
                    overflow: hidden;
                    margin: 6px 0 14px;
                }
                .hx-meter-bar {
                    height: 100%;
                    background: var(--foxglove, #9c4c34);
                    transition: width 300ms ease;
                }

.hx-schedule-list {
                    display: grid;
                    gap: 12px;
                    margin-top: 16px;
                }
                .hx-schedule-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: var(--paper, #f6f2e8);
                    border: 1px solid var(--line, rgba(38, 56, 44, 0.16));
                    padding: 12px 18px;
                    border-radius: 4px;
                }
                .hx-stress-banner {
                    padding: 16px;
                    border-radius: 4px;
                    margin-top: 20px;
                    border-left: 4px solid var(--ochre, #b87c38);
                    background: var(--paper, #f6f2e8);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

.hx-palette-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 120;
                    background: rgba(23, 35, 29, 0.6);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: 12vh;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 160ms ease;
                }
                .hx-palette-backdrop.active {
                    opacity: 1;
                    pointer-events: auto;
                }
                .hx-palette-card {
                    width: min(580px, 92vw);
                    background: var(--paper-card, #fdfbf7);
                    border: 1px solid var(--pine-deep, #1b2920);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
                    border-radius: 6px;
                    overflow: hidden;
                }
                .hx-palette-input-wrap {
                    display: flex;
                    align-items: center;
                    padding: 14px 18px;
                    border-bottom: 1px solid var(--line, rgba(38, 56, 44, 0.16));
                    background: var(--paper, #f6f2e8);
                    gap: 12px;
                }
                .hx-palette-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    font-size: 15px;
                    outline: none;
                    color: var(--ink, #19211c);
                }
                .hx-palette-results {
                    max-height: 340px;
                    overflow-y: auto;
                    padding: 8px 0;
                }
                .hx-palette-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 20px;
                    cursor: pointer;
                    font-size: 13px;
                }
                .hx-palette-item:hover, .hx-palette-item.highlighted {
                    background: var(--paper-tint, #ede6d6);
                }

@media (max-width: 768px) {
                    .hx-dossier-hero {
                        grid-template-columns: 1fr;
                    }
                    .hx-compare-container {
                        grid-template-columns: 1fr;
                    }
                    .hx-dock-trigger {
                        left: 14px;
                        bottom: 14px;
                        padding: 6px 12px;
                        font-size: 12px;
                    }
                }

@media print {
                    .hx-dock-trigger, .hx-drawer-backdrop, .hx-palette-backdrop {
                        display: none !important;
                    }
                }
            `;
            document.head.appendChild(style);
        },

        injectDomShell() {
            if (document.getElementById("harvest-explorer-root")) return;

            const root = document.createElement("div");
            root.id = "harvest-explorer-root";
            root.innerHTML = `
                <button class="hx-dock-trigger" id="hx-open-btn" aria-label="Open Academic Dossier and Planner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                        <path d="M6 6h10"/>
                        <path d="M6 10h10"/>
                    </svg>
                    <span>Dossiers & Schedule</span>
                    <span class="hx-dock-badge" id="hx-schedule-badge">0</span>
                    <span class="hx-dock-keyhint">⌘K</span>
                </button>

<div class="hx-drawer-backdrop" id="hx-drawer" role="dialog" aria-modal="true" aria-labelledby="hx-drawer-title">
                    <div class="hx-drawer-panel">
                        <header class="hx-drawer-header">
                            <div class="hx-drawer-title-group">
                                <h2 id="hx-drawer-title">
                                    <span>Harvest Academic Compendium</span>
                                </h2>
                                <p>Peer-sourced teacher dossiers, workload matrix, and day-one advice.</p>
                            </div>
                            <button class="button button-quiet" id="hx-drawer-close" style="height: 32px; padding: 0 12px; font-size: 12px;">Close (Esc)</button>
                        </header>

<nav class="hx-drawer-tabs" role="tablist">
                            <button class="hx-tab-btn active" data-tab="directory">
                                <span>Teacher Directory</span>
                                <span class="hx-tab-pill" id="hx-teacher-count">0</span>
                            </button>
                            <button class="hx-tab-btn" data-tab="compare">
                                <span>Compare Matrix</span>
                            </button>
                            <button class="hx-tab-btn" data-tab="schedule">
                                <span>Semester Workload</span>
                                <span class="hx-tab-pill" id="hx-schedule-tab-pill">0 hrs</span>
                            </button>
                            <button class="hx-tab-btn" data-tab="saved">
                                <span>Saved Dossiers</span>
                                <span class="hx-tab-pill" id="hx-saved-count">0</span>
                            </button>
                        </nav>

<main class="hx-drawer-body" id="hx-drawer-content"></main>
                    </div>
                </div>

<div class="hx-palette-backdrop" id="hx-palette">
                    <div class="hx-palette-card">
                        <div class="hx-palette-input-wrap">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                            </svg>
                            <input class="hx-palette-input" id="hx-palette-search" placeholder="Type a teacher, course, or shortcut (e.g. Whitfield, Bio, compare)..." autocomplete="off">
                            <span class="hx-dock-keyhint">ESC</span>
                        </div>
                        <div class="hx-palette-results" id="hx-palette-results"></div>
                    </div>
                </div>
            `;

            document.body.appendChild(root);
            this.domInjected = true;
            this.bindShellEvents();
        },

        bindShellEvents() {
            const openBtn = document.getElementById("hx-open-btn");
            const closeBtn = document.getElementById("hx-drawer-close");
            const drawer = document.getElementById("hx-drawer");
            const palette = document.getElementById("hx-palette");

            if (openBtn) {
                openBtn.addEventListener("click", () => this.openDrawer());
            }

            if (closeBtn) {
                closeBtn.addEventListener("click", () => this.closeDrawer());
            }

            if (drawer) {
                drawer.addEventListener("click", (e) => {
                    if (e.target === drawer) this.closeDrawer();
                });
            }

            if (palette) {
                palette.addEventListener("click", (e) => {
                    if (e.target === palette) this.closePalette();
                });
            }

            const tabButtons = document.querySelectorAll(".hx-tab-btn");
            tabButtons.forEach((btn) => {
                btn.addEventListener("click", () => {
                    tabButtons.forEach((b) => b.classList.remove("active"));
                    btn.classList.add("active");
                    this.activeTab = btn.dataset.tab;
                    safePlaySound("buttonSound");
                    this.renderActiveView();
                });
            });

            const paletteInput = document.getElementById("hx-palette-search");
            if (paletteInput) {
                paletteInput.addEventListener("input", () => this.renderPaletteResults(paletteInput.value));
            }
        },

        bindGlobalKeyboard() {
            document.addEventListener("keydown", (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                    e.preventDefault();
                    this.togglePalette();
                    return;
                }

                if (e.key === "Escape") {
                    if (document.getElementById("hx-palette")?.classList.contains("active")) {
                        this.closePalette();
                    } else if (this.isOpen) {
                        this.closeDrawer();
                    }
                }
            });
        },

        bindSidebarIntegration() {
            document.addEventListener("click", (e) => {
                const summaryEl = e.target.closest(".teacher-summary");
                if (summaryEl && summaryEl.dataset.teacher) {
                    const rawName = summaryEl.dataset.teacher;
                    const key = normalizeName(rawName);
                    if (this.teachers.has(key)) {
                        this.openDossierDetail(key);
                    }
                }
            });
        },

        openDrawer(tab = null) {
            this.isOpen = true;
            if (tab) {
                this.activeTab = tab;
                document.querySelectorAll(".hx-tab-btn").forEach((btn) => {
                    btn.classList.toggle("active", btn.dataset.tab === tab);
                });
            }
            document.getElementById("hx-drawer")?.classList.add("active");
            document.body.classList.add("modal-open");
            this.refreshData();
            safePlaySound("buttonSound");
        },

        closeDrawer() {
            this.isOpen = false;
            document.getElementById("hx-drawer")?.classList.remove("active");
            document.body.classList.remove("modal-open");
        },

        togglePalette() {
            const pal = document.getElementById("hx-palette");
            if (!pal) return;
            if (pal.classList.contains("active")) {
                this.closePalette();
            } else {
                pal.classList.add("active");
                const input = document.getElementById("hx-palette-search");
                if (input) {
                    input.value = "";
                    input.focus();
                }
                this.renderPaletteResults("");
                safePlaySound("buttonSound");
            }
        },

        closePalette() {
            document.getElementById("hx-palette")?.classList.remove("active");
        },

        updateScheduleCounter() {
            const badge = document.getElementById("hx-schedule-badge");
            if (badge) badge.textContent = this.schedule.length;

            let totalHours = 0;
            for (const item of this.schedule) {
                totalHours += item.hours || WORKLOAD_HOURS.average;
            }

            const pill = document.getElementById("hx-schedule-tab-pill");
            if (pill) pill.textContent = `${Math.round(totalHours)} hrs`;
        },

        renderActiveView() {
            const content = document.getElementById("hx-drawer-content");
            if (!content) return;

            document.getElementById("hx-teacher-count").textContent = this.teachers.size;
            document.getElementById("hx-saved-count").textContent = this.savedTeacherKeys.length;
            this.updateScheduleCounter();

            if (this.currentDossierTeacherKey && this.activeTab === "directory") {
                this.renderDossierDetailView(content, this.currentDossierTeacherKey);
                return;
            }

            switch (this.activeTab) {
                case "directory":
                    this.renderDirectoryView(content);
                    break;
                case "compare":
                    this.renderCompareView(content);
                    break;
                case "schedule":
                    this.renderScheduleView(content);
                    break;
                case "saved":
                    this.renderSavedView(content);
                    break;
                default:
                    this.renderDirectoryView(content);
            }
        },

        renderDirectoryView(container) {
            const list = Array.from(this.teachers.values());
            let filtered = list;

            if (this.departmentFilter !== "all") {
                filtered = filtered.filter((d) => d.departments.has(this.departmentFilter));
            }

            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                filtered = filtered.filter((d) =>
                    d.displayName.toLowerCase().includes(q) ||
                    Array.from(d.courses).some((c) => c.toLowerCase().includes(q))
                );
            }

            container.innerHTML = `
                <div class="hx-search-strip">
                    <input class="hx-input-search" id="hx-dir-search" placeholder="Search teacher by name, course, or topic..." value="${escapeHtml(this.searchQuery)}">
                    <div class="hx-dept-pills">
                        <button class="hx-dept-pill-btn ${this.departmentFilter === "all" ? "active" : ""}" data-dept="all">All Fields</button>
                        <button class="hx-dept-pill-btn ${this.departmentFilter === "stem" ? "active" : ""}" data-dept="stem">STEM</button>
                        <button class="hx-dept-pill-btn ${this.departmentFilter === "humanities" ? "active" : ""}" data-dept="humanities">Humanities</button>
                        <button class="hx-dept-pill-btn ${this.departmentFilter === "engineering" ? "active" : ""}" data-dept="engineering">Engineering</button>
                        <button class="hx-dept-pill-btn ${this.departmentFilter === "arts" ? "active" : ""}" data-dept="arts">Arts</button>
                    </div>
                </div>

${filtered.length === 0 ? `
                    <div style="text-align: center; padding: 48px; color: var(--muted, #6b756d);">
                        <p style="font-family: var(--font-serif, Georgia, serif); font-size: 20px; margin: 0 0 6px;">No instructors match that inquiry.</p>
                        <small>Try clearing your filter or searching for another subject.</small>
                    </div>
                ` : `
                    <div class="hx-dossier-grid">
                        ${filtered.map((d) => {
                const stats = this.getAggregatedStats(d);
                const isSaved = this.savedTeacherKeys.includes(d.key);
                return `
                                <article class="hx-teacher-tile" data-key="${escapeHtml(d.key)}">
                                    <div>
                                        <div class="hx-tile-top">
                                            <span class="hx-specimen-badge">${escapeHtml(d.specimenNo)}</span>
                                            <span class="hx-dept-badge" style="background-color: ${stats.deptInfo.color};">
                                                ${escapeHtml(stats.deptInfo.tag)}
                                            </span>
                                        </div>
                                        <h3 class="hx-tile-name">${escapeHtml(d.displayName)}</h3>
                                        <div class="hx-tile-courses">
                                            ${Array.from(d.courses).map(c => `<span>${escapeHtml(c)}</span>`).join(" · ") || "General Faculty"}
                                        </div>
                                    </div>

<div>
                                        <div class="hx-tile-metrics">
                                            <div>
                                                <div class="hx-tile-metric-value">${stats.avgRating.toFixed(1)} ★</div>
                                                <div class="hx-tile-metric-label">${d.posts.length} Notes</div>
                                            </div>
                                            <div>
                                                <div class="hx-tile-metric-value">${stats.takeAgainPct}%</div>
                                                <div class="hx-tile-metric-label">Repeat</div>
                                            </div>
                                            <div>
                                                <div class="hx-tile-metric-value">${stats.workloadHours.toFixed(1)}h</div>
                                                <div class="hx-tile-metric-label">Wkload/Wk</div>
                                            </div>
                                        </div>

<div style="margin-top: 14px; display: flex; gap: 8px;">
                                            <button class="button button-quiet hx-inspect-btn" data-key="${escapeHtml(d.key)}" style="flex: 1; height: 32px; font-size: 11px;">
                                                View Dossier
                                            </button>
                                            <button class="button button-quiet hx-save-teacher-btn" data-key="${escapeHtml(d.key)}" title="Bookmark Teacher" style="width: 34px; height: 32px; padding: 0;">
                                                ${isSaved ? "★" : "☆"}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            `;
            }).join("")}
                    </div>
                `}
            `;

            const searchInput = container.querySelector("#hx-dir-search");
            searchInput?.addEventListener("input", (e) => {
                this.searchQuery = e.target.value;
                this.renderDirectoryView(container);
            });

            container.querySelectorAll(".hx-dept-pill-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    this.departmentFilter = btn.dataset.dept;
                    this.renderDirectoryView(container);
                });
            });

            container.querySelectorAll(".hx-teacher-tile").forEach((tile) => {
                tile.addEventListener("click", (e) => {
                    if (e.target.closest("button")) return;
                    this.openDossierDetail(tile.dataset.key);
                });
            });

            container.querySelectorAll(".hx-inspect-btn").forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.openDossierDetail(btn.dataset.key);
                });
            });

            container.querySelectorAll(".hx-save-teacher-btn").forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.toggleSavedTeacher(btn.dataset.key);
                    this.renderDirectoryView(container);
                });
            });
        },

        openDossierDetail(teacherKey) {
            this.currentDossierTeacherKey = teacherKey;
            this.activeTab = "directory";
            if (!this.isOpen) {
                this.openDrawer("directory");
            } else {
                this.renderActiveView();
            }
        },

        renderDossierDetailView(container, teacherKey) {
            const dossier = this.teachers.get(teacherKey);
            if (!dossier) {
                this.currentDossierTeacherKey = null;
                this.renderDirectoryView(container);
                return;
            }

            const stats = this.getAggregatedStats(dossier);
            const isSaved = this.savedTeacherKeys.includes(teacherKey);
            const isInSchedule = this.schedule.some((s) => s.teacherKey === teacherKey);

            const reviewsText = dossier.posts.map(p => p.text).join(" ");
            let adviceHeadline = "Attend office hours and adhere to weekly reading deadlines.";
            if (reviewsText.toLowerCase().includes("lab") || reviewsText.toLowerCase().includes("shop")) {
                adviceHeadline = "Prepare lab equipment before class and utilize shop hours early in the term.";
            } else if (reviewsText.toLowerCase().includes("essay") || reviewsText.toLowerCase().includes("reading")) {
                adviceHeadline = "Focus your study on thesis arguments rather than rote fact memorization.";
            }

            const radarSvg = this.generateRadarSvg(stats);

            container.innerHTML = `
                <div style="margin-bottom: 18px;">
                    <button class="button button-quiet" id="hx-back-dir" style="height: 32px; font-size: 12px;">
                         ← Back to Directory
                    </button>
                </div>

<div class="hx-dossier-full">
                    <section class="hx-dossier-hero">
                        <div class="hx-dossier-hero-left">
                            <span class="hx-specimen-badge">${escapeHtml(dossier.specimenNo)} · ${escapeHtml(stats.deptInfo.tag)}</span>
                            <h1>${escapeHtml(dossier.displayName)}</h1>
                            <p style="color: var(--ink-soft, #3f4741); margin: 0 0 16px; font-size: 14px;">
                                Primary Courses: <strong>${Array.from(dossier.courses).map(escapeHtml).join(", ") || "General Faculty"}</strong>
                            </p>

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <button class="button ${isInSchedule ? "button-quiet" : "button-dark"}" id="hx-toggle-schedule-btn">
                                    ${isInSchedule ? "✓ In Semester Plan" : "+ Add to Semester Plan"}
                                </button>
                                <button class="button button-quiet" id="hx-toggle-saved-dossier">
                                    ${isSaved ? "★ Bookmarked" : "☆ Bookmark Dossier"}
                                </button>
                                <button class="button button-quiet" id="hx-compare-quick-btn">
                                    Compare with Peer
                                </button>
                                <button class="button button-quiet" id="hx-print-dossier-btn" title="Printable Field Reference">
                                    Print Dossier
                                </button>
                            </div>
                        </div>

<div class="hx-radar-card">
                            <div style="font-family: var(--font-mono, monospace); font-size: 10px; color: var(--muted, #6b756d); margin-bottom: 6px; text-transform: uppercase;">
                                Pedagogical Geometry
                            </div>
                            ${radarSvg}
                            <div style="font-size: 11px; color: var(--ink-soft, #3f4741); margin-top: 4px;">
                                5-Axis Botanical Evaluation
                            </div>
                        </div>
                    </section>

<section class="hx-advice-box">
                        <strong>Day-One Academic Field Advice</strong>
                        <p style="margin: 0;">${adviceHeadline} Student consensus indicates that pacing workload evenly avoids steep final review penalties.</p>
                    </section>

<section>
                        <h3 style="font-family: var(--font-serif, Georgia, serif); font-size: 22px; margin: 0 0 14px;">
                            Archived Field Reviews (${dossier.posts.length})
                        </h3>

<div style="display: grid; gap: 16px;">
                            ${dossier.posts.map((post) => `
                                <article class="post-card" style="box-shadow: none;">
                                    <div class="post-card-top">
                                        <div class="post-meta-details">
                                            <span>Course: <strong>${escapeHtml(post.course || "General")}</strong></span>
                                            <span></span>
                                            <span>Difficulty: ${escapeHtml(post.difficulty || "Medium")}</span>
                                            <span></span>
                                            <span>Workload: ${escapeHtml(post.workload || "Average")}</span>
                                        </div>
                                        <span class="review-rating">${"★".repeat(Number(post.rating) || 3)}</span>
                                    </div>
                                    <div class="post-body">
                                        <p class="post-text" style="font-size: 16px; line-height: 1.55;">${escapeHtml(post.text)}</p>
                                        <div class="post-actions" style="margin-top: 14px;">
                                            <span style="font-size: 12px; color: var(--muted, #6b756d);">
                                                By @${escapeHtml(post.handle)}  ${post.likes || 0} likes
                                            </span>
                                            <a href="/messages.html?with=${encodeURIComponent(post.handle)}&prompt=${encodeURIComponent(`Hi @${post.handle}, I saw your review of ${dossier.displayName} for ${post.course}. Could I ask a quick question?`)}" class="button button-quiet" style="margin-left: auto; height: 30px; font-size: 11px; padding: 0 10px;">
                                                Inquire via DM →
                                            </a>
                                        </div>
                                    </div>
                                </article>
                            `).join("")}
                        </div>
                    </section>
                </div>
            `;

            container.querySelector("#hx-back-dir")?.addEventListener("click", () => {
                this.currentDossierTeacherKey = null;
                this.renderActiveView();
            });

            container.querySelector("#hx-toggle-schedule-btn")?.addEventListener("click", () => {
                this.toggleScheduleCourse(teacherKey, Array.from(dossier.courses)[0] || "General Class", stats.workloadHours);
                this.renderDossierDetailView(container, teacherKey);
            });

            container.querySelector("#hx-toggle-saved-dossier")?.addEventListener("click", () => {
                this.toggleSavedTeacher(teacherKey);
                this.renderDossierDetailView(container, teacherKey);
            });

            container.querySelector("#hx-compare-quick-btn")?.addEventListener("click", () => {
                this.compareTeacherA = teacherKey;
                this.activeTab = "compare";
                document.querySelectorAll(".hx-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === "compare"));
                this.renderActiveView();
            });

            container.querySelector("#hx-print-dossier-btn")?.addEventListener("click", () => {
                this.printDossier(dossier, stats);
            });
        },

        generateRadarSvg(stats) {
            const size = 200;
            const center = size / 2;
            const radius = 68;

            const clarity = Math.min(1, Math.max(0.2, stats.avgRating / 5));
            const repeat = Math.min(1, Math.max(0.2, stats.takeAgainPct / 100));
            const manageability = Math.min(1, Math.max(0.2, 1 - (stats.diffScore - 1) / 2));
            const pacing = Math.min(1, Math.max(0.2, 1 - (stats.workloadHours - 2) / 8));
            const responsiveness = Math.min(1, Math.max(0.3, (stats.total / 5)));

            const values = [clarity, repeat, manageability, pacing, responsiveness];
            const labels = ["Clarity", "Repeat", "Fairness", "Pacing", "Depth"];
            const totalPoints = 5;

            function getPoint(index, factor) {
                const angle = (Math.PI * 2 / totalPoints) * index - Math.PI / 2;
                const r = radius * factor;
                return {
                    x: center + r * Math.cos(angle),
                    y: center + r * Math.sin(angle)
                };
            }

            let gridPolys = "";
            for (const step of [0.33, 0.66, 1.0]) {
                const pts = Array.from({ length: totalPoints }, (_, i) => {
                    const p = getPoint(i, step);
                    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                }).join(" ");
                gridPolys += `<polygon points="${pts}" fill="none" stroke="rgba(38,56,44,0.18)" stroke-width="1" />`;
            }

            const dataPoints = values.map((val, idx) => {
                const p = getPoint(idx, val);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            }).join(" ");

            let labelSvg = "";
            for (let i = 0; i < totalPoints; i++) {
                const lp = getPoint(i, 1.28);
                labelSvg += `
                    <text x="${lp.x.toFixed(1)}" y="${(lp.y + 3).toFixed(1)}" font-size="8" font-family="ui-monospace, monospace" fill="#6b756d" text-anchor="middle">
                        ${labels[i]}
                    </text>
                `;
            }

            return `
                <svg class="hx-radar-svg" viewBox="0 0 ${size} ${size}">
                    ${gridPolys}
                    <polygon points="${dataPoints}" fill="rgba(156,76,52,0.3)" stroke="#9c4c34" stroke-width="2" />
                    ${labelSvg}
                </svg>
            `;
        },

        renderCompareView(container) {
            const keys = Array.from(this.teachers.keys());
            if (keys.length === 0) {
                container.innerHTML = `<p style="text-align: center; color: var(--muted, #6b756d);">No teacher reviews found to compare.</p>`;
                return;
            }

            if (!this.compareTeacherA) this.compareTeacherA = keys[0];
            if (!this.compareTeacherB) this.compareTeacherB = keys[1] || keys[0];

            const dossierA = this.teachers.get(this.compareTeacherA);
            const dossierB = this.teachers.get(this.compareTeacherB);

            const statsA = dossierA ? this.getAggregatedStats(dossierA) : null;
            const statsB = dossierB ? this.getAggregatedStats(dossierB) : null;

            container.innerHTML = `
                <div>
                    <h3 style="font-family: var(--font-serif, Georgia, serif); font-size: 26px; margin: 0 0 6px;">
                        Comparative Academic Matrix
                    </h3>
                    <p style="color: var(--muted, #6b756d); font-size: 13px; margin: 0 0 20px;">
                        Contrast two instructors side-by-side to assess grading distribution, homework cadence, and student reception. </p>

<div class="hx-compare-container">
                        <div class="hx-compare-col">
                            <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted, #6b756d); display: block; margin-bottom: 6px;">
                                Instructor A
                            </label>
                            <select class="hx-compare-picker" id="hx-select-comp-a">
                                ${keys.map(k => `<option value="${escapeHtml(k)}" ${k === this.compareTeacherA ? "selected" : ""}>${escapeHtml(this.teachers.get(k).displayName)}</option>`).join("")}
                            </select>

${statsA ? this.renderCompareColumn(dossierA, statsA) : ""}
                        </div>

<div class="hx-compare-col">
                            <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted, #6b756d); display: block; margin-bottom: 6px;">
                                Instructor B
                            </label>
                            <select class="hx-compare-picker" id="hx-select-comp-b">
                                ${keys.map(k => `<option value="${escapeHtml(k)}" ${k === this.compareTeacherB ? "selected" : ""}>${escapeHtml(this.teachers.get(k).displayName)}</option>`).join("")}
                            </select>

${statsB ? this.renderCompareColumn(dossierB, statsB) : ""}
                        </div>
                    </div>
                </div>
            `;

            container.querySelector("#hx-select-comp-a")?.addEventListener("change", (e) => {
                this.compareTeacherA = e.target.value;
                this.renderCompareView(container);
            });

            container.querySelector("#hx-select-comp-b")?.addEventListener("change", (e) => {
                this.compareTeacherB = e.target.value;
                this.renderCompareView(container);
            });
        },

        renderCompareColumn(dossier, stats) {
            return `
                <div style="text-align: center; margin-bottom: 16px;">
                    <h4 style="font-family: var(--font-serif, Georgia, serif); font-size: 22px; margin: 4px 0;">${escapeHtml(dossier.displayName)}</h4>
                    <span style="font-size: 12px; color: var(--muted, #6b756d);">${Array.from(dossier.courses).map(escapeHtml).join(", ")}</span>
                </div>

<div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600;">
                        <span>Average Rating</span>
                        <span>${stats.avgRating.toFixed(1)} / 5.0</span>
                    </div>
                    <div class="hx-meter-wrap">
                        <div class="hx-meter-bar" style="width: ${(stats.avgRating / 5) * 100}%; background-color: var(--pine-deep, #1b2920);"></div>
                    </div>
                </div>

<div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600;">
                        <span>Would Take Again</span>
                        <span>${stats.takeAgainPct}%</span>
                    </div>
                    <div class="hx-meter-wrap">
                        <div class="hx-meter-bar" style="width: ${stats.takeAgainPct}%; background-color: var(--ochre, #b87c38);"></div>
                    </div>
                </div>

<div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600;">
                        <span>Weekly Workload</span>
                        <span>${stats.workloadHours.toFixed(1)} hrs/wk (${stats.workLabel})</span>
                    </div>
                    <div class="hx-meter-wrap">
                        <div class="hx-meter-bar" style="width: ${Math.min(100, (stats.workloadHours / 10) * 100)}%; background-color: var(--foxglove, #9c4c34);"></div>
                    </div>
                </div>

<div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--line, rgba(38, 56, 44, 0.16));">
                    <strong style="font-size: 11px; text-transform: uppercase; color: var(--muted, #6b756d); display: block; margin-bottom: 4px;">Recent Student Quote</strong>
                    <blockquote style="margin: 0; font-family: var(--font-serif, Georgia, serif); font-size: 14px; font-style: italic; color: var(--ink-soft, #3f4741);">
                        "${escapeHtml((dossier.posts[0]?.text || "No commentary recorded.").slice(0, 140))}…"
                    </blockquote>
                </div>
            `;
        },

        renderScheduleView(container) {
            let totalHours = 0;
            for (const item of this.schedule) {
                totalHours += item.hours || WORKLOAD_HOURS.average;
            }

            let stressLevel = "Gentle Meadow";
            let stressColor = "var(--lichen, #5a735c)";
            let stressAdvice = "A balanced course load with plenty of buffer time for deep work, lab projects, and rest.";

            if (totalHours > 24) {
                stressLevel = "Frost Warning (Extreme Overload)";
                stressColor = "var(--foxglove, #9c4c34)";
                stressAdvice = "Exceeding 24 hours of homework per week is correlated with academic fatigue. Strongly consider trading an AP or heavy lab class for a lighter section.";
            } else if (totalHours > 16) {
                stressLevel = "Heavy Autumn Harvest";
                stressColor = "var(--ochre, #b87c38)";
                stressAdvice = "A demanding schedule requiring structured weekday study hours. Ensure major project due dates do not coincide.";
            }

            container.innerHTML = `
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
                        <div>
                            <h3 style="font-family: var(--font-serif, Georgia, serif); font-size: 26px; margin: 0 0 6px;">
                                Semester Workload Balancer
                            </h3>
                            <p style="color: var(--muted, #6b756d); font-size: 13px; margin: 0;">
                                Add courses to assemble your schedule and project cumulative out-of-class study commitments. </p>
                        </div>
                        <button class="button button-quiet" id="hx-clear-sched-btn" style="height: 32px; font-size: 12px;">
                            Clear Schedule
                        </button>
                    </div>

<div class="hx-stress-banner" style="border-left-color: ${stressColor};">
                        <div>
                            <strong style="font-size: 17px; font-family: var(--font-serif, Georgia, serif); color: var(--ink, #19211c);">
                                Projected Homework Cadence: ${Math.round(totalHours)} Hours / Week (${stressLevel})
                            </strong>
                            <p style="margin: 4px 0 0; font-size: 13px; color: var(--ink-soft, #3f4741);">
                                ${stressAdvice}
                            </p>
                        </div>
                    </div>

<div class="hx-schedule-list">
                        ${this.schedule.length === 0 ? `
                            <div style="text-align: center; padding: 48px; border: 1px dashed var(--line, rgba(38, 56, 44, 0.16)); border-radius: 4px;">
                                <p style="font-family: var(--font-serif, Georgia, serif); font-size: 18px; margin: 0 0 8px;">Your schedule basket is unoccupied.</p>
                                <p style="color: var(--muted, #6b756d); font-size: 13px; margin: 0 0 16px;">Browse teacher dossiers in the directory and click "+ Add to Semester Plan".</p>
                            </div>
                        ` : this.schedule.map((item, index) => `
                            <div class="hx-schedule-item">
                                <div>
                                    <strong style="font-family: var(--font-serif, Georgia, serif); font-size: 17px; display: block;">
                                        ${escapeHtml(item.courseName)}
                                    </strong>
                                    <span style="font-size: 12px; color: var(--muted, #6b756d);">
                                        With ${escapeHtml(item.teacherName)}  Est. ${item.hours.toFixed(1)} hrs/wk
                                    </span>
                                </div>
                                <button class="button button-quiet hx-remove-sched-btn" data-index="${index}" style="height: 30px; font-size: 11px; padding: 0 10px;">
                                    Remove
                                </button>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;

            container.querySelector("#hx-clear-sched-btn")?.addEventListener("click", () => {
                this.schedule = [];
                this.saveStoredSchedule();
                this.renderScheduleView(container);
            });

            container.querySelectorAll(".hx-remove-sched-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const idx = Number(btn.dataset.index);
                    this.schedule.splice(idx, 1);
                    this.saveStoredSchedule();
                    this.renderScheduleView(container);
                });
            });
        },

        renderSavedView(container) {
            const savedDossiers = this.savedTeacherKeys
                .map(k => this.teachers.get(k))
                .filter(Boolean);

            container.innerHTML = `
                <div>
                    <h3 style="font-family: var(--font-serif, Georgia, serif); font-size: 26px; margin: 0 0 6px;">
                        Bookmarked Teacher Dossiers (${savedDossiers.length})
                    </h3>
                    <p style="color: var(--muted, #6b756d); font-size: 13px; margin: 0 0 20px;">
                        Quick reference list for instructors you are actively tracking for upcoming registration cycles. </p>

${savedDossiers.length === 0 ? `
                        <div style="text-align: center; padding: 48px; border: 1px dashed var(--line, rgba(38, 56, 44, 0.16)); border-radius: 4px;">
                            <p style="font-family: var(--font-serif, Georgia, serif); font-size: 18px; margin: 0 0 6px;">No instructors bookmarked yet.</p>
                            <span style="font-size: 13px; color: var(--muted, #6b756d);">Click the bookmark star on any teacher dossier in the directory to pin them here.</span>
                        </div>
                    ` : `
                        <div class="hx-dossier-grid">
                            ${savedDossiers.map(d => {
                const stats = this.getAggregatedStats(d);
                return `
                                    <article class="hx-teacher-tile" data-key="${escapeHtml(d.key)}">
                                        <div>
                                            <div class="hx-tile-top">
                                                <span class="hx-specimen-badge">${escapeHtml(d.specimenNo)}</span>
                                                <span class="hx-dept-badge" style="background-color: ${stats.deptInfo.color};">${escapeHtml(stats.deptInfo.tag)}</span>
                                            </div>
                                            <h4 class="hx-tile-name">${escapeHtml(d.displayName)}</h4>
                                            <div class="hx-tile-courses">${Array.from(d.courses).map(escapeHtml).join("  ")}</div>
                                        </div>
                                        <div style="display: flex; gap: 8px; margin-top: 12px;">
                                            <button class="button button-quiet hx-inspect-btn" data-key="${escapeHtml(d.key)}" style="flex: 1; height: 32px; font-size: 11px;">
                                                View Dossier
                                            </button>
                                            <button class="button button-quiet hx-save-teacher-btn" data-key="${escapeHtml(d.key)}" style="width: 34px; height: 32px; padding: 0;">
                                                
                                            </button>
                                        </div>
                                    </article>
                                `;
            }).join("")}
                        </div>
                    `}
                </div>
            `;

            container.querySelectorAll(".hx-inspect-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    this.openDossierDetail(btn.dataset.key);
                });
            });

            container.querySelectorAll(".hx-save-teacher-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    this.toggleSavedTeacher(btn.dataset.key);
                    this.renderSavedView(container);
                });
            });
        },

        renderPaletteResults(query) {
            const container = document.getElementById("hx-palette-results");
            if (!container) return;

            const q = query.trim().toLowerCase();
            const results = [];

            if (!q) {
                results.push({ type: "action", label: "Open Teacher Directory", action: () => { this.closePalette(); this.openDrawer("directory"); } });
                results.push({ type: "action", label: "Open Comparative Matrix", action: () => { this.closePalette(); this.openDrawer("compare"); } });
                results.push({ type: "action", label: "Open Semester Workload Planner", action: () => { this.closePalette(); this.openDrawer("schedule"); } });
            }

            for (const [key, d] of this.teachers.entries()) {
                if (d.displayName.toLowerCase().includes(q) || Array.from(d.courses).some(c => c.toLowerCase().includes(q))) {
                    results.push({
                        type: "teacher",
                        label: `${d.displayName} (${Array.from(d.courses).join(", ") || "General"})`,
                        sub: `${d.posts.length} reviews  ${d.specimenNo}`,
                        action: () => {
                            this.closePalette();
                            this.openDossierDetail(key);
                        }
                    });
                }
            }

            if (results.length === 0) {
                container.innerHTML = `
                    <div style="padding: 16px 20px; color: var(--muted, #6b756d); font-size: 13px;">
                        No matches found for "${escapeHtml(query)}"
                    </div>
                `;
                return;
            }

            container.innerHTML = results.slice(0, 8).map((r, i) => `
                <div class="hx-palette-item ${i === 0 ? "highlighted" : ""}" data-index="${i}">
                    <div>
                        <strong>${escapeHtml(r.label)}</strong>
                        ${r.sub ? `<span style="font-family: var(--font-mono, monospace); font-size: 11px; color: var(--muted, #6b756d); margin-left: 8px;">${escapeHtml(r.sub)}</span>` : ""}
                    </div>
                    <span style="font-size: 11px; color: var(--muted, #6b756d);">↵</span>
                </div>
            `).join("");

            container.querySelectorAll(".hx-palette-item").forEach((el) => {
                el.addEventListener("click", () => {
                    const idx = Number(el.dataset.index);
                    if (results[idx] && results[idx].action) {
                        results[idx].action();
                    }
                });
            });
        },

        toggleSavedTeacher(teacherKey) {
            const idx = this.savedTeacherKeys.indexOf(teacherKey);
            if (idx >= 0) {
                this.savedTeacherKeys.splice(idx, 1);
            } else {
                this.savedTeacherKeys.push(teacherKey);
            }
            this.saveStoredTeachers();
            safePlaySound("buttonSound");
        },

        toggleScheduleCourse(teacherKey, courseName, hours) {
            const idx = this.schedule.findIndex(s => s.teacherKey === teacherKey && s.courseName === courseName);
            if (idx >= 0) {
                this.schedule.splice(idx, 1);
            } else {
                const dossier = this.teachers.get(teacherKey);
                this.schedule.push({
                    teacherKey,
                    teacherName: dossier ? dossier.displayName : "Instructor",
                    courseName,
                    hours: Number(hours) || WORKLOAD_HOURS.average
                });
            }
            this.saveStoredSchedule();
            safePlaySound("buttonSound");
        },

        printDossier(dossier, stats) {
            const printWin = window.open("", "_blank");
            if (!printWin) return;

            printWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${escapeHtml(dossier.displayName)}  Archival Field Dossier</title>
                    <style>
                        body { font-family: "Georgia", serif; margin: 40px; color: #19211c; background: #fff; line-height: 1.6; }
                        h1 { font-size: 28px; margin: 0 0 6px; }
                        .tag { font-family: monospace; font-size: 11px; text-transform: uppercase; color: #6b756d; }
                        .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #ddd; margin: 20px 0; text-align: center; }
                        .meta-cell { padding: 12px; border-right: 1px solid #ddd; }
                        .meta-cell:last-child { border-right: none; }
                        .meta-cell strong { display: block; font-size: 18px; }
                        .review { border-bottom: 1px solid #eee; padding: 16px 0; }
                    </style>
                </head>
                <body>
                    <div class="tag">Harvest Academic Dossier  ${escapeHtml(dossier.specimenNo)}</div>
                    <h1>${escapeHtml(dossier.displayName)}</h1>
                    <p>Courses: ${Array.from(dossier.courses).map(escapeHtml).join(", ")}</p>

<div class="meta-grid">
                        <div class="meta-cell"><strong>${stats.avgRating.toFixed(1)} </strong><span>Rating</span></div>
                        <div class="meta-cell"><strong>${stats.takeAgainPct}%</strong><span>Repeat</span></div>
                        <div class="meta-cell"><strong>${stats.diffLabel}</strong><span>Difficulty</span></div>
                        <div class="meta-cell"><strong>${stats.workloadHours.toFixed(1)}h/wk</strong><span>Workload</span></div>
                    </div>

<h2>Documented Student Reviews (${dossier.posts.length})</h2>
                    ${dossier.posts.map(p => `
                        <div class="review">
                            <div><strong>${escapeHtml(p.course)}</strong>  Rating: ${p.rating}  @${escapeHtml(p.handle)}</div>
                            <p>${escapeHtml(p.text)}</p>
                        </div>
                    `).join("")}
                </body>
                </html>
            `);
            printWin.document.close();
            printWin.focus();
            setTimeout(() => {
                printWin.print();
            }, 300);
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => HarvestExplorer.init());
    } else {
        HarvestExplorer.init();
    }

    window.HarvestExplorer = HarvestExplorer;
})();