import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { T } from "../../lib/i18n";

const fmtMoney = (n) => `${Number(n || 0).toFixed(2)} zł`;
const fmtInt = (n) => String(Math.round(n || 0));
const DAY_MS = 24 * 3600 * 1000;
const LOCALE_BY_LANG = { ru: "ru-RU", pl: "pl-PL", ua: "uk-UA" };
function tpl(str, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), str);
}

const BLUE = "#2B58A1";
const GREEN = "#16A34A";
const AMBER = "#F59E0B";
const GRAY = "#D1D5DB";

function getPeriods(t) {
  return [
    { key: "today", label: t.an_period_today, days: 1 },
    { key: "7d", label: t.an_period_7d, days: 7 },
    { key: "30d", label: t.an_period_30d, days: 30 },
    { key: "quarter", label: t.an_period_quarter, days: 91 },
    { key: "half", label: t.an_period_half, days: 182 },
    { key: "year", label: t.an_period_year, days: 365 },
    { key: "all", label: t.an_period_all, days: null },
    { key: "custom", label: t.an_period_custom, days: null },
  ];
}

function getRange(periodKey, customFrom, customTo, earliestDate, PERIODS) {
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

function pctDelta(current, previous, t) {
  if (!previous) return current > 0 ? { text: t.an_new_word, positive: true } : null;
  const pct = ((current - previous) / previous) * 100;
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`, positive: pct >= 0 };
}

function inRange(dateStr, range) {
  const d = new Date(dateStr).getTime();
  return d >= range.start.getTime() && d <= range.end.getTime();
}

export default function ShopAnalytics({ lang }) {
  const t = T[lang];
  const PERIODS = getPeriods(t);
  const locale = LOCALE_BY_LANG[lang] || "ru-RU";
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [productionQueue, setProductionQueue] = useState([]);
  const [crmOrders, setCrmOrders] = useState([]);
  const [saleMovements, setSaleMovements] = useState([]);
  const [economicsSettings, setEconomicsSettings] = useState(null);
  const [rawItems, setRawItems] = useState([]);
  const [roastBatches, setRoastBatches] = useState([]);
  const [blendBatches, setBlendBatches] = useState([]);
  const [finishedMinStock, setFinishedMinStock] = useState([]);
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
    const [
      ordersRes, itemsRes, productsRes, reviewsRes, productionRes,
      crmOrdersRes, movementsRes, settingsRes, rawItemsRes, roastRes, blendRes, minStockRes,
    ] = await Promise.all([
      supabase.from("shop_orders").select("id, created_at, total, payment_status, discount_amount, customer_email, shop_user_id"),
      supabase.from("shop_order_items").select("order_id, product_name, weight, quantity, line_total"),
      supabase.from("shop_products").select("id, name_ru, stock_status").eq("is_active", true),
      supabase.from("shop_reviews").select("id, author_name, rating, review_text, status, created_at").lte("rating", 2),
      supabase.from("orders").select("id, weight, shop_order_id").in("status", ["new", "processing"]),
      supabase.from("orders").select("id, shop_order_id").not("shop_order_id", "is", null),
      supabase.from("warehouse_movements").select("reference, movement_type, unit, unit_cost, qty_change, item_id, created_at").in("movement_type", ["sale", "shortage"]),
      supabase.from("warehouse_economics_settings").select("*").eq("id", 1).single(),
      supabase.from("warehouse_items").select("id, name, category, stock_qty, min_stock"),
      supabase.from("roast_batches").select("sort_name, remaining_kg, roast_date"),
      supabase.from("blend_batches").select("blend_name, remaining_kg, mix_date"),
      supabase.from("finished_goods_min_stock").select("name, min_stock"),
    ]);
    if (ordersRes.error) showToast(t.prod_err_load_orders + ordersRes.error.message);
    if (itemsRes.error) showToast(t.an_err_load_items + itemsRes.error.message);
    if (productionRes.error) showToast(t.an_err_load_production_queue + productionRes.error.message);
    if (crmOrdersRes.error) showToast(t.an_err_load_crm_orders + crmOrdersRes.error.message);
    if (movementsRes.error) showToast(t.an_err_load_warehouse_movements + movementsRes.error.message);
    if (settingsRes.error) showToast(t.wf_err_load_economics + settingsRes.error.message);
    if (rawItemsRes.error) showToast(t.an_err_load_warehouse_positions + rawItemsRes.error.message);
    if (roastRes.error) showToast(t.wf_err_load_roasts + roastRes.error.message);
    if (blendRes.error) showToast(t.wf_err_load_blends + blendRes.error.message);
    if (minStockRes.error) showToast(t.an_err_load_finished_min_stock + minStockRes.error.message);
    setOrders(ordersRes.data || []);
    setItems(itemsRes.data || []);
    setProducts(productsRes.data || []);
    setCrmOrders(crmOrdersRes.data || []);
    setSaleMovements(movementsRes.data || []);
    setEconomicsSettings(settingsRes.data || null);
    setRawItems(rawItemsRes.data || []);
    setRoastBatches(roastRes.data || []);
    setBlendBatches(blendRes.data || []);
    setFinishedMinStock(minStockRes.data || []);
    setReviews(reviewsRes.data || []);
    setProductionQueue(productionRes.data || []);
    setLoading(false);
  }, [t]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const earliestDate = useMemo(() => {
    if (orders.length === 0) return null;
    return new Date(Math.min(...orders.map(o => new Date(o.created_at).getTime())));
  }, [orders]);

  const range = useMemo(() => getRange(period, customFrom, customTo, earliestDate, PERIODS), [period, customFrom, customTo, earliestDate, PERIODS]);
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

  const itemCategoryById = useMemo(() => {
    const map = {};
    rawItems.forEach(it => { map[it.id] = it.category; });
    return map;
  }, [rawItems]);

  const profitStats = useMemo(() => {
    if (!economicsSettings) return { profit: 0, avgMargin: 0 };
    const paidIds = new Set(current.paid.map(o => o.id));
    const crmIdToShopId = new Map();
    crmOrders.forEach(co => { if (paidIds.has(co.shop_order_id)) crmIdToShopId.set(co.id, co.shop_order_id); });

    const perOrder = new Map();
    current.paid.forEach(o => perOrder.set(o.id, { bean: 0, bag: 0, label: 0, box: 0, hasBox: false }));

    saleMovements.forEach(m => {
      if (m.movement_type !== "sale") return;
      let shopId = null;
      if (crmIdToShopId.has(m.reference)) shopId = crmIdToShopId.get(m.reference);
      else if (perOrder.has(m.reference)) shopId = m.reference;
      if (!shopId) return;
      const acc = perOrder.get(shopId);
      const cost = Math.abs(Number(m.qty_change)) * Number(m.unit_cost || 0);
      if (m.unit === "kg") { acc.bean += cost; return; }
      const cat = itemCategoryById[m.item_id];
      if (cat === "labels") acc.label += cost;
      else if (cat === "shipping_materials") { acc.box += cost; acc.hasBox = true; }
      else if (cat) acc.bag += cost;
    });

    let totalProfit = 0, marginSum = 0, marginCount = 0;
    current.paid.forEach(o => {
      const acc = perOrder.get(o.id) || { bean: 0, bag: 0, label: 0, box: 0, hasBox: false };
      const box = acc.hasBox ? acc.box : Number(economicsSettings.shipping_packaging_cost) || 0;
      const revenue = Number(o.total) || 0;
      const commission = revenue * (Number(economicsSettings.payment_commission_pct) || 0) / 100;
      const shipping = Number(economicsSettings.shipping_cost_for_us) || 0;
      const profit = revenue - acc.bean - acc.bag - acc.label - box - shipping - commission;
      totalProfit += profit;
      if (revenue > 0) { marginSum += (profit / revenue) * 100; marginCount++; }
    });

    return { profit: totalProfit, avgMargin: marginCount ? marginSum / marginCount : 0 };
  }, [current.paid, crmOrders, saleMovements, itemCategoryById, economicsSettings]);

  const revenueByBucket = useMemo(() => {
    const days = rangeMs / DAY_MS;
    const monthly = days > 31;
    const buckets = new Map();
    current.paid.forEach(o => {
      const d = new Date(o.created_at);
      const key = monthly ? `${d.getFullYear()}-${d.getMonth()}` : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const label = monthly
        ? d.toLocaleDateString(locale, { month: "short", year: "2-digit" })
        : d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
      buckets.set(key, { label, value: (buckets.get(key)?.value || 0) + Number(o.total || 0), sortKey: d.getTime() });
    });
    return Array.from(buckets.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [current.paid, rangeMs, locale]);

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
      const ts = new Date(o.created_at).getTime();
      if (!firstPaidByCustomer.has(key) || ts < firstPaidByCustomer.get(key)) firstPaidByCustomer.set(key, ts);
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

    const lowRawStock = rawItems.filter(it => Number(it.min_stock) > 0 && Number(it.stock_qty) <= Number(it.min_stock));

    const minStockByName = {};
    finishedMinStock.forEach(r => { minStockByName[r.name] = Number(r.min_stock); });
    const finishedStockByName = new Map();
    roastBatches.forEach(b => finishedStockByName.set(b.sort_name, (finishedStockByName.get(b.sort_name) || 0) + Number(b.remaining_kg)));
    blendBatches.forEach(b => finishedStockByName.set(b.blend_name, (finishedStockByName.get(b.blend_name) || 0) + Number(b.remaining_kg)));
    const lowFinishedStock = [...finishedStockByName.entries()]
      .filter(([name, kg]) => (minStockByName[name] || 0) > 0 && kg <= minStockByName[name])
      .map(([name, kg]) => ({ name, kg }));

    const oldBatches = [
      ...roastBatches.filter(b => Number(b.remaining_kg) > 0 && new Date(b.roast_date) < since30).map(b => ({ name: b.sort_name, date: b.roast_date })),
      ...blendBatches.filter(b => Number(b.remaining_kg) > 0 && new Date(b.mix_date) < since30).map(b => ({ name: b.blend_name, date: b.mix_date })),
    ];

    const shortages = saleMovements.filter(m => m.movement_type === "shortage" && new Date(m.created_at) >= since30);

    return {
      failedPayments, outOfStock, lowReviews, productionOrderCount: productionOrderKeys.size, productionKg,
      lowRawStock, lowFinishedStock, oldBatches, shortages,
    };
  }, [orders, products, reviews, productionQueue, rawItems, finishedMinStock, roastBatches, blendBatches, saleMovements]);

  const statCards = [
    { label: t.total_revenue, value: fmtMoney(current.revenue), prev: pctDelta(current.revenue, previous.revenue, t), ya: pctDelta(current.revenue, yearAgo.revenue, t) },
    { label: t.total_orders, value: fmtInt(current.orderCount), prev: pctDelta(current.orderCount, previous.orderCount, t), ya: pctDelta(current.orderCount, yearAgo.orderCount, t) },
    { label: t.avg_check, value: fmtMoney(current.avgCheck), prev: pctDelta(current.avgCheck, previous.avgCheck, t), ya: pctDelta(current.avgCheck, yearAgo.avgCheck, t) },
    { label: t.an_conversion_stat, value: `${current.conversion.toFixed(0)}%`, prev: pctDelta(current.conversion, previous.conversion, t), ya: pctDelta(current.conversion, yearAgo.conversion, t) },
    { label: t.an_profit_stat, value: fmtMoney(profitStats.profit) },
    { label: t.an_avg_margin_stat, value: `${profitStats.avgMargin.toFixed(0)}%` },
  ];

  const maxRevenue = Math.max(1, ...revenueByBucket.map(b => b.value));
  const maxProduct = Math.max(1, ...topProducts.map(p => p.value));

  return (
    <div>
      <div className="topbar"><span className="topbar-title">{t.nav_shop_analytics}</span></div>
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

        {loading ? <div className="empty-state">{t.loading}</div> : (
          <>
            <div className="stats-grid" style={{ marginBottom: 18 }}>
              {statCards.map(c => (
                <div key={c.label} className="stat-card-big">
                  <div className="big-label">{c.label}</div>
                  <div className="big-value">{c.value}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    {c.prev && <span style={{ fontSize: 11, fontWeight: 600, color: c.prev.positive ? "#16A34A" : "#DC2626" }}>{c.prev.text}{t.an_vs_prev_period}</span>}
                    {c.ya && <span style={{ fontSize: 11, fontWeight: 600, color: c.ya.positive ? "#16A34A" : "#DC2626" }}>{c.ya.text}{t.an_vs_last_year}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid-2">
              <div className="card">
                <div className="card-title">{t.an_revenue_by_period}</div>
                <RevenueChart t={t} data={revenueByBucket} max={maxRevenue} />
              </div>
              <div className="card">
                <div className="card-title">{t.an_top5_products}</div>
                {topProducts.length === 0 ? <div className="empty-state">{t.no_data}</div> : (
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
                <div className="card-title">{t.an_by_weight}</div>
                <StackedBar
                  t={t}
                  segments={[
                    { label: `250${t.unit_g}`, value: weightSplit.totals[250], color: BLUE },
                    { label: `500${t.unit_g}`, value: weightSplit.totals[500], color: GREEN },
                    { label: `1${t.unit_kg}`, value: weightSplit.totals[1000], color: AMBER },
                  ]}
                  total={weightSplit.sum}
                  fmt={fmtMoney}
                />
              </div>
              <div className="card">
                <div className="card-title">{t.an_promo_vs}</div>
                <StackedBar
                  t={t}
                  segments={[
                    { label: t.an_with_promo, value: promoSplit.withPromo, color: GREEN },
                    { label: t.an_without_promo, value: promoSplit.without, color: GRAY },
                  ]}
                  total={promoSplit.withPromo + promoSplit.without}
                  fmt={fmtInt}
                />
              </div>
              <div className="card">
                <div className="card-title">{t.an_new_vs_repeat}</div>
                <StackedBar
                  t={t}
                  segments={[
                    { label: t.an_new_plural, value: retentionSplit.newCount, color: BLUE },
                    { label: t.an_repeat_plural, value: retentionSplit.repeatCount, color: GREEN },
                  ]}
                  total={retentionSplit.newCount + retentionSplit.repeatCount}
                  fmt={fmtInt}
                />
              </div>
            </div>

            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-title">{t.an_attention_title}</div>
              <div className="grid-3">
                <AttentionBlock
                  t={t} icon="🔴" label={t.an_failed_payments} count={attention.failedPayments.length} color="#DC2626"
                  items={attention.failedPayments.slice(0, 5).map(o => `${t.an_order_for}${fmtMoney(o.total)}`)}
                />
                <AttentionBlock
                  t={t} icon="🟠" label={t.an_out_of_stock} count={attention.outOfStock.length} color="#B45309"
                  items={attention.outOfStock.slice(0, 5).map(p => p.name_ru)}
                />
                <AttentionBlock
                  t={t} icon="🟡" label={t.an_low_reviews} count={attention.lowReviews.length} color="#92400E"
                  items={attention.lowReviews.slice(0, 5).map(r => `${r.author_name}: ${r.review_text.slice(0, 40)}${r.review_text.length > 40 ? "…" : ""}`)}
                />
                {attention.productionOrderCount > 0 && (
                  <AttentionBlock
                    t={t} icon="🟤" label={t.an_awaiting_production} count={attention.productionOrderCount} color="#78350F"
                    items={[tpl(t.an_kg_to_ship, { kg: attention.productionKg.toFixed(1) })]}
                  />
                )}
                {(attention.lowRawStock.length + attention.lowFinishedStock.length) > 0 && (
                  <AttentionBlock
                    t={t} icon="🟠" label={t.an_below_min_stock} count={attention.lowRawStock.length + attention.lowFinishedStock.length} color="#B45309"
                    items={[
                      ...attention.lowRawStock.slice(0, 3).map(it => tpl(t.an_raw_stock_item, { name: it.name, qty: Number(it.stock_qty).toFixed(1) })),
                      ...attention.lowFinishedStock.slice(0, 3).map(it => tpl(t.an_finished_stock_item, { name: it.name, kg: it.kg.toFixed(1) })),
                    ].slice(0, 5)}
                  />
                )}
                {attention.oldBatches.length > 0 && (
                  <AttentionBlock
                    t={t} icon="🟡" label={t.an_old_batches} count={attention.oldBatches.length} color="#92400E"
                    items={attention.oldBatches.slice(0, 5).map(b => tpl(t.an_batch_from, { name: b.name, date: new Date(b.date).toLocaleDateString(locale) }))}
                  />
                )}
                {attention.shortages.length > 0 && (
                  <AttentionBlock
                    t={t} icon="🔴" label={t.an_shortages} count={attention.shortages.length} color="#DC2626"
                    items={attention.shortages.slice(0, 5).map(m => m.comment || t.an_shortage_fallback)}
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

function RevenueChart({ t, data, max }) {
  if (data.length === 0) return <div className="empty-state">{t.an_no_data_period}</div>;
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

function StackedBar({ t, segments, total, fmt }) {
  if (!total) return <div className="empty-state">{t.no_data}</div>;
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

function AttentionBlock({ t, icon, label, count, color, items }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
        <span className="badge" style={{ background: "#F3F4F6", color: "#374151" }}>{count}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{t.prod_status_inactive}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((txt, i) => <div key={i} style={{ fontSize: 11, color: "#6B7280" }}>{txt}</div>)}
        </div>
      )}
    </div>
  );
}
