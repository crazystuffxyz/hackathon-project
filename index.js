import express from "express";
import {join} from "node:path";
const app = express();
const __dirname = import.meta.dirname;

app.use(express.static(join(__dirname, "static")));
app.use((req, res) => {
    res.sendFile(join(__dirname, "static/404.html"));
})
//Im stupid
process.env.port = 8080;
app.listen(process.env.port, () => {
    console.log(`Does http://localhost:${process.env.port} even work?`);
})