import express from "express";
import { PrismaClient } from "@prisma/client";

const port = 3000;
const app = express();
const prisma = new PrismaClient();

app.get("/", async (req, res) => {
    try {
        const tasks = await prisma.Tarefas.findMany({
            orderBy: {
                ordem_apresentacao: "asc",
            },
        });

        res.json(tasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao listar as tarefas." });
    }
});

app.listen(port, () => {
    console.log(`O servidor está em execução em http://localhost:${port}`);
});
