import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

// CRM palette (blue/white). Content is Russian-only, like the rest of the CRM.
const GREY = "#6B7280";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const fmtMoney = (g) => g != null ? `${(Number(g) / 100).toFixed(2)} zł` : "—";

const REASON_RU = {
  too_much_coffee: "Слишком часто",
  try_others:      "Хочет другие сорта",
  too_expensive:   "Дорого",
  delivery_issue:  "Проблемы с получением",
  forgot_pickup:   "Забывает получить",
  quality_issue:   "Не понравился вкус",
  no_time:         "Нет времени",
  other:           "Другое",
};
const REASON_ORDER = Object.keys(REASON_RU);

const pill = (bg, color, border) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color, border: `1px solid ${border}` });
const PILL = {
  green: pill("#F0FDF4", "#15803D", "#BBF7D0"),
  amber: pill("#FFFBEB", "#B45309", "#FDE68A"),
  grey:  pill("#F3F4F6", "#6B7280", "#E5E7EB"),
};

function ActionBadge({ action }) {
  if (action === "paused") return <span style={PILL.amber}>Приостановил</span>;
  if (action === "stayed") return <span style={PILL.green}>Остался</span>;
  return <span style={PILL.grey}>Отменил</span>;
}

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 12, color: GREY, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "#1F2937", marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function Cancellations() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [reasonF, setReasonF] = useState("all");
  const [actionF, setActionF] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: u }] = await Promise.all([
      supabase.from("subscription_cancellations").select("*").order("cancelled_at", { ascending: false }),
      supabase.from("shop_users").select("auth_user_id, name, email"),
    ]);
    setRows(c || []);
    const map = {};
    (u || []).forEach(x => { if (x.auth_user_id) map[x.auth_user_id] = x; });
    setUsers(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const name = (uid) => users[uid]?.name || users[uid]?.email || (uid ? uid.slice(0, 8) : "—");

  const now = Date.now();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const inPeriod = (d) => {
    if (period === "all") return true;
    const ts = new Date(d).getTime();
    if (period === "week")    return ts >= now - 7 * 86400000;
    if (period === "month")   return ts >= monthStart;
    if (period === "quarter") return ts >= now - 90 * 86400000;
    return true;
  };

  // ── Month stats ──
  const thisMonth = rows.filter(r => new Date(r.cancelled_at).getTime() >= monthStart);
  const cancelsM = thisMonth.filter(r => r.final_action === "cancelled").length;
  const retainedM = thisMonth.filter(r => r.accepted_pause === true).length;
  const retention = (retainedM + cancelsM) > 0 ? Math.round((retainedM / (retainedM + cancelsM)) * 100) : 0;
  const cancelledLtv = rows.filter(r => r.final_action === "cancelled" && r.ltv_groszy != null);
  const avgLtv = cancelledLtv.length ? Math.round(cancelledLtv.reduce((s, r) => s + r.ltv_groszy, 0) / cancelledLtv.length) : 0;

  // ── Top reasons this month ──
  const topReasons = REASON_ORDER
    .map(code => {
      const forCode = thisMonth.filter(r => r.reason_code === code);
      const accepted = forCode.filter(r => r.accepted_pause === true).length;
      return { code, total: forCode.length, accepted };
    })
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total);

  const filtered = rows.filter(r =>
    inPeriod(r.cancelled_at) &&
    (reasonF === "all" || r.reason_code === reasonF) &&
    (actionF === "all" || r.final_action === actionF)
  );

  const selStyle = { padding: "7px 10px", borderRadius: 6, border: "1px solid #E0E4EA", fontSize: 13, background: "#fff" };

  return (
    <div>
      <div className="topbar"><span className="topbar-title">Отмены подписок</span></div>
      <div className="content">
        {/* Widgets */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <StatCard label="Отмен за месяц" value={cancelsM} color="#B91C1C" />
          <StatCard label="Удержано паузой" value={retainedM} color="#B45309" />
          <StatCard label="Retention rate" value={`${retention}%`} color="#15803D" />
          <StatCard label="Средний LTV перед отменой" value={fmtMoney(avgLtv)} />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <select style={selStyle} value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="week">За неделю</option>
            <option value="month">За месяц</option>
            <option value="quarter">За квартал</option>
            <option value="all">Всё время</option>
          </select>
          <select style={selStyle} value={reasonF} onChange={e => setReasonF(e.target.value)}>
            <option value="all">Причина: все</option>
            {REASON_ORDER.map(code => <option key={code} value={code}>{REASON_RU[code]}</option>)}
          </select>
          <select style={selStyle} value={actionF} onChange={e => setActionF(e.target.value)}>
            <option value="all">Действие: все</option>
            <option value="cancelled">Отменил</option>
            <option value="paused">Приостановил</option>
            <option value="stayed">Остался</option>
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 24, color: GREY }}>Загрузка…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, color: GREY }}>Нет данных за выбранный период</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Клиент</th><th>Дата</th><th>Причина</th><th>Действие</th>
                  <th>Прожил</th><th>Отправок</th><th>LTV</th><th>Вернулся</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{name(r.user_id)}</td>
                    <td>{fmtDate(r.cancelled_at)}</td>
                    <td>{REASON_RU[r.reason_code] || r.reason_code}{r.reason_code === "other" && r.reason_text ? ` — ${r.reason_text}` : ""}</td>
                    <td><ActionBadge action={r.final_action} /></td>
                    <td>{r.subscription_lifetime_days != null ? `${r.subscription_lifetime_days} дн.` : "—"}</td>
                    <td>{r.total_deliveries_completed != null ? r.total_deliveries_completed : "—"}</td>
                    <td>{fmtMoney(r.ltv_groszy)}</td>
                    <td>{r.returned_at ? fmtDate(r.returned_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top reasons this month */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">Топ причин отмен за месяц</div>
          {topReasons.length === 0 ? (
            <div style={{ color: GREY, fontSize: 13 }}>Нет данных</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Причина</th><th>Кол-во</th><th>% от всех</th><th>Retention</th></tr>
              </thead>
              <tbody>
                {topReasons.map(x => (
                  <tr key={x.code}>
                    <td>{REASON_RU[x.code]}</td>
                    <td>{x.total}</td>
                    <td>{thisMonth.length ? Math.round((x.total / thisMonth.length) * 100) : 0}%</td>
                    <td>{x.total ? Math.round((x.accepted / x.total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
