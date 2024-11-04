import express from "express";
import { PrismaClient } from "@prisma/client";

import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json";

const port = 3000;
const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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

app.delete("/tarefas/:id", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const task = await prisma.Tarefas.findUnique({
            where: {
                id,
            },
        });

        if (!task) {
            return res.status(404).json({ message: "Tarefa não encontrada." });
        }

        await prisma.Tarefas.delete({
            where: {
                id,
            },
        });

        res.status(200).json({ message: "Tarefa excluída com sucesso." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Houve um erro ao excluir a tarefa." });
    }
});

app.put("/tarefas/reordenar", async (req, res) => {
    const { tarefas } = req.body;

    if (!Array.isArray(tarefas)) {
        return res
            .status(400)
            .json({ message: "O campo 'tarefas' deve ser uma lista." });
    }

    try {
        await prisma.$transaction(
            tarefas.map((tarefa) =>
                prisma.Tarefas.update({
                    where: { id: tarefa.id },
                    data: { ordem_apresentacao: tarefa.id * 1000 },
                }),
            ),
        );

        await prisma.$transaction(
            tarefas.map((tarefa, index) =>
                prisma.Tarefas.update({
                    where: { id: tarefa.id },
                    data: { ordem_apresentacao: index + 1 },
                }),
            ),
        );

        res.status(200).json({ message: "Lista reordenada com sucesso." });
    } catch (error) {
        console.error("Erro ao reordenar tarefas:", error);
        res.status(500).json({ message: "Erro ao reordenar tarefas." });
    }
});

app.put("/tarefas/:id", async (req, res) => {
    const id = Number(req.params.id);
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
        const task = await prisma.Tarefas.findUnique({
            where: {
                id,
            },
        });

        if (!task) {
            return res.status(404).json({ message: "Tarefa não encontrada." });
        }

        const duplicateTask = await prisma.Tarefas.findFirst({
            where: {
                nome: {
                    equals: nome,
                    mode: "insensitive",
                },
                id: {
                    not: id,
                },
            },
        });

        if (duplicateTask) {
            return res
                .status(409)
                .json({ message: "Já existe uma tarefa com esse nome." });
        }

        const updateTask = await prisma.Tarefas.update({
            where: { id },
            data: {
                nome,
                custo: parsedCusto,
                data_limite: new Date(data_limite),
            },
        });

        res.status(200).json(updateTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Houve um erro ao editar a tarefa." });
    }
});

app.post("/tarefas/:id/mover-cima", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const currentTask = await prisma.Tarefas.findUnique({
            where: { id },
        });

        if (!currentTask) {
            return res.status(404).json({ message: "Tarefa não encontrada." });
        }

        const taskAbove = await prisma.Tarefas.findFirst({
            where: {
                ordem_apresentacao: {
                    lt: currentTask.ordem_apresentacao,
                },
            },

            orderBy: {
                ordem_apresentacao: "desc",
            },
        });

        if (!taskAbove) {
            return res
                .status(400)
                .json({ message: "A tarefa já está no topo da lista." });
        }

        const temporaryOrder = currentTask.ordem_apresentacao + 1000;

        await prisma.$transaction([
            prisma.Tarefas.update({
                where: { id: currentTask.id },
                data: { ordem_apresentacao: temporaryOrder },
            }),
            prisma.Tarefas.update({
                where: { id: taskAbove.id },
                data: { ordem_apresentacao: currentTask.ordem_apresentacao },
            }),
            prisma.Tarefas.update({
                where: { id: currentTask.id },
                data: { ordem_apresentacao: taskAbove.ordem_apresentacao },
            }),
        ]);

        res.status(200).json({
            message: "Tarefa movida para cima com sucesso.",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Houve um erro ao mover a tarefa pra cima.",
        });
    }
});

app.post("/tarefas/:id/mover-baixo", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const currentTask = await prisma.Tarefas.findUnique({
            where: { id },
        });

        if (!currentTask) {
            return res.status(404).json({ message: "Tarefa não encontrada." });
        }

        const taskBelow = await prisma.Tarefas.findFirst({
            where: {
                ordem_apresentacao: {
                    gt: currentTask.ordem_apresentacao,
                },
            },
            orderBy: {
                ordem_apresentacao: "asc",
            },
        });

        if (!taskBelow) {
            return res
                .status(400)
                .json({ message: "A tarefa já está na última posição." });
        }

        const temporaryOrder = currentTask.ordem_apresentacao + 1000;

        await prisma.$transaction([
            prisma.Tarefas.update({
                where: { id: currentTask.id },
                data: { ordem_apresentacao: temporaryOrder },
            }),
            prisma.Tarefas.update({
                where: { id: taskBelow.id },
                data: { ordem_apresentacao: currentTask.ordem_apresentacao },
            }),
            prisma.Tarefas.update({
                where: { id: currentTask.id },
                data: { ordem_apresentacao: taskBelow.ordem_apresentacao },
            }),
        ]);

        res.status(200).json({
            message: "Tarefa movida para baixo com sucesso",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Houve um erro ao mover a tarefa para baixo.",
        });
    }
});

app.listen(port, () => {
    console.log(`O servidor está em execução em http://localhost:${port}`);
});
