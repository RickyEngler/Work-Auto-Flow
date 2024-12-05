const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const { Configuration, OpenAIApi } = require("openai");
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Configuração da API OpenAI
const openai = new OpenAIApi(
  new Configuration({
    apiKey: "SUA_API_KEY_AQUI", // Substitua pela sua chave da OpenAI
  })
);

// Configuração do banco de dados
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
  `);
});

// Rota para gerar descrições automáticas
app.post("/generate-description", async (req, res) => {
  const { customerReport } = req.body;

  try {
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `
        Baseado no seguinte relato:
        "${customerReport}"
        Gere:
        - Título do chamado
        - Descrição técnica
        - Sugestão de prioridade (P0, P1, etc.)
      `,
      max_tokens: 200,
    });

    const responseText = completion.data.choices[0].text.trim();
    const [title, technicalDescription, priority] = responseText
      .split("\n")
      .map((line) => line.split(": ")[1]);

    res.json({ title, technicalDescription, priority });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao gerar descrição." });
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
        console.error(err);
        res.status(500).json({ success: false });
      } else {
        res.json({ success: true, id: this.lastID });
      }
    }
  );
});

// Rota para listar chamados
app.get("/tickets", (req, res) => {
  db.all("SELECT * FROM tickets", (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).json([]);
    } else {
      res.json(rows);
    }
  });
});

// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
