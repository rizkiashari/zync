import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  MessageSquare,
  Users,
  Hash,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import { cardClean } from "../../lib/uiClasses";

function StatCard({ icon: Icon, label, value, color = "indigo" }) {
  const bg = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  }[color] ?? "bg-slate-50 text-slate-600";

  return (
    <div className={`${cardClean} p-5 flex items-center gap-4`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function AnalyticsCharts({ analytics }) {
  if (!analytics) return null;

  const {
    total_messages,
    messages_30_days,
    active_users_7_days,
    total_rooms,
    total_members,
    total_tasks,
    top_rooms,
    daily_messages,
  } = analytics;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={MessageSquare} label="Total Pesan" value={total_messages} color="indigo" />
        <StatCard icon={TrendingUp} label="Pesan 30 Hari" value={messages_30_days} color="emerald" />
        <StatCard icon={Users} label="Pengguna Aktif (7h)" value={active_users_7_days} color="violet" />
        <StatCard icon={Hash} label="Total Ruangan" value={total_rooms} color="amber" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={Users} label="Total Anggota" value={total_members} color="indigo" />
        <StatCard icon={CheckSquare} label="Total Tugas" value={total_tasks} color="emerald" />
      </div>

      {/* Daily messages chart */}
      {daily_messages && daily_messages.length > 0 && (
        <section className={`${cardClean} p-6`}>
          <h3 className="text-sm font-semibold text-slate-800 mb-4">
            Aktivitas Pesan (30 Hari Terakhir)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={daily_messages} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                formatter={(v) => [v, "Pesan"]}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Top rooms */}
      {top_rooms && top_rooms.length > 0 && (
        <section className={`${cardClean} p-6`}>
          <h3 className="text-sm font-semibold text-slate-800 mb-4">
            Ruangan Paling Aktif
          </h3>
          <div className="space-y-3">
            {top_rooms.map((r, i) => {
              const maxCount = top_rooms[0]?.count ?? 1;
              const pct = Math.round((r.count / maxCount) * 100);
              return (
                <div key={r.room_id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {r.room_name || `Room #${r.room_id}`}
                      </p>
                      <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                        {r.count.toLocaleString()} pesan
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
