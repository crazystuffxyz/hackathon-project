import express from "express";
const app = express();
app.set("trust proxy", 1);
app.get("/q", (req, res) => {
    res.json({
        parser: app.get("query parser"),
        query: req.query,
        categoryType: typeof req.query.category,
        categoryIsArray: Array.isArray(req.query.category),
        ip: req.ip,
        secure: req.secure
    });
});
const s = app.listen(0, async () => {
    const port = s.address().port;
    const base = `http://127.0.0.1:${port}`;
    const urls = [
        "/q?category=found",
        "/q?category=found&category=made",
        "/q?category%5B%5D=found",
        "/q?category%5Ba%5D=1",
        "/q?category[x]=1",
        "/q?category[toString]=x"
    ];
    for (const u of urls) {
        const r = await fetch(base + u);
        console.log(u.padEnd(34), JSON.stringify(await r.json()));
    }
    const r2 = await fetch(base + "/q", { headers: { "X-Forwarded-For": "9.9.9.9", "X-Forwarded-Proto": "https" } });
    console.log("spoofed XFF:".padEnd(34), JSON.stringify(await r2.json()));
    s.close();
});
