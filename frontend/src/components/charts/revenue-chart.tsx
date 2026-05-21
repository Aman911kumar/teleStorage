import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { name: "Mon", value: 12000 },
  { name: "Tue", value: 18800 },
  { name: "Wed", value: 16400 },
  { name: "Thu", value: 24800 },
  { name: "Fri", value: 30200 },
  { name: "Sat", value: 42100 },
  { name: "Sun", value: 38700 }
];

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b8cff" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#5b8cff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" stroke="#647084" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#647084" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: "#111722", border: "1px solid #222838", borderRadius: 8 }} />
        <Area type="monotone" dataKey="value" stroke="#5b8cff" fill="url(#revenue)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
