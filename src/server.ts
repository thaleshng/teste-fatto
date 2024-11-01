import express from "express";

const port = 3000;
const app = express();

app.get("/", (req, res) => {
    res.send("Lista de Tarefas");
});

app.listen(port, () => {
    console.log(`O servidor está em execução em http://localhost:${port}`);
});
