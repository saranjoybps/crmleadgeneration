"use client";

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ZAxis } from "recharts";
import { Card } from "@/components/ui/Card";

type Props = {
  title: string;
  data: Array<{ project: string; tasks: number; tickets: number }>;
  height?: number;
};

export function ScatterChartCard({ title, data, height = 300 }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    total: d.tasks + d.tickets,
  }));

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-bold text-main">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="tasks" name="Tasks" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis dataKey="tickets" name="Tickets" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <ZAxis dataKey="total" range={[60, 400]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Legend />
            <Scatter name="Projects" data={chartData} fill="#7c3aed" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
