import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

const DEFAULT_LOSS_PCT = 15;
const LOSS_WARN_MIN = 10;
const LOSS_WARN_MAX = 20;

const fmtMoney = (n) => (n != null ? `${Number(n).toFixed(2)} zł` : "—");
const fmtKg = (n) => (n != null ? `${Number(n).toFixed(2)} кг` : "—");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ru-RU") : "—");
const norm = (s) => (s || "").trim().toLowerCase();

function computePlan({ pendingOrders, roastBatches, blendBatches, blendIngredients, greenItems }) {
  const requiredByProduct = new Map();
  pendingOrders.forEach(o => {
    if (!o.product_id || !o.products) return;
    const kg = (Number(o.weight) || 0) / 1000;
    const rec = requiredByProduct.get(o.product_id) || { name: o.products.name, country: o.products.country, kg: 0, orderKeys: new Set() };
    rec.kg += kg;
    rec.orderKeys.add(o.shop_order_id || o.id);
    requiredByProduct.set(o.product_id, rec);
  });

  const roastStockByName = new Map();
  const lossesByName = new Map();
  roastBatches.forEach(b => {
    roastStockByName.set(b.sort_name, (roastStockByName.get(b.sort_name) || 0) + Number(b.remaining_kg));
    const arr = lossesByName.get(b.sort_name) || [];
    if (arr.length < 5) arr.push(Number(b.loss_pct));
    lossesByName.set(b.sort_name, arr);
  });

  const blendStockByName = new Map();
  const lastBlendIdByName = new Map();
  blendBatches.forEach(b => {
    blendStockByName.set(b.blend_name, (blendStockByName.get(b.blend_name) || 0) + Number(b.remaining_kg));
    if (!lastBlendIdByName.has(b.blend_name)) lastBlendIdByName.set(b.blend_name, b.id);
  });
  const recipeByBlendName = new Map();
  lastBlendIdByName.forEach((batchId, blendName) => {
    const ings = blendIngredients.filter(i => i.blend_batch_id === batchId);
    const total = ings.reduce((s, i) => s + Number(i.kg), 0);
    if (total > 0) recipeByBlendName.set(blendName, ings.map(i => ({ sort_name: i.sort_name, ratio: Number(i.kg) / total })));
  });

  const greenByName = new Map(greenItems.map(g => [norm(g.name), g]));

  const ingredientNeed = new Map();
  const blendWarnings = [];
  const blendRows = [];
  requiredByProduct.forEach((rec) => {
    if (rec.country !== "Купаж") return;
    const stock = blendStockByName.get(rec.name) || 0;
    const deficit = rec.kg - stock;
    if (deficit <= 0.0001) return;
    const recipe = recipeByBlendName.get(rec.name);
    if (recipe) {
      recipe.forEach(({ sort_name, ratio }) => {
        ingredientNeed.set(sort_name, (ingredientNeed.get(sort_name) || 0) + deficit * ratio);
      });
      blendRows.push({ blend_name: rec.name, deficit_kg: deficit, ingredients: recipe.map(r => ({ sort_name: r.sort_name, kg: deficit * r.ratio })) });
    } else {
      blendWarnings.push({ blend_name: rec.name, deficit_kg: deficit });
    }
  });

  const roastRows = [];
  const handledSorts = new Set();
  function computeSortRow(sortName, directKg) {
    if (handledSorts.has(sortName)) return;
    handledSorts.add(sortName);
    const extra = ingredientNeed.get(sortName) || 0;
    const totalNeed = directKg + extra;
    const stock = roastStockByName.get(sortName) || 0;
    const deficit = totalNeed - stock;
    if (deficit <= 0.0001) return;
    const losses = lossesByName.get(sortName);
    const avgLoss = losses && losses.length ? losses.reduce((s, l) => s + l, 0) / losses.length : DEFAULT_LOSS_PCT;
    const greenNeeded = deficit / (1 - avgLoss / 100);
    const greenItem = greenByName.get(norm(sortName)) || null;
    roastRows.push({
      sort_name: sortName, direct_kg: directKg, ingredient_kg: extra, deficit_kg: deficit,
      avg_loss_pct: avgLoss, green_needed_kg: greenNeeded, green_item: greenItem,
      green_stock_kg: greenItem ? Number(greenItem.stock_qty) : 0,
    });
  }
  requiredByProduct.forEach(rec => { if (rec.country !== "Купаж") computeSortRow(rec.name, rec.kg); });
  ingredientNeed.forEach((kg, sortName) => { if (!handledSorts.has(sortName)) computeSortRow(sortName, 0); });

  return { requiredByProduct, roastRows, blendRows, blendWarnings };
}

export default function Production() {
  const [tab, setTab] = useState("queue");
  const [showRoastModal, setShowRoastModal] = useState(false);
  const [showBlendModal, setShowBlendModal] = useState(false);
  const [roastPrefill, setRoastPrefill] = useState(null);
  const [blendPrefill, setBlendPrefill] = useState(null);
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }
  function refresh() { setRefreshKey(k => k + 1); }

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">Производство</span>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => { setBlendPrefill(null); setShowBlendModal(true); }}>+ Купажирование</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setRoastPrefill(null); setShowRoastModal(true); }}>+ Новая обжарка</button>
        </div>
      </div>
      <div className="content">
        <div className="tabs-row">
          <button className={`tab-btn ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")}>Заказы на производство</button>
          <button className={`tab-btn ${tab === "log" ? "active" : ""}`} onClick={() => setTab("log")}>Журнал производства</button>
        </div>

        {tab === "queue" && (
          <QueueTab
            key={refreshKey}
            showToast={showToast}
            onStartRoast={(prefill) => { setRoastPrefill(prefill); setShowRoastModal(true); }}
            onStartBlend={(prefill) => { setBlendPrefill(prefill); setShowBlendModal(true); }}
          />
        )}
        {tab === "log" && <ProductionLogTab key={"log" + refreshKey} showToast={showToast} />}
      </div>

      {showRoastModal && (
        <NewRoastModal
          prefill={roastPrefill}
          onClose={() => setShowRoastModal(false)}
          onDone={() => { setShowRoastModal(false); refresh(); }}
          showToast={showToast}
        />
      )}
      {showBlendModal && (
        <NewBlendModal
          prefill={blendPrefill}
          onClose={() => setShowBlendModal(false)}
          onDone={() => { setShowBlendModal(false); refresh(); }}
          showToast={showToast}
        />
      )}
      {toast && <div className="print-toast">{toast}</div>}
    </div>
  );
}

// ============================================================
// ОЧЕРЕДЬ + ПЛАН ПРОИЗВОДСТВА
// ============================================================
function QueueTab({ showToast, onStartRoast, onStartBlend }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState([]);
  const [plan, setPlan] = useState({ roastRows: [], blendRows: [], blendWarnings: [] });
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalKg, setTotalKg] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [ordersRes, roastRes, blendRes, greenRes] = await Promise.all([
        supabase.from("orders").select("id, weight, product_id, shop_order_id, products(name, country)").in("status", ["new", "processing"]),
        supabase.from("roast_batches").select("id, sort_name, roast_date, loss_pct, remaining_kg").order("roast_date", { ascending: false }),
        supabase.from("blend_batches").select("id, blend_name, mix_date, total_kg, remaining_kg, created_at").order("created_at", { ascending: false }),
        supabase.from("warehouse_items").select("id, name, stock_qty, unit, avg_price_net").eq("category", "green_beans"),
      ]);
      if (ordersRes.error) showToast("Ошибка загрузки заказов: " + ordersRes.error.message);
      if (roastRes.error) showToast("Ошибка загрузки партий обжарки: " + roastRes.error.message);
      if (blendRes.error) showToast("Ошибка загрузки купажей: " + blendRes.error.message);
      if (greenRes.error) showToast("Ошибка загрузки зелёного зерна: " + greenRes.error.message);

      const pendingOrders = ordersRes.data || [];
      const roastBatches = roastRes.data || [];
      const blendBatches = blendRes.data || [];
      const greenItems = greenRes.data || [];

      const lastIdsByName = new Map();
      blendBatches.forEach(b => { if (!lastIdsByName.has(b.blend_name)) lastIdsByName.set(b.blend_name, b.id); });
      const neededIds = [...lastIdsByName.values()];
      let blendIngredients = [];
      if (neededIds.length) {
        const { data, error } = await supabase.from("blend_batch_ingredients").select("blend_batch_id, sort_name, kg").in("blend_batch_id", neededIds);
        if (error) showToast("Ошибка загрузки состава купажей: " + error.message);
        blendIngredients = data || [];
      }

      const summaryMap = new Map();
      pendingOrders.forEach(o => {
        if (!o.product_id || !o.products) return;
        const rec = summaryMap.get(o.product_id) || { product_id: o.product_id, name: o.products.name, country: o.products.country, kg: 0, orderKeys: new Set() };
        rec.kg += (Number(o.weight) || 0) / 1000;
        rec.orderKeys.add(o.shop_order_id || o.id);
        summaryMap.set(o.product_id, rec);
      });
      const summaryArr = [...summaryMap.values()].map(r => ({ ...r, orderCount: r.orderKeys.size })).sort((a, b) => b.kg - a.kg);
      setSummary(summaryArr);

      const allOrderKeys = new Set(pendingOrders.map(o => o.shop_order_id || o.id));
      setTotalOrders(allOrderKeys.size);
      setTotalKg(pendingOrders.reduce((s, o) => s + (Number(o.weight) || 0) / 1000, 0));

      setPlan(computePlan({ pendingOrders, roastBatches, blendBatches, blendIngredients, greenItems }));
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line

  if (loading) return <div className="empty-state">Загрузка...</div>;

  const planEmpty = plan.roastRows.length === 0 && plan.blendRows.length === 0 && plan.blendWarnings.length === 0;

  return (
    <div>
      <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
        <div className="stat-card-big"><div className="big-label">Заказов в очереди</div><div className="big-value">{totalOrders}</div></div>
        <div className="stat-card-big"><div className="big-label">Кг зерна к отправке</div><div className="big-value">{totalKg.toFixed(1)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">Очередь по сортам/купажам</div>
        {summary.length === 0 ? <div className="empty-state">Очередь пуста</div> : (
          <table className="table">
            <thead><tr><th>Позиция</th><th>Тип</th><th>Заказов</th><th>Кг</th></tr></thead>
            <tbody>
              {summary.map(r => (
                <tr key={r.product_id}>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td style={{ color: "#6B7280" }}>{r.country === "Купаж" ? "Купаж" : "Сорт"}</td>
                  <td>{r.orderCount}</td>
                  <td>{fmtKg(r.kg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-title">План производства</div>
        {planEmpty ? <div className="empty-state">Готового зерна достаточно — производство не требуется</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {plan.roastRows.map(r => {
              const shortage = r.green_needed_kg > r.green_stock_kg + 0.0001;
              return (
                <PlanRow
                  key={"roast-" + r.sort_name}
                  icon="🔥"
                  warn={shortage}
                  title={`Жарить: ${r.sort_name}`}
                  detail={`загрузить ~${r.green_needed_kg.toFixed(2)} кг зелёного (остаток зелёного: ${r.green_stock_kg.toFixed(2)} кг)${shortage ? " — не хватает зелёного, докупите" : ""}`}
                  buttonLabel="Начать обжарку"
                  onClick={() => onStartRoast({
                    green_item: r.green_item,
                    input_kg: Math.min(r.green_needed_kg, r.green_stock_kg || r.green_needed_kg),
                    avg_loss_pct: r.avg_loss_pct,
                  })}
                />
              );
            })}
            {plan.blendRows.map(r => (
              <PlanRow
                key={"blend-" + r.blend_name}
                icon="🔀"
                title={`Купажировать: ${r.blend_name}`}
                detail={`нужно ещё ${r.deficit_kg.toFixed(2)} кг (по последнему рецепту: ${r.ingredients.map(i => `${i.sort_name} ${i.kg.toFixed(2)} кг`).join(", ")})`}
                buttonLabel="Начать купаж"
                onClick={() => onStartBlend({ blend_name: r.blend_name, ingredients: r.ingredients })}
              />
            ))}
            {plan.blendWarnings.map(r => (
              <PlanRow
                key={"blendwarn-" + r.blend_name}
                icon="⚠️" warn
                title={`Купаж: ${r.blend_name}`}
                detail={`нужно ещё ${r.deficit_kg.toFixed(2)} кг, но нет сохранённого рецепта — соберите вручную`}
                buttonLabel="Купажировать вручную"
                onClick={() => onStartBlend({ blend_name: r.blend_name })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlanRow({ icon, title, detail, buttonLabel, onClick, warn }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, background: warn ? "#FFFBEB" : "#fff" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span>{icon}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{detail}</div>
        </div>
      </div>
      <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={onClick}>{buttonLabel}</button>
    </div>
  );
}

// ============================================================
// ЖУРНАЛ ПРОИЗВОДСТВА (партии)
// ============================================================
function ProductionLogTab({ showToast }) {
  const [roasts, setRoasts] = useState([]);
  const [blends, setBlends] = useState([]);
  const [blendIngredients, setBlendIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [roastRes, blendRes] = await Promise.all([
        supabase.from("roast_batches").select("*").order("roast_date", { ascending: false }),
        supabase.from("blend_batches").select("*").order("mix_date", { ascending: false }),
      ]);
      if (roastRes.error) showToast("Ошибка загрузки обжарок: " + roastRes.error.message);
      if (blendRes.error) showToast("Ошибка загрузки купажей: " + blendRes.error.message);
      setRoasts(roastRes.data || []);
      setBlends(blendRes.data || []);
      const blendIds = (blendRes.data || []).map(b => b.id);
      if (blendIds.length) {
        const { data, error } = await supabase.from("blend_batch_ingredients").select("*").in("blend_batch_id", blendIds);
        if (error) showToast("Ошибка загрузки состава купажей: " + error.message);
        setBlendIngredients(data || []);
      }
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line

  if (loading) return <div className="empty-state">Загрузка...</div>;

  return (
    <div>
      <div className="card" style={{ marginBottom: 14, padding: 0, overflow: "hidden" }}>
        <div className="card-title" style={{ padding: "14px 18px 0" }}>Обжарки</div>
        <table className="table">
          <thead>
            <tr><th>Дата</th><th>Сорт</th><th>Загружено</th><th>Выход</th><th>Ужарка</th><th>Себестоимость/кг</th><th>Остаток</th></tr>
          </thead>
          <tbody>
            {roasts.length === 0 ? <tr><td colSpan={7} className="empty-state">Обжарок ещё не было</td></tr> : roasts.map(b => (
              <tr key={b.id}>
                <td>{fmtDate(b.roast_date)}</td>
                <td style={{ fontWeight: 500 }}>{b.sort_name}</td>
                <td>{fmtKg(b.input_kg)}</td>
                <td>{fmtKg(b.output_kg)}</td>
                <td style={{ color: (b.loss_pct < LOSS_WARN_MIN || b.loss_pct > LOSS_WARN_MAX) ? "#B45309" : "#6B7280" }}>{Number(b.loss_pct).toFixed(1)}%</td>
                <td>{fmtMoney(b.cost_per_kg)}</td>
                <td>{fmtKg(b.remaining_kg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-title" style={{ padding: "14px 18px 0" }}>Купажи</div>
        <table className="table">
          <thead>
            <tr><th>Дата</th><th>Название</th><th>Состав</th><th>Кг</th><th>Себестоимость/кг</th><th>Остаток</th></tr>
          </thead>
          <tbody>
            {blends.length === 0 ? <tr><td colSpan={6} className="empty-state">Купажей ещё не было</td></tr> : blends.map(b => (
              <tr key={b.id}>
                <td>{fmtDate(b.mix_date)}</td>
                <td style={{ fontWeight: 500 }}>{b.blend_name}</td>
                <td style={{ color: "#6B7280", fontSize: 12 }}>
                  {blendIngredients.filter(i => i.blend_batch_id === b.id).map(i => `${i.sort_name} ${fmtKg(i.kg)}`).join(", ") || "—"}
                </td>
                <td>{fmtKg(b.total_kg)}</td>
                <td>{fmtMoney(b.cost_per_kg)}</td>
                <td>{fmtKg(b.remaining_kg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// МОДАЛКА: НОВАЯ ОБЖАРКА
// ============================================================
function NewRoastModal({ prefill, onClose, onDone, showToast }) {
  const [greenItems, setGreenItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [greenItemId, setGreenItemId] = useState(prefill?.green_item?.id || "");
  const [roastDate, setRoastDate] = useState(new Date().toISOString().slice(0, 10));
  const [inputKg, setInputKg] = useState(prefill?.input_kg ? prefill.input_kg.toFixed(2) : "");
  const [outputKg, setOutputKg] = useState(
    prefill?.input_kg && prefill?.avg_loss_pct != null ? (prefill.input_kg * (1 - prefill.avg_loss_pct / 100)).toFixed(2) : ""
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("warehouse_items").select("*").eq("category", "green_beans").order("name").then(({ data, error }) => {
      if (error) showToast("Ошибка загрузки зелёного зерна: " + error.message);
      setGreenItems(data || []);
      setLoadingItems(false);
    });
  }, []); // eslint-disable-line

  const greenItem = greenItems.find(i => i.id === greenItemId);
  const input = Number(inputKg) || 0;
  const output = Number(outputKg) || 0;
  const lossPct = input > 0 ? ((input - output) / input) * 100 : 0;
  const costPerKg = output > 0 && greenItem ? (input * Number(greenItem.avg_price_net)) / output : 0;
  const lossWarn = input > 0 && output > 0 && (lossPct < LOSS_WARN_MIN || lossPct > LOSS_WARN_MAX);

  async function save() {
    if (!greenItem) { showToast("Выберите зелёное зерно"); return; }
    if (!(input > 0)) { showToast("Укажите загруженный вес"); return; }
    if (!(output > 0)) { showToast("Укажите вес после обжарки"); return; }
    if (input > Number(greenItem.stock_qty)) { showToast(`Недостаточно зелёного на складе: остаток ${fmtKg(greenItem.stock_qty)}`); return; }
    setSaving(true);

    const { data: batch, error: batchErr } = await supabase.from("roast_batches").insert([{
      sort_name: greenItem.name, green_item_id: greenItem.id, roast_date: roastDate,
      input_kg: input, output_kg: output, loss_pct: lossPct, cost_per_kg: costPerKg, remaining_kg: output, notes: notes || null,
    }]).select().single();
    if (batchErr) { showToast("Не удалось сохранить обжарку: " + batchErr.message); setSaving(false); return; }

    const newGreenStock = Number(greenItem.stock_qty) - input;
    const { error: updErr } = await supabase.from("warehouse_items").update({ stock_qty: newGreenStock }).eq("id", greenItem.id);
    if (updErr) { showToast("Не удалось списать зелёное зерно: " + updErr.message); setSaving(false); return; }

    await supabase.from("warehouse_movements").insert([
      { movement_type: "roast_consume", item_id: greenItem.id, batch_id: batch.id, batch_type: "roast", qty_change: -input, unit: "kg", reference: null, comment: `Обжарка ${greenItem.name}` },
      { movement_type: "roast_produce", item_id: null, batch_id: batch.id, batch_type: "roast", qty_change: output, unit: "kg", reference: null, comment: `Обжарка ${greenItem.name}` },
    ]);

    setSaving(false);
    onDone();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Новая обжарка</div>
        {loadingItems ? <div className="empty-state">Загрузка...</div> : (
          <>
            <div className="form-group">
              <label className="form-label">Зелёное зерно</label>
              <select className="input" value={greenItemId} onChange={e => setGreenItemId(e.target.value)}>
                <option value="">— выберите зелёное зерно —</option>
                {greenItems.map(it => <option key={it.id} value={it.id}>{it.name} (остаток {fmtKg(it.stock_qty)})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Дата обжарки</label>
              <input className="input" type="date" value={roastDate} onChange={e => setRoastDate(e.target.value)} style={{ maxWidth: 200 }} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Загружено, кг</label>
                <input className="input" type="number" value={inputKg} onChange={e => setInputKg(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Выход, кг</label>
                <input className="input" type="number" value={outputKg} onChange={e => setOutputKg(e.target.value)} />
              </div>
            </div>
            {input > 0 && output > 0 && (
              <div className="form-group" style={{ fontSize: 12, color: lossWarn ? "#B45309" : "#6B7280" }}>
                Ужарка: {lossPct.toFixed(1)}%{lossWarn && " — проверьте цифры (обычно 10–20%)"} · Себестоимость: {fmtMoney(costPerKg)}/кг
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Комментарий</label>
              <input className="input" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
              <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Сохранение..." : "Сохранить"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// МОДАЛКА: КУПАЖИРОВАНИЕ
// ============================================================
function emptyIngredientLine(sortName = "", kg = "") {
  return { key: Math.random().toString(36).slice(2), sortName, kg };
}

function NewBlendModal({ prefill, onClose, onDone, showToast }) {
  const [blendProducts, setBlendProducts] = useState([]);
  const [sortOptions, setSortOptions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [blendName, setBlendName] = useState(prefill?.blend_name || "");
  const [isNewName, setIsNewName] = useState(false);
  const [mixDate, setMixDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState(
    prefill?.ingredients?.length
      ? prefill.ingredients.map(i => emptyIngredientLine(i.sort_name, i.kg.toFixed(2)))
      : [emptyIngredientLine(), emptyIngredientLine()]
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: prod, error: prodErr }, { data: roast, error: roastErr }] = await Promise.all([
        supabase.from("products").select("id, name").eq("country", "Купаж"),
        supabase.from("roast_batches").select("sort_name, remaining_kg").gt("remaining_kg", 0),
      ]);
      if (prodErr) showToast("Ошибка загрузки купажей: " + prodErr.message);
      if (roastErr) showToast("Ошибка загрузки готового зерна: " + roastErr.message);
      setBlendProducts(prod || []);
      const stockMap = new Map();
      (roast || []).forEach(b => stockMap.set(b.sort_name, (stockMap.get(b.sort_name) || 0) + Number(b.remaining_kg)));
      setSortOptions([...stockMap.entries()].map(([name, kg]) => ({ name, kg })).sort((a, b) => a.name.localeCompare(b.name)));
      setLoadingData(false);
    }
    load();
  }, []); // eslint-disable-line

  function updateLine(key, patch) { setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l)); }
  function addLine() { setLines(prev => [...prev, emptyIngredientLine()]); }
  function removeLine(key) { setLines(prev => prev.filter(l => l.key !== key)); }

  const totalKg = lines.reduce((s, l) => s + (Number(l.kg) || 0), 0);

  async function save() {
    const name = (blendName || "").trim();
    if (!name) { showToast("Укажите название купажа"); return; }
    const validLines = lines.filter(l => l.sortName && Number(l.kg) > 0);
    if (validLines.length < 2) { showToast("Нужно минимум 2 ингредиента с указанным весом"); return; }
    setSaving(true);

    const ingredientResults = [];
    for (const line of validLines) {
      const needKg = Number(line.kg);
      const { data: batches, error: bErr } = await supabase
        .from("roast_batches").select("*").eq("sort_name", line.sortName).gt("remaining_kg", 0).order("roast_date", { ascending: true });
      if (bErr) { showToast("Ошибка чтения партий обжарки: " + bErr.message); setSaving(false); return; }
      let remainingToConsume = needKg;
      let costSum = 0;
      const touched = [];
      for (const b of (batches || [])) {
        if (remainingToConsume <= 0) break;
        const take = Math.min(Number(b.remaining_kg), remainingToConsume);
        touched.push({ batch: b, take });
        costSum += take * Number(b.cost_per_kg);
        remainingToConsume -= take;
      }
      if (remainingToConsume > 0.0001) {
        showToast(`Недостаточно готового зерна «${line.sortName}»: не хватает ${remainingToConsume.toFixed(2)} кг`);
        setSaving(false);
        return;
      }
      for (const { batch, take } of touched) {
        await supabase.from("roast_batches").update({ remaining_kg: Number(batch.remaining_kg) - take }).eq("id", batch.id);
      }
      ingredientResults.push({ sort_name: line.sortName, kg: needKg, cost_per_kg: needKg > 0 ? costSum / needKg : 0, touched });
    }

    const blendCostPerKg = ingredientResults.reduce((s, i) => s + i.kg * i.cost_per_kg, 0) / totalKg;

    const { data: blendBatch, error: blendErr } = await supabase.from("blend_batches").insert([{
      blend_name: name, mix_date: mixDate, total_kg: totalKg, cost_per_kg: blendCostPerKg, remaining_kg: totalKg, notes: notes || null,
    }]).select().single();
    if (blendErr) { showToast("Не удалось сохранить купаж: " + blendErr.message); setSaving(false); return; }

    await supabase.from("blend_batch_ingredients").insert(
      ingredientResults.map(i => ({ blend_batch_id: blendBatch.id, sort_name: i.sort_name, kg: i.kg, cost_per_kg: i.cost_per_kg }))
    );

    const movementRows = [];
    ingredientResults.forEach(i => {
      i.touched.forEach(({ batch, take }) => {
        movementRows.push({ movement_type: "blend_consume", item_id: null, batch_id: batch.id, batch_type: "roast", qty_change: -take, unit: "kg", reference: null, comment: `Купаж ${name}` });
      });
    });
    movementRows.push({ movement_type: "blend_produce", item_id: null, batch_id: blendBatch.id, batch_type: "blend", qty_change: totalKg, unit: "kg", reference: null, comment: null });
    await supabase.from("warehouse_movements").insert(movementRows);

    setSaving(false);
    onDone();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-title">Купажирование</div>
        {loadingData ? <div className="empty-state">Загрузка...</div> : (
          <>
            <div className="form-group">
              <label className="form-label">Название купажа</label>
              {isNewName ? (
                <input className="input" value={blendName} onChange={e => setBlendName(e.target.value)} placeholder="Название нового купажа" autoFocus />
              ) : (
                <select className="input" value={blendName} onChange={e => {
                  if (e.target.value === "__new__") { setIsNewName(true); setBlendName(""); } else setBlendName(e.target.value);
                }}>
                  <option value="">— выберите купаж —</option>
                  {blendProducts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  <option value="__new__">+ новый купаж...</option>
                </select>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Дата смешивания</label>
              <input className="input" type="date" value={mixDate} onChange={e => setMixDate(e.target.value)} style={{ maxWidth: 200 }} />
            </div>

            {lines.map(line => {
              const missing = line.sortName && !sortOptions.find(o => o.name === line.sortName);
              return (
                <div key={line.key} className="form-row" style={{ alignItems: "flex-end", marginBottom: 8 }}>
                  <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
                    <label className="form-label">Сорт</label>
                    <select className="input" value={line.sortName} onChange={e => updateLine(line.key, { sortName: e.target.value })}>
                      <option value="">— выберите сорт —</option>
                      {sortOptions.map(o => <option key={o.name} value={o.name}>{o.name} (остаток {fmtKg(o.kg)})</option>)}
                      {missing && <option value={line.sortName}>{line.sortName} (нет в наличии)</option>}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Кг</label>
                    <input className="input" type="number" value={line.kg} onChange={e => updateLine(line.key, { kg: e.target.value })} />
                  </div>
                  {lines.length > 2 && (
                    <button className="action-icon-btn danger" onClick={() => removeLine(line.key)}>✕</button>
                  )}
                </div>
              );
            })}
            <button className="btn btn-secondary btn-sm" onClick={addLine}>+ Добавить ингредиент</button>

            <div className="form-group" style={{ marginTop: 14, fontSize: 12, color: "#6B7280" }}>Итого: {fmtKg(totalKg)}</div>

            <div className="form-group">
              <label className="form-label">Комментарий</label>
              <input className="input" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
              <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Сохранение..." : "Сохранить"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
