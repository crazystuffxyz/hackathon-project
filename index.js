import express from "express";
const app = express();
app.use((req, res) => {
    res.send("Nothing here yet");
})
app.listen(8080, (port) => {
    console.log(`Does http://localhost${port} even work?`);
})