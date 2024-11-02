import express from "express";
import { PrismaClient } from "@prisma/client";

const port = 3000;
const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get("/tarefas", async (_, res) => {
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

app.post("/tarefas", async (req, res) => {
    const { nome, custo, data_limite } = req.body;

    if (!nome || custo === undefined || !data_limite) {
        return res.status(400).json({
            message:
                "Todos os campos (nome, custo, data_limite) são obrigatórios.",
        });
    }

    const parsedCusto = parseFloat(custo);
    if (isNaN(parsedCusto)) {
        return res.status(400).json({
            message: "O campo 'custo' deve ser um número válido.",
        });
    }

    try {
        const existingTask = await prisma.Tarefas.findFirst({
            where: {
                nome: {
                    equals: nome,
                    mode: "insensitive",
                },
            },
        });

        if (existingTask) {
            return res.status(409).json({
                message: "Já existe uma tarefa cadastrada com esse nome.",
            });
        }

        const maxOrder = await prisma.Tarefas.aggregate({
            _max: { ordem_apresentacao: true },
        });

        const ordem_apresentacao = (maxOrder._max.ordem_apresentacao || 0) + 1;

        const newTask = await prisma.Tarefas.create({
            data: {
                nome,
                custo: parsedCusto,
                data_limite: new Date(data_limite),
                ordem_apresentacao,
            },
        });

        res.status(201).json(newTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Falha ao criar uma nova tarefa." });
    }
});

app.listen(port, () => {
    console.log(`O servidor está em execução em http://localhost:${port}`);
});
