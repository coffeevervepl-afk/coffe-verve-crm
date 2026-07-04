import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

const fmtDate = (d) => d ? new Date(d).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtMoney = (n) => n != null ? `${Number(n).toFixed(2)} zł` : "—";

const STATUS_LABELS = { new: "Новый", confirmed: "Оплачен", processing: "Собирается", shipped: "Отправлен", delivered: "Доставлен", cancelled: "Отменён" };
const STATUS_PILL = {
  new: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  confirmed: { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" },
  processing: { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" },
  shipped: { bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE" },
  delivered: { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" },
  cancelled: { bg: "#FFF1F2", color: "#BE123C", border: "#FECDD3" },
};
const PAYMENT_LABELS = { pending: "🟡 Ожидает", paid: "🟢 Оплачен", failed: "🔴 Ошибка", refunded: "⚪ Возврат" };
const DELIVERY_LABELS = { paczkomat: "Paczkomat InPost", courier: "Курьер", pickup: "Самовывоз" };
const LANG_FLAG = { ru: "🇷🇺", pl: "🇵🇱", ua: "🇺🇦" };

const TABS = [
  { key: "new", label: "Новые", match: (o) => o.status === "new" },
  { key: "confirmed", label: "Оплачены", match: (o) => o.status === "confirmed" },
  { key: "processing", label: "Собираются", match: (o) => o.status === "processing" },
  { key: "shipped", label: "Отправлены", match: (o) => o.status === "shipped" },
  { key: "delivered", label: "Доставлены", match: (o) => o.status === "delivered" },
  { key: "problem", label: "Проблемные", match: (o) => o.status === "cancelled" || o.payment_status === "failed" || o.payment_status === "refunded" },
  { key: "all", label: "Все", match: () => true },
];

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

function compositionSummary(items) {
  if (!items || items.length === 0) return { short: "—", full: "" };
  const first = items[0];
  const shortText = `${first.product_name} ${first.weight}г ×${first.quantity}` + (items.length > 1 ? ` +${items.length - 1} ещё` : "");
  const full = items.map(i => `${i.product_name} ${i.weight}г ×${i.quantity}`).join("\n");
  return { short: shortText, full };
}

export default function ShopOrders({ openOrderId, onOpenOrderHandled }) {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("new");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
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
      .select("*, shop_order_items(product_name, weight, quantity, unit_price, line_total)")
      .order("created_at", { ascending: false });
    if (error) showToast("Ошибка загрузки заказов: " + error.message);
    setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!openOrderId || orders.length === 0) return;
    const found = orders.find(o => o.id === openOrderId);
    if (found) setSelected(found);
    else showToast("Заказ не найден");
    onOpenOrderHandled?.();
  }, [openOrderId, orders]); // eslint-disable-line react-hooks/exhaustive-deps

  async function changeStatus(id, status) {
    const { error } = await supabase.from("shop_orders").update({ status }).eq("id", id);
    if (error) { showToast("Не удалось сохранить статус: " + error.message); return; }
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
  const filtered = orders.filter(o => activeTab.match(o) && bySearch(o));

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">Заказы магазина ({filtered.length})</span>
      </div>
      <div className="content">
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {TABS.map(tb => (
            <button key={tb.key} className={"btn btn-sm " + (tab === tb.key ? "btn-primary" : "btn-secondary")} onClick={() => setTab(tb.key)}>
              {tb.label} ({orders.filter(tb.match).length})
            </button>
          ))}
        </div>
        <input className="search-bar" placeholder="Поиск по имени, email, номеру заказа..." value={search} onChange={e => setSearch(e.target.value)} />
        {loading ? <div className="empty-state">Загрузка...</div> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>№</th><th>Дата</th><th>Клиент</th><th>Состав</th><th>Сумма</th>
                  <th>Оплата</th><th>Статус</th><th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={8} className="empty-state">Нет заказов</td></tr> : filtered.map(o => {
                  const comp = compositionSummary(o.shop_order_items);
                  return (
                    <tr key={o.id}>
                      <td style={{ color: "#4B5563", fontSize: 12 }}>{o.order_number}</td>
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
                        <button className="action-icon-btn" title="Открыть" onClick={() => setSelected(o)}>👁</button>
                        <button className="action-icon-btn" title="Написать" onClick={() => setContactOrder(o)}>📱</button>
                        <button className="action-icon-btn" title="Печать этикетки" onClick={() => showToast("Печать этикеток появится позже")}>🖨</button>
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
        <OrderDrawer order={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} onContact={(o) => setContactOrder(o)} onError={showToast} />
      )}
      {contactOrder && <ContactModal order={contactOrder} onClose={() => setContactOrder(null)} />}
      {toast && <div className="print-toast">{toast}</div>}
    </div>
  );
}

function ContactModal({ order, onClose }) {
  const text = buildMessageText(order);
  const hasWhatsapp = !!order.customer_phone;
  const waPhone = hasWhatsapp ? order.customer_phone.replace(/[^\d]/g, "") : "";

  function openEmail() {
    window.open(`mailto:${order.customer_email}?subject=${encodeURIComponent("Coffee Verve — заказ №" + order.order_number)}&body=${encodeURIComponent(text)}`, "_blank");
    onClose();
  }
  function openWhatsapp() {
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, "_blank");
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-title">Написать клиенту</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className={"channel-item"} style={{ border: "1px solid #E5E7EB", borderRadius: 8 }} onClick={openEmail}>✉️ Email</div>
          <div className={"channel-item" + (hasWhatsapp ? "" : " disabled")} style={{ border: "1px solid #E5E7EB", borderRadius: 8 }} onClick={hasWhatsapp ? openWhatsapp : undefined}>
            💬 WhatsApp {!hasWhatsapp && "— нет телефона"}
          </div>
          <div className="channel-item disabled" style={{ border: "1px solid #E5E7EB", borderRadius: 8 }}>📱 Telegram — недоступно</div>
        </div>
        <div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Закрыть</button></div>
      </div>
    </div>
  );
}

function OrderDrawer({ order, onClose, onUpdated, onContact, onError }) {
  const [tracking, setTracking] = useState(order.tracking_number || "");
  const [savingTracking, setSavingTracking] = useState(false);
  const [promo, setPromo] = useState(null);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.from("promo_code_uses").select("*, shop_promo_codes(code)").eq("order_id", order.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) onError("Ошибка загрузки промокода: " + error.message);
        setPromo(data);
      });
    return () => { cancelled = true; };
  }, [order.id, onError]);

  async function saveTracking() {
    setSavingTracking(true);
    const { error } = await supabase.from("shop_orders").update({ tracking_number: tracking || null }).eq("id", order.id);
    setSavingTracking(false);
    if (error) { onError("Не удалось сохранить трек-номер: " + error.message); return; }
    onUpdated({ id: order.id, tracking_number: tracking || null });
    onError("Трек-номер сохранён");
  }

  async function changeStatus(status) {
    const { error } = await supabase.from("shop_orders").update({ status }).eq("id", order.id);
    if (error) { onError("Не удалось сохранить статус: " + error.message); return; }
    onUpdated({ id: order.id, status });
  }

  async function doRefund() {
    if (!window.confirm(`Оформить возврат по заказу №${order.order_number}?`)) return;
    setRefunding(true);
    const { error } = await supabase.from("shop_orders").update({ payment_status: "refunded" }).eq("id", order.id);
    if (error) { onError("Не удалось оформить возврат: " + error.message); setRefunding(false); return; }
    if (order.crm_order_id) {
      const { error: wErr } = await supabase.from("warranties").insert([{
        order_id: order.crm_order_id,
        reason: `Возврат оформлен из заказа магазина №${order.order_number}`,
        resolution: "refund",
        status: "new",
      }]);
      if (wErr) onError("Возврат оформлен, но запись в гарантии не создалась: " + wErr.message);
    }
    onUpdated({ id: order.id, payment_status: "refunded" });
    setRefunding(false);
    onError("Возврат оформлен");
  }

  const addr = order.delivery_address || {};
  const addrText = order.delivery_type === "paczkomat"
    ? [addr.paczkomat_id, addr.paczkomat_name, addr.paczkomat_address].filter(Boolean).join(" · ") || "—"
    : order.delivery_type === "courier"
      ? [addr.street, addr.city, addr.postal_code].filter(Boolean).join(", ") || "—"
      : "Самовывоз из точки продажи";

  return (
    <div className="drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer">
        <div className="drawer-header">
          <span className="drawer-title">Заказ №{order.order_number} {LANG_FLAG[order.language] || ""}</span>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body">

          <div className="drawer-section">
            <div className="drawer-section-title">Состав</div>
            {(order.shop_order_items || []).map((it, i) => (
              <div key={i} className="detail-row">
                <span className="detail-label">{it.product_name} {it.weight}г ×{it.quantity}</span>
                <span className="detail-value">{fmtMoney(it.line_total)}</span>
              </div>
            ))}
            {promo?.shop_promo_codes?.code && (
              <div className="detail-row">
                <span className="detail-label">Промокод</span>
                <span><span className="promo-tag">{promo.shop_promo_codes.code}</span> −{fmtMoney(order.discount_amount)}</span>
              </div>
            )}
            <div className="detail-row"><span className="detail-label">Доставка</span><span className="detail-value">{fmtMoney(order.delivery_cost)}</span></div>
            <div className="detail-row"><span className="detail-label" style={{ fontWeight: 700 }}>Итого</span><span className="detail-value" style={{ color: "#16A34A" }}>{fmtMoney(order.total)}</span></div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">Клиент</div>
            <div className="detail-row"><span className="detail-label">Имя</span><span className="detail-value">{order.customer_name}</span></div>
            <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{order.customer_email}</span></div>
            <div className="detail-row"><span className="detail-label">Телефон</span><span className="detail-value">{order.customer_phone || "—"}</span></div>
            <div className="detail-row"><span className="detail-label">Язык</span><span className="detail-value">{LANG_FLAG[order.language] || "—"}</span></div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>Профиль покупателя появится в разделе «Покупатели»</div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">Доставка</div>
            <div className="detail-row"><span className="detail-label">Способ</span><span className="detail-value">{DELIVERY_LABELS[order.delivery_type] || order.delivery_type}</span></div>
            <div className="detail-row"><span className="detail-label">Адрес / пункт</span><span className="detail-value" style={{ textAlign: "right" }}>{addrText}</span></div>
            <div className="form-group" style={{ marginTop: 10 }}>
              <label className="form-label">Номер посылки</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Введите трек-номер" />
                <button className="btn btn-secondary btn-sm" disabled={savingTracking} onClick={saveTracking}>Сохранить</button>
              </div>
            </div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">Статус</div>
            <select
              className="status-select-pill"
              style={{ background: STATUS_PILL[order.status]?.bg, color: STATUS_PILL[order.status]?.color, borderColor: STATUS_PILL[order.status]?.border }}
              value={order.status}
              onChange={e => changeStatus(e.target.value)}
            >
              {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
              Создан: {fmtDate(order.created_at)} · Обновлён: {fmtDate(order.updated_at)}
            </div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">Оплата</div>
            <div className="detail-row"><span className="detail-label">Статус</span><span className="detail-value">{PAYMENT_LABELS[order.payment_status] || order.payment_status}</span></div>
            <div className="detail-row"><span className="detail-label">Провайдер</span><span className="detail-value">{order.payment_provider || "—"}</span></div>
            {order.payment_provider === "stripe" && order.payment_ref && (
              <div className="detail-row">
                <span className="detail-label">Stripe</span>
                <a href={`https://dashboard.stripe.com/test/payments/${order.payment_ref}`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Открыть в Stripe →</a>
              </div>
            )}
            {order.payment_status === "paid" && (
              <button className="btn btn-sm" disabled={refunding} onClick={doRefund}
                style={{ background: "#FEE2E2", color: "#DC2626", marginTop: 10 }}>
                ↩ Оформить возврат
              </button>
            )}
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">Связь</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 12 }}>
              <span className="badge" style={{ background: "#F3F4F6", color: "#374151" }}>✉️ Email ✓</span>
              <span className="badge" style={{ background: order.customer_phone ? "#F3F4F6" : "#F9FAFB", color: order.customer_phone ? "#374151" : "#C0C5CC" }}>💬 WhatsApp {order.customer_phone ? "✓" : "—"}</span>
              <span className="badge" style={{ background: "#F9FAFB", color: "#C0C5CC" }}>📱 Telegram —</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => onContact(order)}>Написать</button>
          </div>

        </div>
      </div>
    </div>
  );
}
