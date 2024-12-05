const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const { OpenAIApi } = require("openai");
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Configuração da API OpenAI
const openai = new OpenAIApi({
  apiKey: process.env.OPENAI_API_KEY || "SUA_API_KEY_AQUI", // Use variável de ambiente ou insira sua chave
});

// Configuração do banco de dados SQLite
const db = new sqlite3.Database("./server/database.sqlite");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      customerReport TEXT,
      priority TEXT,
      system TEXT,
      module TEXT,
      version TEXT,
      requesterName TEXT,
      contactPhone TEXT,
      technicalDescription TEXT
    )
  `, (err) => {
    if (err) console.error("Erro ao criar tabela no banco de dados:", err.message);
  });
});

// Rota para gerar descrições automáticas com OpenAI
app.post("/generate-description", async (req, res) => {
  const { customerReport } = req.body;

  if (!customerReport) {
    return res.status(400).json({ error: "Relato do cliente é obrigatório." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente que ajuda a criar chamados técnicos detalhados com base nos relatos dos clientes.",
        },
        {
          role: "user",
          content: `Baseado no seguinte relato: "${customerReport}". Gere:
            - Título do chamado
            - Descrição técnica
            - Sugestão de prioridade (P0, P1, P2, etc.)`,
        },
      ],
      max_tokens: 200,
    });

    const responseText = completion.choices?.[0]?.message?.content?.trim();
    if (!responseText) {
      throw new Error("A resposta da OpenAI está vazia.");
    }

    const [title, technicalDescription, priority] = responseText
      .split("\n")
      .map((line) => line.split(": ")[1]);

    res.json({ title, technicalDescription, priority });
  } catch (error) {
    console.error("Erro ao chamar a API da OpenAI:", error.message);
    res.status(500).json({ error: "Erro ao gerar descrição automática." });
  }
});

// Rota para criar chamado
app.post("/tickets", (req, res) => {
  const {
    title,
    customerReport,
    priority,
    requesterName,
    contactPhone,
    technicalDescription,
  } = req.body;

  if (!title || !customerReport || !priority || !requesterName || !contactPhone) {
    return res
      .status(400)
      .json({ error: "Os campos obrigatórios não foram preenchidos." });
  }

  const query = `
    INSERT INTO tickets (title, customerReport, priority, requesterName, contactPhone, technicalDescription)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [
      title,
      customerReport,
      priority,
      requesterName,
      contactPhone,
      technicalDescription,
    ],
    function (err) {
      if (err) {
        console.error("Erro ao salvar chamado no banco de dados:", err.message);
        res.status(500).json({ success: false, error: "Erro ao salvar chamado." });
      } else {
        res.json({ success: true, id: this.lastID });
      }
    }
  );
});

// Rota para listar chamados
app.get("/tickets", (req, res) => {
  db.all("SELECT * FROM tickets ORDER BY id DESC", (err, rows) => {
    if (err) {
      console.error("Erro ao buscar chamados:", err.message);
      res.status(500).json([]);
    } else {
      res.json(rows);
    }
  });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
