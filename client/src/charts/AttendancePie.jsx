import { PieChart, Pie, Cell, Tooltip } from "recharts";

export default function AttendancePie({ data }) {
  const colors = ["#22c55e", "#eab308", "#ef4444"];

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="mb-2 font-semibold">Attendance</h3>
      <PieChart width={250} height={250}>
        <Pie data={data} dataKey="value" outerRadius={80}>
          {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </div>
  );
}
