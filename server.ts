import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { generateLocalStrategyPlan } from './src/services/aiStrategyService';
import { generateLocalCargoForecast } from './src/services/aiForecastService';
import { generateDatabaseIndexDDL, RECOMMENDED_DB_INDEXES } from './src/lib/dbPerformanceIndexes';

// In-memory sliding window rate limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStores: {
  general: Map<string, RateLimitRecord>;
  ai: Map<string, RateLimitRecord>;
} = {
  general: new Map(),
  ai: new Map(),
};

// Cleanup expired rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of rateLimitStores.general.entries()) {
    if (rec.resetAt <= now) rateLimitStores.general.delete(ip);
  }
  for (const [ip, rec] of rateLimitStores.ai.entries()) {
    if (rec.resetAt <= now) rateLimitStores.ai.delete(ip);
  }
}, 60000);

function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  store: Map<string, RateLimitRecord>;
  endpointName: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Extract IP with proxy awareness
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' 
      ? forwarded.split(',')[0].trim() 
      : (req.socket.remoteAddress || req.ip || '127.0.0.1');

    const now = Date.now();
    let record = options.store.get(ip);

    if (!record || record.resetAt <= now) {
      record = {
        count: 1,
        resetAt: now + options.windowMs,
      };
      options.store.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, options.maxRequests - record.count);
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', options.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000).toString());

    if (record.count > options.maxRequests) {
      res.setHeader('Retry-After', retryAfterSec.toString());
      console.warn(`[RateLimit] Bloqueio de IP: ${ip} excedeu limite em ${options.endpointName} (${record.count}/${options.maxRequests})`);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Limite de requisições excedido para o IP ${ip}. Aguarde ${retryAfterSec}s para tentar novamente.`,
        endpoint: options.endpointName,
        limitPerMinute: options.maxRequests,
        retryAfter: retryAfterSec,
      });
    }

    next();
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Rate Limiting Middlewares:
  // 1. General endpoints: 120 req/minute
  const generalRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 120,
    store: rateLimitStores.general,
    endpointName: 'General API',
  });

  // 2. AI endpoints: 30 req/minute (stricter limit to protect costs and quotas)
  const aiRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    store: rateLimitStores.ai,
    endpointName: 'AI Intelligence Services',
  });

  app.use(express.json({ limit: '10mb' }));

  // Apply general rate limit to all /api/ routes
  app.use('/api', generalRateLimit);

  // Shared Gemini client instance (Lazy initialization with validation)
  let aiClient: GoogleGenAI | null = null;
  function getGeminiAI(): GoogleGenAI | null {
    const key = process.env.GEMINI_API_KEY;
    if (!key || typeof key !== 'string' || key.trim() === '' || key === 'undefined' || key.includes('placeholder')) {
      return null;
    }
    if (!aiClient) {
      aiClient = new GoogleGenAI({
        apiKey: key.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return aiClient;
  }

  // API Health Check & Elasticity Telemetry
  app.get('/api/health', (req, res) => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
    res.json({
      status: 'ok',
      service: 'Torre de Comando Volumosos',
      timestamp: new Date().toISOString(),
      hasGeminiKey: hasKey,
      rateLimit: {
        generalPerMin: 120,
        aiPerMin: 30,
      },
    });
  });

  // Database Indexes and DDL Generation for 80/20 performance
  app.get('/api/db-indexes', (req, res) => {
    res.json({
      indexes: RECOMMENDED_DB_INDEXES,
      ddlScript: generateDatabaseIndexDDL(),
    });
  });

  // POST /api/ai/strategy - Planejamento Estratégico Inteligente com Gemini (Protected by AI Rate Limiter)
  app.post('/api/ai/strategy', aiRateLimit, async (req, res) => {
    try {
      const payload = req.body || {};
      const { setores = [], colaboradores = [], operations = [], planoCarregamento = [] } = payload;

      // Base heuristic plan calculated mathematically
      const baselinePlan = generateLocalStrategyPlan({
        setores,
        colaboradores,
        operations,
        planoCarregamento,
      });

      const ai = getGeminiAI();

      if (!ai) {
        // Return computed deterministic plan immediately when key is not configured
        return res.json({
          strategy: baselinePlan,
          source: 'local_deterministic_engine',
        });
      }

      // Prompt Gemini for deep operational reasoning
      const systemPrompt = `Você é o Diretor de Operações e Estrategista Chefe de Inteligência Artificial da "Torre de Comando Volumosos".
Seu objetivo é analisar os dados operacionais em tempo real e prescrever a estratégia ótima de:
1. SOLTURA (o que e quando liberar)
2. COLETA (separação por lote/onda, e se a estratégia deve ser "COLETA FOCADA EM LOJAS PRIORITÁRIAS" ou "COLETA TOTAL CONTÍNUA")
3. CARGA (sincronização com as docas)
4. EXPEDIÇÃO (monitoramento de tolerância e cortes)

Regras de Negócio e Promessas de Entrega (SLA):
- D+2: Ideal / Melhor cenário para coleta (antecipação confortável, zero risco)
- D+1: Normal / Janela segura
- D-0: Dia Atual / Janela estrita (carregamento nas próximas horas)
- D-1: Atenção / Risco moderado de atraso
- D-2: Pior cenário / Crítico / Risco iminente de ruptura ou retenção de carreta

Decisão Central:
- "PRIORIDADE_LOJAS": Quando a demanda horária supera a capacidade ou há acúmulo de D-1/D-2 e cortes iminentes.
- "COLETA_TOTAL": Quando a capacidade do armazém e o efetivo conseguem absorver o fluxo em massa sem gerar gargalo.

Balanceamento de Efetivo:
- Analisar a Atividade Total de cada Setor (S87, S88, S89, S90), efetivo atual de colaboradores, UPH e horas necessárias.
- Recomendar transferências pontuais de operadores de setores folgados para setores sobrecarregados.

Retorne SEMPRE a resposta estritamente no formato JSON válido correspondente ao objeto de estratégia.`;

      const userContent = `Dados Operacionais de Hoje:
- Setores Cadastrados: ${JSON.stringify(setores.map((s: { id: string | number; numero: string | number; nome: string; ativ: number; uph: number; meta: number }) => ({
        id: s.numero || s.id,
        nome: s.nome,
        volumeAtividade: s.ativ,
        uphAtual: s.uph,
        metaUPH: s.meta
      })))}
- Total de Colaboradores na Escala: ${colaboradores.length}
- Total de Lojas em Execução no Radar: ${operations.length}
- Amostra de Lojas / Janelas de Corte: ${JSON.stringify(operations.slice(0, 10).map((op: { lojaId: string; nomeLoja: string; setor: string; corte: string; carregamento: string; statusColeta: string; statusExpedicao: string }) => ({
        loja: op.lojaId,
        nome: op.nomeLoja,
        setor: op.setor,
        corte: op.corte,
        carregamento: op.carregamento,
        coleta: op.statusColeta,
        expedicao: op.statusExpedicao
      })))}
- Distribuição Base de Promessas: ${JSON.stringify(baselinePlan.promessas)}
- Proposta de Balanceamento Preliminar: ${JSON.stringify(baselinePlan.balanceamento)}

Gere um diagnóstico operacional executivo aprofundado, refinando o título, diagnóstico geral, plano das 4 etapas e justificativas de balanceamento de equipe.`;

      try {
        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: userContent,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const text = aiResponse.text;
        if (text) {
          try {
            const parsed = JSON.parse(text);
            // Merge AI insights with mathematical baseline guarantees
            const finalStrategy = {
              ...baselinePlan,
              ...parsed,
              promessas: {
                ...baselinePlan.promessas,
                ...(parsed.promessas || {}),
              },
              balanceamento: {
                ...baselinePlan.balanceamento,
                ...(parsed.balanceamento || {}),
              },
              plano4Etapas: {
                ...baselinePlan.plano4Etapas,
                ...(parsed.plano4Etapas || {}),
              },
            };
            return res.json({
              strategy: finalStrategy,
              source: 'gemini_3.7_flash',
            });
          } catch {
            // JSON parse fallback
          }
        }
      } catch (geminiError: unknown) {
        // Log clean info if API key is invalid or request is unauthorized
        console.info('[server.ts] Gemini API key unauthenticated or unavailable, providing mathematical deterministic strategy plan.');
      }

      return res.json({
        strategy: baselinePlan,
        source: 'local_engine_fallback',
      });
    } catch {
      const baselinePlan = generateLocalStrategyPlan(req.body || {});
      return res.json({
        strategy: baselinePlan,
        source: 'local_engine_fallback_error',
      });
    }
  });

  // POST /api/ai/forecast - Previsão Preditiva de Volume de Carga (Soltura, Coleta, Carga, Expedição) com Gemini (Protected by AI Rate Limiter)
  app.post('/api/ai/forecast', aiRateLimit, async (req, res) => {
    try {
      const payload = req.body || {};
      const baselineForecast = generateLocalCargoForecast(payload);

      const ai = getGeminiAI();

      if (!ai) {
        return res.json({
          forecast: baselineForecast,
          source: 'local_deterministic_forecast',
        });
      }

      const systemPrompt = `Você é o Diretor de Inteligência Artificial e Planejamento Operacional da Torre de Comando de Volumosos em um Centro de Distribuição Logístico de Alta Performance.
Sua missão é realizar a previsão preditiva do volume de carga necessário para o dia seguinte, analisando detalhadamente as 4 etapas operacionais:
1. 'Soltura' (liberação e fracionamento sistêmico de ondas de pedidos/picking)
2. 'Coleta' (picking e separação física nos universos e corredores)
3. 'Carga' (consolidação, paletização e formação de pulmão de gaiolas)
4. 'Expedição' (conferência final, carregamento nas docas e despacho de caminhões)

Com base nas médias históricas fornecidas, calcule e refine:
- O volume total de carga previsto e intervalo de confiança (mínimo, esperado, máximo)
- Métricas, dimensionamento de headcount e UPH necessário para cada uma das 4 etapas
- Previsão de volume e taxa de ocupação por setor (S87, S88, S89, S90)
- Distribuição ideal de volume e foco operacional por turno (Turno 1, Turno 2, Turno 3)
- Recomendações executivas acionáveis, alertas de gargalos e plano de ação imediato

Retorne APENAS um objeto JSON válido (sem tags markdown nem explicações fora do JSON) com a estrutura:
{
  "totalCargoVolume": number,
  "confidenceInterval": {
    "min": number,
    "expected": number,
    "max": number,
    "confidenceScore": number
  },
  "stages": {
    "soltura": {
      "stage": "Soltura",
      "descricao": string,
      "historicalAvgVolume": number,
      "predictedVolume": number,
      "targetUPH": number,
      "requiredHeadcount": number,
      "estimatedHours": number,
      "status": "adequado" | "atencao" | "critico",
      "insights": string
    },
    "coleta": {
      "stage": "Coleta",
      "descricao": string,
      "historicalAvgVolume": number,
      "predictedVolume": number,
      "targetUPH": number,
      "requiredHeadcount": number,
      "estimatedHours": number,
      "status": "adequado" | "atencao" | "critico",
      "insights": string
    },
    "carga": {
      "stage": "Carga",
      "descricao": string,
      "historicalAvgVolume": number,
      "predictedVolume": number,
      "targetUPH": number,
      "requiredHeadcount": number,
      "estimatedHours": number,
      "status": "adequado" | "atencao" | "critico",
      "insights": string
    },
    "expedicao": {
      "stage": "Expedição",
      "descricao": string,
      "historicalAvgVolume": number,
      "predictedVolume": number,
      "targetUPH": number,
      "requiredHeadcount": number,
      "estimatedHours": number,
      "status": "adequado" | "atencao" | "critico",
      "insights": string
    }
  },
  "sectors": [
    {
      "setorId": string,
      "setorName": string,
      "volumePrevisto": number,
      "percentualTotal": number,
      "headcountSugerido": number,
      "uphAlvo": number,
      "capacidadeEstimada": number,
      "taxaOcupacao": number,
      "gargaloPotencial": boolean
    }
  ],
  "turnos": [
    {
      "turno": string,
      "volumePrevisto": number,
      "percentual": number,
      "operadoresSugeridos": number,
      "focoOperacional": string
    }
  ],
  "recomendacoesIA": {
    "resumoExecutivo": string,
    "estrategiaCarga": string,
    "alertasGargalos": string[],
    "planoAcao": string[]
  }
}`;

      const userContent = `Dados para Previsão Preditiva de Carga do Dia Seguinte:
Data Alvo: ${baselineForecast.targetDate} (${baselineForecast.dayOfWeek})
Médias Históricas:
- Registros analisados: ${baselineForecast.historicalAverages.totalRecordsAnalyzed}
- Média Diária Total: ${baselineForecast.historicalAverages.avgDailyVolume} caixas
- Média Histórica Soltura: ${baselineForecast.historicalAverages.avgSoltura} caixas
- Média Histórica Coleta: ${baselineForecast.historicalAverages.avgColeta} caixas
- Média Histórica Carga: ${baselineForecast.historicalAverages.avgCarga} caixas
- Média Histórica Expedição: ${baselineForecast.historicalAverages.avgExpedicao} caixas
- UPH Médio Histórico: ${baselineForecast.historicalAverages.avgUPH} caixas/hora
- SLA Médio Histórico: ${baselineForecast.historicalAverages.avgSLA}%

Linha de Base Calculada:
- Volume Total Previsto: ${baselineForecast.totalCargoVolume} caixas (Min: ${baselineForecast.confidenceInterval.min}, Max: ${baselineForecast.confidenceInterval.max})
- Variação vs Média: ${baselineForecast.historicalAverages.growthVsAvg}%
- Setores Atuais: ${JSON.stringify(baselineForecast.sectors.map(s => ({ id: s.setorId, vol: s.volumePrevisto, cap: s.capacidadeEstimada })))}

Gere a previsão refinada e as recomendações táticas da IA Gemini para garantir 100% de pontualidade no despacho de carga do dia seguinte.`;

      try {
        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: userContent,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.25,
          },
        });

        const text = aiResponse.text;
        if (text) {
          try {
            const parsed = JSON.parse(text);
            const finalForecast = {
              ...baselineForecast,
              ...parsed,
              stages: {
                ...baselineForecast.stages,
                ...(parsed.stages || {}),
              },
              confidenceInterval: {
                ...baselineForecast.confidenceInterval,
                ...(parsed.confidenceInterval || {}),
              },
              recomendacoesIA: {
                ...baselineForecast.recomendacoesIA,
                ...(parsed.recomendacoesIA || {}),
              },
            };
            return res.json({
              forecast: finalForecast,
              source: 'gemini_3.7_flash',
            });
          } catch {
            // JSON parse fallback
          }
        }
      } catch (geminiError: unknown) {
        console.info('[server.ts] Gemini forecast unauthenticated or unavailable, providing mathematical deterministic forecast.');
      }

      return res.json({
        forecast: baselineForecast,
        source: 'local_deterministic_forecast',
      });
    } catch {
      const baselineForecast = generateLocalCargoForecast(req.body || {});
      return res.json({
        forecast: baselineForecast,
        source: 'local_deterministic_forecast_error',
      });
    }
  });

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1d',
      etag: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=600');
        }
      }
    }));
    // Express v5 syntax:
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Torre de Comando Volumosos Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
