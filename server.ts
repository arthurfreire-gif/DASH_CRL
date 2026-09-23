import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// API health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Gemini AI Insights endpoint for consultant ROI and expense optimization
app.post("/api/ai-insights", async (req, res) => {
  try {
    const { consultants, expenses, visits, filterSummary } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY não configurada. Configure a chave nas configurações do ambiente." 
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Você é um CFO sênior e Diretor de Operações Comerciais especialista em Gestão de Relacionamento com Clientes, Análise de ROI Comercial e Otimização de Orçamento de Despesas.
Analise os seguintes dados consolidados da equipe de consultores de relacionamento:

Resumo do Período/Filtro: ${JSON.stringify(filterSummary)}
Consultores: ${JSON.stringify(consultants)}
Despesas/Investimentos: ${JSON.stringify(expenses)}
Visitas e Retornos Financeiros: ${JSON.stringify(visits)}

Forneça uma análise executiva estruturada e profissional em português do Brasil, contendo:
1. **Diagnóstico Geral de Eficiência e ROI**: Avalie a relação entre o investimento total (despesas) e o retorno financeiro gerado pelas visitas.
2. **Destaques por Consultor**: Identifique quais consultores estão gerando o melhor ROI (retorno vs gasto) e quais apresentam despesas elevadas com baixa conversão.
3. **Análise de Categorias de Despesa**: Avalie quais tipos de despesa (ex: Viagens, Hospedagem, Jantares de Negócio, Eventos) parecem trazer maior retorno em conversão.
4. **Recomendações Práticas e Estratégicas**: 3 a 4 ações tangíveis para otimizar o orçamento de visitas, melhorar taxas de conversão e maximizar a receita futura.

Responda em formato JSON estruturado com os campos:
- "executiveSummary": string com visão geral perspicaz,
- "topPerformers": array de objetos { name: string, reason: string },
- "areasForImprovement": array de objetos { name: string, issue: string, recommendation: string },
- "budgetRecommendations": array de strings com dicas práticas de alocação de orçamento.
Certifique-se de que o retorno seja um JSON válido ou texto formatado em Markdown se preferir, mas retorne um JSON contendo o texto analítico.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const resultText = response.text;
    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText || "{}");
    } catch {
      parsedResult = { rawText: resultText };
    }

    res.json({ success: true, insights: parsedResult });
  } catch (error: any) {
    console.error("Erro ao gerar insights com Gemini:", error);
    res.status(500).json({ error: error.message || "Erro interno ao processar IA" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
