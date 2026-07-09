import { pgTable, serial, text, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  usuario: text("usuario").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  perfil: text("perfil").notNull(), // "admin", "coordenador", "visualizacao"
  criadoEm: timestamp("criado_em").defaultNow(),
});

export const lideranca = pgTable("lideranca", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  foto: text("foto"),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const escalaSemanal = pgTable("escala_semanal", {
  id: serial("id").primaryKey(),
  dia: text("dia").notNull().unique(), // "SEGUNDA-FEIRA", etc.
  referenteSb7: text("referente_sb7"),
  referenteVolumosos: text("referente_volumosos"),
  apoio: text("apoio"),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const setores = pgTable("setores", {
  id: serial("id").primaryKey(),
  numero: integer("numero").notNull().unique(), // 87, 88, 89, 90
  tipo: text("tipo").notNull(), // "Caixas", "Colis"
  responsavel: text("responsavel").notNull(),
  atividade: integer("atividade").notNull(),
  unidade: text("unidade").notNull(), // "CAIXAS", "COLIS"
  promessa: numeric("promessa").notNull(),
  uph: integer("uph").notNull(),
  bsi: numeric("bsi").notNull(),
  erros: numeric("erros").notNull(),
  seguranca: boolean("seguranca").notNull().default(false),
  varFin: numeric("var_fin").notNull().default("0"),
  nota5s: numeric("nota_5s").notNull().default("100"),
  reproTotal: integer("repro_total").notNull().default(0),
  horasDkt: numeric("horas_dkt").notNull().default("0"),
  poliRec: integer("poli_rec").notNull().default(0),
  rdl: integer("rdl").notNull().default(0),
  poliSaid: integer("poli_said").notNull().default(0),
  coletado: integer("coletado").notNull().default(0),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const overrideOperacional = pgTable("override_operacional", {
  id: serial("id").primaryKey(),
  chave: text("chave").notNull().unique(),
  valor: text("valor").notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const historico = pgTable("historico", {
  id: serial("id").primaryKey(),
  usuario: text("usuario").notNull(),
  tabela: text("tabela").notNull(),
  registro: integer("registro"),
  alteracao: text("alteracao").notNull(),
  data: timestamp("data").defaultNow(),
});

export const historicoConsolidado = pgTable("historico_consolidado", {
  id: serial("id").primaryKey(),
  dataRegistro: text("data_registro").notNull(),
  hora: text("hora").notNull(),
  semana: text("semana").notNull(),
  turno: text("turno").notNull(),
  setor: text("setor").notNull(),
  ativ: integer("ativ").notNull().default(0),
  uph: integer("uph").notNull().default(0),
  repro: integer("repro").notNull().default(0),
  promessa: numeric("promessa").notNull().default("100"),
  nota5s: numeric("nota_5s").notNull().default("100"),
  erros: numeric("erros").notNull().default("0"),
  criadoEm: timestamp("criado_em").defaultNow(),
});
