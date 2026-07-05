import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

const fmtMoney = (n) => `${Number(n || 0).toFixed(2)} zł`;
const fmtInt = (n) => String(Math.round(n || 0));
const DAY_MS = 24 * 3600 * 1000;

const BLUE = "#2B58A1";
const GREEN = "#16A34A";
const AMBER = "#F59E0B";
const GRAY = "#D1D5DB";

const PERIODS = [
  { key: "today", label: "Сегодня", days: 1 },
  { key: "7d", label: "7 дней", days: 7 },
  { key: "30d", label: "30 дней", days: 30 },
  { key: "quarter", label: "Квартал", days: 91 },
  { key: "half", label: "Полгода", days: 182 },
  { key: "year", label: "Год", days: 365 },
  { key: "all", label: "Всё время", days: null },
  { key: "custom", label: "Свой период", days: null },
];

function getRange(periodKey, customFrom, customTo, earliestDate) {
  const now = new Date();
  if (periodKey === "custom") {
    const start = customFrom ? new Date(customFrom + "T00:00:00") : new Date(now.getTime() - 30 * DAY_MS);
    const end = customTo ? new Date(customTo + "T23:59:59") : now;
    return { start, end };
  }
  if (periodKey === "all") {
    return { start: earliestDate || new Date(2020, 0, 1), end: now };
  }
  const period = PERIODS.find(p => p.key === periodKey) || PERIODS[1];
  const start = periodKey === "today" ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : new Date(now.getTime() - period.days * DAY_MS);
  return { start, end: now };
}

function shiftRange(range, ms) {
  return { start: new Date(range.start.getTime() - ms), end: new Date(range.end.getTime() - ms) };
}

function pctDelta(current, previous) {
  if (!previous) return current > 0 ? { text: "новое", positive: true } : null;
  const pct = ((current - previous) / previous) * 100;
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`, positive: pct >= 0 };
}

function inRange(dateStr, range) {
  const d = new Date(dateStr).getTime();
  return d >= range.start.getTime() && d <= range.end.getTime();
}

export default function ShopAnalytics() {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [productionQueue, setProductionQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [ordersRes, itemsRes, productsRes, reviewsRes, productionRes] = await Promise.all([
      supabase.from("shop_orders").select("id, created_at, total, payment_status, discount_amount, customer_email, shop_user_id"),
      supabase.from("shop_order_items").select("order_id, product_name, weight, quantity, line_total"),
      supabase.from("shop_products").select("id, name_ru, stock_status").eq("is_active", true),
      supabase.from("shop_reviews").select("id, author_name, rating, review_text, status, created_at").lte("rating", 2),
      supabase.from("orders").select("id, weight, shop_order_id").in("status", ["new", "processing"]),
    ]);
    if (ordersRes.error) showToast("Ошибка загрузки заказов: " + ordersRes.error.message);
    if (itemsRes.error) showToast("Ошибка загрузки позиций: " + itemsRes.error.message);
    if (productionRes.error) showToast("Ошибка загрузки очереди производства: " + productionRes.error.message);
    setOrders(ordersRes.data || []);
    setItems(itemsRes.data || []);
    setProducts(productsRes.data || []);
    setReviews(reviewsRes.data || []);
    setProductionQueue(productionRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const earliestDate = useMemo(() => {
    if (orders.length === 0) return null;
    return new Date(Math.min(...orders.map(o => new Date(o.created_at).getTime())));
  }, [orders]);

  const range = useMemo(() => getRange(period, customFrom, customTo, earliestDate), [period, customFrom, customTo, earliestDate]);
  const rangeMs = range.end.getTime() - range.start.getTime();
  const prevRange = useMemo(() => shiftRange(range, rangeMs), [range, rangeMs]);
  const yearAgoRange = useMemo(() => shiftRange(range, 365 * DAY_MS), [range]);

  function computeStats(r) {
    const inR = orders.filter(o => inRange(o.created_at, r));
    const paid = inR.filter(o => o.payment_status === "paid");
    const revenue = paid.reduce((s, o) => s + Number(o.total || 0), 0);
    const orderCount = paid.length;
    const avgCheck = orderCount ? revenue / orderCount : 0;
    const conversion = inR.length ? (paid.length / inR.length) * 100 : 0;
    return { revenue, orderCount, avgCheck, conversion, all: inR, paid };
  }

  const current = computeStats(range);
  const previous = computeStats(prevRange);
  const yearAgo = computeStats(yearAgoRange);

  const revenueByBucket = useMemo(() => {
    const days = rangeMs / DAY_MS;
    const monthly = days > 31;
    const buckets = new Map();
    current.paid.forEach(o => {
      const d = new Date(o.created_at);
      const key = monthly ? `${d.getFullYear()}-${d.getMonth()}` : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const label = monthly
        ? d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" })
        : d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
      buckets.set(key, { label, value: (buckets.get(key)?.value || 0) + Number(o.total || 0), sortKey: d.getTime() });
    });
    return Array.from(buckets.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [current.paid, rangeMs]);

  const topProducts = useMemo(() => {
    const paidOrderIds = new Set(current.paid.map(o => o.id));
    const map = new Map();
    items.forEach(it => {
      if (!paidOrderIds.has(it.order_id)) return;
      map.set(it.product_name, (map.get(it.product_name) || 0) + Number(it.line_total || 0));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [items, current.paid]);

  const weightSplit = useMemo(() => {
    const paidOrderIds = new Set(current.paid.map(o => o.id));
    const totals = { 250: 0, 500: 0, 1000: 0 };
    items.forEach(it => {
      if (!paidOrderIds.has(it.order_id)) return;
      totals[it.weight] = (totals[it.weight] || 0) + Number(it.line_total || 0);
    });
    const sum = totals[250] + totals[500] + totals[1000];
    return { totals, sum };
  }, [items, current.paid]);

  const promoSplit = useMemo(() => {
    const withPromo = current.paid.filter(o => Number(o.discount_amount || 0) > 0).length;
    return { withPromo, without: current.paid.length - withPromo };
  }, [current.paid]);

  const retentionSplit = useMemo(() => {
    const firstPaidByCustomer = new Map();
    orders.filter(o => o.payment_status === "paid").forEach(o => {
      const key = o.shop_user_id || o.customer_email;
      const t = new Date(o.created_at).getTime();
      if (!firstPaidByCustomer.has(key) || t < firstPaidByCustomer.get(key)) firstPaidByCustomer.set(key, t);
    });
    let newCount = 0, repeatCount = 0;
    current.paid.forEach(o => {
      const key = o.shop_user_id || o.customer_email;
      const firstT = firstPaidByCustomer.get(key);
      if (firstT != null && inRange(new Date(firstT).toISOString(), range)) newCount++;
      else repeatCount++;
    });
    return { newCount, repeatCount };
  }, [orders, current.paid, range]);

  const attention = useMemo(() => {
    const since30 = new Date(Date.now() - 30 * DAY_MS);
    const failedPayments = orders.filter(o => o.payment_status === "failed" && new Date(o.created_at) >= since30);
    const outOfStock = products.filter(p => p.stock_status === "out");
    const lowReviews = reviews.filter(r => r.status !== "rejected");
    const productionOrderKeys = new Set(productionQueue.map(o => o.shop_order_id || o.id));
    const productionKg = productionQueue.reduce((s, o) => s + (Number(o.weight) || 0) / 1000, 0);
    return { failedPayments, outOfStock, lowReviews, productionOrderCount: productionOrderKeys.size, productionKg };
  }, [orders, products, reviews, productionQueue]);

  const statCards = [
    { label: "Выручка", value: fmtMoney(current.revenue), prev: pctDelta(current.revenue, previous.revenue), ya: pctDelta(current.revenue, yearAgo.revenue) },
    { label: "Заказов", value: fmtInt(current.orderCount), prev: pctDelta(current.orderCount, previous.orderCount), ya: pctDelta(current.orderCount, yearAgo.orderCount) },
    { label: "Средний чек", value: fmtMoney(current.avgCheck), prev: pctDelta(current.avgCheck, previous.avgCheck), ya: pctDelta(current.avgCheck, yearAgo.avgCheck) },
    { label: "Конверсия оплат", value: `${current.conversion.toFixed(0)}%`, prev: pctDelta(current.conversion, previous.conversion), ya: pctDelta(current.conversion, yearAgo.conversion) },
  ];

  const maxRevenue = Math.max(1, ...revenueByBucket.map(b => b.value));
  const maxProduct = Math.max(1, ...topProducts.map(p => p.value));

  return (
    <div>
      <div className="topbar"><span className="topbar-title">Аналитика магазина</span></div>
      <div className="content">
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          {PERIODS.map(p => (
            <button key={p.key} className={"btn btn-sm " + (period === p.key ? "btn-primary" : "btn-secondary")} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
          {period === "custom" && (
            <>
              <input className="input" type="date" style={{ width: 140 }} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              <span style={{ color: "#9CA3AF" }}>—</span>
              <input className="input" type="date" style={{ width: 140 }} value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </>
          )}
        </div>

        {loading ? <div className="empty-state">Загрузка...</div> : (
          <>
            <div className="stats-grid" style={{ marginBottom: 18 }}>
              {statCards.map(c => (
                <div key={c.label} className="stat-card-big">
                  <div className="big-label">{c.label}</div>
                  <div className="big-value">{c.value}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    {c.prev && <span style={{ fontSize: 11, fontWeight: 600, color: c.prev.positive ? "#16A34A" : "#DC2626" }}>{c.prev.text} к пред. периоду</span>}
                    {c.ya && <span style={{ fontSize: 11, fontWeight: 600, color: c.ya.positive ? "#16A34A" : "#DC2626" }}>{c.ya.text} к прошлому году</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid-2">
              <div className="card">
                <div className="card-title">Выручка по периоду</div>
                <RevenueChart data={revenueByBucket} max={maxRevenue} />
              </div>
              <div className="card">
                <div className="card-title">Топ-5 товаров по выручке</div>
                {topProducts.length === 0 ? <div className="empty-state">Нет данных</div> : (
                  <div className="bar-chart">
                    {topProducts.map(p => (
                      <div key={p.name} className="bar-row" title={`${p.name}: ${fmtMoney(p.value)}`}>
                        <span className="bar-label">{p.name}</span>
                        <div className="bar-track"><div className="bar-fill" style={{ width: `${(p.value / maxProduct) * 100}%`, background: BLUE }} /></div>
                        <span className="bar-val">{fmtMoney(p.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid-3">
              <div className="card">
                <div className="card-title">По весу</div>
                <StackedBar
                  segments={[
                    { label: "250г", value: weightSplit.totals[250], color: BLUE },
                    { label: "500г", value: weightSplit.totals[500], color: GREEN },
                    { label: "1кг", value: weightSplit.totals[1000], color: AMBER },
                  ]}
                  total={weightSplit.sum}
                  fmt={fmtMoney}
                />
              </div>
              <div className="card">
                <div className="card-title">С промокодом vs без</div>
                <StackedBar
                  segments={[
                    { label: "С промокодом", value: promoSplit.withPromo, color: GREEN },
                    { label: "Без промокода", value: promoSplit.without, color: GRAY },
                  ]}
                  total={promoSplit.withPromo + promoSplit.without}
                  fmt={fmtInt}
                />
              </div>
              <div className="card">
                <div className="card-title">Новые vs повторные</div>
                <StackedBar
                  segments={[
                    { label: "Новые", value: retentionSplit.newCount, color: BLUE },
                    { label: "Повторные", value: retentionSplit.repeatCount, color: GREEN },
                  ]}
                  total={retentionSplit.newCount + retentionSplit.repeatCount}
                  fmt={fmtInt}
                />
              </div>
            </div>

            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-title">Требует внимания</div>
              <div className="grid-3">
                <AttentionBlock
                  icon="🔴" label="Неудачные оплаты за 30 дн" count={attention.failedPayments.length} color="#DC2626"
                  items={attention.failedPayments.slice(0, 5).map(o => `Заказ на ${fmtMoney(o.total)}`)}
                />
                <AttentionBlock
                  icon="🟠" label="Нет в наличии" count={attention.outOfStock.length} color="#B45309"
                  items={attention.outOfStock.slice(0, 5).map(p => p.name_ru)}
                />
                <AttentionBlock
                  icon="🟡" label="Отзывы 1–2★" count={attention.lowReviews.length} color="#92400E"
                  items={attention.lowReviews.slice(0, 5).map(r => `${r.author_name}: ${r.review_text.slice(0, 40)}${r.review_text.length > 40 ? "…" : ""}`)}
                />
                {attention.productionOrderCount > 0 && (
                  <AttentionBlock
                    icon="🟤" label="Ждут производства" count={attention.productionOrderCount} color="#78350F"
                    items={[`${attention.productionKg.toFixed(1)} кг зерна к отправке`]}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {toast && <div className="print-toast">{toast}</div>}
    </div>
  );
}

function RevenueChart({ data, max }) {
  if (data.length === 0) return <div className="empty-state">Нет данных за период</div>;
  const w = 600, h = 160, pad = 24;
  const stepX = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (d.value / max) * (h - pad * 2);
    return { x, y, ...d };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${h - pad} L${points[0].x},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 160 }}>
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#E5E7EB" strokeWidth="1" />
      <path d={areaPath} fill={BLUE} opacity="0.1" />
      <path d={linePath} fill="none" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={BLUE} stroke="#fff" strokeWidth="2" />
          <circle cx={p.x} cy={p.y} r="12" fill="transparent">
            <title>{`${p.label}: ${fmtMoney(p.value)}`}</title>
          </circle>
        </g>
      ))}
      <text x={points[0].x} y={h - 6} fontSize="10" fill="#9CA3AF">{points[0].label}</text>
      <text x={points[points.length - 1].x} y={h - 6} fontSize="10" fill="#9CA3AF" textAnchor="end">{points[points.length - 1].label}</text>
    </svg>
  );
}

function StackedBar({ segments, total, fmt }) {
  if (!total) return <div className="empty-state">Нет данных</div>;
  return (
    <div>
      <div style={{ display: "flex", height: 22, borderRadius: 6, overflow: "hidden", gap: 2, background: "#F3F4F6" }}>
        {segments.filter(s => s.value > 0).map(s => (
          <div key={s.label} title={`${s.label}: ${fmt(s.value)}`} style={{ width: `${(s.value / total) * 100}%`, background: s.color, minWidth: s.value > 0 ? 4 : 0 }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#4B5563" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: "inline-block" }} />
            {s.label}: <b>{fmt(s.value)}</b> ({total ? Math.round((s.value / total) * 100) : 0}%)
          </div>
        ))}
      </div>
    </div>
  );
}

function AttentionBlock({ icon, label, count, color, items }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
        <span className="badge" style={{ background: "#F3F4F6", color: "#374151" }}>{count}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 11, color: "#9CA3AF" }}>Нет</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((t, i) => <div key={i} style={{ fontSize: 11, color: "#6B7280" }}>{t}</div>)}
        </div>
      )}
    </div>
  );
}
