/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { HistoricoRegistro, Colaborador } from "../types";

interface LineChartProps {
  data: HistoricoRegistro[];
}

export const TrendLineChart: React.FC<LineChartProps> = ({ data }) => {
  const chartData = data.slice(-14).map((h) => ({
    name: h.data.slice(0, 5) + " S" + h.setor,
    ATIV: h.ativ,
    UPH: h.uph,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
        <YAxis stroke="#71717a" fontSize={9} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a" }}
          labelStyle={{ color: "#a1a1aa", fontWeight: "bold" }}
        />
        <Line
          type="monotone"
          dataKey="ATIV"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

interface ExecTrendProps {
  data: { data: string; ativ: number; uph: number; promessa: number }[];
}

export const ExecutivoBarChart: React.FC<ExecTrendProps> = ({ data }) => {
  const chartData = data.slice(-12).map((d) => ({
    name: d.data.slice(0, 5),
    Volume: d.ativ,
    UPH: d.uph,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
        <YAxis stroke="#71717a" fontSize={9} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a" }}
          labelStyle={{ color: "#a1a1aa", fontWeight: "bold" }}
        />
        <Bar dataKey="Volume" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const AnalyticsDoubleLineChart: React.FC<ExecTrendProps> = ({ data }) => {
  const chartData = data.slice(-30).map((d) => ({
    name: d.data.slice(0, 5),
    Volume: d.ativ,
    UPH: d.uph,
    SLA: d.promessa,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
        <YAxis yAxisId="left" stroke="#71717a" fontSize={9} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" stroke="#71717a" fontSize={9} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a" }}
          labelStyle={{ color: "#a1a1aa", fontWeight: "bold" }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="Volume"
          stroke="#38bdf8"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="SLA"
          stroke="#10b981"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const HourlyBarChart: React.FC<ExecTrendProps> = ({ data }) => {
  const chartData = data.length > 0 ? data : [
    { name: "07h", UPH: 420 },
    { name: "08h", UPH: 480 },
    { name: "09h", UPH: 510 },
    { name: "10h", UPH: 550 },
    { name: "11h", UPH: 490 },
    { name: "12h", UPH: 440 },
    { name: "13h", UPH: 530 },
    { name: "14h", UPH: 560 },
  ].map(item => ({ name: item.name, Volume: 0, UPH: item.UPH, data: "" }));

  const normalizedData = chartData.map((d: any) => ({
    name: d.name || d.hora || "Hr",
    UPH: d.uph || d.UPH || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={normalizedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
        <YAxis stroke="#71717a" fontSize={9} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a" }}
          labelStyle={{ color: "#a1a1aa", fontWeight: "bold" }}
        />
        <Bar dataKey="UPH" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

interface MixPieProps {
  percentage: number;
}

export const MixDoughnutChart: React.FC<MixPieProps> = ({ percentage }) => {
  const data = [
    { name: "Feito", value: percentage },
    { name: "Pendente", value: Math.max(0, 100 - percentage) },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="75%"
          outerRadius="90%"
          startAngle={90}
          endAngle={-270}
          paddingAngle={0}
          dataKey="value"
        >
          <Cell fill="#10b981" />
          <Cell fill="rgba(255, 255, 255, 0.05)" />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};

interface CopilChartProps {
  rows: { kpi: string; comp: string; real: string; inverso: boolean }[];
  calcNotaFn: (r: { comp: string; real: string; inverso: boolean }) => string;
}

export const CopilBarChart: React.FC<CopilChartProps> = ({ rows, calcNotaFn }) => {
  const chartData = rows.map((r) => {
    const notaStr = calcNotaFn(r);
    let notaVal = 0;
    if (["A", "B", "C", "D"].includes(notaStr)) {
      if (notaStr === "A") notaVal = 1.0;
      else if (notaStr === "B") notaVal = 0.95;
      else if (notaStr === "C") notaVal = 0.90;
      else notaVal = 0.85;
    } else {
      notaVal = notaStr === "—" ? 0 : parseFloat(notaStr);
    }
    return {
      kpi: r.kpi.length > 18 ? r.kpi.slice(0, 15) + "..." : r.kpi,
      Nota: isNaN(notaVal) ? 0 : notaVal,
    };
  });

  const getBarColor = (nota: number) => {
    if (nota >= 1.0) return "rgba(16, 185, 129, 0.7)"; // green
    if (nota >= 0.95) return "rgba(245, 158, 11, 0.7)"; // yellow/orange
    if (nota >= 0.90) return "rgba(249, 115, 22, 0.7)"; // orange
    return "rgba(239, 68, 68, 0.7)"; // red
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="kpi" stroke="#71717a" fontSize={9} tickLine={false} />
        <YAxis stroke="#71717a" fontSize={9} tickLine={false} domain={[0, 1.5]} />
        <Tooltip
          contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a" }}
          labelStyle={{ color: "#a1a1aa", fontWeight: "bold" }}
        />
        <Bar dataKey="Nota" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.Nota)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

interface ProdChartProps {
  colaboradores: Colaborador[];
}

export const ProdHorasHorizontalBar: React.FC<ProdChartProps> = ({ colaboradores }) => {
  const chartData = colaboradores
    .filter((c) => c.status === "Operacao")
    .map((c) => ({
      name: c.nome.split(" ")[0],
      Horas: c.horas,
    }));

  const finalData = chartData.length > 0 ? chartData : [{ name: "Nenhum", Horas: 0 }];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={finalData}
        layout="vertical"
        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis type="number" stroke="#71717a" fontSize={9} tickLine={false} />
        <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={9} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a" }}
          labelStyle={{ color: "#a1a1aa", fontWeight: "bold" }}
        />
        <Bar dataKey="Horas" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
};
