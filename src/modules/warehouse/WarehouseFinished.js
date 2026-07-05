import { useState, useEffect, Fragment } from "react";
import { supabase } from "../../lib/supabaseClient";

const AGE_WARN_DAYS = 30;

const fmtMoney = (n) => (n != null ? `${Number(n).toFixed(2)} zł` : "—");
const fmtKg = (n) => (n != null ? `${Number(n).toFixed(2)} кг` : "—");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ru-RU") : "—");
const ageDays = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0);

export default function WarehouseFinished() {
  const [roastBatches, setRoastBatches] = useState([]);
  const [blendBatches, setBlendBatches] = useState([]);
  const [minStockMap, setMinStockMap] = useState({});
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [editingMinStock, setEditingMinStock] = useState(null);
  const [minStockValue, setMinStockValue] = useState("");
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    setLoading(true);
    const [roastRes, blendRes, minRes, settingsRes] = await Promise.all([
      supabase.from("roast_batches").select("*").order("roast_date", { ascending: false }),
      supabase.from("blend_batches").select("*").order("mix_date", { ascending: false }),
      supabase.from("finished_goods_min_stock").select("*"),
      supabase.from("warehouse_economics_settings").select("*").eq("id", 1).single(),
    ]);
    if (roastRes.error) showToast("Ошибка загрузки обжарок: " + roastRes.error.message);
    if (blendRes.error) showToast("Ошибка загрузки купажей: " + blendRes.error.message);
    if (minRes.error) showToast("Ошибка загрузки мин. остатков: " + minRes.error.message);
    if (settingsRes.error) showToast("Ошибка загрузки настроек экономики: " + settingsRes.error.message);
    setRoastBatches(roastRes.data || []);
    setBlendBatches(blendRes.data || []);
    const mm = {};
    (minRes.data || []).forEach(r => { mm[r.name] = r.min_stock; });
    setMinStockMap(mm);
    setSettings(settingsRes.data || null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  async function saveSetting(field, value) {
    const num = Number(String(value).replace(",", ".")) || 0;
    const { error } = await supabase.from("warehouse_economics_settings").update({ [field]: num }).eq("id", 1);
    if (error) { showToast("Не удалось сохранить настройку: " + error.message); return; }
    setSettings(prev => ({ ...prev, [field]: num }));
  }

  function startEditMinStock(name) {
    setEditingMinStock(name);
    setMinStockValue(minStockMap[name] != null ? String(minStockMap[name]) : "0");
  }

  async function commitMinStock(name) {
    const num = Number(minStockValue) || 0;
    setEditingMinStock(null);
    const { error } = await supabase.from("finished_goods_min_stock").upsert({ name, min_stock: num }, { onConflict: "name" });
    if (error) { showToast("Не удалось сохранить: " + error.message); return; }
    setMinStockMap(prev => ({ ...prev, [name]: num }));
  }

  const groupsMap = new Map();
  roastBatches.forEach(b => {
    const g = groupsMap.get(b.sort_name) || { name: b.sort_name, type: "sort", batches: [], remaining: 0 };
    g.batches.push({ ...b, date: b.roast_date });
    g.remaining += Number(b.remaining_kg);
    groupsMap.set(b.sort_name, g);
  });
  blendBatches.forEach(b => {
    const g = groupsMap.get(b.blend_name) || { name: b.blend_name, type: "blend", batches: [], remaining: 0 };
    g.batches.push({ ...b, date: b.mix_date });
    g.remaining += Number(b.remaining_kg);
    groupsMap.set(b.blend_name, g);
  });
  const groups = [...groupsMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">Готовая продукция</span>
      </div>
      <div className="content">
        {settings && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">Настройки экономики</div>
            <div className="config-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <div className="config-item">
                <label>Тариф доставки для нас, zł</label>
                <input type="text" inputMode="decimal" defaultValue={settings.shipping_cost_for_us} onBlur={e => saveSetting("shipping_cost_for_us", e.target.value)} />
                <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4, fontWeight: 400, textTransform: "none" }}>Сколько нам стоит одна отправка InPost</div>
              </div>
              <div className="config-item">
                <label>Комиссия платежей, %</label>
                <input type="text" inputMode="decimal" defaultValue={settings.payment_commission_pct} onBlur={e => saveSetting("payment_commission_pct", e.target.value)} />
                <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4, fontWeight: 400, textTransform: "none" }}>% платёжной системы: Stripe ~2.9%, P24 ~1.9%</div>
              </div>
              <div className="config-item">
                <label>Упаковка отправки, zł</label>
                <input type="text" inputMode="decimal" defaultValue={settings.shipping_packaging_cost} onBlur={e => saveSetting("shipping_packaging_cost", e.target.value)} />
                <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4, fontWeight: 400, textTransform: "none" }}>Резервная оценка, если коробка не выбрана или нет позиций категории «Материалы для отправки»</div>
              </div>
            </div>
          </div>
        )}

        {loading ? <div className="empty-state">Загрузка...</div> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr><th>Название</th><th>Тип</th><th>Остаток</th><th>Мин. остаток</th><th>Партий</th></tr>
              </thead>
              <tbody>
                {groups.length === 0 ? <tr><td colSpan={5} className="empty-state">Готового зерна ещё нет</td></tr> : groups.map(g => {
                  const minStock = minStockMap[g.name] || 0;
                  const low = minStock > 0 && g.remaining <= minStock;
                  const isOpen = expanded === g.name;
                  return (
                    <Fragment key={g.name}>
                      <tr style={{ cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : g.name)}>
                        <td style={{ fontWeight: 500 }}>{g.name}</td>
                        <td style={{ color: "#6B7280" }}>{g.type === "blend" ? "Купаж" : "Сорт"}</td>
                        <td>
                          {fmtKg(g.remaining)}
                          {low && <span className="status-pill" style={{ marginLeft: 8, background: "#FFFBEB", color: "#B45309", borderColor: "#FDE68A" }}>Мало</span>}
                        </td>
                        <td className="inline-edit-cell" onClick={e => { e.stopPropagation(); startEditMinStock(g.name); }}>
                          {editingMinStock === g.name ? (
                            <input
                              className="input" style={{ width: 80, padding: "3px 6px" }} autoFocus
                              value={minStockValue}
                              onChange={e => setMinStockValue(e.target.value)}
                              onBlur={() => commitMinStock(g.name)}
                              onKeyDown={e => e.key === "Enter" && commitMinStock(g.name)}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : fmtKg(minStock)}
                        </td>
                        <td>{g.batches.length}</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={5} style={{ background: "#F9FAFB", padding: "10px 16px" }}>
                            {g.batches
                              .slice()
                              .sort((a, b) => new Date(b.date) - new Date(a.date))
                              .map(b => {
                                const age = ageDays(b.date);
                                const oldBatch = age > AGE_WARN_DAYS;
                                return (
                                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid #F3F4F6", background: oldBatch ? "#FFFBEB" : "transparent" }}>
                                    <span>{fmtDate(b.date)} {oldBatch && <span style={{ color: "#B45309" }}>· {age} дн.</span>}</span>
                                    <span style={{ color: "#6B7280" }}>{fmtKg(b.remaining_kg)} · себестоимость {fmtMoney(b.cost_per_kg)}/кг</span>
                                  </div>
                                );
                              })}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {toast && <div className="print-toast">{toast}</div>}
    </div>
  );
}
