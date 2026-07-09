import express, { Request, Response, NextFunction } from "express";
import path from "path";
import * as dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { setores, escalaSemanal, lideranca, overrideOperacional, historico, historicoConsolidado } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import cors from "cors";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Attempt to load project ID fallback from firebase-applet-config.json
let fbProjectIdFallback = "";
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    fbProjectIdFallback = configData.projectId || "";
  }
} catch (err) {
  console.warn("Failed to read firebase-applet-config.json in server.ts:", err);
}

// Initialize Firebase Admin using environment variables or fallback config
if (!getApps().length) {
  initializeApp({
    projectId: fbProjectIdFallback || process.env.VITE_FIREBASE_PROJECT_ID,
  });
}

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

// Memory-based fallback store (used if SQL_HOST is not defined, or if DB queries fail)
let sectorsMem = [
  {
    id: 1,
    numero: 87,
    tipo: "Caixas",
    responsavel: "CARLOS OLIVEIRA",
    atividade: 120,
    unidade: "CAIXAS",
    promessa: "150",
    uph: 80,
    bsi: "98.5",
    erros: "2.1",
    seguranca: false,
    varFin: "1540.2",
    nota5s: "100.0",
    reproTotal: 151,
    horasDkt: "14.4",
    poliRec: 10,
    rdl: 2,
    poliSaid: 8,
    coletado: 7920,
    atualizadoEm: new Date()
  },
  {
    id: 2,
    numero: 88,
    tipo: "Colis",
    responsavel: "ANA PAULA",
    atividade: 95,
    unidade: "COLIS",
    promessa: "120",
    uph: 75,
    bsi: "97.0",
    erros: "1.5",
    seguranca: false,
    varFin: "430.5",
    nota5s: "95.0",
    reproTotal: 127,
    horasDkt: "14.4",
    poliRec: 8,
    rdl: 1,
    poliSaid: 6,
    coletado: 6480,
    atualizadoEm: new Date()
  },
  {
    id: 3,
    numero: 89,
    tipo: "Colis",
    responsavel: "MARCOS SOUZA",
    atividade: 110,
    unidade: "COLIS",
    promessa: "100",
    uph: 90,
    bsi: "99.0",
    erros: "0.8",
    seguranca: false,
    varFin: "-120.0",
    nota5s: "98.0",
    reproTotal: 98,
    horasDkt: "7.2",
    poliRec: 5,
    rdl: 0,
    poliSaid: 5,
    coletado: 2160,
    atualizadoEm: new Date()
  },
  {
    id: 4,
    numero: 90,
    tipo: "Caixas",
    responsavel: "JULIANA LIMA",
    atividade: 130,
    unidade: "CAIXAS",
    promessa: "135",
    uph: 85,
    bsi: "96.5",
    erros: "3.2",
    seguranca: true,
    varFin: "85.0",
    nota5s: "92.0",
    reproTotal: 99,
    horasDkt: "7.2",
    poliRec: 12,
    rdl: 3,
    poliSaid: 10,
    coletado: 3240,
    atualizadoEm: new Date()
  }
];

let escalaSemanalMem = [
  { id: 1, dia: "SEGUNDA-FEIRA", referenteSb7: "Referente A", referenteVolumosos: "Volumosos A", apoio: "Apoio A", atualizadoEm: new Date() },
  { id: 2, dia: "TERÇA-FEIRA", referenteSb7: "Referente B", referenteVolumosos: "Volumosos B", apoio: "Apoio B", atualizadoEm: new Date() },
  { id: 3, dia: "QUARTA-FEIRA", referenteSb7: "Referente C", referenteVolumosos: "Volumosos C", apoio: "Apoio C", atualizadoEm: new Date() },
  { id: 4, dia: "QUINTA-FEIRA", referenteSb7: "Referente D", referenteVolumosos: "Volumosos D", apoio: "Apoio D", atualizadoEm: new Date() },
  { id: 5, dia: "SEXTA-FEIRA", referenteSb7: "Referente E", referenteVolumosos: "Volumosos E", apoio: "Apoio E", atualizadoEm: new Date() },
  { id: 6, dia: "SÁBADO", referenteSb7: "Referente F", referenteVolumosos: "Volumosos F", apoio: "Apoio F", atualizadoEm: new Date() },
  { id: 7, dia: "DOMINGO", referenteSb7: "Referente G", referenteVolumosos: "Volumosos G", apoio: "Apoio G", atualizadoEm: new Date() }
];

let liderancaMem = {
  id: 1,
  nome: "HELOISA GONGALVES DE SALES",
  foto: "",
  atualizadoEm: new Date()
};

let overrideOperacionalMem: any[] = [];
let auditLogsMem: any[] = [];
let historicoConsolidadoMem: any[] = [];

// Helper function to safely execute DB queries with memory fallback
async function runDbQuery<T>(
  queryFn: () => Promise<T> | T,
  fallbackFn: () => T | Promise<T>
): Promise<T> {
  if (!process.env.SQL_HOST) {
    const res = fallbackFn();
    return res instanceof Promise ? await res : res;
  }
  try {
    const res = queryFn();
    return res instanceof Promise ? await res : res;
  } catch (err) {
    console.warn("Database connection or query failed. Gracefully falling back to memory storage.", err);
    const res = fallbackFn();
    return res instanceof Promise ? await res : res;
  }
}

// Zod validation schemas
const sectorSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  numero: z.union([z.number(), z.string()]),
  tipo: z.string().optional(),
  responsavel: z.string().optional(),
  resp: z.string().optional(),
  atividade: z.union([z.number(), z.string()]).optional(),
  ativ: z.union([z.number(), z.string()]).optional(),
  unidade: z.string().optional(),
  promessa: z.union([z.number(), z.string()]).optional(),
  uph: z.union([z.number(), z.string()]).optional(),
  bsi: z.union([z.number(), z.string()]).optional(),
  erros: z.union([z.number(), z.string()]).optional(),
  errosPicking: z.union([z.number(), z.string()]).optional(),
  seguranca: z.boolean().optional(),
  infracaoSeguranca: z.boolean().optional(),
  varFin: z.union([z.number(), z.string()]).optional(),
  nota5s: z.union([z.number(), z.string()]).optional(),
  reproTotal: z.union([z.number(), z.string()]).optional(),
  horasDKT: z.union([z.number(), z.string()]).optional(),
  horasDkt: z.union([z.number(), z.string()]).optional(),
  poliRec: z.union([z.number(), z.string()]).optional(),
  rdl: z.union([z.number(), z.string()]).optional(),
  poliSaid: z.union([z.number(), z.string()]).optional(),
  coletado: z.union([z.number(), z.string()]).optional(),
});

const putSetoresSchema = z.array(sectorSchema);

const escalaItemSchema = z.object({
  dia: z.string(),
  ref87: z.string().optional(),
  referenteSb7: z.string().optional(),
  refVol: z.string().optional(),
  referenteVolumosos: z.string().optional(),
  apoios: z.string().optional(),
  apoio: z.string().optional(),
});

const putEscalaSchema = z.array(escalaItemSchema);

const putLiderancaSchema = z.object({
  nome: z.string().optional(),
  foto: z.string().optional(),
});

const putOverrideSchema = z.object({
  chave: z.string(),
  valor: z.string().optional(),
});

const postAuditLogsSchema = z.object({
  data: z.string().optional(),
  usuario: z.string().optional(),
  acao: z.string().optional(),
  campo: z.string().optional(),
  valorAnterior: z.any().optional(),
  valorNovo: z.any().optional(),
  dispositivo: z.string().optional(),
});

const postHistoricoSchema = z.object({
  data: z.string().optional(),
  hora: z.string().optional(),
  semana: z.string().optional(),
  turno: z.string().optional(),
  setor: z.string().optional(),
  ativ: z.union([z.number(), z.string()]).optional(),
  uph: z.union([z.number(), z.string()]).optional(),
  repro: z.union([z.number(), z.string()]).optional(),
  promessa: z.union([z.number(), z.string()]).optional(),
  nota5s: z.union([z.number(), z.string()]).optional(),
  erros: z.union([z.number(), z.string()]).optional(),
});

// Middleware helper to validate request body with a Zod schema
const validateBody = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: result.error.issues.map(err => ({
        path: err.path.join("."),
        message: err.message
      }))
    });
  }
  req.body = result.data;
  next();
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser
  app.use(express.json());

  // CORS Config
  const allowedOrigins = [
    "http://localhost:3000",
    "https://ais-dev-tjndsqzrue4au5i2br6va4-17783458042.us-east1.run.app",
    "https://ais-pre-tjndsqzrue4au5i2br6va4-17783458042.us-east1.run.app"
  ];

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.includes(origin) || 
                        origin.endsWith(".run.app") ||
                        origin.startsWith("http://localhost:") ||
                        origin.startsWith("https://localhost:");
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  };
  app.use(cors(corsOptions));

  // Public Health Check Endpoint (Registered BEFORE auth middleware)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: process.env.SQL_HOST ? "connected" : "memory" });
  });

  // Auth Middleware
  const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") {
      return next();
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }
    const token = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error: any) {
      console.error("Token verification failed:", error);
      return res.status(401).json({ error: "Unauthorized: Invalid token", details: error.message });
    }
  };

  // Mount Auth Middleware for all other API endpoints
  app.use("/api", authMiddleware);

  // 1. SETORES API
  app.get("/api/setores", async (req, res) => {
    try {
      const data = await runDbQuery(
        () => db.select().from(setores).orderBy(setores.numero),
        () => [...sectorsMem].sort((a, b) => a.numero - b.numero)
      );
      res.json(data);
    } catch (error: any) {
      console.error("Failed to fetch sectors:", error);
      res.status(500).json({ error: "Failed to fetch sectors from database" });
    }
  });

  app.put("/api/setores", validateBody(putSetoresSchema), async (req, res) => {
    try {
      const body = req.body; // Array of sectors
      if (!Array.isArray(body)) {
        return res.status(400).json({ error: "Body must be an array of sectors" });
      }

      await runDbQuery(
        async () => {
          for (const s of body) {
            const numeroVal = parseInt(s.id || s.numero);
            if (isNaN(numeroVal)) continue;

            await db.insert(setores)
              .values({
                numero: numeroVal,
                tipo: s.tipo || (numeroVal === 87 ? "Caixas" : "Colis"),
                responsavel: s.resp || s.responsavel || "",
                atividade: parseInt(s.ativ || s.atividade || 0) || 0,
                unidade: s.unidade || (numeroVal === 87 ? "CAIXAS" : "COLIS"),
                promessa: (s.promessa || 100).toString(),
                uph: parseInt(s.uph || 0) || 0,
                bsi: (s.bsi || 100).toString(),
                erros: (s.errosPicking || s.erros || 0).toString(),
                seguranca: !!(s.infracaoSeguranca || s.seguranca),
                varFin: (s.varFin ?? 0).toString(),
                nota5s: (s.nota5s ?? 100).toString(),
                reproTotal: parseInt(s.reproTotal ?? 0) || 0,
                horasDkt: (s.horasDKT ?? 0).toString(),
                poliRec: parseInt(s.poliRec ?? 0) || 0,
                rdl: parseInt(s.rdl ?? 0) || 0,
                poliSaid: parseInt(s.poliSaid ?? 0) || 0,
                coletado: parseInt(s.coletado ?? 0) || 0,
              })
              .onConflictDoUpdate({
                target: setores.numero,
                set: {
                  responsavel: s.resp || s.responsavel || "",
                  atividade: parseInt(s.ativ || s.atividade || 0) || 0,
                  promessa: (s.promessa || 100).toString(),
                  uph: parseInt(s.uph || 0) || 0,
                  bsi: (s.bsi || 100).toString(),
                  erros: (s.errosPicking || s.erros || 0).toString(),
                  seguranca: !!(s.infracaoSeguranca || s.seguranca),
                  varFin: s.varFin !== undefined ? (s.varFin ?? 0).toString() : undefined,
                  nota5s: s.nota5s !== undefined ? (s.nota5s ?? 100).toString() : undefined,
                  reproTotal: s.reproTotal !== undefined ? (parseInt(s.reproTotal ?? 0) || 0) : undefined,
                  horasDkt: s.horasDKT !== undefined ? (s.horasDKT ?? 0).toString() : undefined,
                  poliRec: s.poliRec !== undefined ? (parseInt(s.poliRec ?? 0) || 0) : undefined,
                  rdl: s.rdl !== undefined ? (parseInt(s.rdl ?? 0) || 0) : undefined,
                  poliSaid: s.poliSaid !== undefined ? (parseInt(s.poliSaid ?? 0) || 0) : undefined,
                  coletado: s.coletado !== undefined ? (parseInt(s.coletado ?? 0) || 0) : undefined,
                  atualizadoEm: new Date(),
                },
              });
          }
        },
        () => {
          for (const s of body) {
            const numeroVal = parseInt(s.id || s.numero);
            if (isNaN(numeroVal)) continue;

            const existingIndex = sectorsMem.findIndex(x => x.numero === numeroVal);
            const updated = {
              id: existingIndex !== -1 ? sectorsMem[existingIndex].id : sectorsMem.length + 1,
              numero: numeroVal,
              tipo: s.tipo || (numeroVal === 87 ? "Caixas" : "Colis"),
              responsavel: s.resp || s.responsavel || "",
              atividade: parseInt(s.ativ || s.atividade || 0) || 0,
              unidade: s.unidade || (numeroVal === 87 ? "CAIXAS" : "COLIS"),
              promessa: (s.promessa || 100).toString(),
              uph: parseInt(s.uph || 0) || 0,
              bsi: (s.bsi || 100).toString(),
              erros: (s.errosPicking || s.erros || 0).toString(),
              seguranca: !!(s.infracaoSeguranca || s.seguranca),
              varFin: (s.varFin ?? 0).toString(),
              nota5s: (s.nota5s ?? 100).toString(),
              reproTotal: parseInt(s.reproTotal ?? 0) || 0,
              horasDkt: (s.horasDKT ?? 0).toString(),
              poliRec: parseInt(s.poliRec ?? 0) || 0,
              rdl: parseInt(s.rdl ?? 0) || 0,
              poliSaid: parseInt(s.poliSaid ?? 0) || 0,
              coletado: parseInt(s.coletado ?? 0) || 0,
              atualizadoEm: new Date(),
            };

            if (existingIndex !== -1) {
              sectorsMem[existingIndex] = {
                ...sectorsMem[existingIndex],
                ...updated
              };
            } else {
              sectorsMem.push(updated);
            }
          }
        }
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to update sectors:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/setores/:numero", validateBody(sectorSchema), async (req, res) => {
    try {
      const numeroVal = parseInt(req.params.numero);
      const s = req.body;

      if (isNaN(numeroVal)) {
        return res.status(400).json({ error: "Invalid sector number" });
      }

      await runDbQuery(
        async () => {
          await db.insert(setores)
            .values({
              numero: numeroVal,
              tipo: s.tipo || (numeroVal === 87 ? "Caixas" : "Colis"),
              responsavel: s.resp || s.responsavel || "",
              atividade: parseInt(s.ativ || s.atividade || 0) || 0,
              unidade: s.unidade || (numeroVal === 87 ? "CAIXAS" : "COLIS"),
              promessa: (s.promessa || 100).toString(),
              uph: parseInt(s.uph || 0) || 0,
              bsi: (s.bsi || 100).toString(),
              erros: (s.errosPicking || s.erros || 0).toString(),
              seguranca: !!(s.infracaoSeguranca || s.seguranca),
              varFin: (s.varFin ?? 0).toString(),
              nota5s: (s.nota5s ?? 100).toString(),
              reproTotal: parseInt(s.reproTotal ?? 0) || 0,
              horasDkt: (s.horasDKT ?? 0).toString(),
              poliRec: parseInt(s.poliRec ?? 0) || 0,
              rdl: parseInt(s.rdl ?? 0) || 0,
              poliSaid: parseInt(s.poliSaid ?? 0) || 0,
              coletado: parseInt(s.coletado ?? 0) || 0,
            })
            .onConflictDoUpdate({
              target: setores.numero,
              set: {
                responsavel: s.resp || s.responsavel || s.responsavel !== undefined ? (s.resp || s.responsavel) : undefined,
                atividade: s.ativ !== undefined ? parseInt(s.ativ) : (s.atividade !== undefined ? parseInt(s.atividade) : undefined),
                promessa: s.promessa !== undefined ? s.promessa.toString() : undefined,
                uph: s.uph !== undefined ? parseInt(s.uph) : undefined,
                bsi: s.bsi !== undefined ? s.bsi.toString() : undefined,
                erros: s.errosPicking !== undefined ? s.errosPicking.toString() : (s.erros !== undefined ? s.erros.toString() : undefined),
                seguranca: s.infracaoSeguranca !== undefined ? !!s.infracaoSeguranca : (s.seguranca !== undefined ? !!s.seguranca : undefined),
                varFin: s.varFin !== undefined ? s.varFin.toString() : undefined,
                nota5s: s.nota5s !== undefined ? s.nota5s.toString() : undefined,
                reproTotal: s.reproTotal !== undefined ? parseInt(s.reproTotal) : undefined,
                horasDkt: s.horasDKT !== undefined ? s.horasDKT.toString() : undefined,
                poliRec: s.poliRec !== undefined ? parseInt(s.poliRec) : undefined,
                rdl: s.rdl !== undefined ? parseInt(s.rdl) : undefined,
                poliSaid: s.poliSaid !== undefined ? parseInt(s.poliSaid) : undefined,
                coletado: s.coletado !== undefined ? parseInt(s.coletado) : undefined,
                atualizadoEm: new Date(),
              },
            });
        },
        () => {
          const existingIndex = sectorsMem.findIndex(x => x.numero === numeroVal);
          const updated = {
            id: existingIndex !== -1 ? sectorsMem[existingIndex].id : sectorsMem.length + 1,
            numero: numeroVal,
            tipo: s.tipo || (numeroVal === 87 ? "Caixas" : "Colis"),
            responsavel: s.resp || s.responsavel || "",
            atividade: parseInt(s.ativ || s.atividade || 0) || 0,
            unidade: s.unidade || (numeroVal === 87 ? "CAIXAS" : "COLIS"),
            promessa: (s.promessa || 100).toString(),
            uph: parseInt(s.uph || 0) || 0,
            bsi: (s.bsi || 100).toString(),
            erros: (s.errosPicking || s.erros || 0).toString(),
            seguranca: !!(s.infracaoSeguranca || s.seguranca),
            varFin: (s.varFin ?? 0).toString(),
            nota5s: (s.nota5s ?? 100).toString(),
            reproTotal: parseInt(s.reproTotal ?? 0) || 0,
            horasDkt: (s.horasDKT ?? 0).toString(),
            poliRec: parseInt(s.poliRec ?? 0) || 0,
            rdl: parseInt(s.rdl ?? 0) || 0,
            poliSaid: parseInt(s.poliSaid ?? 0) || 0,
            coletado: parseInt(s.coletado ?? 0) || 0,
            atualizadoEm: new Date(),
          };

          if (existingIndex !== -1) {
            sectorsMem[existingIndex] = {
              ...sectorsMem[existingIndex],
              ...updated
            };
          } else {
            sectorsMem.push(updated);
          }
        }
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error(`Failed to update sector ${req.params.numero}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. ESCALA SEMANAL API
  app.get("/api/escala_semanal", async (req, res) => {
    try {
      const data = await runDbQuery(
        () => db.select().from(escalaSemanal),
        () => escalaSemanalMem
      );
      res.json(data);
    } catch (error: any) {
      console.error("Failed to fetch weekly schedule:", error);
      res.status(500).json({ error: "Failed to fetch weekly schedule" });
    }
  });

  app.put("/api/escala_semanal", validateBody(putEscalaSchema), async (req, res) => {
    try {
      const body = req.body; // Array of days
      if (!Array.isArray(body)) {
        return res.status(400).json({ error: "Body must be an array of schedule items" });
      }

      await runDbQuery(
        async () => {
          for (const item of body) {
            const dia = item.dia;
            if (!dia) continue;

            await db.insert(escalaSemanal)
              .values({
                dia,
                referenteSb7: item.ref87 || item.referenteSb7 || "",
                referenteVolumosos: item.refVol || item.referenteVolumosos || "",
                apoio: item.apoios || item.apoio || "",
              })
              .onConflictDoUpdate({
                target: escalaSemanal.dia,
                set: {
                  referenteSb7: item.ref87 || item.referenteSb7 || "",
                  referenteVolumosos: item.refVol || item.referenteVolumosos || "",
                  apoio: item.apoios || item.apoio || "",
                  atualizadoEm: new Date(),
                },
              });
          }
        },
        () => {
          for (const item of body) {
            const dia = item.dia;
            if (!dia) continue;

            const existingIndex = escalaSemanalMem.findIndex(x => x.dia === dia);
            const updated = {
              id: existingIndex !== -1 ? escalaSemanalMem[existingIndex].id : escalaSemanalMem.length + 1,
              dia,
              referenteSb7: item.ref87 || item.referenteSb7 || "",
              referenteVolumosos: item.refVol || item.referenteVolumosos || "",
              apoio: item.apoios || item.apoio || "",
              atualizadoEm: new Date(),
            };

            if (existingIndex !== -1) {
              escalaSemanalMem[existingIndex] = {
                ...escalaSemanalMem[existingIndex],
                ...updated
              };
            } else {
              escalaSemanalMem.push(updated);
            }
          }
        }
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to update weekly schedule:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. LIDERANCA API (Coordenador)
  app.get("/api/lideranca", async (req, res) => {
    try {
      const data = await runDbQuery(
        () => db.select().from(lideranca).where(eq(lideranca.id, 1)),
        () => [liderancaMem]
      );
      if (data.length > 0) {
        res.json(data[0]);
      } else {
        res.json({ id: 1, nome: "HELOISA GONGALVES DE SALES", foto: "" });
      }
    } catch (error: any) {
      console.error("Failed to fetch general manager:", error);
      res.status(500).json({ error: "Failed to fetch general manager" });
    }
  });

  app.put("/api/lideranca", validateBody(putLiderancaSchema), async (req, res) => {
    try {
      const { nome, foto } = req.body;
      await runDbQuery(
        async () => {
          await db.insert(lideranca)
            .values({
              id: 1,
              nome: nome || "HELOISA GONGALVES DE SALES",
              foto: foto || "",
            })
            .onConflictDoUpdate({
              target: lideranca.id,
              set: {
                nome: nome || "HELOISA GONGALVES DE SALES",
                foto: foto || "",
                atualizadoEm: new Date(),
              },
            });
        },
        () => {
          liderancaMem = {
            id: 1,
            nome: nome || "HELOISA GONGALVES DE SALES",
            foto: foto || "",
            atualizadoEm: new Date()
          };
        }
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to update general manager:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 4. OVERRIDE OPERACIONAL API
  app.get("/api/override_operacional", async (req, res) => {
    try {
      const data = await runDbQuery(
        () => db.select().from(overrideOperacional),
        () => overrideOperacionalMem
      );
      res.json(data);
    } catch (error: any) {
      console.error("Failed to fetch overrides:", error);
      res.status(500).json({ error: "Failed to fetch overrides" });
    }
  });

  app.put("/api/override_operacional", validateBody(putOverrideSchema), async (req, res) => {
    try {
      const { chave, valor } = req.body;
      if (!chave) {
        return res.status(400).json({ error: "Chave is required" });
      }
      await runDbQuery(
        async () => {
          await db.insert(overrideOperacional)
            .values({
              chave,
              valor: valor || "",
            })
            .onConflictDoUpdate({
              target: overrideOperacional.chave,
              set: {
                valor: valor || "",
                atualizadoEm: new Date(),
              },
            });
        },
        () => {
          const existingIndex = overrideOperacionalMem.findIndex(x => x.chave === chave);
          const updated = {
            id: existingIndex !== -1 ? overrideOperacionalMem[existingIndex].id : overrideOperacionalMem.length + 1,
            chave,
            valor: valor || "",
            atualizadoEm: new Date()
          };
          if (existingIndex !== -1) {
            overrideOperacionalMem[existingIndex] = {
              ...overrideOperacionalMem[existingIndex],
              ...updated
            };
          } else {
            overrideOperacionalMem.push(updated);
          }
        }
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to update override:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 5. AUDIT LOG API (historico table)
  app.get("/api/audit_logs", async (req, res) => {
    try {
      const data = await runDbQuery(
        () => db.select().from(historico).orderBy(historico.data),
        () => auditLogsMem
      );
      res.json(data);
    } catch (error: any) {
      console.error("Failed to fetch audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.post("/api/audit_logs", validateBody(postAuditLogsSchema), async (req, res) => {
    try {
      const { data, usuario, acao, campo, valorAnterior, valorNovo, dispositivo } = req.body;
      const formattedAlteracao = JSON.stringify({
        campo: campo || "",
        valorAnterior: valorAnterior !== undefined ? valorAnterior : null,
        valorNovo: valorNovo !== undefined ? valorNovo : null,
        dispositivo: dispositivo || "TOWER_OS_CONSOLE"
      });

      await runDbQuery(
        async () => {
          await db.insert(historico).values({
            usuario: usuario || "Sistema",
            tabela: acao || "Geral",
            registro: null,
            alteracao: formattedAlteracao,
            data: data ? new Date(data) : new Date(),
          });
        },
        () => {
          auditLogsMem.push({
            id: auditLogsMem.length + 1,
            usuario: usuario || "Sistema",
            tabela: acao || "Geral",
            registro: null,
            alteracao: formattedAlteracao,
            data: data || new Date().toISOString()
          });
        }
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to save audit log:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/audit_logs", async (req, res) => {
    try {
      await runDbQuery<any>(
        () => db.delete(historico),
        () => {
          auditLogsMem = [];
        }
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to clear audit logs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 6. HISTORICO CONSOLIDADO API (historicoConsolidado table)
  app.get("/api/historico_consolidado", async (req, res) => {
    try {
      const data = await runDbQuery(
        () => db.select().from(historicoConsolidado).orderBy(historicoConsolidado.id),
        () => historicoConsolidadoMem
      );
      res.json(data);
    } catch (error: any) {
      console.error("Failed to fetch consolidated history:", error);
      res.status(500).json({ error: "Failed to fetch consolidated history" });
    }
  });

  app.post("/api/historico_consolidado", validateBody(postHistoricoSchema), async (req, res) => {
    try {
      const { data, hora, semana, turno, setor, ativ, uph, repro, promessa, nota5s, erros } = req.body;
      await runDbQuery(
        async () => {
          await db.insert(historicoConsolidado).values({
            dataRegistro: data || new Date().toLocaleDateString("pt-BR"),
            hora: hora || new Date().toLocaleTimeString("pt-BR"),
            semana: semana || "S26",
            turno: turno || "Turno A",
            setor: setor || "",
            ativ: ativ ? parseInt(ativ) : 0,
            uph: uph ? parseInt(uph) : 0,
            repro: repro ? parseInt(repro) : 0,
            promessa: promessa ? promessa.toString() : "100",
            nota5s: nota5s ? nota5s.toString() : "100",
            erros: erros ? erros.toString() : "0",
          });
        },
        () => {
          historicoConsolidadoMem.push({
            id: historicoConsolidadoMem.length + 1,
            dataRegistro: data || new Date().toLocaleDateString("pt-BR"),
            hora: hora || new Date().toLocaleTimeString("pt-BR"),
            semana: semana || "S26",
            turno: turno || "Turno A",
            setor: setor || "",
            ativ: ativ ? parseInt(ativ) : 0,
            uph: uph ? parseInt(uph) : 0,
            repro: repro ? parseInt(repro) : 0,
            promessa: promessa ? promessa.toString() : "100",
            nota5s: nota5s ? nota5s.toString() : "100",
            erros: erros ? erros.toString() : "0",
          });
        }
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to save consolidated history:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/historico_consolidado", async (req, res) => {
    try {
      await runDbQuery<any>(
        () => db.delete(historicoConsolidado),
        () => {
          historicoConsolidadoMem = [];
        }
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to clear consolidated history:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
