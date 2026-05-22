"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card } from "@/components/ui/Card";

const COLORS = ["#7c3aed", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#ec4899", "#14b8a6"];

type Props = {
  title: string;
  data: Array<{ name: string; hours: number }>;
  height?: number;
};

export function RadialBarChartCard({ title, data, height = 300 }: Props) {
  const maxHours = Math.max(...data.map((d) => d.hours), 1);
  const chartData = data.map((d, i) => ({
    ...d,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-bold text-main">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={16} data={chartData}>
            <PolarAngleAxis type="number" domain={[0, maxHours]} angleAxisId={0} tick={false} />
            <RadialBar background dataKey="hours" cornerRadius={8} />
            <Tooltip />
            <Legend
              iconType="circle"
              formatter={(value: string) => <span className="text-sm text-slate-700">{value}</span>}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
