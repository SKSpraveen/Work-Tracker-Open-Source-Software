import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function WorkHoursChart({ data }) {
  return (
    <div className="bg-white p-4 rounded shadow h-64">
      <h3 className="mb-2 font-semibold">Work Hours</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="hours" stroke="#2563eb" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
