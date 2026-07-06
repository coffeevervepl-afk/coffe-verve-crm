import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { T } from "../../lib/i18n";

const fmtMoney = (n) => n != null ? `${Number(n).toFixed(2)} zł` : "—";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("ru-RU") : "—";
const LANG_FLAG = { ru: "🇷🇺", pl: "🇵🇱", ua: "🇺🇦" };
function getOrderStatusLabels(t) {
  return {
    new: t.shop_status_new, confirmed: t.shop_status_confirmed, processing: t.shop_status_processing,
    shipped: t.shop_status_shipped, delivered: t.shop_status_delivered, cancelled: t.shop_status_cancelled,
  };
}
const NINETY_DAYS_MS = 90 * 24 * 3600 * 1000;
function tpl(str, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), str);
}

function compositionText(items) {
  if (!items || items.length === 0) return "—";
  return items.map(i => `${i.product_name} ${i.weight}g ×${i.quantity}`).join(", ");
}

export default function ShopCustomers({ lang, onOpenOrder }) {
  const t = T[lang];
  const FILTERS = [
    { key: "all", label: t.review_all },
    { key: "classic", label: "Classic" },
    { key: "gold", label: "Gold" },
    { key: "platinum", label: "Platinum" },
    { key: "b2b", label: "B2B" },
    { key: "inactive", label: t.cust_filter_inactive },
    { key: "abandoned", label: t.cust_filter_abandoned },
  ];
  const [customers, setCustomers] = useState([]);
  const [orderCounts, setOrderCounts] = useState({});
  const [abandonedIds, setAbandonedIds] = useState(new Set());
  const [config, setConfig] = useState({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [usersRes, ordersRes, cartsRes, cfgRes] = await Promise.all([
      supabase.from("shop_users").select("*").order("spent_12m", { ascending: false, nullsFirst: false }),
      supabase.from("shop_orders").select("shop_user_id"),
      supabase.from("shop_carts").select("shop_user_id, items, expires_at").not("shop_user_id", "is", null),
      supabase.from("loyalty_config").select("key, value"),
    ]);
    if (usersRes.error) showToast(t.cust_err_load_customers + usersRes.error.message);
    if (ordersRes.error) showToast(t.prod_err_load_orders + ordersRes.error.message);
    if (cartsRes.error) showToast(t.cust_err_load_carts + cartsRes.error.message);
    if (cfgRes.error) showToast(t.cust_err_load_loyalty_cfg + cfgRes.error.message);

    const counts = {};
    (ordersRes.data || []).forEach(o => {
      if (!o.shop_user_id) return;
      counts[o.shop_user_id] = (counts[o.shop_user_id] || 0) + 1;
    });
    setOrderCounts(counts);

    const abandoned = new Set();
    (cartsRes.data || []).forEach(c => {
      const hasItems = Array.isArray(c.items) && c.items.length > 0;
      const notExpired = !c.expires_at || new Date(c.expires_at) > new Date();
      if (hasItems && notExpired) abandoned.add(c.shop_user_id);
    });
    setAbandonedIds(abandoned);

    const cfg = {};
    (cfgRes.data || []).forEach(r => { cfg[r.key] = Number(r.value); });
    setConfig(cfg);

    setCustomers(usersRes.data || []);
    setLoading(false);
  }, [t]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const now = Date.now();
  const isInactive = (c) => !c.last_purchase_at || (now - new Date(c.last_purchase_at).getTime()) > NINETY_DAYS_MS;

  const filtered = customers.filter(c => {
    const matchFilter = filter === "all" ? true
      : filter === "b2b" ? c.is_b2b
      : filter === "inactive" ? isInactive(c)
      : filter === "abandoned" ? abandonedIds.has(c.id)
      : (c.loyalty_level || "classic") === filter && !c.is_b2b;
    const q = search.toLowerCase();
    const matchSearch = !q || (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  function remindAbandoned(c) {
    showToast(tpl(t.cust_remind_toast, { name: c.name || c.email }));
  }

  return (
    <div>
      <div className="topbar"><span className="topbar-title">{t.nav_shop_customers} ({customers.length})</span></div>
      <div className="content">
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button key={f.key} className={"btn btn-sm " + (filter === f.key ? "btn-primary" : "btn-secondary")} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <input className="search-bar" placeholder={t.cust_search_placeholder} value={search} onChange={e => setSearch(e.target.value)} />
        {loading ? <div className="empty-state">{t.loading}</div> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{t.name}</th><th>{t.email}</th><th>{t.cust_level_col}</th><th>{t.orders_count}</th>
                  <th>{t.cust_spent_12m_col}</th><th>{t.cust_last_purchase_col}</th><th>{t.cust_discount_until_col}</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={8} className="empty-state">{t.cust_no_customers}</td></tr> : filtered.map(c => {
                  const minActive = c.min_discount_until && new Date(c.min_discount_until) > new Date();
                  const inactive = isInactive(c);
                  return (
                    <tr key={c.id} style={inactive ? { background: "#FFF7F7" } : undefined}>
                      <td style={{ cursor: "pointer", fontWeight: 500 }} onClick={() => setSelected(c)}>
                        <span style={{ marginRight: 5 }}>{LANG_FLAG[c.language] || ""}</span>{c.name || "—"}
                      </td>
                      <td style={{ color: "#6B7280", fontSize: 12 }}>{c.email}</td>
                      <td>
                        {c.is_b2b
                          ? <span className="level-badge level-b2b">B2B</span>
                          : <span className={"level-badge level-" + (c.loyalty_level || "classic")}>{(c.loyalty_level || "classic")}</span>}
                      </td>
                      <td style={{ textAlign: "center", color: "#4B5563" }}>{orderCounts[c.id] || 0}</td>
                      <td style={{ fontWeight: 600 }}>{fmtMoney(c.spent_12m || 0)}</td>
                      <td style={{ fontSize: 12 }}>
                        {c.last_purchase_at ? (
                          <span style={{ color: inactive ? "#DC2626" : "#6B7280" }}>
                            {fmtDate(c.last_purchase_at)}
                            {inactive && <span style={{ marginLeft: 4, fontSize: 10, background: "#FEE2E2", color: "#DC2626", padding: "1px 5px", borderRadius: 4 }}>90+</span>}
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {minActive ? <span style={{ color: "#16A34A", fontWeight: 500 }}>✓ {fmtDate(c.min_discount_until)}</span> : "—"}
                      </td>
                      <td>
                        {abandonedIds.has(c.id) && (
                          <button className="btn btn-sm" style={{ background: "#FEF3C7", color: "#92400E" }} onClick={() => remindAbandoned(c)}>
                            {t.cust_remind_btn}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && <CustomerDrawer t={t} customer={selected} config={config} onClose={() => setSelected(null)} onError={showToast} onOpenOrder={onOpenOrder} />}
      {toast && <div className="print-toast">{toast}</div>}
    </div>
  );
}

function flattenStrings(value, acc) {
  if (value == null) return acc;
  if (typeof value === "string") { acc.push(value.toLowerCase()); return acc; }
  if (Array.isArray(value)) { value.forEach(v => flattenStrings(v, acc)); return acc; }
  if (typeof value === "object") { Object.values(value).forEach(v => flattenStrings(v, acc)); return acc; }
  return acc;
}

function CustomerDrawer({ t, customer, config, onClose, onError, onOpenOrder }) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [crmClient, setCrmClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const ORDER_STATUS_LABELS = getOrderStatusLabels(t);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [ordersRes, productsRes, crmRes] = await Promise.all([
        supabase.from("shop_orders").select("id, order_number, created_at, total, status, shop_order_items(product_name, weight, quantity)").eq("shop_user_id", customer.id).order("created_at", { ascending: false }),
        supabase.from("shop_products").select("name_ru, flavor_notes_ru, origin").eq("is_active", true),
        customer.crm_client_id
          ? supabase.from("clients").select("id, name, client_code").eq("id", customer.crm_client_id).maybeSingle()
          : (customer.email
            ? supabase.from("clients").select("id, name, client_code").ilike("email", customer.email).maybeSingle()
            : Promise.resolve({ data: null, error: null })),
      ]);
      if (cancelled) return;
      if (ordersRes.error) onError(t.prod_err_load_orders + ordersRes.error.message);
      setOrders(ordersRes.data || []);
      setProducts(productsRes.data || []);
      setCrmClient(crmRes.data || null);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [customer.id, customer.crm_client_id, customer.email, onError]);

  const tasteTerms = flattenStrings(customer.taste_profile, []);
  const suggestions = tasteTerms.length === 0 ? [] : products
    .map(p => {
      const notes = (p.flavor_notes_ru || "").toLowerCase();
      const score = tasteTerms.reduce((s, term) => s + (notes.includes(term) ? 1 : 0), 0);
      return { ...p, score };
    })
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const goldThreshold = config.gold_threshold || 600;
  const platinumThreshold = config.platinum_threshold || 1800;
  const spent = Number(customer.spent_12m || 0);
  const nextThreshold = customer.loyalty_level === "platinum" ? null : customer.loyalty_level === "gold" ? platinumThreshold : goldThreshold;
  const progressPct = nextThreshold ? Math.min(100, Math.round((spent / nextThreshold) * 100)) : 100;
  const minActive = customer.min_discount_until && new Date(customer.min_discount_until) > new Date();

  return (
    <div className="drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer">
        <div className="drawer-header">
          <span className="drawer-title">{customer.name || customer.email}</span>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body">

          <div className="drawer-section">
            <div className="drawer-section-title">{t.cust_loyalty_section}</div>
            <div className="detail-row">
              <span className="detail-label">{t.cust_level_col}</span>
              <span>{customer.is_b2b ? <span className="level-badge level-b2b">B2B</span> : <span className={"level-badge level-" + (customer.loyalty_level || "classic")}>{customer.loyalty_level || "classic"}</span>}</span>
            </div>
            {!customer.is_b2b && nextThreshold && (
              <div style={{ margin: "8px 0" }}>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${progressPct}%` }} /></div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{tpl(t.cust_of_next_level, { spent: fmtMoney(spent), next: fmtMoney(nextThreshold) })}</div>
              </div>
            )}
            <div className="detail-row"><span className="detail-label">{t.cust_spent_12m_label}</span><span className="detail-value">{fmtMoney(spent)}</span></div>
            <div className="detail-row"><span className="detail-label">{t.cust_discount_until_col}</span><span className="detail-value">{minActive ? `✓ ${fmtDate(customer.min_discount_until)}` : "—"}</span></div>
            <div className="detail-row"><span className="detail-label">{t.cust_referral_code_label}</span><span className="detail-value">{customer.referral_code ? <span className="promo-tag">{customer.referral_code}</span> : "—"}</span></div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.cust_order_history_title}</div>
            {loading ? t.loading : orders.length === 0 ? <div style={{ fontSize: 12, color: "#9CA3AF" }}>{t.cust_no_orders}</div> : orders.map(o => (
              <div key={o.id}
                style={{ padding: "8px 0", borderBottom: "1px solid #F3F4F6", cursor: onOpenOrder ? "pointer" : "default" }}
                onClick={() => onOpenOrder?.(o.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span className="detail-label">№{o.order_number} · {fmtDate(o.created_at)}</span>
                  <span className="detail-value">{fmtMoney(o.total)} · {ORDER_STATUS_LABELS[o.status] || o.status}</span>
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{compositionText(o.shop_order_items)}</div>
              </div>
            ))}
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.cust_taste_profile_title}</div>
            {tasteTerms.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>{t.cust_quiz_not_taken}</div>
            ) : (
              <>
                <div className="chip-list" style={{ marginBottom: 10 }}>
                  {tasteTerms.map((term, i) => <span key={i} className="chip selected">{term}</span>)}
                </div>
                <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>{t.cust_what_to_suggest}</div>
                {suggestions.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>{t.cust_no_taste_matches}</div>
                ) : suggestions.map((p, i) => (
                  <div key={i} className="detail-row"><span className="detail-label">{p.name_ru}</span><span className="detail-value" style={{ fontSize: 11 }}>{p.origin}</span></div>
                ))}
              </>
            )}
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.cust_crm_link_title}</div>
            {crmClient ? (
              <div style={{ fontSize: 13, color: "#16A34A" }}>{t.cust_is_crm_client}<b>{crmClient.name}</b> ({crmClient.client_code || t.cust_no_code})</div>
            ) : (
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>{t.cust_no_crm_match}</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
