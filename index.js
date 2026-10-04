import express from "express";
import multer from "multer";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);

const port = process.env.PORT || 8080;

const root = __dirname;
const staticDir = path.join(root, "static");
const uploadDir = path.join(root, "uploads");
const dataDir = path.join(root, "data");

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "harvest.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        handle TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        bio TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT 'Somewhere nearby',
        created_at INTEGER NOT NULL,
        password_hash TEXT,
        ip_address TEXT
    );

CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author_id INTEGER NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('found', 'made', 'grown', 'learned')),
        text TEXT NOT NULL,
        image TEXT,
        weather TEXT DEFAULT 'brisk',
        specimen_no TEXT,
        likes INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS likes (
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        PRIMARY KEY (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS saves (
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        PRIMARY KEY (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        author_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        read_at INTEGER,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS messages_pair_idx
        ON messages(sender_id, recipient_id, created_at);

CREATE INDEX IF NOT EXISTS comments_post_idx
        ON comments(post_id, created_at);

CREATE INDEX IF NOT EXISTS posts_created_idx
        ON posts(created_at DESC);

CREATE INDEX IF NOT EXISTS posts_likes_idx
        ON posts(likes DESC, created_at DESC);
CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
`);

const postColumns = db.prepare("PRAGMA table_info(posts)").all()
.map(column => column.name);

if (!postColumns.includes("teacher")) {
    db.exec(`
        ALTER TABLE posts
        ADD COLUMN teacher TEXT NOT NULL DEFAULT ''
    `);
}

if (!postColumns.includes("course")) {
    db.exec(`
        ALTER TABLE posts
        ADD COLUMN course TEXT NOT NULL DEFAULT ''
    `);
}

if (!postColumns.includes("difficulty")) {
    db.exec(`
        ALTER TABLE posts
        ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'medium'
    `);
}

if (!postColumns.includes("workload")) {
    db.exec(`
        ALTER TABLE posts
        ADD COLUMN workload TEXT NOT NULL DEFAULT 'average'
    `);
}

if (!postColumns.includes("take_again")) {
    db.exec(`
        ALTER TABLE posts
        ADD COLUMN take_again TEXT NOT NULL DEFAULT 'yes'
    `);
}

if (!postColumns.includes("rating")) {
    db.exec(`
        ALTER TABLE posts
        ADD COLUMN rating INTEGER NOT NULL DEFAULT 3
    `);
}

const userColumns = db.prepare("PRAGMA table_info(users)").all()
    .map(column => column.name);
if (!userColumns.includes("password_hash")) {
    db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
}
if (!userColumns.includes("ip_address")) {
    db.exec(`ALTER TABLE users ADD COLUMN ip_address TEXT`);
}

function now() {
    return Date.now();
}

function cleanHandle(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/^@/, "")
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 24);
}

function cleanText(value, maxLength = 1000) {
    return String(value || "")
        .trim()
        .replace(/\r\n/g, "\n")
        .slice(0, maxLength);
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    return scryptHash(password, salt).then(hash => `${salt}:${hash}`);
}

async function verifyPassword(password, stored) {
    if (!stored || !stored.includes(":")) {
        return false;
    }
    const [salt, expected] = stored.split(":");
    const actual = await scryptHash(password, salt);
    const a = Buffer.from(actual, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function scryptHash(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(String(password), salt, 64, (err, key) => {
            if (err) reject(err);
            else resolve(key.toString("hex"));
        });
    });
}
function publicUser(user) {
    if (!user) {
        return null;
    }
    const { password_hash, ip_address, ...safe } = user;
    return safe;
}
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;
function createSession(userId) {
    const token = crypto.randomBytes(32).toString("hex");
    db.prepare(`
        INSERT INTO sessions (token, user_id, expires_at)
        VALUES (?, ?, ?)
    `).run(token, userId, now() + SESSION_TTL);
    return token;
}
function parseCookies(header) {
    const jar = {};
    for (const part of String(header || "").split(";")) {
        const index = part.indexOf("=");
        if (index > -1) {
            const key = part.slice(0, index).trim();
            const value = part.slice(index + 1).trim();
            try {
                jar[key] = decodeURIComponent(value);
            } catch {
                jar[key] = value;
            }
        }
    }
    return jar;
}

function generateSpecimenNo() {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const num = Math.floor(100 + Math.random() * 899);
    return `CAT. ${letter}-${num}`;
}

function getUser(handle, create = true) {
    handle = cleanHandle(handle);

    if (!handle) {
        return null;
    }

    let user = db.prepare(`
        SELECT id, handle, display_name, bio, location, created_at
        FROM users
        WHERE handle = ?
    `).get(handle);

    return user;
}

async function seedUser(handle, displayName, bio, location, password) {
    let user = db.prepare(`
        SELECT * FROM users WHERE handle = ? `).get(handle);

if (!user) {
        db.prepare(`
            INSERT INTO users (handle, display_name, bio, location, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(handle, displayName, bio, location, await hashPassword(password), now());
}
}

const appleIllustration = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500"><rect width="800" height="500" fill="%23f7f3ea"/><g stroke="%232b382d" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M400 130 C400 90 425 65 445 55" stroke="%238a4a35" stroke-width="4"/><path d="M440 60 C465 60 485 75 490 95 C460 100 445 80 440 60Z" fill="%23677a64" stroke="%234b5c49"/><path d="M400 145 C350 110 270 120 250 200 C230 280 270 380 340 410 C375 425 395 400 400 400 C405 400 425 425 460 410 C530 380 570 280 550 200 C530 120 450 110 400 145 Z" fill="%23a84e36" stroke="%236c2e1f" stroke-width="3.5"/><path d="M280 210 C295 180 330 160 360 165" stroke="%23f3d3b4" stroke-width="4" stroke-linecap="round"/><path d="M300 230 C310 210 335 195 350 200" stroke="%23f3d3b4" stroke-width="2"/></g><text x="400" y="465" font-family="Georgia, serif" font-size="14" fill="%236b685e" letter-spacing="4" text-anchor="middle">SPECIMEN № 08 · ORCHARD HARVEST · VALLEY RD</text></svg>`;

const basilIllustration = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500"><rect width="800" height="500" fill="%23f7f3ea"/><g stroke="%232e4233" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M400 420 L400 130" stroke="%2358705c" stroke-width="4"/><path d="M400 340 C340 330 300 290 280 240 C340 230 390 270 400 340 Z" fill="%23567056"/><path d="M400 280 C460 270 500 230 520 180 C460 170 410 210 400 280 Z" fill="%23638263"/><path d="M400 210 C350 195 320 160 310 110 C360 110 395 150 400 210 Z" fill="%23719471"/><path d="M400 150 C440 140 465 110 470 70 C430 70 405 105 400 150 Z" fill="%237ea37e"/><path d="M390 120 C395 80 400 60 400 50 C400 60 405 80 410 120 Z" fill="%2392b892"/></g><text x="400" y="465" font-family="Georgia, serif" font-size="14" fill="%236b685e" letter-spacing="4" text-anchor="middle">SPECIMEN № 19 · GENOVESE BASIL · NORTH SILL</text></svg>`;

const scannerLampIllustration = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500"><rect width="800" height="500" fill="%23f7f3ea"/><g stroke="%232c382f" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M260 410 L540 410 L510 385 L290 385 Z" fill="%23d6ccb8"/><path d="M400 385 L400 260 L490 180 L440 120" stroke-width="6" stroke="%23846638"/><circle cx="400" cy="260" r="9" fill="%23bd8c42" stroke="%23523f20"/><circle cx="490" cy="180" r="9" fill="%23bd8c42" stroke="%23523f20"/><path d="M430 110 L530 170 L510 200 L410 140 Z" fill="%233e4b40"/><path d="M470 175 C520 220 570 290 620 370" stroke="%23e8a638" stroke-dasharray="6 8" stroke-width="2.5"/></g><text x="400" y="465" font-family="Georgia, serif" font-size="14" fill="%236b685e" letter-spacing="4" text-anchor="middle">BLUEPRINT № 42 · SCANNER COLD-CATHODE LAMP</text></svg>`;

function seedPosts() {
    const postCount = db.prepare("SELECT COUNT(*) AS count FROM posts").get().count;

if (postCount > 0) {
        return;
    }

const users = {
        mira: getUser("mira"),
        noor: getUser("noor"),
        sam: getUser("sam"),
        jon: getUser("jon")
    };

const posts = [
        [
            users.mira.id,
            "found",
            "Dana Whitfield",
            "AP Biology",
            "Dr. Whitfield runs the best labs I've had here. Every unit ends with a real dissection or field sample instead of a worksheet, and her study guides match the tests almost line for line. Go to office hours once and she'll remember your name all semester.",
            appleIllustration,
            "mist",
            "CAT. M-104",
            18,
            now() - 18 * 60 * 1000,
            "medium",
            "average",
            "yes",
            5
        ],
        [
            users.noor.id,
            "found",
            "Marcus Oyelaran",
            "World History",
            "Mr. Oyelaran lectures without slides and somehow it works. Heavy reading week to week, but the discussions are genuinely interesting and he grades essays on your argument, not on trivia. Stay on top of the reading and it's very doable.",
            basilIllustration,
            "brisk",
            "CAT. N-221",
            31,
            now() - 53 * 60 * 1000,
            "medium",
            "heavy",
            "yes",
            4
        ],
        [
            users.sam.id,
            "found",
            "Priya Raghavan",
            "Intro to Engineering",
            "Ms. Raghavan is tough but the fairest grader in the department. The scanner project sounds scary and then you realize she gives you a full parts bench and unlimited shop hours. She'll stay late if you're stuck. Take her if you actually want to build things.",
            scannerLampIllustration,
            "clear",
            "CAT. S-049",
            26,
            now() - 92 * 60 * 1000,
            "hard",
            "average",
            "yes",
            5
        ],
        [
            users.jon.id,
            "found",
            "Elliot Marsh",
            "Creative Writing",
            "Mr. Marsh canceling workshop three weeks in a row was the only consistent thing about this class. Feedback on submitted work was one word or nothing, and the final portfolio guidelines changed twice. Easy credit, but I didn't learn much.",
            null,
            "frost",
            "CAT. J-318",
            42,
            now() - 148 * 60 * 1000,
            "easy",
            "light",
            "no",
            2
        ]
];

const insert = db.prepare(`
        INSERT INTO posts (
            author_id, category, teacher, course, text, image, weather, specimen_no, likes, created_at,
            difficulty, workload, take_again, rating
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) `);

const addAll = db.transaction(items => {
        for (const item of items) {
            insert.run(...item);
        }
    });

addAll(posts);

const firstPost = db.prepare(`
        SELECT id FROM posts ORDER BY id ASC LIMIT 1
    `).get();

const secondPost = db.prepare(`
        SELECT id FROM posts ORDER BY id ASC LIMIT 1 OFFSET 1
    `).get();

db.prepare(`
        INSERT OR IGNORE INTO comments (post_id, author_id, text, created_at)
        VALUES (?, ?, ?, ?) `).run(
        firstPost.id,
        users.jon.id,
        "The study guides really do match the tests, can confirm",
        now() - 7 * 60 * 1000
    );

db.prepare(`
        INSERT OR IGNORE INTO comments (post_id, author_id, text, created_at)
        VALUES (?, ?, ?, ?) `).run(
        secondPost.id,
        users.mira.id,
        "The reading load is real but worth it, take him",
        now() - 32 * 60 * 1000
    );
}

function seedMessages() {
    const messageCount = db.prepare("SELECT COUNT(*) AS count FROM messages").get().count;

if (messageCount > 0) {
        return;
    }

const mira = getUser("mira");
    const noor = getUser("noor");
    const sam = getUser("sam");
    const you = getUser("you");

const add = db.prepare(`
        INSERT INTO messages (
            sender_id, recipient_id, text, created_at, read_at
        )
        VALUES (?, ?, ?, ?, ?) `);

add.run(
        mira.id,
        you.id,
        "Found the heirloom apples again. The crate was set out near the red barn.",
        now() - 36 * 60 * 1000,
        now() - 35 * 60 * 1000
);

add.run(
        you.id,
        mira.id,
        "Heading out with two canvas bags before dusk.",
        now() - 34 * 60 * 1000,
        now() - 34 * 60 * 1000
    );

add.run(
        noor.id,
        you.id,
        "Do you still want to trade cutting slips this weekend by the nursery?",
        now() - 4 * 60 * 60 * 1000,
        null
    );

add.run(
        sam.id,
        you.id,
        "Finished adjusting the ballast on the lamp. It runs clean now.",
        now() - 23 * 60 * 60 * 1000,
        now() - 22 * 60 * 60 * 1000
);
}

await seedUser("mira", "Mira Vance", "Collector of old kitchen tools and even older recipes.", "Hudson Valley, NY", "harvest123");
await seedUser("noor", "Noor Thorne", "Home baker. I cook whatever's in season and skip the rest.", "Lancaster, PA", "harvest123");
await seedUser("sam", "Sam Whitaker", "I rescue lamps and hand tools from old machines and get them working again.", "Portland, ME", "harvest123");
await seedUser("jon", "Jon Gale", "Trail walks, bookbinding, birding.", "Asheville, NC", "harvest123");
await seedUser("you", "Field Naturalist", "Just here to keep track of what turns up.", "Kingston, NY", "harvest123");
seedPosts();
seedMessages();

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDir);
    },

filename: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        callback(
            null,
            `${crypto.randomUUID()}${extension}`
        );
    }
});

const upload = multer({
    storage,

limits: {
        fileSize: 5 * 1024 * 1024
    },

fileFilter: (req, file, callback) => {
        if (!file.mimetype.startsWith("image/")) {
            const err = new Error("Only image uploads are allowed.");
            err.status = 400;
            callback(err);
            return;
        }

callback(null, true);
}
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadDir));
app.use(express.static(staticDir));

app.use((req, res, next) => {
    const token = parseCookies(req.headers.cookie).harvest_session;
    req.user = null;
    if (token) {
        const session = db.prepare(`
            SELECT s.token, s.expires_at, u.id, u.handle, u.display_name, u.bio, u.location, u.created_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
        `).get(token);
        if (session && session.expires_at > now()) {
            req.user = session;
        } else if (session) {
            db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
        }
    }
    next();
});
function cookieOpts(req) {
    return {
        httpOnly: true,
        sameSite: "lax",
        secure: req.secure === true,
        maxAge: SESSION_TTL,
        path: "/"
    };
}

function normalizeIp(value) {
    let ip = String(value || "");
    if (ip.startsWith("::ffff:")) {
        ip = ip.slice(7);
    }
    return ip;
}

function isLoopback(ip) {
    return ip === "::1" || ip.startsWith("127.");
}

app.post("/api/signup", async (req, res) => {
    const handle = cleanHandle(req.body.username);
    const password = String(req.body.password || "");
    const displayName = cleanText(req.body.displayName, 60) || handle.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const ip = normalizeIp(req.ip);
    if (!handle || !password) {
        res.status(400).json({ error: "Username and password are required." });
        return;
    }
    if (password.length < 8) {
        res.status(400).json({ error: "Password needs at least 8 characters." });
        return;
    }
    if (ip && !isLoopback(ip)) {
        const existing = db.prepare(`SELECT id FROM users WHERE ip_address = ?`).get(ip);
        if (existing) {
            res.status(403).json({ error: "One account per network — this network already has an account." });
            return;
        }
    }
    if (db.prepare(`SELECT id FROM users WHERE handle = ?`).get(handle)) {
        res.status(400).json({ error: "That username is taken." });
        return;
    }
    let result;
    try {
        result = db.prepare(`
            INSERT INTO users (handle, display_name, bio, location, password_hash, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(handle, displayName, "", "Somewhere nearby", await hashPassword(password), ip, now());
    } catch (err) {
        if (String(err.code || "").startsWith("SQLITE_CONSTRAINT")) {
            res.status(400).json({ error: "That username is taken." });
            return;
        }
        throw err;
    }
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(result.lastInsertRowid);
    res.cookie("harvest_session", createSession(user.id), cookieOpts(req));
    res.status(201).json({ user: publicUser(user) });
});
app.post("/api/login", async (req, res) => {
    const handle = cleanHandle(req.body.username);
    const user = handle ? db.prepare(`SELECT * FROM users WHERE handle = ?`).get(handle) : null;
    if (!user || !(await verifyPassword(req.body.password, user.password_hash))) {
        res.status(401).json({ error: "Wrong username or password." });
        return;
    }
    res.cookie("harvest_session", createSession(user.id), cookieOpts(req));
    res.json({ user: publicUser(user) });
});
app.post("/api/logout", (req, res) => {
    const token = parseCookies(req.headers.cookie).harvest_session;
    if (token) {
        db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    }
    res.clearCookie("harvest_session", { path: "/" });
    res.json({ success: true });
});
app.get("/api/me", (req, res) => {
    res.json({ user: publicUser(req.user) });
});
function requireUser(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: "Please log in." });
        return;
    }
    next();
}

function toPostId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}


app.get("/api/profile", requireUser, (req, res) => {
    const user = req.user;

const postCount = db.prepare(`
        SELECT COUNT(*) AS count
        FROM posts
        WHERE author_id = ? `).get(user.id).count;

const likeCount = db.prepare(`
        SELECT COALESCE(SUM(likes), 0) AS count
        FROM posts
        WHERE author_id = ? `).get(user.id).count;

const savedCount = db.prepare(`
        SELECT COUNT(*) AS count
        FROM saves
        WHERE user_id = ? `).get(user.id).count;

res.json({
        user,
        stats: {
            posts: postCount,
            likes: likeCount,
            saved: savedCount
        }
    });
});

app.put("/api/profile", requireUser, (req, res) => {
const user = req.user;

const displayName = cleanText(req.body.displayName, 60);
    const bio = cleanText(req.body.bio, 240);
    const location = cleanText(req.body.location, 60);

db.prepare(`
        UPDATE users
        SET display_name = ?, bio = ?, location = ? WHERE id = ? `).run(
        displayName || user.display_name,
        bio,
        location || user.location,
        user.id
    );

res.json({
        user: db.prepare(`
            SELECT id, handle, display_name, bio, location, created_at
            FROM users
            WHERE id = ? `).get(user.id)
});
});

app.get("/api/users", requireUser, (req, res) => {

const users = db.prepare(`
        SELECT
            id,
            handle,
            display_name,
            bio,
            location
        FROM users
        ORDER BY CASE WHEN handle = @me THEN 0 ELSE 1 END, display_name COLLATE NOCASE ASC
    `).all({ me: req.user.handle });

res.json(users);
});

app.get("/api/posts", requireUser, (req, res) => {
    const user = req.user;

let order = "p.created_at DESC";

if (req.query.sort === "popular") {
    order = "p.likes DESC, p.created_at DESC";
} else if (req.query.sort === "rating") {
    order = "p.rating DESC, p.created_at DESC";
}

let filterSql = "";
    const params = { userId: user.id };

if (req.query.category && req.query.category !== "all") {
        filterSql += " AND p.category = @category";
        params.category = req.query.category;
    }

if (req.query.author) {
        filterSql += " AND u.handle = @author";
        params.author = req.query.author;
    }

const posts = db.prepare(`
    SELECT
        p.id,
        p.category,
        p.teacher,
        p.course,
        p.difficulty,
        p.workload,
        p.take_again,
        p.rating,
        p.text,
        p.image,
        p.weather,
        p.specimen_no,
        p.likes,
        p.created_at,
        u.handle,
        u.display_name,
        u.location,
        EXISTS(
            SELECT 1
            FROM likes
            WHERE likes.post_id = p.id
            AND likes.user_id = @userId
        ) AS liked,
        EXISTS(
            SELECT 1
            FROM saves
            WHERE saves.post_id = p.id
            AND saves.user_id = @userId
        ) AS saved
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE 1=1 ${filterSql}
    ORDER BY ${order}
    LIMIT 100
`).all(params);

const postIds = posts.map(p => p.id);

let groupedComments = new Map();

if (postIds.length > 0) {
        const placeholders = postIds.map(() => "?").join(",");
        const comments = db.prepare(`
            SELECT
                c.id,
                c.post_id,
                c.text,
                c.created_at,
                u.handle,
                u.display_name
            FROM comments c
            JOIN users u ON u.id = c.author_id
            WHERE c.post_id IN (${placeholders})
            ORDER BY c.created_at ASC
        `).all(...postIds);

for (const comment of comments) {
            if (!groupedComments.has(comment.post_id)) {
                groupedComments.set(comment.post_id, []);
            }
            groupedComments.get(comment.post_id).push(comment);
        }
}

for (const post of posts) {
        post.comments = groupedComments.get(post.id) || [];
    }

res.json(posts);
});

app.post(
    "/api/posts",
    requireUser,
    upload.single("image"),
    (req, res) => {
        const user = req.user;
        const text = cleanText(req.body.text, 1400);
        const teacher = cleanText(req.body.teacher, 80);
        const course = cleanText(req.body.course, 80);

        if (!teacher || !course) {
    res.status(400).json({
        error: "Add a teacher and course."
    });
    return;
}

const allowedCategories = new Set([
            "found",
            "made",
            "grown",
            "learned"
        ]);

const category = allowedCategories.has(req.body.category)
            ? req.body.category
            : "found";

const weather = cleanText(req.body.weather || "brisk", 20);

if (!text) {
            res.status(400).json({
                error: "Write something first." });
            return;
}

const image = req.file
            ? `/uploads/${req.file.filename}`
            : (req.body.imageUrl || null);

const specimenNo = generateSpecimenNo();

const difficulty = cleanText(req.body.difficulty, 20);
const workload = cleanText(req.body.workload, 20);
const takeAgain = req.body.take_again === "no" ? "no" : "yes";
const rating = Math.min(5, Math.max(1, Number(req.body.rating) || 3));

const result = db.prepare(`
    INSERT INTO posts (
        author_id,
        category,
        teacher,
        course,
        text,
        image,
        weather,
        specimen_no,
        created_at,
        difficulty,
        workload,
        take_again,
        rating
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
    user.id,
    category,
    teacher,
    course,
    text,
    image,
    weather,
    specimenNo,
    now(),
    difficulty,
    workload,
    takeAgain,
    rating
);

const post = db.prepare(`
    SELECT
        p.id,
        p.category,
        p.text,
        p.teacher,
        p.course,
        p.image,
        p.difficulty,
        p.workload,
        p.take_again,
        p.rating,
        p.weather,
        p.specimen_no,
        p.likes,
        p.created_at,
        u.handle,
        u.display_name,
        u.location
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.id = ?
`).get(result.lastInsertRowid);

post.liked = 0;
post.saved = 0;
post.comments = [];

res.status(201).json(post);
    }
);

app.put(
    "/api/posts/:id",
    requireUser,
    upload.single("image"),
    (req, res) => {
        const postId = toPostId(req.params.id);

        if (!postId) {
            res.status(404).json({ error: "Review not found." });
            return;
        }

        const user = req.user;

        const existing = db.prepare(`
            SELECT * FROM posts WHERE id = ?
        `).get(postId);

        if (!existing) {
            res.status(404).json({ error: "Review not found." });
            return;
        }

        if (existing.author_id !== user.id) {
            res.status(403).json({
                error: "You can only edit your own reviews."
            });
            return;
        }

        const teacher = cleanText(req.body.teacher, 80);
        const course = cleanText(req.body.course, 80);
        const text = cleanText(req.body.text, 1400);
        const difficulty = cleanText(req.body.difficulty, 20);
        const workload = cleanText(req.body.workload, 20);
        const takeAgain = req.body.take_again === "no" ? "no" : "yes";
        const rating = Math.min(
            5,
            Math.max(1, Number(req.body.rating) || 3)
        );

        if (!teacher || !course || !text) {
            res.status(400).json({
                error: "Teacher, course, and review text are required."
            });
            return;
        }

        const image = req.file
            ? `/uploads/${req.file.filename}`
            : existing.image;

        db.prepare(`
            UPDATE posts
            SET
                teacher = ?,
                course = ?,
                difficulty = ?,
                workload = ?,
                take_again = ?,
                rating = ?,
                text = ?,
                image = ?
            WHERE id = ?
        `).run(
            teacher,
            course,
            difficulty,
            workload,
            takeAgain,
            rating,
            text,
            image,
            postId
        );

        const post = db.prepare(`
            SELECT
                p.id,
                p.category,
                p.teacher,
                p.course,
                p.difficulty,
                p.workload,
                p.take_again,
                p.rating,
                p.text,
                p.image,
                p.weather,
                p.specimen_no,
                p.likes,
                p.created_at,
                u.handle,
                u.display_name,
                u.location
            FROM posts p
            JOIN users u ON u.id = p.author_id
            WHERE p.id = ?
        `).get(postId);

        post.liked = 0;
        post.saved = 0;
        post.comments = [];

        res.json(post);
    }
);

app.delete("/api/posts/:id", requireUser, (req, res) => {
    const postId = toPostId(req.params.id);

    if (!postId) {
        res.status(404).json({ error: "Review not found." });
        return;
    }

    const user = req.user;

const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);

if (!post) {
        res.status(404).json({ error: "Review not found." });
        return;
}

if (post.author_id !== user.id) {
        res.status(403).json({ error: "You can only delete your own reviews." });
        return;
}

db.prepare(`DELETE FROM posts WHERE id = ?`).run(postId);
    res.json({ success: true, id: postId });
});

app.post("/api/posts/:id/like", requireUser, (req, res) => {
    const postId = toPostId(req.params.id);

    if (!postId) {
        res.status(404).json({ error: "Review not found." });
        return;
    }

    const user = req.user;

const post = db.prepare(`
        SELECT id FROM posts WHERE id = ? `).get(postId);

if (!post) {
        res.status(404).json({ error: "Post not found." });
        return;
}

const existing = db.prepare(`
        SELECT 1
        FROM likes
        WHERE post_id = ? AND user_id = ? `).get(postId, user.id);

if (existing) {
        db.prepare(`
            DELETE FROM likes
            WHERE post_id = ? AND user_id = ? `).run(postId, user.id);

db.prepare(`
            UPDATE posts
            SET likes = MAX(likes - 1, 0)
            WHERE id = ? `).run(postId);
} else {
        db.prepare(`
            INSERT INTO likes (post_id, user_id)
            VALUES (?, ?) `).run(postId, user.id);

db.prepare(`
            UPDATE posts
            SET likes = likes + 1
            WHERE id = ? `).run(postId);
}

const updated = db.prepare(`
        SELECT
            likes,
            EXISTS(
                SELECT 1
                FROM likes
                WHERE likes.post_id = posts.id
                AND likes.user_id = ? ) AS liked
        FROM posts
        WHERE id = ? `).get(user.id, postId);

res.json(updated);
});

app.post("/api/posts/:id/save", requireUser, (req, res) => {
    const postId = toPostId(req.params.id);

    if (!postId) {
        res.status(404).json({ error: "Review not found." });
        return;
    }

    const user = req.user;

const post = db.prepare(`SELECT id FROM posts WHERE id = ?`).get(postId);

if (!post) {
        res.status(404).json({ error: "Review not found." });
        return;
}

const existing = db.prepare(`
        SELECT 1
        FROM saves
        WHERE post_id = ? AND user_id = ? `).get(postId, user.id);

if (existing) {
        db.prepare(`
            DELETE FROM saves
            WHERE post_id = ? AND user_id = ? `).run(postId, user.id);
} else {
        db.prepare(`
            INSERT INTO saves (post_id, user_id)
            VALUES (?, ?) `).run(postId, user.id);
}

res.json({
        saved: !existing
    });
});

app.post("/api/posts/:id/comments", requireUser, (req, res) => {
    const postId = toPostId(req.params.id);
    const user = req.user;
    const text = cleanText(req.body.text, 500);

if (!postId) {
        res.status(404).json({
            error: "Review not found." });
        return;
}

if (!text) {
        res.status(400).json({
            error: "A comment needs some text." });
        return;
}

const post = db.prepare(`
        SELECT id FROM posts WHERE id = ? `).get(postId);

if (!post) {
        res.status(404).json({
            error: "Post not found." });
        return;
}

const result = db.prepare(`
        INSERT INTO comments (
            post_id,
            author_id,
            text,
            created_at
        )
        VALUES (?, ?, ?, ?) `).run(
        postId,
        user.id,
        text,
        now()
    );

const comment = db.prepare(`
        SELECT
            c.id,
            c.post_id,
            c.text,
            c.created_at,
            u.handle,
            u.display_name
        FROM comments c
        JOIN users u ON u.id = c.author_id
        WHERE c.id = ? `).get(result.lastInsertRowid);

res.status(201).json(comment);
});

app.get("/api/messages", requireUser, (req, res) => {
    const user = req.user;

const conversationHandle = cleanHandle(req.query.with || "");

if (conversationHandle) {
        const other = getUser(conversationHandle, false);

if (!other) {
            res.json([]);
            return;
        }

db.prepare(`
            UPDATE messages
            SET read_at = ? WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL
        `).run(
            now(),
            other.id,
            user.id
        );

const messages = db.prepare(`
            SELECT
                m.id,
                m.text,
                m.created_at,
                m.sender_id,
                m.recipient_id,
                sender.handle AS sender,
                sender.display_name AS sender_name,
                recipient.handle AS recipient,
                recipient.display_name AS recipient_name
            FROM messages m
            JOIN users sender ON sender.id = m.sender_id
            JOIN users recipient ON recipient.id = m.recipient_id
            WHERE
                (m.sender_id = ? AND m.recipient_id = ?) OR
                (m.sender_id = ? AND m.recipient_id = ?) ORDER BY m.created_at ASC
            LIMIT 300
        `).all(
            user.id,
            other.id,
            other.id,
            user.id
        );

res.json(messages);
        return;
}

const conversations = db.prepare(`
        SELECT
            u.id,
            u.handle,
            u.display_name,
            u.bio,
            u.location,
            last_message.text AS latest_message,
            last_message.created_at AS latest_message_at,
            COALESCE(unread.unread_count, 0) AS unread_count
        FROM users u

JOIN (
            SELECT
                CASE
                    WHEN sender_id = @userId THEN recipient_id
                    ELSE sender_id
                END AS other_user_id,
                MAX(id) AS latest_id
            FROM messages
            WHERE
                sender_id = @userId
                OR recipient_id = @userId
            GROUP BY other_user_id
        ) latest
            ON latest.other_user_id = u.id

JOIN messages last_message
            ON last_message.id = latest.latest_id

LEFT JOIN (
            SELECT
                sender_id,
                COUNT(*) AS unread_count
            FROM messages
            WHERE
                recipient_id = @userId
                AND read_at IS NULL
            GROUP BY sender_id
        ) unread
            ON unread.sender_id = u.id

ORDER BY last_message.created_at DESC
    `).all({
        userId: user.id
    });

res.json(conversations);
});

app.post("/api/messages", requireUser, (req, res) => {
    const sender = req.user;
    const recipient = getUser(req.body.to, false);

const text = cleanText(req.body.text, 900);

if (!recipient) {
        res.status(404).json({
            error: "That person isn't registered here." });
        return;
}

if (!text) {
        res.status(400).json({
            error: "A message needs some text." });
        return;
}

const result = db.prepare(`
        INSERT INTO messages (
            sender_id,
            recipient_id,
            text,
            created_at
        )
        VALUES (?, ?, ?, ?) `).run(
        sender.id,
        recipient.id,
        text,
        now()
    );

const message = db.prepare(`
        SELECT
            m.id,
            m.text,
            m.created_at,
            m.sender_id,
            m.recipient_id,
            sender.handle AS sender,
            sender.display_name AS sender_name,
            recipient.handle AS recipient,
            recipient.display_name AS recipient_name
        FROM messages m
        JOIN users sender ON sender.id = m.sender_id
        JOIN users recipient ON recipient.id = m.recipient_id
        WHERE m.id = ? `).get(result.lastInsertRowid);

res.status(201).json(message);
});

app.get("/api/stats", (req, res) => {
    const posts = db.prepare(`SELECT COUNT(*) AS count FROM posts`).get().count;
    const messages = db.prepare(`SELECT COUNT(*) AS count FROM messages`).get().count;
    const comments = db.prepare(`SELECT COUNT(*) AS count FROM comments`).get().count;
    const people = db.prepare(`SELECT COUNT(*) AS count FROM users`).get().count;
    const totalLikes = db.prepare(`SELECT COALESCE(SUM(likes), 0) AS count FROM posts`).get().count;

res.json({
        posts,
        messages,
        comments,
        people,
        totalLikes
    });
});

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        res.status(400).json({
            error: `Image upload failed: ${error.message}`
        });
        return;
    }

if (error) {
        console.error(error);
        res.status(error.status || 500).json({
            error: error.message
        });
        return;
    }

next();
});

app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
        next();
        return;
    }

    res.status(404).sendFile(path.join(staticDir, "404.html"));
});

app.listen(port, () => {
    console.log(`Harvest running at http://localhost:${port}`);
});