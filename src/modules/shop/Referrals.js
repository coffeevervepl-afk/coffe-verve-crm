import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { T } from "../../lib/i18n";

// CRM palette (blue/white — not the shop's brown theme).
const GREY = "#6B7280";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const pill = (bg, color, border) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color, border: `1px solid ${border}` });
const PILL = {
  green: pill("#F0FDF4", "#15803D", "#BBF7D0"),
  amber: pill("#FFFBEB", "#B45309", "#FDE68A"),
  blue:  pill("#EFF6FF", "#1D4ED8", "#BFDBFE"),
  grey:  pill("#F3F4F6", "#6B7280", "#E5E7EB"),
};

function StatusBadge({ status, t }) {
  if (status === "available") return <span style={PILL.green}>{t.rf_st_available}</span>;
  if (status === "used")      return <span style={PILL.blue}>{t.rf_st_used}</span>;
  if (status === "expired")   return <span style={PILL.grey}>{t.rf_st_expired}</span>;
  return <span style={PILL.amber}>{t.rf_st_pending}</span>;
}

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 12, color: GREY, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "#1F2937", marginTop: 4 }}>{value}</div>
    </div>
  );
}

// ── Manual grant modal ───────────────────────────────────────────────────────
function GrantModal({ userList, t, onClose, onGranted }) {
  const [uid, setUid] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!uid) return;
    setSaving(true);
    const expires = new Date(Date.now() + 90 * 86400000).toISOString();
    await supabase.from("referral_bonuses").insert({ user_id: uid, status: "available", expires_at: expires });
    setSaving(false);
    onGranted();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{t.rf_grant_title}</h3>
        <label style={{ fontSize: 13, color: GREY }}>{t.rf_grant_user}</label>
        <select value={uid} onChange={e => setUid(e.target.value)}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E0E4EA", fontSize: 13, background: "#fff", marginTop: 4 }}>
          <option value="">{t.rf_grant_pick}</option>
          {userList.map(u => <option key={u.uid} value={u.uid}>{u.name || u.email}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose}>{t.rf_close}</button>
          <button className="btn btn-primary" disabled={!uid || saving} onClick={save}>{t.rf_grant_save}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────
export default function Referrals({ lang }) {
  const t = T[lang];
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState({});
  const [orders, setOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState("all");
  const [period, setPeriod] = useState("all");
  const [showGrant, setShowGrant] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: b }, { data: u }] = await Promise.all([
      supabase.from("referral_bonuses").select("*").order("created_at", { ascending: false }),
      supabase.from("shop_users").select("auth_user_id, name, email"),
    ]);
    setRows(b || []);
    const map = {};
    (u || []).forEach(x => { if (x.auth_user_id) map[x.auth_user_id] = x; });
    setUsers(map);
    const ids = [...new Set((b || []).flatMap(x => [x.source_order_id, x.used_in_order_id]).filter(Boolean))];
    if (ids.length) {
      const { data: o } = await supabase.from("shop_orders").select("id, order_number").in("id", ids);
      const om = {};
      (o || []).forEach(x => { om[x.id] = x.order_number; });
      setOrders(om);
    } else setOrders({});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const name = (uid) => users[uid]?.name || users[uid]?.email || (uid ? uid.slice(0, 8) : "—");

  const now = Date.now();
  const inPeriod = (d) => {
    if (period === "all") return true;
    const ts = new Date(d).getTime();
    if (period === "month") return ts >= now - 30 * 86400000;
    if (period === "week")  return ts >= now - 7 * 86400000;
    return true;
  };
  const filtered = rows.filter(r => (statusF === "all" || r.status === statusF) && inPeriod(r.created_at));

  const stats = {
    issued:    rows.length,
    available: rows.filter(r => r.status === "available").length,
    used:      rows.filter(r => r.status === "used").length,
    expired:   rows.filter(r => r.status === "expired").length,
  };
  const conversion = stats.issued ? Math.round((stats.used / stats.issued) * 100) : 0;

  const byRef = {};
  rows.forEach(r => { byRef[r.user_id] = (byRef[r.user_id] || 0) + 1; });
  const top = Object.entries(byRef).map(([uid, n]) => ({ uid, n })).sort((a, b) => b.n - a.n).slice(0, 5);

  const userList = Object.entries(users).map(([uid, u]) => ({ uid, ...u }));

  const revoke = async (id) => {
    if (!window.confirm(t.rf_revoke_confirm)) return;
    await supabase.from("referral_bonuses").update({ status: "expired" }).eq("id", id);
    load();
  };

  const selStyle = { padding: "7px 10px", borderRadius: 6, border: "1px solid #E0E4EA", fontSize: 13, background: "#fff" };

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">{t.rf_title}</span>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setShowGrant(true)}>{t.rf_grant}</button>
      </div>
      <div className="content">
        {/* Stats */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <StatCard label={t.rf_stat_issued}     value={stats.issued} />
          <StatCard label={t.rf_stat_available}  value={stats.available} color="#15803D" />
          <StatCard label={t.rf_stat_used}       value={stats.used}      color="#1D4ED8" />
          <StatCard label={t.rf_stat_expired}    value={stats.expired}   color={GREY} />
          <StatCard label={t.rf_stat_conversion} value={`${conversion}%`} />
        </div>

        {/* Top referrers */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">{t.rf_top_title}</div>
          {top.length === 0 ? (
            <div style={{ color: GREY, fontSize: 13 }}>{t.rf_empty}</div>
          ) : top.map(x => (
            <div key={x.uid} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
              <span style={{ fontWeight: 600, color: "#1F2937" }}>{name(x.uid)}</span>
              <span style={{ color: GREY }}>{x.n} {t.rf_bonuses_count}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <select style={selStyle} value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="all">{t.rf_filter_status}: {t.rf_filter_all}</option>
            <option value="available">{t.rf_st_available}</option>
            <option value="used">{t.rf_st_used}</option>
            <option value="expired">{t.rf_st_expired}</option>
            <option value="pending">{t.rf_st_pending}</option>
          </select>
          <select style={selStyle} value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="all">{t.rf_filter_period}: {t.rf_period_all}</option>
            <option value="month">{t.rf_period_month}</option>
            <option value="week">{t.rf_period_week}</option>
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 24, color: GREY }}>{t.rf_loading}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, color: GREY }}>{t.rf_empty}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t.rf_col_referrer}</th><th>{t.rf_col_friend}</th><th>{t.rf_col_order}</th>
                  <th>{t.rf_col_status}</th><th>{t.rf_col_created}</th><th>{t.rf_col_expires}</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{name(r.user_id)}</td>
                    <td>{r.source_user_id ? name(r.source_user_id) : <span style={{ color: GREY }}>—</span>}</td>
                    <td>{r.source_order_id && orders[r.source_order_id] ? `#${orders[r.source_order_id]}` : "—"}</td>
                    <td><StatusBadge status={r.status} t={t} /></td>
                    <td>{fmtDate(r.created_at)}</td>
                    <td>{r.status === "used" ? fmtDate(r.used_at) : fmtDate(r.expires_at)}</td>
                    <td>
                      {r.status === "available" && (
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => revoke(r.id)}>{t.rf_revoke}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showGrant && (
        <GrantModal userList={userList} t={t}
          onClose={() => setShowGrant(false)}
          onGranted={() => { setShowGrant(false); load(); }} />
      )}
    </div>
  );
}
