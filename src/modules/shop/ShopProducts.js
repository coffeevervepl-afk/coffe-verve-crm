import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

const fmtMoney = (n) => n != null ? `${Number(n).toFixed(2)} zł` : "—";

const STOCK_LABELS = { in_stock: "В наличии", low: "Мало", out: "Нет" };
const STOCK_PILL = {
  in_stock: { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" },
  low: { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" },
  out: { bg: "#FFF1F2", color: "#BE123C", border: "#FECDD3" },
};
const ROAST_LABELS = { light: "Светлая", medium: "Средняя", "medium-dark": "Средне-тёмная", dark: "Тёмная" };
const PROCESS_OPTIONS = ["Мытая", "Натуральная", "Хани", "Анаэробная"];

const PRESET_NOTES = {
  ru: ["Орехи", "Молочный шоколад", "Карамель", "Фундук", "Какао", "Миндаль", "Шоколад", "Спелая слива", "Тёмный шоколад", "Апельсин", "Спелые фрукты", "Ягоды", "Цитрус", "Цветочные ноты", "Косточковые фрукты", "Жареный миндаль"],
  pl: ["Orzechy", "Czekolada mleczna", "Karmel", "Orzech laskowy", "Kakao", "Migdały", "Czekolada", "Dojrzała śliwka", "Gorzka czekolada", "Pomarańcza", "Dojrzałe owoce", "Jagody", "Cytrusy", "Nuty kwiatowe", "Owoce pestkowe", "Prażone migdały"],
  ua: ["Горіхи", "Молочний шоколад", "Карамель", "Фундук", "Какао", "Мигдаль", "Шоколад", "Стигла слива", "Темний шоколад", "Апельсин", "Стиглі фрукти", "Ягоди", "Цитрус", "Квіткові ноти", "Кісточкові фрукти", "Смажений мигдаль"],
};

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isPublishable(p) {
  return !!(p.description_ru?.trim() && p.description_pl?.trim() && p.description_ua?.trim() && p.images?.length);
}

export default function ShopProducts() {
  const [products, setProducts] = useState([]);
  const [soldMap, setSoldMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddFromCrm, setShowAddFromCrm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [cellValue, setCellValue] = useState("");
  const [toast, setToast] = useState(null);
  const dragIndexRef = useRef(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("shop_products").select("*").order("sort_order", { ascending: true });
    if (error) showToast("Ошибка загрузки товаров: " + error.message);
    setProducts(data || []);
    setLoading(false);
  }, []);

  const fetchSold = useCallback(async () => {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from("shop_order_items")
      .select("shop_product_id, quantity, shop_orders!inner(created_at)")
      .gte("shop_orders.created_at", since);
    if (error) { showToast("Ошибка загрузки продаж: " + error.message); return; }
    const map = {};
    (data || []).forEach(row => {
      if (!row.shop_product_id) return;
      map[row.shop_product_id] = (map[row.shop_product_id] || 0) + row.quantity;
    });
    setSoldMap(map);
  }, []);

  useEffect(() => { fetchProducts(); fetchSold(); }, [fetchProducts, fetchSold]);

  function handleUpdated(updated) {
    setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    setSelected(prev => prev && prev.id === updated.id ? { ...prev, ...updated } : prev);
  }

  async function saveField(id, field, value) {
    const { error } = await supabase.from("shop_products").update({ [field]: value }).eq("id", id);
    if (error) { showToast("Не удалось сохранить: " + error.message); return; }
    handleUpdated({ id, [field]: value });
  }

  function startEdit(p, field) {
    setEditingCell({ id: p.id, field });
    setCellValue(p[field] != null ? String(p[field]) : "");
  }

  async function commitEdit() {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const num = cellValue === "" ? null : Number(cellValue);
    await saveField(id, field, num);
    setEditingCell(null);
  }

  async function toggleActive(p) {
    if (!p.is_active && !isPublishable(p)) {
      showToast("Нельзя опубликовать: нужны фото и описания на RU/PL/UA");
      return;
    }
    await saveField(p.id, "is_active", !p.is_active);
  }

  async function changeStock(p, stock_status) {
    await saveField(p.id, "stock_status", stock_status);
  }

  function onDragStart(index) { dragIndexRef.current = index; }
  async function onDrop(index) {
    const from = dragIndexRef.current;
    if (from == null || from === index) return;
    const reordered = [...products];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(index, 0, moved);
    setProducts(reordered);
    dragIndexRef.current = null;
    const results = await Promise.all(reordered.map((p, i) => supabase.from("shop_products").update({ sort_order: i }).eq("id", p.id)));
    const failed = results.find(r => r.error);
    if (failed) showToast("Не удалось сохранить порядок: " + failed.error.message);
    reordered.forEach((p, i) => { p.sort_order = i; });
  }

  const filtered = products.filter(p => !search || p.name_ru?.toLowerCase().includes(search.toLowerCase()) || p.slug?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">Товары магазина ({products.length})</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddFromCrm(true)}>+ Товар из CRM</button>
      </div>
      <div className="content">
        <input className="search-bar" placeholder="Поиск по названию..." value={search} onChange={e => setSearch(e.target.value)} />
        {loading ? <div className="empty-state">Загрузка...</div> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr>
                  <th></th><th>Фото</th><th>Название</th><th>250г</th><th>500г</th><th>1кг</th>
                  <th>Наличие</th><th>Продано за 30д</th><th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={9} className="empty-state">Нет товаров</td></tr> : filtered.map((p, i) => (
                  <tr key={p.id} className="drag-row"
                    draggable
                    onDragStart={() => onDragStart(i)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => onDrop(i)}
                  >
                    <td className="drag-handle" title="Перетащить для смены порядка">⠿</td>
                    <td>
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }} />
                        : <div style={{ width: 40, height: 40, borderRadius: 6, background: "#F3F4F6" }} />}
                    </td>
                    <td style={{ cursor: "pointer", fontWeight: 500 }} onClick={() => setSelected(p)}>
                      {p.name_ru}
                      {!isPublishable(p) && <div style={{ fontSize: 10, color: "#B45309" }}>не хватает данных для публикации</div>}
                    </td>
                    {["price_250", "price_500", "price_1000"].map(field => (
                      <td key={field} className="inline-edit-cell" onClick={() => startEdit(p, field)}>
                        {editingCell?.id === p.id && editingCell?.field === field ? (
                          <input
                            className="input" style={{ width: 70, padding: "3px 6px" }} autoFocus
                            value={cellValue}
                            onChange={e => setCellValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={e => e.key === "Enter" && commitEdit()}
                          />
                        ) : (
                          <span style={{ color: "#16A34A", fontWeight: 600 }}>
                            {p[field.replace("price", "old_price")] != null && (
                              <span className="old-price">{fmtMoney(p[field.replace("price", "old_price")])}</span>
                            )}
                            {fmtMoney(p[field])}
                          </span>
                        )}
                      </td>
                    ))}
                    <td>
                      <select
                        className="status-select-pill"
                        style={{ background: STOCK_PILL[p.stock_status]?.bg, color: STOCK_PILL[p.stock_status]?.color, borderColor: STOCK_PILL[p.stock_status]?.border }}
                        value={p.stock_status}
                        onChange={e => changeStock(p, e.target.value)}
                      >
                        {Object.keys(STOCK_LABELS).map(s => <option key={s} value={s}>{STOCK_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td style={{ textAlign: "center", color: "#4B5563" }}>{soldMap[p.id] || 0}</td>
                    <td>
                      <label className="toggle-switch" title={p.is_active ? "Активен" : "Скрыт"}>
                        <input type="checkbox" checked={!!p.is_active} onChange={() => toggleActive(p)} />
                        <span className="toggle-slider" />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && <ProductDrawer product={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} onError={showToast} />}
      {showAddFromCrm && (
        <AddFromCrmModal
          existingIds={products.map(p => p.crm_product_id).filter(Boolean)}
          onClose={() => setShowAddFromCrm(false)}
          onCreated={(p) => { setShowAddFromCrm(false); fetchProducts(); setSelected(p); }}
          onError={showToast}
        />
      )}
      {toast && <div className="print-toast">{toast}</div>}
    </div>
  );
}

function AddFromCrmModal({ existingIds, onClose, onCreated, onError }) {
  const [crmProducts, setCrmProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState(null);

  useEffect(() => {
    supabase.from("products").select("*").order("code").then(({ data, error }) => {
      if (error) onError("Ошибка загрузки товаров CRM: " + error.message);
      setCrmProducts((data || []).filter(p => !existingIds.includes(p.id)));
      setLoading(false);
    });
  }, [existingIds, onError]);

  async function addProduct(cp) {
    setCreatingId(cp.id);
    const { data: last, error: lastError } = await supabase.from("shop_products").select("sort_order").order("sort_order", { ascending: false }).limit(1);
    if (lastError) { onError("Ошибка: " + lastError.message); setCreatingId(null); return; }
    const nextSortOrder = last?.[0] ? last[0].sort_order + 1 : 0;
    const slug = slugify(cp.name);
    const { data, error } = await supabase.from("shop_products").insert([{
      crm_product_id: cp.id,
      slug,
      name_ru: cp.name,
      name_pl: cp.name,
      name_ua: cp.name,
      origin: cp.country,
      flavor_notes_ru: cp.flavor_notes,
      flavor_notes_pl: cp.flavor_notes_pl,
      flavor_notes_ua: cp.flavor_notes_ua,
      price_250: cp.price_250,
      price_500: cp.price_500,
      price_1000: cp.price_1000,
      is_active: false,
      stock_status: "in_stock",
      sort_order: nextSortOrder,
    }]).select().single();
    setCreatingId(null);
    if (error) { onError("Не удалось добавить товар: " + error.message); return; }
    if (data) onCreated(data);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-title">Добавить товар из CRM</div>
        {loading ? <div className="empty-state">Загрузка...</div> : crmProducts.length === 0 ? (
          <div className="empty-state">Все товары CRM уже добавлены в магазин</div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {crmProducts.map(cp => (
              <div key={cp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{cp.name}</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>{cp.country} · {cp.code}</div>
                </div>
                <button className="btn btn-secondary btn-sm" disabled={creatingId === cp.id} onClick={() => addProduct(cp)}>
                  {creatingId === cp.id ? "…" : "Добавить"}
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Закрыть</button></div>
      </div>
    </div>
  );
}

function NoteChips({ value, lang, onChange }) {
  const selected = (value || "").split("•").map(s => s.trim()).filter(Boolean);
  const [custom, setCustom] = useState("");

  function toggle(note) {
    const next = selected.includes(note) ? selected.filter(n => n !== note) : [...selected, note];
    onChange(next.join(" • "));
  }
  function addCustom() {
    if (!custom.trim()) return;
    onChange([...selected, custom.trim()].join(" • "));
    setCustom("");
  }

  return (
    <div>
      <div className="chip-list" style={{ marginBottom: 8 }}>
        {PRESET_NOTES[lang].map(note => (
          <span key={note} className={"chip" + (selected.includes(note) ? " selected" : "")} onClick={() => toggle(note)}>{note}</span>
        ))}
        {selected.filter(s => !PRESET_NOTES[lang].includes(s)).map(note => (
          <span key={note} className="chip selected" onClick={() => toggle(note)}>{note} ×</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input className="input" placeholder="Своя нота..." value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addCustom()} />
        <button className="btn btn-secondary btn-sm" onClick={addCustom}>+</button>
      </div>
    </div>
  );
}

function ProductDrawer({ product, onClose, onUpdated, onError }) {
  const [form, setForm] = useState(product);
  const [descTab, setDescTab] = useState("ru");
  const [uploading, setUploading] = useState(false);
  const dragImgIndex = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { setForm(product); }, [product]);

  async function saveFields(fields) {
    setForm(prev => ({ ...prev, ...fields }));
    const { error } = await supabase.from("shop_products").update(fields).eq("id", product.id);
    if (error) { onError("Не удалось сохранить: " + error.message); return; }
    onUpdated({ id: product.id, ...fields });
  }

  async function uploadImages(files) {
    setUploading(true);
    const uploaded = [];
    const failures = [];
    for (const file of Array.from(files)) {
      const path = `products/${form.slug || product.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("shop").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("shop").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      } else {
        failures.push(`${file.name}: ${error.message}`);
      }
    }
    setUploading(false);
    if (failures.length) onError("Ошибка загрузки фото — " + failures.join("; "));
    if (uploaded.length) await saveFields({ images: [...(form.images || []), ...uploaded] });
  }

  function storagePathFromUrl(url) {
    const marker = "/object/public/shop/";
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.slice(idx + marker.length);
  }

  async function removeImage(idx) {
    const img = (form.images || [])[idx];
    const next = (form.images || []).filter((_, i) => i !== idx);
    await saveFields({ images: next });
    const path = img && storagePathFromUrl(img);
    if (path) {
      const { error } = await supabase.storage.from("shop").remove([path]);
      if (error) onError("Фото убрано из товара, но не удалилось из хранилища: " + error.message);
    }
  }

  function onImgDragStart(idx) { dragImgIndex.current = idx; }
  function onImgDrop(idx) {
    const from = dragImgIndex.current;
    if (from == null || from === idx) return;
    const next = [...(form.images || [])];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    dragImgIndex.current = null;
    saveFields({ images: next });
  }

  const publishable = isPublishable(form);

  return (
    <div className="drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer">
        <div className="drawer-header">
          <span className="drawer-title">{form.name_ru}</span>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body">

          <div className="drawer-section">
            <div className="drawer-section-title">Фото (первое — главное)</div>
            <div className="img-thumb-list">
              {(form.images || []).map((img, i) => (
                <div key={img + i} className={"img-thumb" + (i === 0 ? " main" : "")}
                  draggable onDragStart={() => onImgDragStart(i)} onDragOver={e => e.preventDefault()} onDrop={() => onImgDrop(i)}>
                  <img src={img} alt="" />
                  <button className="img-remove" onClick={() => removeImage(i)}>×</button>
                </div>
              ))}
              <div className="img-thumb-add" onClick={() => fileInputRef.current?.click()}>{uploading ? "…" : "+"}</div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden
                onChange={e => e.target.files.length && uploadImages(e.target.files)} />
            </div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">Основное</div>
            <div className="form-group">
              <label className="form-label">Название (RU)</label>
              <input className="input" value={form.name_ru || ""} onChange={e => setForm({ ...form, name_ru: e.target.value })} onBlur={() => saveFields({ name_ru: form.name_ru })} />
            </div>
            <div className="form-group">
              <label className="form-label">Slug</label>
              <input className="input" value={form.slug || ""} onChange={e => setForm({ ...form, slug: e.target.value })} onBlur={() => saveFields({ slug: form.slug })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Страна</label>
                <input className="input" value={form.origin || ""} onChange={e => setForm({ ...form, origin: e.target.value })} onBlur={() => saveFields({ origin: form.origin })} />
              </div>
              <div className="form-group">
                <label className="form-label">Высота</label>
                <input className="input" placeholder="1200–1800 м" value={form.altitude || ""} onChange={e => setForm({ ...form, altitude: e.target.value })} onBlur={() => saveFields({ altitude: form.altitude })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Обработка</label>
                <select className="input" value={form.process || ""} onChange={e => saveFields({ process: e.target.value })}>
                  <option value="">—</option>
                  {PROCESS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Обжарка</label>
                <select className="input" value={form.roast_level || ""} onChange={e => saveFields({ roast_level: e.target.value })}>
                  <option value="">—</option>
                  {Object.keys(ROAST_LABELS).map(r => <option key={r} value={r}>{ROAST_LABELS[r]}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">Вкусовые ноты</div>
            <div className="tabs-row">
              {["ru", "pl", "ua"].map(l => (
                <button key={l} className={"tab-btn" + (descTab === l ? " active" : "")} onClick={() => setDescTab(l)}>{l.toUpperCase()}</button>
              ))}
            </div>
            <NoteChips value={form[`flavor_notes_${descTab}`]} lang={descTab} onChange={v => saveFields({ [`flavor_notes_${descTab}`]: v })} />
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">Цены по весам</div>
            {[250, 500, 1000].map(w => (
              <div key={w} className="form-row" style={{ marginBottom: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{w}г — цена</label>
                  <input className="input" type="number" value={form[`price_${w}`] ?? ""} onChange={e => setForm({ ...form, [`price_${w}`]: e.target.value })} onBlur={() => saveFields({ [`price_${w}`]: form[`price_${w}`] || null })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Старая цена (для акций)</label>
                  <input className="input" type="number" value={form[`old_price_${w}`] ?? ""} onChange={e => setForm({ ...form, [`old_price_${w}`]: e.target.value })} onBlur={() => saveFields({ [`old_price_${w}`]: form[`old_price_${w}`] || null })} />
                </div>
              </div>
            ))}
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">
              Описания (RU/PL/UA) {!publishable && <span style={{ color: "#B45309", fontWeight: 400 }}>— обязательны для публикации</span>}
            </div>
            <div className="tabs-row">
              {["ru", "pl", "ua"].map(l => (
                <button key={l} className={"tab-btn" + (descTab === l ? " active" : "")} onClick={() => setDescTab(l)}>
                  {l.toUpperCase()} {!form[`description_${l}`]?.trim() && "•"}
                </button>
              ))}
            </div>
            <textarea className="input" rows={4} style={{ resize: "vertical" }}
              value={form[`description_${descTab}`] || ""}
              onChange={e => setForm({ ...form, [`description_${descTab}`]: e.target.value })}
              onBlur={() => saveFields({ [`description_${descTab}`]: form[`description_${descTab}`] })}
            />
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">SEO</div>
            <div className="form-group">
              <label className="form-label">SEO title</label>
              <input className="input" value={form.seo_title || ""} onChange={e => setForm({ ...form, seo_title: e.target.value })} onBlur={() => saveFields({ seo_title: form.seo_title })} />
            </div>
            <div className="form-group">
              <label className="form-label">SEO description</label>
              <textarea className="input" rows={2} value={form.seo_description || ""} onChange={e => setForm({ ...form, seo_description: e.target.value })} onBlur={() => saveFields({ seo_description: form.seo_description })} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
