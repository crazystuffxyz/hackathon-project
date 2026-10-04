import Database from "better-sqlite3";
const db = new Database(":memory:");
db.exec(`CREATE TABLE posts(id INTEGER PRIMARY KEY, author_id INT, category TEXT, created_at INT, likes INT, rating INT DEFAULT 3, text TEXT);
CREATE TABLE users(id INTEGER PRIMARY KEY, handle TEXT, display_name TEXT, location TEXT);
CREATE TABLE likes(post_id INT, user_id INT);
CREATE TABLE saves(post_id INT, user_id INT);`);
db.prepare(`INSERT INTO users VALUES (1,'mira','M','L')`).run();
db.prepare(`INSERT INTO posts VALUES (1,1,'found',1,5,5,'hi')`).run();

function run(query) {
    let order = "p.created_at DESC";
    if (query.sort === "popular") order = "p.likes DESC, p.created_at DESC";
    else if (query.sort === "rating") order = "p.rating DESC, p.created_at DESC";
    let filterSql = "";
    const params = { userId: 1 };
    if (query.category && query.category !== "all") { filterSql += " AND p.category = @category"; params.category = query.category; }
    if (query.author) { filterSql += " AND u.handle = @author"; params.author = query.author; }
    const sql = `SELECT p.id FROM posts p JOIN users u ON u.id = p.author_id WHERE 1=1 ${filterSql} ORDER BY ${order} LIMIT 100`;
    try { return "OK rows=" + JSON.stringify(db.prepare(sql).all(params)); }
    catch (e) { return "THROW " + e.constructor.name + ": " + e.message; }
}

const evil = str => ({ toString: () => str });
const cases = [
    ["1 normal", { sort: "popular", category: "found", author: "mira" }],
    ["2 sqli category quote", { category: "found' OR '1'='1" }],
    ["3 sqli stacked", { category: "x'; DROP TABLE posts;--" }],
    ["4 sqli author", { author: "mira' OR 1=1 --" }],
    ["5 array category", { category: ["found", "made"] }],
    ["6 array author", { author: ["a", "b"] }],
    ["7 nested object category", { category: { a: 1 } }],
    ["8 bogus sort string", { sort: "rating; DROP TABLE posts" }],
    ["9 sort object toString", { sort: evil("rating") }],
    ["10 sort nested", { sort: { a: 1 } }],
    ["11 nothing", {}],
    ["12 category array-len-1", { category: ["found"] }],
    ["13 prototype key", Object.create({ category: "found" })],
    ["14 rating NaN path", { sort: "rating" }]
];
for (const [name, q] of cases) console.log(name.padEnd(26), "->", run(q));
console.log("posts table still there:", db.prepare(`SELECT COUNT(*) c FROM posts`).get());
