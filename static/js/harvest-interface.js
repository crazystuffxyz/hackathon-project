// static/js/harvest-interface.js

(function (global, factory) {
    "use strict";
    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = factory(global);
    } else {
        global.HarvestInterface = factory(global);
    }
})(typeof window !== "undefined" ? window : this, function (window) {
    "use strict";

    const VERSION = "1.0.0";
    const STORAGE_PREFIX = "harvest_interface_v1_";
    const DEFAULT_BAYESIAN_PRIOR_RATING = 3.2;
    const DEFAULT_BAYESIAN_PRIOR_WEIGHT = 3;

    const PALETTE = {
        pineDeep: "#1b2920",
        pineResin: "#26382c",
        paper: "#f6f2e8",
        paperCard: "#fdfbf7",
        paperTint: "#ede6d6",
        paperDark: "#dfd7c2",
        ink: "#19211c",
        inkSoft: "#3f4741",
        muted: "#6b756d",
        foxglove: "#9c4c34",
        ochre: "#b87c38",
        lichen: "#5a735c",
        chicory: "#5e526c",
        cream: "#fffdf9",
        specimenGold: "#c79247",
        line: "rgba(38, 56, 44, 0.16)",
        lineLight: "rgba(38, 56, 44, 0.08)"
    };

    const TAXONOMY = {
        departments: {
            stem: {
                id: "stem",
                name: "Natural Sciences & Mathematics",
                code: "STEM",
                color: PALETTE.lichen,
                keywords: [
                    "biology", "bio", "chemistry", "chem", "physics", "calculus",
                    "algebra", "geometry", "statistics", "lab", "dissection", "genetics",
                    "ecology", "anatomy", "astronomy", "trigonometry", "precalculus"
                ],
                workloadMultiplier: 1.15
            },
            humanities: {
                id: "humanities",
                name: "Humanities, History & Civics",
                code: "HUMANITIES",
                color: PALETTE.foxglove,
                keywords: [
                    "history", "world", "civics", "government", "social", "literature",
                    "english", "essay", "reading", "lecture", "philosophy", "economics",
                    "geography", "sociology", "psychology", "seminar", "thesis"
                ],
                workloadMultiplier: 1.05
            },
            engineering: {
                id: "engineering",
                name: "Applied Engineering, Robotics & Shop",
                code: "ENGINEERING",
                color: PALETTE.ochre,
                keywords: [
                    "engineering", "shop", "robotics", "intro", "build", "circuit",
                    "lamp", "scanner", "tools", "bench", "design", "cad", "mechanics",
                    "fabrication", "woodwork", "electronics", "machining"
                ],
                workloadMultiplier: 1.25
            },
            arts: {
                id: "arts",
                name: "Writing, Visual Arts & Studio Letters",
                code: "ARTS & LETTERS",
                color: PALETTE.chicory,
                keywords: [
                    "writing", "creative", "poetry", "art", "studio", "workshop",
                    "music", "portfolio", "journal", "ceramics", "sculpture", "painting",
                    "illustration", "printmaking", "photography", "drama", "theater"
                ],
                workloadMultiplier: 0.95
            },
            languages: {
                id: "languages",
                name: "Classical & Modern World Languages",
                code: "LANGUAGES",
                color: "#4a6b63",
                keywords: [
                    "spanish", "french", "latin", "german", "mandarin", "japanese",
                    "linguistics", "translation", "grammar", "dialogue", "conjugation", "oral"
                ],
                workloadMultiplier: 1.0
            }
        },

        difficultyHours: {
            easy: { hours: 2.5, score: 1.0, label: "Approachable" },
            medium: { hours: 5.5, score: 2.0, label: "Balanced" },
            hard: { hours: 9.5, score: 3.0, label: "Demanding" }
        },

        workloadHours: {
            light: { hours: 2.5, score: 1.0, label: "Breezy" },
            average: { hours: 5.5, score: 2.0, label: "Standard" },
            heavy: { hours: 9.5, score: 3.0, label: "Strenuous" }
        },

        stressThresholds: [
            { maxHours: 12, level: "Gentle Meadow", color: PALETTE.lichen, advice: "Manageable course pacing with ample personal study and rest buffers." },
            { maxHours: 20, level: "Steady Harvest", color: PALETTE.ochre, advice: "Structured schedule requiring deliberate weekday study schedules." },
            { maxHours: 28, level: "Autumn Gale", color: "#b85c38", advice: "Substantial workload. High probability of concurrent exam deadlines." },
            { maxHours: 999, level: "Frost Warning", color: PALETTE.foxglove, advice: "Severe risk of academic fatigue. Strongly consider trading an AP/Shop lab." }
        ]
    };

    function safeHtml(str) {
        if (str == null) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function cleanString(str, maxLen = 1000) {
        return String(str || "")
            .trim()
            .replace(/\r\n/g, "\n")
            .slice(0, maxLen);
    }

    function normalizeKey(str) {
        return String(str || "")
            .trim()
            .toLowerCase()
            .replace(/^(mr|mrs|ms|dr|prof)\.?\s+/i, "")
            .replace(/[^a-z0-9_-]/g, "");
    }

    function formatInitials(name) {
        return String(name || "Faculty")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part[0])
            .join("")
            .toUpperCase() || "F";
    }

    function formatRelativeTime(timestamp) {
        const time = Number(timestamp) || Date.now();
        const diff = Math.max(0, Math.floor((Date.now() - time) / 1000));
        if (diff < 20) return "just now";
        if (diff < 60) return `${diff}s ago`;
        const minutes = Math.floor(diff / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days === 1) return "yesterday";
        if (days < 7) return `${days}d ago`;
        return new Date(time).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: (new Date().getFullYear() !== new Date(time).getFullYear()) ? "numeric" : undefined
        });
    }

    function generateSpecimenCatalog(prefix = "CAT") {
        const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const char = letters[Math.floor(Math.random() * letters.length)];
        const num = Math.floor(100 + Math.random() * 899);
        return `${prefix}. ${char}-${num}`;
    }

    function parseMarkdownLite(text) {
        const raw = safeHtml(text);
        return raw
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/`([^`]+)`/g, "<code style=\"font-family: ui-monospace, monospace; background: rgba(38,56,44,0.08); padding: 1px 4px; border-radius: 3px;\">$1</code>")
            .replace(/\n\n+/g, "<br><br>")
            .replace(/\n/g, "<br>");
    }

    class EventBus {
        constructor() {
            this._listeners = new Map();
        }

        on(event, handler) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(handler);
            return () => this.off(event, handler);
        }

        off(event, handler) {
            if (this._listeners.has(event)) {
                this._listeners.get(event).delete(handler);
            }
        }

        emit(event, payload) {
            if (this._listeners.has(event)) {
                for (const handler of this._listeners.get(event)) {
                    try {
                        handler(payload);
                    } catch (err) {
                        console.error(`[EventBus] Error in handler for event "${event}":`, err);
                    }
                }
            }
        }
    }

    class StorageAdapter {
        constructor(prefix = STORAGE_PREFIX) {
            this.prefix = prefix;
        }

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(this.prefix + key);
                if (item === null) return defaultValue;
                return JSON.parse(item);
            } catch (err) {
                console.warn(`[StorageAdapter] Failed to get key "${key}":`, err);
                return defaultValue;
            }
        }

        set(key, value) {
            try {
                localStorage.setItem(this.prefix + key, JSON.stringify(value));
                return true;
            } catch (err) {
                console.warn(`[StorageAdapter] Failed to set key "${key}":`, err);
                return false;
            }
        }

        remove(key) {
            try {
                localStorage.removeItem(this.prefix + key);
                return true;
            } catch (err) {
                return false;
            }
        }

        clear() {
            try {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(this.prefix)) {
                        keysToRemove.push(k);
                    }
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
                return true;
            } catch (err) {
                return false;
            }
        }
    }

    class SyntheticAudio {
        constructor() {
            this.ctx = null;
            this.isMuted = false;
            this._initMuteState();
        }

        _initMuteState() {
            try {
                this.isMuted = localStorage.getItem("soundMuted") === "true";
            } catch (_) {
                this.isMuted = false;
            }
        }

        _ensureContext() {
            if (this.ctx) return true;
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return false;
                this.ctx = new AudioCtx();
                return true;
            } catch (_) {
                return false;
            }
        }

        toggleMute() {
            this.isMuted = !this.isMuted;
            try {
                localStorage.setItem("soundMuted", String(this.isMuted));
            } catch (_) {}
            return this.isMuted;
        }

        playClick() {
            if (this.isMuted || !this._ensureContext()) return;
            if (this.ctx.state === "suspended") {
                this.ctx.resume().catch(() => {});
            }
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const now = this.ctx.currentTime;
                osc.type = "sine";
                osc.frequency.setValueAtTime(480, now);
                osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.045);
            } catch (_) {}
        }

        playChime(type = "success") {
            if (this.isMuted || !this._ensureContext()) return;
            if (this.ctx.state === "suspended") {
                this.ctx.resume().catch(() => {});
            }
            try {
                const freqs = type === "warning" ? [380, 290] : [440, 660, 880];
                const now = this.ctx.currentTime;
                freqs.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    const startTime = now + idx * 0.06;
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(freq, startTime);
                    gain.gain.setValueAtTime(0.08, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(startTime);
                    osc.stop(startTime + 0.23);
                });
            } catch (_) {}
        }

        playParchmentRustle() {
            if (this.isMuted || !this._ensureContext()) return;
            if (this.ctx.state === "suspended") {
                this.ctx.resume().catch(() => {});
            }
            try {
                const bufferSize = this.ctx.sampleRate * 0.06;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = "bandpass";
                filter.frequency.value = 1200;
                filter.Q.value = 1.2;
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start();
            } catch (_) {}
        }
    }

    class TaxonomyResolver {
        static detectDepartment(courseName, reviewText) {
            const haystack = `${courseName || ""} ${reviewText || ""}`.toLowerCase();
            for (const [key, dept] of Object.entries(TAXONOMY.departments)) {
                for (const keyword of dept.keywords) {
                    if (haystack.includes(keyword)) {
                        return dept;
                    }
                }
            }
            return TAXONOMY.departments.humanities;
        }

        static getWorkloadMetric(workloadStr) {
            const key = String(workloadStr || "").toLowerCase().trim();
            return TAXONOMY.workloadHours[key] || TAXONOMY.workloadHours.average;
        }

        static getDifficultyMetric(diffStr) {
            const key = String(diffStr || "").toLowerCase().trim();
            return TAXONOMY.difficultyHours[key] || TAXONOMY.difficultyHours.medium;
        }

        static assessScheduleStress(totalHours) {
            for (const tier of TAXONOMY.stressThresholds) {
                if (totalHours <= tier.maxHours) {
                    return tier;
                }
            }
            return TAXONOMY.stressThresholds[TAXONOMY.stressThresholds.length - 1];
        }
    }

    class BayesianAnalytics {
        static computeTeacherDossier(teacherKey, rawPosts = []) {
            const key = normalizeKey(teacherKey);
            const posts = rawPosts.filter(p => normalizeKey(p.teacher) === key);
            const total = posts.length;

            let displayName = teacherKey;
            const courses = new Set();
            const departments = new Set();
            const ratingValues = [];
            let takeAgainYes = 0;
            let totalLikes = 0;
            let totalComments = 0;
            let accumulatedDifficultyScore = 0;
            let accumulatedWorkloadHours = 0;
            const wordFrequencies = new Map();

            for (const p of posts) {
                if (p.teacher && p.teacher.length > displayName.length) {
                    displayName = p.teacher;
                }
                if (p.course) courses.add(p.course);

                const dept = TaxonomyResolver.detectDepartment(p.course, p.text);
                departments.add(dept.id);

                if (p.rating != null) {
                    ratingValues.push(Number(p.rating));
                }

                if (String(p.take_again).toLowerCase() === "yes") {
                    takeAgainYes++;
                }

                totalLikes += Number(p.likes) || 0;
                if (Array.isArray(p.comments)) {
                    totalComments += p.comments.length;
                }

                const diffMeta = TaxonomyResolver.getDifficultyMetric(p.difficulty);
                accumulatedDifficultyScore += diffMeta.score;

                const workMeta = TaxonomyResolver.getWorkloadMetric(p.workload);
                accumulatedWorkloadHours += workMeta.hours * dept.workloadMultiplier;

                const tokens = (p.text || "")
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, " ")
                    .split(/\s+/)
                    .filter(w => w.length >= 4);

                const stopWords = new Set(["this", "that", "with", "have", "from", "they", "will", "been", "were", "when", "what", "their", "about"]);
                tokens.forEach(tok => {
                    if (!stopWords.has(tok)) {
                        wordFrequencies.set(tok, (wordFrequencies.get(tok) || 0) + 1);
                    }
                });
            }

            const rawAverageRating = ratingValues.length
                ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
                : DEFAULT_BAYESIAN_PRIOR_RATING;

            const bayesianRating = total === 0
                ? DEFAULT_BAYESIAN_PRIOR_RATING
                : (
                    (DEFAULT_BAYESIAN_PRIOR_WEIGHT * DEFAULT_BAYESIAN_PRIOR_RATING +
                     ratingValues.reduce((a, b) => a + b, 0)) /
                    (DEFAULT_BAYESIAN_PRIOR_WEIGHT + total)
                );

            const takeAgainPercent = total > 0 ? Math.round((takeAgainYes / total) * 100) : 75;
            const avgDifficultyScore = total > 0 ? accumulatedDifficultyScore / total : 2.0;
            const avgWorkloadHours = total > 0 ? accumulatedWorkloadHours / total : 5.5;

            const primaryDeptId = Array.from(departments)[0] || "humanities";
            const primaryDept = TAXONOMY.departments[primaryDeptId] || TAXONOMY.departments.humanities;

            const sortedKeywords = Array.from(wordFrequencies.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(entry => entry[0]);

            const dayOneAdvice = BayesianAnalytics._synthesizeDayOneAdvice(posts, sortedKeywords);

            return {
                key,
                displayName: cleanString(displayName, 80),
                posts,
                totalPosts: total,
                courses: Array.from(courses),
                departments: Array.from(departments),
                primaryDept,
                rawAverageRating: Number(rawAverageRating.toFixed(2)),
                bayesianRating: Number(bayesianRating.toFixed(2)),
                takeAgainPercent,
                difficultyScore: Number(avgDifficultyScore.toFixed(2)),
                difficultyLabel: avgDifficultyScore > 2.3 ? "Demanding" : (avgDifficultyScore < 1.7 ? "Approachable" : "Balanced"),
                workloadHours: Number(avgWorkloadHours.toFixed(1)),
                workloadLabel: avgWorkloadHours > 7.0 ? "Heavy" : (avgWorkloadHours < 4.0 ? "Light" : "Moderate"),
                totalLikes,
                totalComments,
                topKeywords: sortedKeywords,
                dayOneAdvice,
                specimenNo: posts[0]?.specimen_no || generateSpecimenCatalog("SPEC")
            };
        }

        static _synthesizeDayOneAdvice(posts, topKeywords) {
            const combined = posts.map(p => p.text || "").join(" ").toLowerCase();
            if (combined.includes("dissection") || combined.includes("lab")) {
                return "Read laboratory protocols the evening before; lab write-ups determine the bulk of unit curves.";
            }
            if (combined.includes("shop") || combined.includes("bench") || combined.includes("build")) {
                return "Claim workbench parts early in the rotation and request shop supervision hours prior to project week.";
            }
            if (combined.includes("essay") || combined.includes("thesis") || combined.includes("reading")) {
                return "Outline discussion thesis questions before seminar meetings; essays are graded on structural rigor.";
            }
            if (combined.includes("test") || combined.includes("study guide")) {
                return "Study guides mirror midterm exams almost line-by-line; commit primary definitions early.";
            }
            if (topKeywords.length > 0) {
                return `Emphasize consistent review of ${topKeywords.slice(0, 3).join(", ")}; pacing workload prevents end-of-term penalties.`;
            }
            return "Attend office hours during week two to establish expectations; stay ahead of weekly homework milestones.";
        }
    }

    class VectorGeometry {
        static createRadarPolygon(stats, size = 200) {
            const center = size / 2;
            const radius = size * 0.35;
            const axes = [
                { name: "Clarity", value: Math.min(1, Math.max(0.15, stats.bayesianRating / 5)) },
                { name: "Support", value: Math.min(1, Math.max(0.15, stats.takeAgainPercent / 100)) },
                { name: "Fairness", value: Math.min(1, Math.max(0.15, 1 - (stats.difficultyScore - 1) / 2)) },
                { name: "Pacing", value: Math.min(1, Math.max(0.15, 1 - (stats.workloadHours - 2) / 8)) },
                { name: "Breadth", value: Math.min(1, Math.max(0.2, (stats.totalPosts / 4))) }
            ];

            const total = axes.length;
            function polarToCartesian(index, factor) {
                const angle = (Math.PI * 2 / total) * index - Math.PI / 2;
                const r = radius * factor;
                return {
                    x: center + r * Math.cos(angle),
                    y: center + r * Math.sin(angle)
                };
            }

            let gridSvg = "";
            for (const step of [0.33, 0.66, 1.0]) {
                const points = axes.map((_, i) => {
                    const p = polarToCartesian(i, step);
                    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                }).join(" ");
                gridSvg += `<polygon points="${points}" fill="none" stroke="${PALETTE.line}" stroke-width="1" stroke-dasharray="${step < 1.0 ? '2,2' : 'none'}"/>`;
            }

            const dataPoints = axes.map((axis, i) => {
                const p = polarToCartesian(i, axis.value);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            }).join(" ");

            let labelsSvg = "";
            axes.forEach((axis, i) => {
                const labelPos = polarToCartesian(i, 1.25);
                labelsSvg += `<text x="${labelPos.x.toFixed(1)}" y="${(labelPos.y + 3).toFixed(1)}" font-family="ui-monospace, monospace" font-size="8" fill="${PALETTE.muted}" text-anchor="middle">${axis.name}</text>`;
            });

            return `
                <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-label="5-Axis Pedagogical Radar Chart" style="display:block;margin:0 auto;overflow:visible;">
                    ${gridSvg}
                    <polygon points="${dataPoints}" fill="rgba(156,76,52,0.24)" stroke="${PALETTE.foxglove}" stroke-width="2" stroke-linejoin="round"/>
                    ${axes.map((axis, i) => {
                        const p = polarToCartesian(i, axis.value);
                        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${PALETTE.foxglove}"/>`;
                    }).join("")}
                    ${labelsSvg}
                </svg>
            `;
        }

        static createWorkloadBellCurve(avgHours, sizeW = 280, sizeH = 70) {
            const clamped = Math.max(1, Math.min(14, avgHours));
            const meanX = (clamped / 14) * sizeW;
            const stdDev = sizeW * 0.16;

            let pathData = `M 0,${sizeH}`;
            for (let x = 0; x <= sizeW; x += 4) {
                const exponent = -Math.pow(x - meanX, 2) / (2 * Math.pow(stdDev, 2));
                const y = sizeH - Math.exp(exponent) * (sizeH * 0.85);
                pathData += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
            }
            pathData += ` L ${sizeW},${sizeH} Z`;

            return `
                <svg viewBox="0 0 ${sizeW} ${sizeH}" width="${sizeW}" height="${sizeH}" aria-label="Workload Distribution Curve" style="display:block;width:100%;">
                    <path d="${pathData}" fill="rgba(184,124,56,0.18)" stroke="${PALETTE.ochre}" stroke-width="1.8"/>
                    <line x1="${meanX.toFixed(1)}" y1="0" x2="${meanX.toFixed(1)}" y2="${sizeH}" stroke="${PALETTE.pineDeep}" stroke-width="1.5" stroke-dasharray="3,3"/>
                    <text x="${meanX.toFixed(1)}" y="12" font-family="ui-monospace, monospace" font-size="9" fill="${PALETTE.pineDeep}" text-anchor="middle" font-weight="600">${clamped.toFixed(1)}h/wk</text>
                </svg>
            `;
        }

        static createWaxSealBadgeSvg(text = "HARVEST", size = 48) {
            return `
                <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" style="display:inline-block;vertical-align:middle;">
                    <circle cx="50" cy="50" r="46" fill="${PALETTE.foxglove}" stroke="#6c2e1f" stroke-width="3"/>
                    <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="3,2"/>
                    <path d="M50 20 L55 35 L70 35 L58 45 L62 60 L50 50 L38 60 L42 45 L30 35 L45 35 Z" fill="${PALETTE.paperTint}"/>
                    <text x="50" y="78" font-family="Georgia, serif" font-size="11" font-weight="700" fill="${PALETTE.cream}" text-anchor="middle" letter-spacing="1">${safeHtml(text)}</text>
                </svg>
            `;
        }
    }

    class ScheduleManager {
        constructor(storage, bus) {
            this.storage = storage;
            this.bus = bus;
            this.items = this.storage.get("schedule_items", []);
        }

        getItems() {
            return [...this.items];
        }

        addItem(teacherKey, teacherName, courseName, rawHours = 5.5) {
            const hours = Number(rawHours) || 5.5;
            const existingIdx = this.items.findIndex(
                item => normalizeKey(item.teacherKey) === normalizeKey(teacherKey) &&
                        item.courseName.toLowerCase() === courseName.toLowerCase()
            );

            if (existingIdx >= 0) {
                return { success: false, reason: "Course already exists in your plan." };
            }

            const item = {
                id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                teacherKey: normalizeKey(teacherKey),
                teacherName: cleanString(teacherName, 80),
                courseName: cleanString(courseName, 80),
                hours: Number(hours.toFixed(1)),
                department: TaxonomyResolver.detectDepartment(courseName, "").id,
                addedAt: Date.now()
            };

            this.items.push(item);
            this._persist();
            this.bus.emit("schedule:changed", this.getSummary());
            return { success: true, item };
        }

        removeItem(id) {
            const initialLen = this.items.length;
            this.items = this.items.filter(item => item.id !== id);
            if (this.items.length !== initialLen) {
                this._persist();
                this.bus.emit("schedule:changed", this.getSummary());
                return true;
            }
            return false;
        }

        clear() {
            this.items = [];
            this._persist();
            this.bus.emit("schedule:changed", this.getSummary());
        }

        getSummary() {
            const count = this.items.length;
            const totalHours = this.items.reduce((sum, item) => sum + (item.hours || 0), 0);
            const stressTier = TaxonomyResolver.assessScheduleStress(totalHours);

            const deptBreakdown = {};
            this.items.forEach(item => {
                deptBreakdown[item.department] = (deptBreakdown[item.department] || 0) + 1;
            });

            return {
                count,
                totalHours: Number(totalHours.toFixed(1)),
                stressTier,
                deptBreakdown,
                items: this.getItems()
            };
        }

        exportToText() {
            const summary = this.getSummary();
            const dateStr = new Date().toLocaleDateString(undefined, { dateStyle: "long" });
            let out = `HARVEST ACADEMIC COMPENDIUM — SEMESTER WORKLOAD SPECIFICATION\n`;
            out += `Exported: ${dateStr}\n`;
            out += `===============================================================\n\n`;
            out += `Cumulative Out-of-Class Workload: ${summary.totalHours} Hours/Week\n`;
            out += `Evaluation Level: ${summary.stressTier.level}\n`;
            out += `Advisory: ${summary.stressTier.advice}\n\n`;
            out += `SCHEDULED COURSES (${summary.count}):\n`;
            out += `---------------------------------------------------------------\n`;

            if (summary.items.length === 0) {
                out += `(No courses registered in this semester blueprint)\n`;
            } else {
                summary.items.forEach((item, idx) => {
                    out += `${idx + 1}. ${item.courseName}\n`;
                    out += `   Instructor: ${item.teacherName}\n`;
                    out += `   Projected Homework: ${item.hours} hrs/wk [Dept: ${item.department.toUpperCase()}]\n\n`;
                });
            }

            out += `===============================================================\n`;
            out += `Verified by Harvest Archival Peer Network · Keep what is learned.\n`;
            return out;
        }

        _persist() {
            this.storage.set("schedule_items", this.items);
        }
    }

    class OfflineQueue {
        constructor(storage, bus) {
            this.storage = storage;
            this.bus = bus;
            this.queue = this.storage.get("offline_mutations", []);
            this._bindNetworkListener();
        }

        enqueue(endpoint, method, payload) {
            const entry = {
                id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                endpoint,
                method: method.toUpperCase(),
                payload,
                enqueuedAt: Date.now()
            };
            this.queue.push(entry);
            this._persist();
            this.bus.emit("queue:enqueued", entry);
            return entry;
        }

        async flush() {
            if (!navigator.onLine || this.queue.length === 0) return;
            const pending = [...this.queue];
            const remaining = [];

            for (const item of pending) {
                try {
                    const res = await fetch(item.endpoint, {
                        method: item.method,
                        headers: { "Content-Type": "application/json" },
                        body: item.payload ? JSON.stringify(item.payload) : undefined
                    });
                    if (!res.ok) {
                        remaining.push(item);
                    }
                } catch (err) {
                    remaining.push(item);
                }
            }

            this.queue = remaining;
            this._persist();
            this.bus.emit("queue:flushed", { processed: pending.length - remaining.length, remaining: remaining.length });
        }

        _bindNetworkListener() {
            window.addEventListener("online", () => {
                this.flush();
            });
        }

        _persist() {
            this.storage.set("offline_mutations", this.queue);
        }
    }

    class ToastManager {
        constructor() {
            this.container = null;
            this.timer = null;
        }

        _ensureContainer() {
            if (this.container && document.body.contains(this.container)) return;
            this.container = document.createElement("div");
            this.container.id = "harvest-toast-announcer";
            this.container.setAttribute("role", "status");
            this.container.setAttribute("aria-live", "polite");
            this.container.style.cssText = `
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                background: ${PALETTE.pineDeep};
                color: ${PALETTE.cream};
                padding: 10px 22px;
                border-radius: 30px;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 10px 30px rgba(0,0,0,0.28);
                border: 1px solid rgba(255,255,255,0.12);
                opacity: 0;
                pointer-events: none;
                transition: opacity 180ms ease, transform 180ms ease;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            document.body.appendChild(this.container);
        }

        show(message, type = "info", duration = 2800) {
            this._ensureContainer();
            clearTimeout(this.timer);

            let icon = "✦";
            if (type === "success") icon = "✓";
            if (type === "warning") icon = "⚠";
            if (type === "error") icon = "✕";

            this.container.innerHTML = `<span>${icon}</span> <span>${safeHtml(message)}</span>`;
            this.container.style.opacity = "1";
            this.container.style.pointerEvents = "auto";
            this.container.style.transform = "translateX(-50%) translateY(0)";

            this.timer = setTimeout(() => {
                this.hide();
            }, duration);
        }

        hide() {
            if (!this.container) return;
            this.container.style.opacity = "0";
            this.container.style.pointerEvents = "none";
            this.container.style.transform = "translateX(-50%) translateY(20px)";
        }
    }

    class CommandPalette {
        constructor(interfaceCore) {
            this.core = interfaceCore;
            this.isOpen = false;
            this.backdrop = null;
            this.input = null;
            this.resultsList = null;
            this.selectedIndex = 0;
            this.currentResults = [];
        }

        init() {
            this._injectDom();
            this._bindKeyboard();
        }

        _injectDom() {
            if (document.getElementById("harvest-command-palette")) return;

            this.backdrop = document.createElement("div");
            this.backdrop.id = "harvest-command-palette";
            this.backdrop.setAttribute("role", "dialog");
            this.backdrop.setAttribute("aria-modal", "true");
            this.backdrop.setAttribute("aria-label", "Harvest Academic Command Palette");
            this.backdrop.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(23, 35, 29, 0.65);
                backdrop-filter: blur(8px);
                z-index: 10000;
                display: none;
                align-items: flex-start;
                justify-content: center;
                padding-top: 14vh;
            `;

            const card = document.createElement("div");
            card.style.cssText = `
                width: min(620px, 92vw);
                background: ${PALETTE.paperCard};
                border: 1px solid ${PALETTE.pineDeep};
                border-radius: 6px;
                box-shadow: 0 24px 60px rgba(0,0,0,0.35);
                overflow: hidden;
            `;

            const searchWrap = document.createElement("div");
            searchWrap.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 18px;
                background: ${PALETTE.paper};
                border-bottom: 1px solid ${PALETTE.line};
            `;

            searchWrap.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${PALETTE.pineDeep}" stroke-width="2" stroke-linecap="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
            `;

            this.input = document.createElement("input");
            this.input.type = "text";
            this.input.placeholder = "Type teacher, course, schedule command, or topic (ESC to exit)...";
            this.input.style.cssText = `
                flex: 1;
                border: none;
                background: transparent;
                font-size: 14px;
                font-family: inherit;
                outline: none;
                color: ${PALETTE.ink};
            `;

            const escBadge = document.createElement("kbd");
            escBadge.textContent = "ESC";
            escBadge.style.cssText = `
                font-family: ui-monospace, monospace;
                font-size: 10px;
                background: ${PALETTE.paperTint};
                border: 1px solid ${PALETTE.line};
                padding: 2px 6px;
                border-radius: 3px;
                color: ${PALETTE.muted};
            `;

            searchWrap.appendChild(this.input);
            searchWrap.appendChild(escBadge);

            this.resultsList = document.createElement("div");
            this.resultsList.style.cssText = `
                max-height: 360px;
                overflow-y: auto;
                padding: 6px 0;
            `;

            card.appendChild(searchWrap);
            card.appendChild(this.resultsList);
            this.backdrop.appendChild(card);
            document.body.appendChild(this.backdrop);

            this.backdrop.addEventListener("click", e => {
                if (e.target === this.backdrop) this.close();
            });

            this.input.addEventListener("input", () => {
                this.selectedIndex = 0;
                this._renderResults(this.input.value.trim());
            });

            this.input.addEventListener("keydown", e => {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (this.currentResults.length > 0) {
                        this.selectedIndex = (this.selectedIndex + 1) % this.currentResults.length;
                        this._highlightSelection();
                    }
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (this.currentResults.length > 0) {
                        this.selectedIndex = (this.selectedIndex - 1 + this.currentResults.length) % this.currentResults.length;
                        this._highlightSelection();
                    }
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (this.currentResults[this.selectedIndex]) {
                        this.currentResults[this.selectedIndex].action();
                    }
                }
            });
        }

        _bindKeyboard() {
            document.addEventListener("keydown", e => {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                    e.preventDefault();
                    this.toggle();
                    return;
                }
                if (e.key === "Escape" && this.isOpen) {
                    this.close();
                }
            });
        }

        open() {
            this.isOpen = true;
            this.backdrop.style.display = "flex";
            this.input.value = "";
            this.selectedIndex = 0;
            this.input.focus();
            this._renderResults("");
            this.core.audio.playParchmentRustle();
        }

        close() {
            this.isOpen = false;
            this.backdrop.style.display = "none";
        }

        toggle() {
            if (this.isOpen) this.close();
            else this.open();
        }

        _renderResults(query) {
            const q = query.toLowerCase();
            const results = [];

            if (!q) {
                results.push({
                    title: "Open Teacher Dossiers Compendium",
                    subtitle: "Browse all peer evaluations and pedagogical geometry",
                    tag: "VIEW",
                    action: () => {
                        this.close();
                        if (window.HarvestExplorer) window.HarvestExplorer.openDrawer("directory");
                    }
                });
                results.push({
                    title: "Inspect Semester Workload Plan",
                    subtitle: "View homework commitment curves and conflict alerts",
                    tag: "SCHEDULE",
                    action: () => {
                        this.close();
                        if (window.HarvestExplorer) window.HarvestExplorer.openDrawer("schedule");
                    }
                });
                results.push({
                    title: "Comparative Faculty Matrix",
                    subtitle: "Contrast two teachers side-by-side",
                    tag: "COMPARE",
                    action: () => {
                        this.close();
                        if (window.HarvestExplorer) window.HarvestExplorer.openDrawer("compare");
                    }
                });
                results.push({
                    title: "Toggle Auditory Immersion (Mute/Unmute)",
                    subtitle: "Switch tactile mechanical sounds and ambience",
                    tag: "AUDIO",
                    action: () => {
                        const muted = this.core.audio.toggleMute();
                        this.core.toast.show(muted ? "Sound effects muted" : "Tactile sounds active");
                        this.close();
                    }
                });
            }

            const dossiers = this.core.getAllDossiers();
            for (const d of dossiers) {
                if (
                    d.displayName.toLowerCase().includes(q) ||
                    d.courses.some(c => c.toLowerCase().includes(q)) ||
                    d.topKeywords.some(kw => kw.includes(q))
                ) {
                    results.push({
                        title: d.displayName,
                        subtitle: `${d.courses.join(", ") || "Faculty"} · ${d.bayesianRating} ★ · ${d.workloadHours}h/wk`,
                        tag: d.primaryDept.code,
                        action: () => {
                            this.close();
                            if (window.HarvestExplorer) {
                                window.HarvestExplorer.openDossierDetail(d.key);
                            } else {
                                this.core.openModalDossier(d.key);
                            }
                        }
                    });
                }
            }

            this.currentResults = results.slice(0, 10);
            if (this.currentResults.length === 0) {
                this.resultsList.innerHTML = `
                    <div style="padding: 24px; text-align: center; color: ${PALETTE.muted}; font-size: 13px;">
                        No academic dossiers or commands matching "${safeHtml(query)}"
                    </div>
                `;
                return;
            }

            this.resultsList.innerHTML = this.currentResults.map((item, idx) => `
                <div class="harvest-palette-row ${idx === this.selectedIndex ? "selected" : ""}" data-idx="${idx}" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 18px;
                    cursor: pointer;
                    background: ${idx === this.selectedIndex ? PALETTE.paperTint : "transparent"};
                    border-left: 3px solid ${idx === this.selectedIndex ? PALETTE.foxglove : "transparent"};
                ">
                    <div>
                        <strong style="font-family: Georgia, serif; font-size: 14px; color: ${PALETTE.ink};">${safeHtml(item.title)}</strong>
                        <div style="font-size: 11px; color: ${PALETTE.muted}; margin-top: 2px;">${safeHtml(item.subtitle)}</div>
                    </div>
                    <span style="font-family: ui-monospace, monospace; font-size: 9px; font-weight: 700; background: ${PALETTE.paperTint}; padding: 2px 6px; border-radius: 3px; color: ${PALETTE.inkSoft};">
                        ${safeHtml(item.tag)}
                    </span>
                </div>
            `).join("");

            this.resultsList.querySelectorAll(".harvest-palette-row").forEach(row => {
                row.addEventListener("click", () => {
                    const idx = Number(row.dataset.idx);
                    if (this.currentResults[idx]) {
                        this.currentResults[idx].action();
                    }
                });
                row.addEventListener("mouseenter", () => {
                    this.selectedIndex = Number(row.dataset.idx);
                    this._highlightSelection();
                });
            });
        }

        _highlightSelection() {
            const rows = this.resultsList.querySelectorAll(".harvest-palette-row");
            rows.forEach((row, idx) => {
                const isSelected = idx === this.selectedIndex;
                row.style.background = isSelected ? PALETTE.paperTint : "transparent";
                row.style.borderLeftColor = isSelected ? PALETTE.foxglove : "transparent";
            });
        }
    }

    class BroadSheetExporter {
        static printDossier(stats) {
            const printWindow = window.open("", "_blank");
            if (!printWindow) return;

            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>${safeHtml(stats.displayName)} — Archival Field Dossier</title>
                    <style>
                        @page { size: letter portrait; margin: 18mm; }
                        body {
                            font-family: "Georgia", "Newsreader", serif;
                            color: ${PALETTE.ink};
                            background: #fff;
                            margin: 0;
                            padding: 24px;
                            line-height: 1.5;
                        }
                        .header-row {
                            border-bottom: 2px solid ${PALETTE.pineDeep};
                            padding-bottom: 12px;
                            margin-bottom: 20px;
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-end;
                        }
                        .catalog-tag {
                            font-family: monospace;
                            font-size: 11px;
                            letter-spacing: 2px;
                            text-transform: uppercase;
                            color: ${PALETTE.muted};
                        }
                        h1 {
                            font-size: 30px;
                            margin: 4px 0 0;
                            font-weight: 500;
                        }
                        .metrics-grid {
                            display: grid;
                            grid-template-columns: repeat(4, 1fr);
                            border: 1px solid ${PALETTE.pineDeep};
                            margin-bottom: 24px;
                            text-align: center;
                        }
                        .metric-cell {
                            padding: 12px;
                            border-right: 1px solid ${PALETTE.pineDeep};
                        }
                        .metric-cell:last-child { border-right: none; }
                        .metric-cell strong {
                            display: block;
                            font-size: 22px;
                            margin-bottom: 2px;
                        }
                        .metric-cell span {
                            font-family: monospace;
                            font-size: 10px;
                            text-transform: uppercase;
                            color: ${PALETTE.muted};
                        }
                        .advice-banner {
                            border-left: 3px solid ${PALETTE.foxglove};
                            background: #fbf7ee;
                            padding: 14px 18px;
                            margin-bottom: 26px;
                            font-size: 13px;
                        }
                        .review-entry {
                            border-bottom: 1px dashed #ccc;
                            padding: 14px 0;
                        }
                        .review-meta {
                            font-family: monospace;
                            font-size: 11px;
                            color: ${PALETTE.muted};
                            margin-bottom: 6px;
                        }
                        .footer-stamp {
                            margin-top: 36px;
                            border-top: 1px solid #aaa;
                            padding-top: 12px;
                            font-size: 11px;
                            color: ${PALETTE.muted};
                            text-align: center;
                            font-family: monospace;
                        }
                    </style>
                </head>
                <body>
                    <div class="header-row">
                        <div>
                            <div class="catalog-tag">HARVEST ARCHIVAL SPECIMEN · ${safeHtml(stats.specimenNo)}</div>
                            <h1>${safeHtml(stats.displayName)}</h1>
                            <div style="font-size: 13px; color: ${PALETTE.inkSoft}; margin-top: 2px;">
                                Field: ${safeHtml(stats.primaryDept.name)} · Courses: ${safeHtml(stats.courses.join(", ") || "General Faculty")}
                            </div>
                        </div>
                        <div class="catalog-tag">
                            SEMESTER VERIFIED
                        </div>
                    </div>

                    <div class="metrics-grid">
                        <div class="metric-cell">
                            <strong>${stats.bayesianRating.toFixed(1)} ★</strong>
                            <span>Bayesian Rating</span>
                        </div>
                        <div class="metric-cell">
                            <strong>${stats.takeAgainPercent}%</strong>
                            <span>Would Repeat</span>
                        </div>
                        <div class="metric-cell">
                            <strong>${stats.difficultyLabel}</strong>
                            <span>Difficulty (${stats.difficultyScore.toFixed(1)}/3)</span>
                        </div>
                        <div class="metric-cell">
                            <strong>${stats.workloadHours.toFixed(1)} h/wk</strong>
                            <span>Homework Pace</span>
                        </div>
                    </div>

                    <div class="advice-banner">
                        <strong style="font-size: 14px; display: block; margin-bottom: 4px;">Day-One Academic Field Strategy:</strong>
                        ${safeHtml(stats.dayOneAdvice)}
                    </div>

                    <h2 style="font-size: 18px; border-bottom: 1px solid ${PALETTE.pineDeep}; padding-bottom: 4px; margin-bottom: 12px;">
                        Archived Peer Records (${stats.posts.length})
                    </h2>

                    ${stats.posts.map((p, i) => `
                        <div class="review-entry">
                            <div class="review-meta">
                                [RECORD ${i + 1}] COURSE: ${safeHtml(p.course || "GENERAL")} · RATING: ${p.rating || 3}/5 · WORKLOAD: ${safeHtml(p.workload || "average").toUpperCase()}
                            </div>
                            <div style="font-size: 14px; line-height: 1.5;">${safeHtml(p.text)}</div>
                            <div style="font-size: 11px; color: #888; margin-top: 4px;">Verified by student @${safeHtml(p.handle || "anonymous")}</div>
                        </div>
                    `).join("")}

                    <div class="footer-stamp">
                        HARVEST HIGH SCHOOL COMPENDIUM · DOCUMENT GENERATED FOR EDUCATIONAL REFERENCE ONLY
                    </div>
                </body>
                </html>
            `;

            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 350);
        }
    }

    class HarvestInterface {
        constructor() {
            this.version = VERSION;
            this.palette = PALETTE;
            this.taxonomy = TAXONOMY;
            this.bus = new EventBus();
            this.storage = new StorageAdapter();
            this.audio = new SyntheticAudio();
            this.toast = new ToastManager();
            this.schedule = new ScheduleManager(this.storage, this.bus);
            this.queue = new OfflineQueue(this.storage, this.bus);
            this.paletteUi = new CommandPalette(this);
            this.postsCache = [];
            this.isInitialized = false;
        }

        async init() {
            if (this.isInitialized) return this;
            this.paletteUi.init();
            this._bindGlobalKeyShortcuts();
            await this.refreshPosts();
            this.isInitialized = true;
            this.bus.emit("interface:ready", { version: this.version });
            return this;
        }

        async refreshPosts() {
            try {
                if (window.home && Array.isArray(window.home.posts) && window.home.posts.length > 0) {
                    this.postsCache = window.home.posts;
                } else {
                    const res = await fetch("/api/posts?sort=popular");
                    if (res.ok) {
                        this.postsCache = await res.json();
                    }
                }
            } catch (_) {
                this.postsCache = [];
            }
            this.bus.emit("posts:refreshed", this.postsCache);
            return this.postsCache;
        }

        getAllDossiers() {
            const keys = new Set();
            for (const post of this.postsCache) {
                if (post.teacher) {
                    keys.add(normalizeKey(post.teacher));
                }
            }

            const dossiers = [];
            for (const key of keys) {
                const samplePost = this.postsCache.find(p => normalizeKey(p.teacher) === key);
                const teacherName = samplePost ? samplePost.teacher : key;
                dossiers.push(BayesianAnalytics.computeTeacherDossier(teacherName, this.postsCache));
            }

            return dossiers.sort((a, b) => b.totalPosts - a.totalPosts);
        }

        getDossier(teacherKey) {
            const key = normalizeKey(teacherKey);
            const samplePost = this.postsCache.find(p => normalizeKey(p.teacher) === key);
            const teacherName = samplePost ? samplePost.teacher : teacherKey;
            return BayesianAnalytics.computeTeacherDossier(teacherName, this.postsCache);
        }

        renderRadar(teacherKey, size = 200) {
            const dossier = this.getDossier(teacherKey);
            return VectorGeometry.createRadarPolygon(dossier, size);
        }

        renderWorkloadCurve(avgHours, sizeW = 280, sizeH = 70) {
            return VectorGeometry.createWorkloadBellCurve(avgHours, sizeW, sizeH);
        }

        renderWaxBadge(text, size = 48) {
            return VectorGeometry.createWaxSealBadgeSvg(text, size);
        }

        printDossier(teacherKey) {
            const dossier = this.getDossier(teacherKey);
            BroadSheetExporter.printDossier(dossier);
            this.audio.playParchmentRustle();
        }

        openModalDossier(teacherKey) {
            const dossier = this.getDossier(teacherKey);
            const existingModal = document.getElementById("harvest-custom-dossier-modal");
            if (existingModal) existingModal.remove();

            const backdrop = document.createElement("div");
            backdrop.id = "harvest-custom-dossier-modal";
            backdrop.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(23, 35, 29, 0.72);
                backdrop-filter: blur(8px);
                z-index: 10500;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            `;

            const card = document.createElement("div");
            card.style.cssText = `
                width: min(720px, 94vw);
                max-height: 88vh;
                background: ${PALETTE.paperCard};
                border: 1px solid ${PALETTE.pineDeep};
                border-radius: 6px;
                box-shadow: 0 24px 60px rgba(0,0,0,0.35);
                overflow-y: auto;
                padding: 32px;
                position: relative;
            `;

            card.innerHTML = `
                <button id="close-custom-dossier" style="
                    position: absolute;
                    top: 18px;
                    right: 18px;
                    background: ${PALETTE.paper};
                    border: 1px solid ${PALETTE.line};
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    font-size: 16px;
                    cursor: pointer;
                ">×</button>

                <div style="font-family: ui-monospace, monospace; font-size: 10px; color: ${PALETTE.muted}; letter-spacing: 2px;">
                    ${safeHtml(dossier.specimenNo)} · ${safeHtml(dossier.primaryDept.code)}
                </div>

                <h2 style="font-family: Georgia, serif; font-size: 32px; margin: 4px 0 6px; color: ${PALETTE.ink};">
                    ${safeHtml(dossier.displayName)}
                </h2>

                <div style="font-size: 13px; color: ${PALETTE.inkSoft}; margin-bottom: 20px;">
                    Courses: <strong>${safeHtml(dossier.courses.join(", ") || "General")}</strong>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 220px; gap: 24px; align-items: center; margin-bottom: 24px;">
                    <div>
                        <div style="background: ${PALETTE.pineDeep}; color: ${PALETTE.cream}; padding: 16px; border-radius: 4px; font-size: 13px; line-height: 1.6;">
                            <strong style="color: ${PALETTE.specimenGold}; display: block; margin-bottom: 4px;">Day-One Advice:</strong>
                            ${safeHtml(dossier.dayOneAdvice)}
                        </div>

                        <div style="display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap;">
                            <button id="modal-add-schedule-btn" style="
                                background: ${PALETTE.pineDeep};
                                color: #fff;
                                border: none;
                                padding: 8px 16px;
                                border-radius: 4px;
                                font-size: 12px;
                                font-weight: 600;
                                cursor: pointer;
                            ">+ Add to Semester Plan</button>

                            <button id="modal-print-btn" style="
                                background: transparent;
                                color: ${PALETTE.ink};
                                border: 1px solid ${PALETTE.line};
                                padding: 8px 14px;
                                border-radius: 4px;
                                font-size: 12px;
                                font-weight: 600;
                                cursor: pointer;
                            ">Print Dossier</button>
                        </div>
                    </div>

                    <div style="background: ${PALETTE.paper}; border: 1px solid ${PALETTE.line}; padding: 12px; border-radius: 4px; text-align: center;">
                        ${VectorGeometry.createRadarPolygon(dossier, 190)}
                    </div>
                </div>

                <h3 style="font-family: Georgia, serif; font-size: 20px; border-bottom: 1px solid ${PALETTE.line}; padding-bottom: 6px; margin: 24px 0 14px;">
                    Verified Student Observations (${dossier.posts.length})
                </h3>

                <div style="display: grid; gap: 12px;">
                    ${dossier.posts.map(p => `
                        <div style="background: ${PALETTE.paper}; border: 1px solid ${PALETTE.line}; padding: 14px; border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; font-size: 12px; color: ${PALETTE.muted}; margin-bottom: 4px;">
                                <span>${safeHtml(p.course || "General")}</span>
                                <span style="color: ${PALETTE.ochre};">${"★".repeat(p.rating || 3)}</span>
                            </div>
                            <div style="font-size: 14px; line-height: 1.5; color: ${PALETTE.ink};">${parseMarkdownLite(p.text)}</div>
                            <div style="margin-top: 6px; font-size: 11px; color: ${PALETTE.muted};">
                                By @${safeHtml(p.handle)} · ${p.likes || 0} likes
                            </div>
                        </div>
                    `).join("")}
                </div>
            `;

            backdrop.appendChild(card);
            document.body.appendChild(backdrop);

            const close = () => {
                backdrop.remove();
                this.audio.playClick();
            };

            card.querySelector("#close-custom-dossier")?.addEventListener("click", close);
            backdrop.addEventListener("click", e => {
                if (e.target === backdrop) close();
            });

            card.querySelector("#modal-add-schedule-btn")?.addEventListener("click", () => {
                const res = this.schedule.addItem(
                    dossier.key,
                    dossier.displayName,
                    dossier.courses[0] || "General Class",
                    dossier.workloadHours
                );
                if (res.success) {
                    this.toast.show(`Added ${dossier.displayName} to semester plan`, "success");
                    this.audio.playChime("success");
                } else {
                    this.toast.show(res.reason, "warning");
                    this.audio.playChime("warning");
                }
            });

            card.querySelector("#modal-print-btn")?.addEventListener("click", () => {
                this.printDossier(dossier.key);
            });
        }

        _bindGlobalKeyShortcuts() {
            document.addEventListener("keydown", e => {
                if (e.key === "?" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
                    e.preventDefault();
                    this._showShortcutsModal();
                }
            });
        }

        _showShortcutsModal() {
            const existing = document.getElementById("harvest-shortcuts-dialog");
            if (existing) {
                existing.remove();
                return;
            }

            const modal = document.createElement("div");
            modal.id = "harvest-shortcuts-dialog";
            modal.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(23, 35, 29, 0.65);
                backdrop-filter: blur(6px);
                z-index: 11000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            `;

            modal.innerHTML = `
                <div style="width: min(480px, 90vw); background: ${PALETTE.paperCard}; border: 1px solid ${PALETTE.pineDeep}; padding: 28px; border-radius: 6px; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
                    <h3 style="font-family: Georgia, serif; font-size: 22px; margin: 0 0 16px;">Harvest Keyboard Field Guide</h3>
                    <div style="display: grid; gap: 10px; font-size: 13px;">
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed ${PALETTE.line}; padding-bottom: 6px;">
                            <span>Command Palette</span>
                            <kbd style="font-family: monospace; background: ${PALETTE.paperTint}; padding: 2px 6px; border-radius: 3px;">⌘K / Ctrl+K</kbd>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed ${PALETTE.line}; padding-bottom: 6px;">
                            <span>Focus Review Search</span>
                            <kbd style="font-family: monospace; background: ${PALETTE.paperTint}; padding: 2px 6px; border-radius: 3px;">/</kbd>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed ${PALETTE.line}; padding-bottom: 6px;">
                            <span>Draft Field Review</span>
                            <kbd style="font-family: monospace; background: ${PALETTE.paperTint}; padding: 2px 6px; border-radius: 3px;">N</kbd>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed ${PALETTE.line}; padding-bottom: 6px;">
                            <span>Dismiss Dialog / Palette</span>
                            <kbd style="font-family: monospace; background: ${PALETTE.paperTint}; padding: 2px 6px; border-radius: 3px;">ESC</kbd>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Keyboard Help</span>
                            <kbd style="font-family: monospace; background: ${PALETTE.paperTint}; padding: 2px 6px; border-radius: 3px;">?</kbd>
                        </div>
                    </div>
                    <div style="margin-top: 22px; text-align: right;">
                        <button id="close-shortcuts-btn" style="background: ${PALETTE.pineDeep}; color: #fff; border: none; padding: 6px 14px; border-radius: 4px; font-size: 12px; cursor: pointer;">Understood</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            modal.addEventListener("click", e => {
                if (e.target === modal || e.target.id === "close-shortcuts-btn") {
                    modal.remove();
                }
            });
        }
    }

    const instance = new HarvestInterface();

    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => instance.init());
        } else {
            instance.init();
        }
    }

    return instance;
});