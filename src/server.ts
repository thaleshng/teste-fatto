import express from "express";
import { PrismaClient } from "@prisma/client";

const port = 3000;
const app = express();
const prisma = new PrismaClient();

app.get("/", async (req, res) => {
    const tasks = await prisma.Tarefas.findMany();

    res.json(tasks);
});

app.listen(port, () => {
    console.log(`O servidor está em execução em http://localhost:${port}`);
});
