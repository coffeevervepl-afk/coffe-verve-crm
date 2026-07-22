import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { T } from "../../lib/i18n";

const fmtDate = (d) => d ? new Date(d).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtMoney = (n) => n != null ? `${Number(n).toFixed(2)} zł` : "—";
function tpl(str, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), str);
}

function sizeFromName(name) {
  if (/\bS\b/i.test(name)) return "S";
  if (/\bM\b/i.test(name)) return "M";
  if (/\bL\b/i.test(name)) return "L";
  return null;
}
function suggestBoxSize(totalKg) {
  if (totalKg <= 1) return "S";
  if (totalKg <= 3) return "M";
  return "L";
}

// Сайт пишет telegram-юзернейм в shop_orders.customer_telegram (гостевой
// заказ) или в shop_users.telegram (зарегистрированный покупатель) — берём
// первое непустое значение и нормализуем (убираем ведущий @, пробелы).
function telegramUsername(order) {
  const raw = order.customer_telegram || order.shop_users?.telegram;
  if (!raw) return null;
  const clean = raw.trim().replace(/^@+/, "");
  return clean || null;
}

function getStatusLabels(t) {
  return {
    new: t.shop_status_new, confirmed: t.shop_status_confirmed, processing: t.shop_status_processing,
    shipped: t.shop_status_shipped, delivered: t.shop_status_delivered, cancelled: t.shop_status_cancelled,
  };
}
const STATUS_PILL = {
  new: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  confirmed: { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" },
  processing: { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" },
  shipped: { bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE" },
  delivered: { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" },
  cancelled: { bg: "#FFF1F2", color: "#BE123C", border: "#FECDD3" },
};
function getPaymentLabels(t) {
  return { pending: t.so_payment_pending, paid: t.so_payment_paid, failed: t.so_payment_failed, refunded: t.so_payment_refunded };
}
function getDeliveryLabels(t) {
  return { paczkomat: t.so_delivery_paczkomat, courier: t.so_delivery_courier, pickup: t.so_delivery_pickup };
}
const LANG_FLAG = { ru: "🇷🇺", pl: "🇵🇱", ua: "🇺🇦" };

function getTabs(t) {
  return [
    { key: "new", label: t.so_tab_new, match: (o) => o.status === "new" },
    { key: "confirmed", label: t.so_tab_confirmed, match: (o) => o.status === "confirmed" },
    { key: "processing", label: t.so_tab_processing, match: (o) => o.status === "processing" },
    { key: "shipped", label: t.so_tab_shipped, match: (o) => o.status === "shipped" },
    { key: "delivered", label: t.so_tab_delivered, match: (o) => o.status === "delivered" },
    { key: "problem", label: t.so_tab_problem, match: (o) => o.status === "cancelled" || o.payment_status === "failed" || o.payment_status === "refunded" },
    { key: "all", label: t.review_all, match: () => true },
  ];
}

const STATUS_WORD_BY_LANG = {
  ru: { new: "новый", confirmed: "оплачен", processing: "собирается", shipped: "отправлен", delivered: "доставлен", cancelled: "отменён" },
  pl: { new: "nowe", confirmed: "opłacone", processing: "w przygotowaniu", shipped: "wysłane", delivered: "dostarczone", cancelled: "anulowane" },
  ua: { new: "нове", confirmed: "оплачено", processing: "збирається", shipped: "відправлено", delivered: "доставлено", cancelled: "скасовано" },
};

function buildMessageText(order) {
  const lang = ["ru", "pl", "ua"].includes(order.language) ? order.language : "ru";
  const statusWord = STATUS_WORD_BY_LANG[lang][order.status] || order.status;
  const templates = {
    ru: `Здравствуйте, ${order.customer_name}! Ваш заказ №${order.order_number} в Coffee Verve — статус: ${statusWord}. Спасибо, что вы с нами! ☕`,
    pl: `Dzień dobry, ${order.customer_name}! Twoje zamówienie nr ${order.order_number} w Coffee Verve — status: ${statusWord}. Dziękujemy! ☕`,
    ua: `Доброго дня, ${order.customer_name}! Ваше замовлення №${order.order_number} у Coffee Verve — статус: ${statusWord}. Дякуємо, що ви з нами! ☕`,
  };
  return templates[lang];
}

const GRIND_LABELS = {
  espresso: "Эспрессо / Espresso",
  aeropress: "Аэропресс / Aeropress",
  pourover: "Пуровер / Кемекс / Drip / Chemex",
  frenchpress: "Френч-пресс / French press",
  turka: "Турка / Tygielek",
  moka: "Мока / Kawiarka",
};
function grindInfo(item) {
  if (item.grind === "ground" && item.grind_option && GRIND_LABELS[item.grind_option]) {
    return { ground: true, label: `Молотый · ${GRIND_LABELS[item.grind_option]}` };
  }
  return { ground: false, label: "В зёрнах / W ziarnach" };
}
function GrindBadge({ item }) {
  const gi = grindInfo(item);
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 600, padding: "1px 8px",
      borderRadius: 10, marginTop: 3,
      background: gi.ground ? "#EFF6FF" : "#F3F4F6",
      color: gi.ground ? "#2B58A1" : "#6B7280",
    }}>
      {gi.label}
    </span>
  );
}

function compositionSummary(items, t) {
  if (!items || items.length === 0) return { short: "—", full: "" };
  const first = items[0];
  const shortText = `${first.product_name} ${first.weight}${t.unit_g} ×${first.quantity}` + (items.length > 1 ? tpl(t.so_more_suffix, { n: items.length - 1 }) : "");
  const full = items.map(i => `${i.product_name} ${i.weight}${t.unit_g} ×${i.quantity}`).join("\n");
  return { short: shortText, full };
}

export default function ShopOrders({ lang, openOrderId, onOpenOrderHandled, onOpenSubscription }) {
  const t = T[lang];
  const TABS = getTabs(t);
  const STATUS_LABELS = getStatusLabels(t);
  const PAYMENT_LABELS = getPaymentLabels(t);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("new");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [contactOrder, setContactOrder] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shop_orders")
      .select("*, shop_order_items(product_name, weight, quantity, unit_price, line_total, grind, grind_option, shop_product_id, custom_bundle_group), shop_users(telegram)")
      .order("created_at", { ascending: false });
    if (error) showToast(t.prod_err_load_orders + error.message);
    setOrders(data || []);
    setLoading(false);
  }, [t]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!openOrderId || orders.length === 0) return;
    const found = orders.find(o => o.id === openOrderId);
    if (found) setSelected(found);
    else showToast(t.so_order_not_found);
    onOpenOrderHandled?.();
  }, [openOrderId, orders]); // eslint-disable-line

  async function changeStatus(id, status) {
    const { error } = await supabase.from("shop_orders").update({ status }).eq("id", id);
    if (error) { showToast(t.so_err_save_status + error.message); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    setSelected(prev => prev && prev.id === id ? { ...prev, status } : prev);
  }

  function handleUpdated(updated) {
    setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
    setSelected(prev => prev && prev.id === updated.id ? { ...prev, ...updated } : prev);
  }

  const activeTab = TABS.find(tb => tb.key === tab) || TABS[0];
  const bySearch = (o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.customer_name?.toLowerCase().includes(q) || o.customer_email?.toLowerCase().includes(q) || String(o.order_number).includes(q);
  };
  const filtered = orders.filter(o => activeTab.match(o) && bySearch(o) && (sourceFilter === "all" || (o.source || "manual") === sourceFilter));

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">{t.nav_shop_orders} ({filtered.length})</span>
      </div>
      <div className="content">
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {TABS.map(tb => (
            <button key={tb.key} className={"btn btn-sm " + (tab === tb.key ? "btn-primary" : "btn-secondary")} onClick={() => setTab(tb.key)}>
              {tb.label} ({orders.filter(tb.match).length})
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[["all", t.so_src_all], ["manual", t.so_src_manual], ["subscription", t.so_src_subscription], ["bundle", t.so_src_bundle]].map(([k, label]) => (
            <button key={k} className={"btn btn-sm " + (sourceFilter === k ? "btn-primary" : "btn-secondary")} onClick={() => setSourceFilter(k)}>{label}</button>
          ))}
        </div>
        <input className="search-bar" placeholder={t.so_search_placeholder} value={search} onChange={e => setSearch(e.target.value)} />
        {loading ? <div className="empty-state">{t.loading}</div> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>№</th><th>{t.date}</th><th>{t.client}</th><th>{t.so_composition_col}</th><th>{t.so_amount_col}</th>
                  <th>{t.so_payment_col}</th><th>{t.status}</th><th>{t.so_actions_col}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={8} className="empty-state">{t.so_no_orders}</td></tr> : filtered.map(o => {
                  const comp = compositionSummary(o.shop_order_items, t);
                  return (
                    <tr key={o.id}>
                      <td style={{ color: "#4B5563", fontSize: 12 }}>
                        {o.order_number}
                        {o.source === "subscription" && (
                          <div style={{ marginTop: 3 }}>
                            <span onClick={e => { e.stopPropagation(); if (onOpenSubscription && o.subscription_id) onOpenSubscription(o.subscription_id); }}
                              style={{ cursor: "pointer", display: "inline-block", padding: "1px 7px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
                              {t.so_src_subscription}
                            </span>
                          </div>
                        )}
                        {o.source === "bundle" && (
                          <div style={{ marginTop: 3 }}>
                            <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }}>{t.so_src_bundle}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ color: "#4B5563", fontSize: 12 }}>{fmtDate(o.created_at)}</td>
                      <td style={{ cursor: "pointer" }} onClick={() => setSelected(o)}>
                        <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{LANG_FLAG[o.language] || ""}</span>{o.customer_name}
                        </div>
                        <div style={{ fontSize: 11, color: "#4B5563" }}>{o.customer_email}</div>
                      </td>
                      <td style={{ color: "#6B7280", fontSize: 12, maxWidth: 220 }}>
                        <span className="composition-tip">
                          {comp.short}
                          {o.shop_order_items?.length > 1 && (
                            <span className="composition-tip-box">{comp.full.split("\n").map((l, i) => <div key={i}>{l}</div>)}</span>
                          )}
                        </span>
                      </td>
                      <td style={{ color: "#16A34A", fontWeight: 600 }}>{fmtMoney(o.total)}</td>
                      <td style={{ fontSize: 12 }}>{PAYMENT_LABELS[o.payment_status] || o.payment_status}</td>
                      <td>
                        <select
                          className="status-select-pill"
                          style={{ background: STATUS_PILL[o.status]?.bg, color: STATUS_PILL[o.status]?.color, borderColor: STATUS_PILL[o.status]?.border }}
                          value={o.status}
                          onChange={e => changeStatus(o.id, e.target.value)}
                        >
                          {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="action-icon-btn" title={t.open_order_action} onClick={() => setSelected(o)}>👁</button>
                        <button className="action-icon-btn" title={t.so_write_title} onClick={() => setContactOrder(o)}>📱</button>
                        <button className="action-icon-btn" title={t.so_print_label_title} onClick={() => showToast(t.so_print_labels_later)}>🖨</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && (
        <OrderDrawer t={t} order={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} onContact={(o) => setContactOrder(o)} onError={showToast} onOpenSubscription={onOpenSubscription} />
      )}
      {contactOrder && <ContactModal t={t} order={contactOrder} onClose={() => setContactOrder(null)} />}
      {toast && <div className="print-toast">{toast}</div>}
    </div>
  );
}

function ContactModal({ t, order, onClose }) {
  const text = buildMessageText(order);
  const hasWhatsapp = !!order.customer_phone;
  const waPhone = hasWhatsapp ? order.customer_phone.replace(/[^\d]/g, "") : "";
  const tgUsername = telegramUsername(order);
  const hasTelegram = !!tgUsername;

  function openEmail() {
    window.open(`mailto:${order.customer_email}?subject=${encodeURIComponent(t.so_email_subject + order.order_number)}&body=${encodeURIComponent(text)}`, "_blank");
    onClose();
  }
  function openWhatsapp() {
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, "_blank");
    onClose();
  }
  function openTelegram() {
    window.open(`https://t.me/${tgUsername}`, "_blank");
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-title">{t.so_contact_title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className={"channel-item"} style={{ border: "1px solid #E5E7EB", borderRadius: 8 }} onClick={openEmail}>{t.so_email_channel}</div>
          <div className={"channel-item" + (hasWhatsapp ? "" : " disabled")} style={{ border: "1px solid #E5E7EB", borderRadius: 8 }} onClick={hasWhatsapp ? openWhatsapp : undefined}>
            {t.so_whatsapp_channel} {!hasWhatsapp && t.so_no_phone}
          </div>
          <div className={"channel-item" + (hasTelegram ? "" : " disabled")} style={{ border: "1px solid #E5E7EB", borderRadius: 8 }} onClick={hasTelegram ? openTelegram : undefined}>
            {t.so_telegram_channel} {hasTelegram ? `@${tgUsername}` : t.so_no_telegram}
          </div>
        </div>
        <div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>{t.close}</button></div>
      </div>
    </div>
  );
}

function OrderDrawer({ t, order, onClose, onUpdated, onContact, onError, onOpenSubscription }) {
  const [tracking, setTracking] = useState(order.tracking_number || "");
  const [savingTracking, setSavingTracking] = useState(false);
  const [promo, setPromo] = useState(null);
  const [bundleMap, setBundleMap] = useState({}); // shop_product_id -> { isBundle, items:[{name,weight}] }
  const [refunding, setRefunding] = useState(false);
  const [subInfo, setSubInfo] = useState(null);
  const STATUS_LABELS = getStatusLabels(t);
  const PAYMENT_LABELS = getPaymentLabels(t);
  const DELIVERY_LABELS = getDeliveryLabels(t);

  useEffect(() => {
    let cancelled = false;
    supabase.from("promo_code_uses").select("*, shop_promo_codes(code)").eq("order_id", order.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) onError(t.so_err_load_promo + error.message);
        setPromo(data);
      });
    return () => { cancelled = true; };
  }, [order.id, onError, t]);

  useEffect(() => {
    if (order.source !== "subscription" || !order.subscription_id) { setSubInfo(null); return; }
    let cancelled = false;
    (async () => {
      const [{ data: sub }, { data: dels }] = await Promise.all([
        supabase.from("subscriptions").select("interval_weeks, next_delivery_date").eq("id", order.subscription_id).maybeSingle(),
        supabase.from("subscription_deliveries").select("id, scheduled_date").eq("subscription_id", order.subscription_id).order("scheduled_date", { ascending: true }),
      ]);
      if (cancelled) return;
      const list = dels || [];
      const idx = list.findIndex(d => d.id === order.subscription_delivery_id);
      setSubInfo({ sub, num: idx >= 0 ? idx + 1 : null, count: list.length });
    })();
    return () => { cancelled = true; };
  }, [order.id, order.source, order.subscription_id, order.subscription_delivery_id]);

  // Pull composition for any bundle product in this order (name + weight per sort).
  useEffect(() => {
    let cancelled = false;
    const ids = [...new Set((order.shop_order_items || []).map(it => it.shop_product_id).filter(Boolean))];
    if (ids.length === 0) { setBundleMap({}); return; }
    supabase.from("shop_products")
      .select("id, product_type, bundle_items:shop_bundle_items!shop_bundle_items_bundle_id_fkey(weight, component:shop_products!shop_bundle_items_product_id_fkey(name_ru))")
      .in("id", ids)
      .then(({ data, error }) => {
        if (cancelled || error) return;
        const m = {};
        (data || []).forEach(p => {
          m[p.id] = {
            isBundle: p.product_type === "bundle",
            items: (p.bundle_items || []).map(bi => ({ name: bi.component?.name_ru || "—", weight: bi.weight })),
          };
        });
        setBundleMap(m);
      });
    return () => { cancelled = true; };
  }, [order.id]);

  async function saveTracking() {
    setSavingTracking(true);
    const { error } = await supabase.from("shop_orders").update({ tracking_number: tracking || null }).eq("id", order.id);
    setSavingTracking(false);
    if (error) { onError(t.so_err_save_tracking + error.message); return; }
    onUpdated({ id: order.id, tracking_number: tracking || null });
    onError(t.so_tracking_saved);
  }

  async function changeStatus(status) {
    const { error } = await supabase.from("shop_orders").update({ status }).eq("id", order.id);
    if (error) { onError(t.so_err_save_status + error.message); return; }
    onUpdated({ id: order.id, status });
  }

  async function doRefund() {
    if (!window.confirm(tpl(t.so_confirm_refund, { num: order.order_number }))) return;
    setRefunding(true);
    const { error } = await supabase.from("shop_orders").update({ payment_status: "refunded" }).eq("id", order.id);
    if (error) { onError(t.so_err_refund + error.message); setRefunding(false); return; }
    if (order.crm_order_id) {
      const { error: wErr } = await supabase.from("warranties").insert([{
        order_id: order.crm_order_id,
        reason: tpl(t.so_refund_warranty_reason, { num: order.order_number }),
        resolution: "refund",
        status: "new",
      }]);
      if (wErr) onError(t.so_refund_warranty_err + wErr.message);
    }
    onUpdated({ id: order.id, payment_status: "refunded" });
    setRefunding(false);
    onError(t.so_refund_done);
  }

  const addr = order.delivery_address || {};
  const addrText = order.delivery_type === "paczkomat"
    ? [addr.paczkomat_id, addr.paczkomat_name, addr.paczkomat_address].filter(Boolean).join(" · ") || "—"
    : order.delivery_type === "courier"
      ? [addr.street, addr.city, addr.postal_code].filter(Boolean).join(", ") || "—"
      : t.so_pickup_text;

  return (
    <div className="drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer">
        <div className="drawer-header">
          <span className="drawer-title">{t.so_order_word} №{order.order_number} {LANG_FLAG[order.language] || ""}</span>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body">

          {order.source === "subscription" && (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: "#1D4ED8", fontSize: 13, marginBottom: 6 }}>{t.so_sub_info}</div>
              <div style={{ fontSize: 13, color: "#1F2937", display: "flex", flexDirection: "column", gap: 3 }}>
                {subInfo && subInfo.num && <div>{tpl(t.so_sub_delivery_num, { n: subInfo.num, total: subInfo.count })}</div>}
                {subInfo && subInfo.sub && <div>{t.sub_interval}: {tpl(t.sub_every, { n: subInfo.sub.interval_weeks })}</div>}
                {subInfo && subInfo.sub && <div>{t.sub_next_delivery}: {fmtDate(subInfo.sub.next_delivery_date)}</div>}
              </div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}
                onClick={() => onOpenSubscription && order.subscription_id && onOpenSubscription(order.subscription_id)}>
                {t.so_sub_open}
              </button>
            </div>
          )}

          <div className="drawer-section">
            <div className="drawer-section-title">{t.so_composition_col}</div>
            {(() => {
              const customGroups = {};
              const regular = [];
              (order.shop_order_items || []).forEach(it => {
                if (it.custom_bundle_group) {
                  (customGroups[it.custom_bundle_group] = customGroups[it.custom_bundle_group] || []).push(it);
                } else { regular.push(it); }
              });
              const rows = [];
              regular.forEach((it, i) => {
                const comp = bundleMap[it.shop_product_id];
                const isBundle = comp?.isBundle && comp.items.length > 0;
                const totalW = isBundle ? comp.items.reduce((s, c) => s + (Number(c.weight) || 0), 0) : it.weight;
                rows.push(
                  <div key={"r" + i} style={{ padding: "9px 0", borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                      <span className="detail-label">{isBundle ? "📦 " : ""}{it.product_name} {totalW}{t.unit_g} ×{it.quantity}</span>
                      <span className="detail-value">{fmtMoney(it.line_total)}</span>
                    </div>
                    {isBundle ? (
                      <div style={{ marginTop: 4 }}>
                        {comp.items.map((c, ci) => (
                          <div key={ci} style={{ paddingLeft: 24, fontSize: 13, color: "#6E6D68" }}>
                            └ {c.name} · {c.weight}{t.unit_g} · {grindInfo(it).label}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <GrindBadge item={it} />
                    )}
                  </div>
                );
              });
              Object.keys(customGroups).forEach(gid => {
                const its = customGroups[gid];
                const totalW = its.reduce((s, x) => s + (Number(x.weight) || 0), 0);
                const totalP = its.reduce((s, x) => s + (Number(x.line_total) || 0), 0);
                rows.push(
                  <div key={"c" + gid} style={{ padding: "9px 0", borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                      <span className="detail-label">📦 {t.so_custom_bundle} {totalW}{t.unit_g}</span>
                      <span className="detail-value">{fmtMoney(totalP)}</span>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {its.map((x, xi) => (
                        <div key={xi} style={{ paddingLeft: 24, fontSize: 13, color: "#6E6D68" }}>
                          └ {x.product_name} · {x.weight}{t.unit_g} · {grindInfo(x).label}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
              return rows;
            })()}
            {promo?.shop_promo_codes?.code && (
              <div className="detail-row">
                <span className="detail-label">{t.promo_code}</span>
                <span><span className="promo-tag">{promo.shop_promo_codes.code}</span> −{fmtMoney(order.discount_amount)}</span>
              </div>
            )}
            <div className="detail-row"><span className="detail-label">{t.so_delivery_section}</span><span className="detail-value">{fmtMoney(order.delivery_cost)}</span></div>
            <div className="detail-row"><span className="detail-label" style={{ fontWeight: 700 }}>{t.total}</span><span className="detail-value" style={{ color: "#16A34A" }}>{fmtMoney(order.total)}</span></div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.client}</div>
            <div className="detail-row"><span className="detail-label">{t.name}</span><span className="detail-value">{order.customer_name}</span></div>
            <div className="detail-row"><span className="detail-label">{t.email}</span><span className="detail-value">{order.customer_email}</span></div>
            <div className="detail-row"><span className="detail-label">{t.phone}</span><span className="detail-value">{order.customer_phone || "—"}</span></div>
            <div className="detail-row"><span className="detail-label">{t.language}</span><span className="detail-value">{LANG_FLAG[order.language] || "—"}</span></div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>{t.so_customer_profile_hint}</div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.so_delivery_section}</div>
            <div className="detail-row"><span className="detail-label">{t.so_method_label}</span><span className="detail-value">{DELIVERY_LABELS[order.delivery_type] || order.delivery_type}</span></div>
            <div className="detail-row"><span className="detail-label">{t.so_address_point_label}</span><span className="detail-value" style={{ textAlign: "right" }}>{addrText}</span></div>
            <div className="form-group" style={{ marginTop: 10 }}>
              <label className="form-label">{t.so_tracking_number_label}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" value={tracking} onChange={e => setTracking(e.target.value)} placeholder={t.so_tracking_placeholder} />
                <button className="btn btn-secondary btn-sm" disabled={savingTracking} onClick={saveTracking}>{t.save}</button>
              </div>
            </div>
            <PackagingSelect t={t} order={order} onUpdated={onUpdated} showToast={onError} />
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.status}</div>
            <select
              className="status-select-pill"
              style={{ background: STATUS_PILL[order.status]?.bg, color: STATUS_PILL[order.status]?.color, borderColor: STATUS_PILL[order.status]?.border }}
              value={order.status}
              onChange={e => changeStatus(e.target.value)}
            >
              {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
              {t.so_created_label}{fmtDate(order.created_at)}{t.so_updated_label}{fmtDate(order.updated_at)}
            </div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.so_payment_col}</div>
            <div className="detail-row"><span className="detail-label">{t.status}</span><span className="detail-value">{PAYMENT_LABELS[order.payment_status] || order.payment_status}</span></div>
            <div className="detail-row"><span className="detail-label">{t.so_provider_label}</span><span className="detail-value">{order.payment_provider || "—"}</span></div>
            {order.payment_provider === "stripe" && order.payment_ref && (
              <div className="detail-row">
                <span className="detail-label">Stripe</span>
                <a href={`https://dashboard.stripe.com/test/payments/${order.payment_ref}`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>{t.so_open_in_stripe}</a>
              </div>
            )}
            {order.payment_status === "paid" && (
              <button className="btn btn-sm" disabled={refunding} onClick={doRefund}
                style={{ background: "#FEE2E2", color: "#DC2626", marginTop: 10 }}>
                {t.so_refund_btn}
              </button>
            )}
          </div>

          <EconomicsBlock t={t} order={order} showToast={onError} />

          <div className="drawer-section">
            <div className="drawer-section-title">{t.so_communication_section}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 12 }}>
              <span className="badge" style={{ background: "#F3F4F6", color: "#374151" }}>✉️ Email ✓</span>
              <span className="badge" style={{ background: order.customer_phone ? "#F3F4F6" : "#F9FAFB", color: order.customer_phone ? "#374151" : "#C0C5CC" }}>💬 WhatsApp {order.customer_phone ? "✓" : "—"}</span>
              <span className="badge" style={{ background: telegramUsername(order) ? "#F3F4F6" : "#F9FAFB", color: telegramUsername(order) ? "#374151" : "#C0C5CC" }}>📱 Telegram {telegramUsername(order) ? "✓" : "—"}</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => onContact(order)}>{t.so_write_title}</button>
          </div>

        </div>
      </div>
    </div>
  );
}

function PackagingSelect({ t, order, onUpdated, showToast }) {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [packagingId, setPackagingId] = useState(order.packaging_item_id || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("warehouse_items")
        .select("id, name, stock_qty, avg_price_net")
        .eq("category", "shipping_materials")
        .order("name");
      if (error) { showToast(t.so_err_load_boxes + error.message); setLoading(false); return; }
      if (cancelled) return;
      const list = data || [];
      setBoxes(list);
      setLoading(false);

      if (!order.packaging_item_id && list.length) {
        const totalG = (order.shop_order_items || []).reduce((s, it) => s + (Number(it.weight) || 0) * (Number(it.quantity) || 1), 0);
        const suggestedSize = suggestBoxSize(totalG / 1000);
        const match = list.find(b => sizeFromName(b.name) === suggestedSize);
        if (match) save(match.id, true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [order.id]); // eslint-disable-line

  async function save(id, silent) {
    setSaving(true);
    const { error } = await supabase.from("shop_orders").update({ packaging_item_id: id || null }).eq("id", order.id);
    setSaving(false);
    if (error) { showToast(t.so_err_save_packaging + error.message); return; }
    setPackagingId(id || "");
    onUpdated({ id: order.id, packaging_item_id: id || null });
    if (!silent) showToast(t.so_packaging_saved);
  }

  if (loading) return null;

  return (
    <div className="form-group" style={{ marginTop: 10 }}>
      <label className="form-label">{t.so_packaging_label}</label>
      <select className="input" value={packagingId} disabled={saving} onChange={e => save(e.target.value)}>
        <option value="">{t.so_packaging_none_opt}</option>
        {boxes.map(b => (
          <option key={b.id} value={b.id}>{b.name} · {t.whr_remaining_word} {b.stock_qty} · {fmtMoney(b.avg_price_net)}</option>
        ))}
      </select>
    </div>
  );
}

function EconomicsBlock({ t, order, showToast }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [{ data: crmOrders, error: crmErr }, { data: settings, error: setErr }] = await Promise.all([
        supabase.from("orders").select("id").eq("shop_order_id", order.id),
        supabase.from("warehouse_economics_settings").select("*").eq("id", 1).single(),
      ]);
      if (crmErr) showToast(t.an_err_load_crm_orders + crmErr.message);
      if (setErr) showToast(t.wf_err_load_economics + setErr.message);
      if (cancelled) return;

      const refs = [...(crmOrders || []).map(o => o.id), order.id];
      const { data: movements, error: mvErr } = await supabase
        .from("warehouse_movements")
        .select("movement_type, unit, unit_cost, qty_change, item_id")
        .in("reference", refs);
      if (mvErr) { showToast(t.an_err_load_warehouse_movements + mvErr.message); setLoading(false); return; }

      const itemIds = [...new Set((movements || []).map(m => m.item_id).filter(Boolean))];
      const itemCategoryById = {};
      if (itemIds.length) {
        const { data: items, error: itemsErr } = await supabase.from("warehouse_items").select("id, category").in("id", itemIds);
        if (itemsErr) showToast(t.an_err_load_warehouse_positions + itemsErr.message);
        (items || []).forEach(it => { itemCategoryById[it.id] = it.category; });
      }

      let beanCost = 0, bagCost = 0, labelCost = 0, boxCost = 0, hasShortage = false, hasBoxMovement = false;
      (movements || []).forEach(m => {
        if (m.movement_type === "shortage") { hasShortage = true; return; }
        if (m.movement_type !== "sale") return;
        const cost = Math.abs(Number(m.qty_change)) * Number(m.unit_cost || 0);
        if (m.unit === "kg") { beanCost += cost; return; }
        const cat = itemCategoryById[m.item_id];
        if (cat === "labels") labelCost += cost;
        else if (cat === "shipping_materials") { boxCost += cost; hasBoxMovement = true; }
        else if (cat) bagCost += cost;
      });
      if (!hasBoxMovement && settings) boxCost = Number(settings.shipping_packaging_cost) || 0;

      const revenue = Number(order.total) || 0;
      const shippingCost = settings ? Number(settings.shipping_cost_for_us) || 0 : 0;
      const commissionPct = settings ? Number(settings.payment_commission_pct) || 0 : 0;
      const commissionCost = revenue * (commissionPct / 100);
      const profit = revenue - beanCost - bagCost - labelCost - boxCost - shippingCost - commissionCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      if (!cancelled) {
        setData({ revenue, beanCost, bagCost, labelCost, boxCost, shippingCost, commissionCost, profit, margin, hasShortage, boxIsEstimate: !hasBoxMovement });
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [order.id]); // eslint-disable-line

  if (loading) {
    return (
      <div className="drawer-section">
        <div className="drawer-section-title">{t.so_economics_section}</div>
        <div className="empty-state">{t.loading}</div>
      </div>
    );
  }
  if (!data) return null;

  const rows = [
    [t.total_revenue, data.revenue],
    [t.sp_bean_col, -data.beanCost],
    [t.so_bags_row, -data.bagCost],
    [t.whr_cat_labels, -data.labelCost],
    [data.boxIsEstimate ? t.so_packaging_estimate_row : t.so_packaging_label, -data.boxCost],
    [t.so_delivery_section, -data.shippingCost],
    [t.so_commission_row, -data.commissionCost],
  ];

  return (
    <div className="drawer-section">
      <div className="drawer-section-title">{t.so_economics_section}</div>
      {data.hasShortage && (
        <div style={{ fontSize: 11, color: "#B45309", marginBottom: 8 }}>{t.so_shortage_warning}</div>
      )}
      {rows.map(([label, value]) => (
        <div key={label} className="detail-row">
          <span className="detail-label">{label}</span>
          <span className="detail-value" style={{ color: value < 0 ? "#DC2626" : "#1F2937" }}>{value < 0 ? "−" : ""}{fmtMoney(Math.abs(value))}</span>
        </div>
      ))}
      <div className="detail-row">
        <span className="detail-label" style={{ fontWeight: 700 }}>{t.so_profit_row}</span>
        <span className="detail-value" style={{ fontWeight: 700, color: data.profit >= 0 ? "#16A34A" : "#DC2626" }}>
          {fmtMoney(data.profit)} ({data.margin.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}
