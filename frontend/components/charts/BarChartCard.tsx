"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/Card";

type Series = { dataKey: string; color: string; name: string };

type Props = {
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  height?: number;
  stacked?: boolean;
};

export function BarChartCard({ title, data, xKey, series, height = 260, stacked }: Props) {
  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-bold text-main">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip />
            <Legend />
            {series.map((s) => (
              <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.color} stackId={stacked ? "stack" : undefined} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
