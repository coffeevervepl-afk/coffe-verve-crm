import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

const fmtMoney = (n) => n != null ? `${Number(n).toFixed(2)} zł` : "—";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("ru-RU") : "—";

const CATEGORY_LABELS = {
  welcome: "welcome", referral: "referral", birthday: "birthday",
  review: "review", manual: "manual", reactivation: "reactivation", campaign: "campaign",
};
const CATEGORY_COLORS = {
  welcome: { background: "#DCFCE7", color: "#15803D" },
  referral: { background: "#FEF3C7", color: "#92400E" },
  birthday: { background: "#FCE7F3", color: "#9D174D" },
  review: { background: "#EFF6FF", color: "#1D4ED8" },
  manual: { background: "#F3F4F6", color: "#374151" },
  reactivation: { background: "#FFF7ED", color: "#C2410C" },
  campaign: { background: "#EDE9FE", color: "#6D28D9" },
};
const AUTO_CATEGORIES = ["referral", "review"];
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomChars(n) {
  return Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
}

const emptyForm = {
  code: "", type: "fixed", value: 15, min_order: 0,
  valid_from: "", valid_until: "", max_uses: 1, one_per_customer: true,
  category: "manual", first_order_only: false, product_id: "",
};

export default function ShopPromoCodes() {
  const [promos, setPromos] = useState([]);
  const [products, setProducts] = useState([]);
  const [uses30d, setUses30d] = useState(0);
  const [discountGiven, setDiscountGiven] = useState(0);
  const [revenueWithCodes, setRevenueWithCodes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [promosRes, productsRes, usesRes, ordersRes] = await Promise.all([
      supabase.from("shop_promo_codes").select("*, shop_products(name_ru)").order("created_at", { ascending: false }),
      supabase.from("shop_products").select("id, name_ru").order("name_ru"),
      supabase.from("promo_code_uses").select("id", { count: "exact", head: true }).gte("used_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
      supabase.from("shop_orders").select("discount_amount, total").gt("discount_amount", 0),
    ]);
    if (promosRes.error) showToast("Ошибка загрузки промокодов: " + promosRes.error.message);
    if (ordersRes.error) showToast("Ошибка загрузки статистики: " + ordersRes.error.message);
    setPromos(promosRes.data || []);
    setProducts(productsRes.data || []);
    setUses30d(usesRes.count || 0);
    const orders = ordersRes.data || [];
    setDiscountGiven(orders.reduce((s, o) => s + Number(o.discount_amount || 0), 0));
    setRevenueWithCodes(orders.reduce((s, o) => s + Number(o.total || 0), 0));
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function generateCode() {
    setForm(f => ({ ...f, code: "CV-" + randomChars(8) }));
  }

  async function savePromo() {
    if (!form.code.trim() || (form.type !== "free_shipping" && !form.value)) return;
    setSaving(true);
    const { error } = await supabase.from("shop_promo_codes").insert({
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: form.type === "free_shipping" ? 0 : Number(form.value),
      min_order: Number(form.min_order) || 0,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      used_count: 0,
      one_per_customer: form.one_per_customer,
      category: form.category,
      first_order_only: form.first_order_only,
      product_id: form.product_id || null,
      is_active: true,
    });
    setSaving(false);
    if (error) { showToast("Не удалось создать промокод: " + error.message); return; }
    setShowModal(false);
    setForm(emptyForm);
    loadAll();
  }

  async function toggleActive(promo) {
    const { error } = await supabase.from("shop_promo_codes").update({ is_active: !promo.is_active }).eq("id", promo.id);
    if (error) { showToast("Не удалось сохранить: " + error.message); return; }
    setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: !p.is_active } : p));
  }

  async function deletePromo(id) {
    if (!window.confirm("Удалить промокод?")) return;
    const { error } = await supabase.from("shop_promo_codes").delete().eq("id", id);
    if (error) { showToast("Не удалось удалить: " + error.message); return; }
    setPromos(prev => prev.filter(p => p.id !== id));
  }

  const activeCount = promos.filter(p => p.is_active).length;

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">Промокоды</span>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={() => setShowBulk(true)}>🎲 Массовая генерация</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Создать</button>
        </div>
      </div>
      <div className="content">
        <div className="stats-grid" style={{ marginBottom: 18 }}>
          <div className="stat-card">
            <div><div className="stat-label">Активных</div><div className="stat-value">{activeCount}</div></div>
          </div>
          <div className="stat-card">
            <div><div className="stat-label">Использований 30 дн</div><div className="stat-value">{uses30d}</div></div>
          </div>
          <div className="stat-card">
            <div><div className="stat-label">Скидок выдано</div><div className="stat-value">{fmtMoney(discountGiven)}</div></div>
          </div>
          <div className="stat-card">
            <div><div className="stat-label">Выручка с кодами</div><div className="stat-value">{fmtMoney(revenueWithCodes)}</div></div>
          </div>
        </div>

        {loading ? <div className="empty-state">Загрузка...</div> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Код</th><th>Тип</th><th>Скидка</th><th>Условия</th>
                  <th>Использован</th><th>Срок</th><th>Активен</th><th></th>
                </tr>
              </thead>
              <tbody>
                {promos.length === 0 && <tr><td colSpan={8}><div className="empty-state">Нет промокодов</div></td></tr>}
                {promos.map(p => {
                  const isAuto = AUTO_CATEGORIES.includes(p.category);
                  return (
                    <tr key={p.id}>
                      <td><span className="promo-tag">{p.code}</span></td>
                      <td>
                        <span className="badge" style={CATEGORY_COLORS[p.category] || CATEGORY_COLORS.manual}>
                          {CATEGORY_LABELS[p.category] || p.category}
                        </span>
                        {isAuto && <span className="badge" style={{ background: "#F3F4F6", color: "#9CA3AF", marginLeft: 4 }}>авто</span>}
                      </td>
                      <td style={{ fontWeight: 600, color: "#16A34A" }}>
                        {p.type === "free_shipping" ? "Бесплатная доставка" : p.type === "fixed" ? `−${p.value} zł` : `−${p.value}%`}
                      </td>
                      <td style={{ fontSize: 11, color: "#6B7280" }}>
                        {p.min_order ? `от ${fmtMoney(p.min_order)}` : ""}
                        {p.first_order_only && <div>только 1-й заказ</div>}
                        {p.shop_products?.name_ru && <div>товар: {p.shop_products.name_ru}</div>}
                        {!p.min_order && !p.first_order_only && !p.shop_products?.name_ru && "—"}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <span style={{ fontWeight: 600 }}>{p.used_count || 0}</span>
                        <span style={{ color: "#9CA3AF" }}> / {p.max_uses ?? "∞"}</span>
                      </td>
                      <td style={{ color: "#6B7280", fontSize: 12 }}>
                        {p.valid_until ? fmtDate(p.valid_until) : "∞"}
                      </td>
                      <td>
                        <label className="toggle-switch" style={isAuto ? { opacity: 0.4, pointerEvents: "none" } : undefined}>
                          <input type="checkbox" checked={!!p.is_active} onChange={() => toggleActive(p)} disabled={isAuto} />
                          <span className="toggle-slider" />
                        </label>
                      </td>
                      <td>
                        {!isAuto && (
                          <button className="action-icon-btn danger" onClick={() => deletePromo(p.id)} title="Удалить">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                            </svg>
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

      {showModal && (
        <CreateModal
          form={form} setForm={setForm} products={products} saving={saving}
          onGenerate={generateCode} onSave={savePromo} onClose={() => { setShowModal(false); setForm(emptyForm); }}
        />
      )}
      {showBulk && <BulkGenerateModal onClose={() => setShowBulk(false)} onDone={() => { setShowBulk(false); loadAll(); }} onError={showToast} />}
      {toast && <div className="print-toast">{toast}</div>}
    </div>
  );
}

function CreateModal({ form, setForm, products, saving, onGenerate, onSave, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Создать промокод</div>
        <div className="form-group">
          <label className="form-label">Код</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" style={{ flex: 1 }} value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="CV-XXXXXXXX" />
            <button className="btn btn-secondary" onClick={onGenerate}>🎲 Сгенерировать</button>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Тип скидки</label>
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="fixed">Фикс, zł</option>
              <option value="percent">Процент, %</option>
              <option value="free_shipping">Бесплатная доставка</option>
            </select>
          </div>
          {form.type !== "free_shipping" && (
            <div className="form-group">
              <label className="form-label">Размер скидки</label>
              <input className="input" type="number" min={1} value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </div>
          )}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Мин. сумма заказа (zł)</label>
            <input className="input" type="number" min={0} value={form.min_order}
              onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Категория</label>
            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {Object.keys(CATEGORY_LABELS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Только для товара</label>
            <select className="input" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}>
              <option value="">— любой товар —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name_ru}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Лимит использований</label>
            <input className="input" type="number" min={1} value={form.max_uses}
              onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="∞" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Срок: с</label>
            <input className="input" type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Срок: по</label>
            <input className="input" type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
          </div>
        </div>
        <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="toggle-switch">
              <input type="checkbox" checked={form.one_per_customer} onChange={e => setForm(f => ({ ...f, one_per_customer: e.target.checked }))} />
              <span className="toggle-slider" />
            </span>
            <span style={{ fontSize: 13, color: "#374151" }}>1 использование на клиента</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="toggle-switch">
              <input type="checkbox" checked={form.first_order_only} onChange={e => setForm(f => ({ ...f, first_order_only: e.target.checked }))} />
              <span className="toggle-slider" />
            </span>
            <span style={{ fontSize: 13, color: "#374151" }}>Только первый заказ</span>
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving || !form.code.trim()}>
            {saving ? "…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkGenerateModal({ onClose, onDone, onError }) {
  const [template, setTemplate] = useState("SUMMER-XXXX");
  const [count, setCount] = useState(20);
  const [type, setType] = useState("fixed");
  const [value, setValue] = useState(10);
  const [category, setCategory] = useState("campaign");
  const [validUntil, setValidUntil] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);

  async function generate() {
    if (!template.includes("X")) { onError("В шаблоне должна быть хотя бы одна X"); return; }
    setGenerating(true);
    const { data: existing, error: fetchError } = await supabase.from("shop_promo_codes").select("code");
    if (fetchError) { onError("Ошибка: " + fetchError.message); setGenerating(false); return; }
    const existingCodes = new Set((existing || []).map(r => r.code));
    const codes = new Set();
    let guard = 0;
    while (codes.size < Number(count) && guard < Number(count) * 50) {
      guard++;
      const candidate = template.replace(/X+/g, m => randomChars(m.length));
      if (!existingCodes.has(candidate) && !codes.has(candidate)) codes.add(candidate);
    }
    const rows = Array.from(codes).map(code => ({
      code, type, value: Number(value), min_order: 0,
      valid_until: validUntil || null, max_uses: 1, one_per_customer: true,
      category, is_active: true,
    }));
    const { error } = await supabase.from("shop_promo_codes").insert(rows);
    setGenerating(false);
    if (error) { onError("Не удалось создать коды: " + error.message); return; }
    setGenerated(rows);
  }

  function downloadCsv() {
    const header = "code,type,value,valid_until";
    const lines = generated.map(r => `${r.code},${r.type},${r.value},${r.valid_until || ""}`);
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promo-codes-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Массовая генерация промокодов</div>
        {!generated ? (
          <>
            <div className="form-group">
              <label className="form-label">Шаблон (X — случайный символ)</label>
              <input className="input" value={template} onChange={e => setTemplate(e.target.value.toUpperCase())} placeholder="SUMMER-XXXX" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Количество кодов</label>
                <input className="input" type="number" min={1} max={1000} value={count} onChange={e => setCount(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Категория</label>
                <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                  {Object.keys(CATEGORY_LABELS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Тип скидки</label>
                <select className="input" value={type} onChange={e => setType(e.target.value)}>
                  <option value="fixed">Фикс, zł</option>
                  <option value="percent">Процент, %</option>
                  <option value="free_shipping">Бесплатная доставка</option>
                </select>
              </div>
              {type !== "free_shipping" && (
                <div className="form-group">
                  <label className="form-label">Размер скидки</label>
                  <input className="input" type="number" min={1} value={value} onChange={e => setValue(e.target.value)} />
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Срок действия по</label>
              <input className="input" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10 }}>
              Каждый код — одноразовый (1 использование на клиента), для рассылок/листовок/QR на пачках.
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
              <button className="btn btn-primary" onClick={generate} disabled={generating}>
                {generating ? "…" : "Сгенерировать"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 10 }}>
              Создано кодов: <b>{generated.length}</b>
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto", background: "#F9FAFB", borderRadius: 8, padding: "8px 10px", fontFamily: "monospace", fontSize: 12, marginBottom: 12 }}>
              {generated.map(r => <div key={r.code}>{r.code}</div>)}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { onDone(); }}>Закрыть</button>
              <button className="btn btn-primary" onClick={downloadCsv}>Скачать CSV</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
