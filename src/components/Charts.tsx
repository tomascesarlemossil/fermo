"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

type Datum = { key: string; value: number };

export function SimpleBar({ data, color = "#C79A4B" }: { data: Datum[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6DDCF" vertical={false} />
        <XAxis dataKey="key" tick={{ fontSize: 11, fill: "#6E6356" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6E6356" }} />
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleLine({
  data,
}: {
  data: { month: string; receivable: number; payable: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6DDCF" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6E6356" }} />
        <YAxis tick={{ fontSize: 11, fill: "#6E6356" }} />
        <Tooltip />
        <Line type="monotone" dataKey="receivable" stroke="#4F7A4A" strokeWidth={2} dot={false} name="Entradas" />
        <Line type="monotone" dataKey="payable" stroke="#B0402F" strokeWidth={2} dot={false} name="Saídas" />
      </LineChart>
    </ResponsiveContainer>
  );
}
