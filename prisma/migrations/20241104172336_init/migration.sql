-- CreateTable
CREATE TABLE "tarefas" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "custo" DECIMAL(10,2) NOT NULL,
    "data_limite" DATE NOT NULL,
    "ordem_apresentacao" INTEGER NOT NULL,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tarefas_nome_key" ON "tarefas"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "tarefas_ordem_apresentacao_key" ON "tarefas"("ordem_apresentacao");
