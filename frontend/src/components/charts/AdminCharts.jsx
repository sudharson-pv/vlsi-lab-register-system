import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import Panel from "../common/Panel";
import { formatDuration } from "../../utils/formatters";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
);

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      labels: {
        color: "#cbd5e1",
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "#cbd5e1" },
      grid: { color: "rgba(148, 163, 184, 0.12)" },
    },
    y: {
      ticks: { color: "#cbd5e1" },
      grid: { color: "rgba(148, 163, 184, 0.12)" },
    },
  },
};

const AdminCharts = ({ analytics }) => {
  const peakHours = analytics?.peak_hours || [];
  const systems = analytics?.most_used_systems || [];
  const students = analytics?.student_usage_frequency || [];

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Panel title="Peak Hours" eyebrow="Chart.js" className="xl:col-span-2">
        <Bar
          options={chartOptions}
          data={{
            labels: peakHours.map((entry) => `${entry.hour}:00`),
            datasets: [
              {
                label: "Bookings",
                data: peakHours.map((entry) => entry.bookings),
                backgroundColor: "rgba(34, 211, 238, 0.7)",
                borderRadius: 10,
              },
            ],
          }}
        />
      </Panel>

      <Panel title="Most Used Systems" eyebrow="Chart.js">
        <Doughnut
          data={{
            labels: systems.map((entry) => entry.seat_id),
            datasets: [
              {
                data: systems.map((entry) => entry.bookings),
                backgroundColor: [
                  "#22d3ee",
                  "#f59e0b",
                  "#4ade80",
                  "#fb7185",
                  "#c084fc",
                  "#f87171",
                  "#67e8f9",
                  "#fbbf24",
                ],
                borderWidth: 0,
              },
            ],
          }}
        />
      </Panel>

      <Panel title="Student Usage Frequency" eyebrow="Top Users" className="xl:col-span-3">
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Register Number</th>
                <th>Sessions</th>
                <th>Total Usage</th>
              </tr>
            </thead>
            <tbody>
              {students.length ? (
                students.map((entry) => (
                  <tr key={entry.register_number}>
                    <td>{entry.student_name}</td>
                    <td>{entry.register_number}</td>
                    <td>{entry.bookings}</td>
                    <td>{formatDuration(entry.total_minutes)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center text-slate-400">
                    No usage analytics yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

export default AdminCharts;
