import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { T } from "../../lib/i18n";

// CRM palette (matches the rest of the CRM, not the shop's brown theme).
const GREY = "#6B7280";

const tpl = (str, vars) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), str);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const fmtMoney = (grosze) => grosze != null ? `${(Number(grosze) / 100).toFixed(2)} zł` : "—";
const wLabel = (w) => w >= 1000 ? `${w / 1000}кг` : `${w}г`;
const itemsAmount = (items) => (items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
const itemsSummary = (items) => (items || [])
  .map(it => `${it.name} ${wLabel(it.weight)}${(it.quantity || 1) > 1 ? ` ×${it.quantity}` : ""}`)
  .join(", ");

const ymd = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const TODAY = ymd(new Date());
const TOMORROW = ymd(new Date(Date.now() + 86400000));

// ── Badges — soft-pill style copied from the CRM shop-orders STATUS_PILL ─────
const pill = (bg, color, border) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color, border: `1px solid ${border}` });
const PILL = {
  green: pill("#F0FDF4", "#15803D", "#BBF7D0"),
  amber: pill("#FFFBEB", "#B45309", "#FDE68A"),
  blue:  pill("#EFF6FF", "#1D4ED8", "#BFDBFE"),
  grey:  pill("#F3F4F6", "#6B7280", "#E5E7EB"),
};

function PayBadge({ method, t }) {
  if (method === "przelewy24_card") return <span style={PILL.blue}>{t.sub_pay_card}</span>;
  if (method === "przelewy24_blik") return <span style={PILL.blue}>{t.sub_pay_blik}</span>;
  return <span style={PILL.grey}>{t.sub_pay_manual}</span>;
}
function StatusBadge({ status, t }) {
  if (status === "active") return <span style={PILL.green}>{t.sub_status_active}</span>;
  if (status === "paused") return <span style={PILL.amber}>{t.sub_status_paused}</span>;
  return <span style={PILL.grey}>{t.sub_status_cancelled}</span>;
}
function NextBadge({ date, t }) {
  if (!date) return <span>—</span>;
  const d = ymd(date);
  if (d < TODAY) return <span style={PILL.amber}>{t.sub_overdue} · {fmtDate(date)}</span>;
  if (d === TODAY || d === TOMORROW) return <span style={PILL.blue}>{t.sub_tomorrow} · {fmtDate(date)}</span>;
  return <span>{fmtDate(date)}</span>;
}

// ── Dashboard widget ────────────────────────────────────────────────────────
export function SubscriptionWidget({ t, setPage }) {
  const [subs, setSubs] = useState([]);
  const [users, setUsers] = useState({});
  const [awaiting, setAwaiting] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: u }, { count }] = await Promise.all([
        supabase.from("subscriptions").select("*").eq("status", "active"),
        supabase.from("shop_users").select("auth_user_id, name, email"),
        supabase.from("subscription_deliveries").select("id", { count: "exact", head: true }).in("payment_status", ["failed", "retry"]),
      ]);
      setSubs(s || []);
      const map = {};
      (u || []).forEach(x => { if (x.auth_user_id) map[x.auth_user_id] = x; });
      setUsers(map);
      setAwaiting(count || 0);
    })();
  }, []);

  const clientName = (uid) => users[uid]?.name || users[uid]?.email || "—";
  const tomorrow = subs.filter(s => ymd(s.next_delivery_date) === TOMORROW);
  const overdue = subs.filter(s => ymd(s.next_delivery_date) < TODAY);

  const Row = ({ s }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 13, padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
      <span style={{ fontWeight: 600, color: "#1F2937" }}>{clientName(s.user_id)}</span>
      <span style={{ color: GREY }}>{itemsSummary(s.items)}</span>
      <span style={{ marginLeft: "auto", fontWeight: 600, color: "#1F2937" }}>{fmtMoney(itemsAmount(s.items))}</span>
      <PayBadge method={s.payment_method} t={t} />
    </div>
  );

  const empty = tomorrow.length === 0 && overdue.length === 0 && awaiting === 0;

  return (
    <div className="card" style={{ cursor: "pointer" }} onClick={() => setPage && setPage("shop_subscriptions")}>
      <div className="card-title">{t.sub_widget_title}</div>
      {empty ? (
        <div style={{ color: GREY, fontSize: 13 }}>{t.sub_widget_empty}</div>
      ) : (
        <div onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8", textTransform: "uppercase", letterSpacing: "0.05em", margin: "4px 0 2px" }}>
            {t.sub_widget_tomorrow} ({tomorrow.length})
          </div>
          {tomorrow.map(s => <Row key={s.id} s={s} />)}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.05em", margin: "10px 0 2px" }}>
            {t.sub_widget_overdue} ({overdue.length})
          </div>
          {overdue.map(s => <Row key={s.id} s={s} />)}
          <div style={{ fontSize: 12, fontWeight: 700, color: GREY, textTransform: "uppercase", letterSpacing: "0.05em", margin: "10px 0 2px" }}>
            {t.sub_widget_awaiting} ({awaiting})
          </div>
        </div>
      )}
    </div>
  );
}

// ── Detail modal ────────────────────────────────────────────────────────────
function DetailModal({ sub, user, t, onClose, onChanged }) {
  const [deliveries, setDeliveries] = useState([]);
  const [interval, setIntervalW] = useState(sub.interval_weeks);
  const [nextDate, setNextDate] = useState(ymd(sub.next_delivery_date));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("subscription_deliveries").select("*").eq("subscription_id", sub.id)
      .order("scheduled_date", { ascending: false })
      .then(({ data }) => setDeliveries(data || []));
  }, [sub.id]);

  const cardPct = Number(user?.discount_pct || 0);

  async function updateDelivery(delId, fields) {
    const { error } = await supabase.from("subscription_deliveries").update(fields).eq("id", delId);
    if (!error) setDeliveries(prev => prev.map(x => x.id === delId ? { ...x, ...fields } : x));
  }

  async function patch(fields) {
    setSaving(true);
    const { error } = await supabase.from("subscriptions").update(fields).eq("id", sub.id);
    setSaving(false);
    if (!error) onChanged(fields);
  }
  const saveEdits = () => patch({ interval_weeks: Number(interval), next_delivery_date: nextDate });
  const pause = () => patch({ status: "paused", paused_at: new Date().toISOString() });
  const resume = () => patch({ status: "active", paused_at: null });
  const cancel = () => patch({ status: "cancelled", cancelled_at: new Date().toISOString() });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-title">{t.sub_detail_title} · <StatusBadge status={sub.status} t={t} /></div>

        <div className="drawer-section-title">{t.sub_composition}</div>
        <table className="table" style={{ marginBottom: 16 }}>
          <thead><tr><th>{t.sub_col_items}</th><th>{t.sub_weight}</th><th>{t.sub_grind}</th><th>{t.sub_qty}</th><th style={{ textAlign: "right" }}>{t.sub_dcol_amount}</th></tr></thead>
          <tbody>
            {(sub.items || []).map((it, i) => (
              <tr key={i}>
                <td>{it.name}</td><td>{wLabel(it.weight)}</td>
                <td>{it.grind === "ground" ? t.sub_grind_ground : t.sub_grind_beans}</td>
                <td>{it.quantity || 1}</td>
                <td style={{ textAlign: "right" }}>{fmtMoney((Number(it.price) || 0) * (it.quantity || 1))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="form-row" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className="form-group">
            <label className="form-label">{t.sub_interval}</label>
            <input className="input" type="number" min="1" max="8" value={interval} style={{ width: 90 }}
              onChange={e => setIntervalW(e.target.value)} onBlur={saveEdits} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.sub_next_delivery}</label>
            <input className="input" type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} onBlur={saveEdits} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.sub_discount}</label>
            <div style={{ paddingTop: 8, fontSize: 13, fontWeight: 600, color: "#1F2937" }}>
              {tpl(t.sub_discount_line, { card: cardPct, total: 5 + cardPct })}
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="drawer-section-title" style={{ marginTop: 8 }}>{t.sub_payment_section}</div>
        <div className="form-group">
          <label className="form-label">{t.sub_payment_method}</label>
          <select className="input" value={sub.payment_method || "manual"} disabled style={{ maxWidth: 260 }}>
            <option value="manual">{t.sub_pay_manual}</option>
          </select>
        </div>
        <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, padding: 14, marginTop: 6 }}>
          <div style={{ fontWeight: 700, color: "#1F2937", fontSize: 13 }}>{t.sub_autopay_off_title}</div>
          <div style={{ color: GREY, fontSize: 12, marginTop: 4 }}>{t.sub_autopay_off_text}</div>
        </div>

        {/* Deliveries history */}
        <div className="drawer-section-title" style={{ marginTop: 18 }}>{t.sub_deliveries_history}</div>
        {deliveries.length === 0 ? (
          <div style={{ color: GREY, fontSize: 13 }}>{t.sub_no_deliveries}</div>
        ) : (
          <table className="table">
            <thead><tr><th>{t.sub_dcol_date}</th><th>{t.sub_dcol_amount}</th><th>{t.sub_dcol_status}</th><th>{t.sd_tracking}</th><th>{t.sub_dcol_payment}</th><th>{t.sub_dcol_order}</th></tr></thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td>{fmtDate(d.scheduled_date)}</td>
                  <td>{fmtMoney(d.amount)}</td>
                  <td>
                    <select className="input" style={{ padding: "4px 6px", fontSize: 12, height: "auto", minWidth: 130 }}
                      value={d.status} onChange={e => updateDelivery(d.id, { status: e.target.value })}>
                      <option value="pending">{t.sd_pending}</option>
                      <option value="processing">{t.sd_processing}</option>
                      <option value="shipped">{t.sd_shipped}</option>
                      <option value="delivered">{t.sd_delivered}</option>
                      <option value="cancelled">{t.sd_cancelled}</option>
                    </select>
                  </td>
                  <td>
                    <input className="input" style={{ padding: "4px 6px", fontSize: 12, height: "auto", width: 120 }}
                      defaultValue={d.tracking_number || ""} placeholder={t.sd_tracking}
                      onBlur={e => { const v = e.target.value.trim(); if (v !== (d.tracking_number || "")) updateDelivery(d.id, { tracking_number: v || null }); }} />
                  </td>
                  <td>{d.payment_status}</td>
                  <td>{d.order_id ? d.order_id.slice(0, 8) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="modal-actions" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 22 }}>
          {sub.status === "active" && <button className="btn btn-secondary" disabled={saving} onClick={pause}>{t.sub_pause}</button>}
          {sub.status === "paused" && <button className="btn btn-secondary" disabled={saving} onClick={resume}>{t.sub_resume}</button>}
          {sub.status !== "cancelled" && <button className="btn btn-secondary" disabled={saving} onClick={cancel}>{t.sub_cancel}</button>}
          <button className="btn btn-primary" onClick={onClose}>{t.sub_close}</button>
        </div>
      </div>
    </div>
  );
}

// ── New subscription modal ──────────────────────────────────────────────────
function NewModal({ t, clients, onClose, onCreated }) {
  const [search, setSearch] = useState("");
  const [client, setClient] = useState(null);
  const [products, setProducts] = useState([]);
  const [draft, setDraft] = useState([]); // { product, weight, grind, qty }
  const [weeks, setWeeks] = useState(4);
  const [firstDate, setFirstDate] = useState(TOMORROW);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("shop_products").select("id, name_ru, price_250, price_500, price_1000")
      .eq("is_active", true).eq("product_type", "single").order("name_ru")
      .then(({ data }) => setProducts(data || []));
  }, []);

  const priceZl = (p, w) => w === 500 ? Number(p.price_500 ?? p.price_250 * 2)
    : w === 1000 ? Number(p.price_1000 ?? p.price_250 * 4) : Number(p.price_250);

  const addProduct = (p) => setDraft(d => d.some(x => x.product.id === p.id) ? d
    : [...d, { product: p, weight: 250, grind: "beans", qty: 1 }]);
  const patchDraft = (id, patch) => setDraft(d => d.map(x => x.product.id === id ? { ...x, ...patch } : x));
  const removeDraft = (id) => setDraft(d => d.filter(x => x.product.id !== id));

  const shown = clients.filter(c => {
    const q = search.trim().toLowerCase();
    return !q || (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
  }).slice(0, 8);

  async function create() {
    if (!client || draft.length === 0) return;
    setSaving(true);
    const items = draft.map(d => ({
      product_id: d.product.id, name: d.product.name_ru,
      weight: d.weight, grind: d.grind, quantity: d.qty,
      price: Math.round(priceZl(d.product, d.weight) * 100),
    }));
    const { error } = await supabase.from("subscriptions").insert({
      user_id: client.auth_user_id, status: "active", items,
      interval_weeks: Number(weeks), next_delivery_date: firstDate,
      discount_percent: 5, payment_method: "manual",
    });
    setSaving(false);
    if (!error) onCreated();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-title">{t.sub_new_title}</div>

        <div className="form-group">
          <label className="form-label">{t.sub_pick_client}</label>
          {client ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{client.name || client.email}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setClient(null)}>✕</button>
            </div>
          ) : (
            <>
              <input className="input" placeholder={t.sub_search_client} value={search} onChange={e => setSearch(e.target.value)} />
              <div style={{ marginTop: 6 }}>
                {shown.map(c => (
                  <div key={c.id} style={{ padding: "6px 8px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #F3F4F6" }}
                    onClick={() => setClient(c)}>
                    {c.name || "—"} <span style={{ color: GREY }}>{c.email}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="drawer-section-title" style={{ marginTop: 10 }}>{t.sub_add_products}</div>
        <select className="input" value="" onChange={e => { const p = products.find(x => x.id === e.target.value); if (p) addProduct(p); }} style={{ maxWidth: 320 }}>
          <option value="">+ {t.sub_add}…</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name_ru}</option>)}
        </select>

        {draft.length === 0 ? (
          <div style={{ color: GREY, fontSize: 13, marginTop: 8 }}>{t.sub_no_items}</div>
        ) : (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {draft.map(d => (
              <div key={d.product.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", border: "1px solid #E5E7EB", borderRadius: 8, padding: 8 }}>
                <span style={{ minWidth: 120, flex: 1, fontSize: 13, fontWeight: 500 }}>{d.product.name_ru}</span>
                <select className="input" value={d.weight} onChange={e => patchDraft(d.product.id, { weight: Number(e.target.value) })} style={{ width: 90 }}>
                  <option value={250}>250г</option><option value={500}>500г</option><option value={1000}>1кг</option>
                </select>
                <select className="input" value={d.grind} onChange={e => patchDraft(d.product.id, { grind: e.target.value })} style={{ width: 130 }}>
                  <option value="beans">{t.sub_grind_beans}</option><option value="ground">{t.sub_grind_ground}</option>
                </select>
                <input className="input" type="number" min="1" value={d.qty} onChange={e => patchDraft(d.product.id, { qty: Math.max(1, Number(e.target.value)) })} style={{ width: 70 }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtMoney(Math.round(priceZl(d.product, d.weight) * 100) * d.qty)}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => removeDraft(d.product.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="form-row" style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
          <div className="form-group">
            <label className="form-label">{t.sub_interval}</label>
            <input className="input" type="number" min="1" max="8" value={weeks} onChange={e => setWeeks(e.target.value)} style={{ width: 90 }} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.sub_first_date}</label>
            <input className="input" type="date" value={firstDate} onChange={e => setFirstDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.sub_payment_method}</label>
            <select className="input" value="manual" disabled style={{ maxWidth: 200 }}><option value="manual">{t.sub_pay_manual}</option></select>
          </div>
        </div>

        <div className="modal-actions" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose}>{t.sub_close}</button>
          <button className="btn btn-primary" disabled={saving || !client || draft.length === 0} onClick={create}>{t.sub_create}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main section ────────────────────────────────────────────────────────────
export default function Subscriptions({ lang }) {
  const t = T[lang];
  const [subs, setSubs] = useState([]);
  const [users, setUsers] = useState({});
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState("all");
  const [payF, setPayF] = useState("all");
  const [detail, setDetail] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: u }] = await Promise.all([
      supabase.from("subscriptions").select("*").order("next_delivery_date", { ascending: true }),
      supabase.from("shop_users").select("id, auth_user_id, name, email, discount_pct"),
    ]);
    setSubs(s || []);
    const map = {};
    (u || []).forEach(x => { if (x.auth_user_id) map[x.auth_user_id] = x; });
    setUsers(map);
    setClients((u || []).filter(x => x.auth_user_id));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const clientOf = (uid) => users[uid] || null;
  const clientName = (uid) => users[uid]?.name || users[uid]?.email || (uid ? uid.slice(0, 8) : "—");

  const filtered = subs.filter(s =>
    (statusF === "all" || s.status === statusF) &&
    (payF === "all" || s.payment_method === payF)
  );

  const selStyle = { padding: "7px 10px", borderRadius: 6, border: "1px solid #E0E4EA", fontSize: 13, background: "#fff" };

  return (
    <div>
      <div className="topbar"><span className="topbar-title">{t.sub_title}</span></div>
      <div className="content">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <select style={selStyle} value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="all">{t.sub_filter_status}: {t.sub_filter_all}</option>
            <option value="active">{t.sub_status_active}</option>
            <option value="paused">{t.sub_status_paused}</option>
            <option value="cancelled">{t.sub_status_cancelled}</option>
          </select>
          <select style={selStyle} value={payF} onChange={e => setPayF(e.target.value)}>
            <option value="all">{t.sub_filter_payment}: {t.sub_filter_all}</option>
            <option value="manual">{t.sub_pay_manual}</option>
            <option value="przelewy24_card">{t.sub_pay_card}</option>
            <option value="przelewy24_blik">{t.sub_pay_blik}</option>
          </select>
          <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setShowNew(true)}>{t.sub_new}</button>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 24, color: GREY }}>{t.sub_loading}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, color: GREY }}>{t.sub_empty}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t.sub_col_client}</th><th>{t.sub_col_items}</th><th>{t.sub_col_interval}</th>
                  <th>{t.sub_col_payment}</th><th>{t.sub_col_next}</th><th>{t.sub_col_status}</th>
                  <th>{t.sub_col_deliveries}</th><th>{t.sub_col_created}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => setDetail(s)}>
                    <td style={{ fontWeight: 600 }}>{clientName(s.user_id)}</td>
                    <td style={{ maxWidth: 260 }}>{itemsSummary(s.items)}</td>
                    <td>{tpl(t.sub_every, { n: s.interval_weeks })}</td>
                    <td><PayBadge method={s.payment_method} t={t} /></td>
                    <td><NextBadge date={s.next_delivery_date} t={t} /></td>
                    <td><StatusBadge status={s.status} t={t} /></td>
                    <td>{s.total_deliveries || 0}</td>
                    <td>{fmtDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {detail && (
        <DetailModal sub={detail} user={clientOf(detail.user_id)} t={t}
          onClose={() => { setDetail(null); load(); }}
          onChanged={(fields) => {
            setDetail(d => d ? { ...d, ...fields } : d);
            setSubs(prev => prev.map(x => x.id === detail.id ? { ...x, ...fields } : x));
          }} />
      )}
      {showNew && (
        <NewModal t={t} clients={clients}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }} />
      )}
    </div>
  );
}
