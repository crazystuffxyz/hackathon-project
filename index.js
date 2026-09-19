import express from "express";
const app = express();
app.use((req, res) => {
    res.send("Nothing here yet");
})
//Im stupid
process.env.port = 8080;
app.listen(process.env.port, () => {
    console.log(`Does http://localhost${process.env.port} even work?`);
})