import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { T } from "../../lib/i18n";

const fmtMoney = (n) => n != null ? `${Number(n).toFixed(2)} zł` : "—";

function getStockLabels(t) {
  return { in_stock: t.sp_stock_in_stock, low: t.sp_stock_low, out: t.sp_stock_out };
}
const STOCK_PILL = {
  in_stock: { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" },
  low: { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" },
  out: { bg: "#FFF1F2", color: "#BE123C", border: "#FECDD3" },
};
function getRoastLabels(t) {
  return { light: t.sp_roast_light, medium: t.sp_roast_medium, "medium-dark": t.sp_roast_medium_dark, dark: t.sp_roast_dark };
}
// value — каноническое (русское) значение, хранимое в shop_products.process; labelKey — переводимая подпись.
function getProcessOptions(t) {
  return [
    { value: "Мытая", labelKey: "sp_process_washed" },
    { value: "Натуральная", labelKey: "sp_process_natural" },
    { value: "Хани", labelKey: "sp_process_honey" },
    { value: "Анаэробная", labelKey: "sp_process_anaerobic" },
  ];
}
function tpl(str, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), str);
}

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

const EDITABLE_FIELD_KEYS = [
  "name_ru", "slug", "origin", "altitude", "process", "roast_level",
  "flavor_notes_ru", "flavor_notes_pl", "flavor_notes_ua",
  "price_250", "price_500", "price_1000", "old_price_250", "old_price_500", "old_price_1000",
  "description_ru", "description_pl", "description_ua", "seo_title", "seo_description",
  "body", "acidity", "sca_score", "variety", "caffeine", "roaster", "is_featured",
];

function clampInt(value, min, max) {
  if (value === "" || value == null) return null;
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return null;
  return Math.min(max, Math.max(min, n));
}

export default function ShopProducts({ lang }) {
  const t = T[lang];
  const STOCK_LABELS = getStockLabels(t);
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
    if (error) showToast(t.sp_err_load_products + error.message);
    setProducts(data || []);
    setLoading(false);
  }, [t]);

  const fetchSold = useCallback(async () => {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from("shop_order_items")
      .select("shop_product_id, quantity, shop_orders!inner(created_at)")
      .gte("shop_orders.created_at", since);
    if (error) { showToast(t.sp_err_load_sales + error.message); return; }
    const map = {};
    (data || []).forEach(row => {
      if (!row.shop_product_id) return;
      map[row.shop_product_id] = (map[row.shop_product_id] || 0) + row.quantity;
    });
    setSoldMap(map);
  }, [t]);

  useEffect(() => { fetchProducts(); fetchSold(); }, [fetchProducts, fetchSold]);

  function handleUpdated(updated) {
    setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    setSelected(prev => prev && prev.id === updated.id ? { ...prev, ...updated } : prev);
  }

  async function saveField(id, field, value) {
    const { error } = await supabase.from("shop_products").update({ [field]: value }).eq("id", id);
    if (error) { showToast(t.wf_err_save + error.message); return; }
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
      showToast(t.sp_cannot_publish_toast);
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
    if (failed) showToast(t.sp_err_save_order + failed.error.message);
    reordered.forEach((p, i) => { p.sort_order = i; });
  }

  const filtered = products.filter(p => !search || p.name_ru?.toLowerCase().includes(search.toLowerCase()) || p.slug?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">{t.nav_shop_products} ({products.length})</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddFromCrm(true)}>{t.sp_add_from_crm_btn}</button>
      </div>
      <div className="content">
        <input className="search-bar" placeholder={t.sp_search_placeholder} value={search} onChange={e => setSearch(e.target.value)} />
        {loading ? <div className="empty-state">{t.loading}</div> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr>
                  <th></th><th>{t.sp_photo_col}</th><th>{t.wh_name_col}</th><th>{`250${t.unit_g}`}</th><th>{`500${t.unit_g}`}</th><th>1{t.unit_kg}</th>
                  <th>{t.sp_stock_col}</th><th>{t.sp_sold_30d_col}</th><th>{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={9} className="empty-state">{t.sp_no_products}</td></tr> : filtered.map((p, i) => (
                  <tr key={p.id} className="drag-row"
                    draggable
                    onDragStart={() => onDragStart(i)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => onDrop(i)}
                  >
                    <td className="drag-handle" title={t.sp_drag_title}>⠿</td>
                    <td>
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }} />
                        : <div style={{ width: 40, height: 40, borderRadius: 6, background: "#F3F4F6" }} />}
                    </td>
                    <td style={{ cursor: "pointer", fontWeight: 500 }} onClick={() => setSelected(p)}>
                      {p.name_ru}
                      {!isPublishable(p) && <div style={{ fontSize: 10, color: "#B45309" }}>{t.sp_missing_data_hint}</div>}
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
                      <label className="toggle-switch" title={p.is_active ? t.promo_active_col : t.sp_hidden_title}>
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
      {selected && <ProductDrawer t={t} product={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} onError={showToast} />}
      {showAddFromCrm && (
        <AddFromCrmModal
          t={t}
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

function AddFromCrmModal({ t, existingIds, onClose, onCreated, onError }) {
  const [crmProducts, setCrmProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState(null);

  useEffect(() => {
    supabase.from("products").select("*").order("code").then(({ data, error }) => {
      if (error) onError(t.sp_err_load_crm_products + error.message);
      setCrmProducts((data || []).filter(p => !existingIds.includes(p.id)));
      setLoading(false);
    });
  }, [existingIds, onError, t]);

  async function addProduct(cp) {
    setCreatingId(cp.id);
    const { data: last, error: lastError } = await supabase.from("shop_products").select("sort_order").order("sort_order", { ascending: false }).limit(1);
    if (lastError) { onError(t.promo_err_generic + lastError.message); setCreatingId(null); return; }
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
    if (error) { onError(t.sp_err_add_product + error.message); return; }
    if (data) onCreated(data);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-title">{t.sp_add_from_crm_title}</div>
        {loading ? <div className="empty-state">{t.loading}</div> : crmProducts.length === 0 ? (
          <div className="empty-state">{t.sp_all_crm_added}</div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {crmProducts.map(cp => (
              <div key={cp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{cp.name}</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>{cp.country} · {cp.code}</div>
                </div>
                <button className="btn btn-secondary btn-sm" disabled={creatingId === cp.id} onClick={() => addProduct(cp)}>
                  {creatingId === cp.id ? "…" : t.add}
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>{t.close}</button></div>
      </div>
    </div>
  );
}

function DotRating({ value, onChange, max = 5, readOnly = false }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map(n => {
        const filled = value != null && n <= value;
        return (
          <span
            key={n}
            onClick={readOnly ? undefined : () => onChange(value === n ? null : n)}
            style={{
              width: 20, height: 20, borderRadius: "50%",
              background: filled ? "#412618" : "transparent",
              border: `1px solid ${filled ? "#412618" : "#D8D3CC"}`,
              cursor: readOnly ? "default" : "pointer",
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

function NoteChips({ t, value, lang, onChange }) {
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
        <input className="input" placeholder={t.sp_custom_note_placeholder} value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addCustom()} />
        <button className="btn btn-secondary btn-sm" onClick={addCustom}>+</button>
      </div>
    </div>
  );
}

function ProductDrawer({ t, product, onClose, onUpdated, onError }) {
  const [form, setForm] = useState(product);
  const [descTab, setDescTab] = useState("ru");
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const dragImgIndex = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const ROAST_LABELS = getRoastLabels(t);
  const PROCESS_OPTIONS = getProcessOptions(t);

  useEffect(() => { setForm(product); }, [product]);

  async function saveFields(fields) {
    setForm(prev => ({ ...prev, ...fields }));
    const { error } = await supabase.from("shop_products").update(fields).eq("id", product.id);
    if (error) { onError(t.wf_err_save + error.message); return; }
    onUpdated({ id: product.id, ...fields });
  }

  async function saveAll() {
    setSavingAll(true);
    const fields = {};
    EDITABLE_FIELD_KEYS.forEach(k => { fields[k] = form[k] === "" ? null : form[k]; });
    const { error } = await supabase.from("shop_products").update(fields).eq("id", product.id);
    setSavingAll(false);
    if (error) { onError(t.wf_err_save + error.message); return; }
    onUpdated({ id: product.id, ...fields });
    onError(t.sp_product_saved);
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
    if (failures.length) onError(t.sp_err_photo_upload + failures.join("; "));
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
      if (error) onError(t.sp_photo_removed_err + error.message);
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

  async function uploadVideo(file) {
    setUploadingVideo(true);
    const path = `products/${form.slug || product.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("videos").upload(path, file);
    setUploadingVideo(false);
    if (error) { onError(t.sp_err_video_upload + error.message); return; }
    const { data } = supabase.storage.from("videos").getPublicUrl(path);
    await saveFields({ video_url: data.publicUrl });
  }

  async function removeVideo() {
    const url = form.video_url;
    await saveFields({ video_url: null });
    const marker = "/object/public/videos/";
    const idx = url ? url.indexOf(marker) : -1;
    if (idx !== -1) {
      const path = url.slice(idx + marker.length);
      const { error } = await supabase.storage.from("videos").remove([path]);
      if (error) onError(t.sp_err_video_remove + error.message);
    }
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
            <div className="drawer-section-title">{t.sp_photo_section}</div>
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
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>Квадрат 1:1, формат JPG, до 2MB. Рекомендуем Snapseed для обрезки.</div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.sp_video_section}</div>
            {form.video_url ? (
              <div>
                <video src={form.video_url} controls style={{ width: "100%", maxHeight: 240, borderRadius: 8, background: "#000" }} />
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={removeVideo}>{t.sp_video_remove_btn}</button>
              </div>
            ) : (
              <div>
                <button className="btn btn-secondary btn-sm" disabled={uploadingVideo} onClick={() => videoInputRef.current?.click()}>
                  {uploadingVideo ? "…" : t.sp_video_upload_btn}
                </button>
                <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" hidden
                  onChange={e => e.target.files.length && uploadVideo(e.target.files[0])} />
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>Квадрат 1:1, формат MP4, до 30MB. Рекомендуем CapCut для обрезки.</div>
              </div>
            )}
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.sp_main_section}</div>
            <div className="form-group">
              <label className="form-label">{t.sp_name_ru_label}</label>
              <input className="input" value={form.name_ru || ""} onChange={e => setForm({ ...form, name_ru: e.target.value })} onBlur={() => saveFields({ name_ru: form.name_ru })} />
            </div>
            <div className="form-group">
              <label className="form-label">{t.sp_slug_label}</label>
              <input className="input" value={form.slug || ""} onChange={e => setForm({ ...form, slug: e.target.value })} onBlur={() => saveFields({ slug: form.slug })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t.country}</label>
                <input className="input" value={form.origin || ""} onChange={e => setForm({ ...form, origin: e.target.value })} onBlur={() => saveFields({ origin: form.origin })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.sp_altitude_label}</label>
                <input className="input" placeholder={t.sp_altitude_placeholder} value={form.altitude || ""} onChange={e => setForm({ ...form, altitude: e.target.value })} onBlur={() => saveFields({ altitude: form.altitude })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t.sp_process_label}</label>
                <select className="input" value={form.process || ""} onChange={e => saveFields({ process: e.target.value })}>
                  <option value="">—</option>
                  {PROCESS_OPTIONS.map(o => <option key={o.value} value={o.value}>{t[o.labelKey]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t.sp_roast_label}</label>
                <select className="input" value={form.roast_level || ""} onChange={e => saveFields({ roast_level: e.target.value })}>
                  <option value="">—</option>
                  {Object.keys(ROAST_LABELS).map(r => <option key={r} value={r}>{ROAST_LABELS[r]}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.sp_char_section}</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t.sp_body_label}: {form.body ? `${form.body}/5` : "—"}</label>
                <DotRating value={form.body ?? null} onChange={n => saveFields({ body: n })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.sp_acidity_label}: {form.acidity ? `${form.acidity}/5` : "—"}</label>
                <DotRating value={form.acidity ?? null} onChange={n => saveFields({ acidity: n })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t.sp_sca_label}</label>
              <input className="input" type="number" min={0} max={100} placeholder={t.sp_sca_placeholder}
                value={form.sca_score ?? ""}
                onChange={e => setForm({ ...form, sca_score: e.target.value })}
                onBlur={() => saveFields({ sca_score: clampInt(form.sca_score, 0, 100) })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t.sp_variety_label}</label>
                <input className="input" value={form.variety || ""} onChange={e => setForm({ ...form, variety: e.target.value })} onBlur={() => saveFields({ variety: form.variety || null })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.sp_caffeine_label}</label>
                <input className="input" placeholder={t.sp_caffeine_placeholder} value={form.caffeine || ""} onChange={e => setForm({ ...form, caffeine: e.target.value })} onBlur={() => saveFields({ caffeine: form.caffeine || null })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t.sp_roaster_label}</label>
              <input className="input" value={form.roaster || ""} onChange={e => setForm({ ...form, roaster: e.target.value })} onBlur={() => saveFields({ roaster: form.roaster || null })} />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <span className="toggle-switch">
                  <input type="checkbox" checked={!!form.is_featured} onChange={e => saveFields({ is_featured: e.target.checked })} />
                  <span className="toggle-slider" />
                </span>
                <span style={{ fontSize: 13, color: "#374151" }}>{t.sp_featured_label || "Рекомендуем (показывать в карусели на главной)"}</span>
              </label>
            </div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.flavor_notes}</div>
            <div className="tabs-row">
              {["ru", "pl", "ua"].map(l => (
                <button key={l} className={"tab-btn" + (descTab === l ? " active" : "")} onClick={() => setDescTab(l)}>{l.toUpperCase()}</button>
              ))}
            </div>
            <NoteChips t={t} value={form[`flavor_notes_${descTab}`]} lang={descTab} onChange={v => saveFields({ [`flavor_notes_${descTab}`]: v })} />
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.sp_prices_section}</div>
            {[250, 500, 1000].map(w => (
              <div key={w} className="form-row" style={{ marginBottom: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{tpl(t.sp_price_label, { w })}</label>
                  <input className="input" type="number" value={form[`price_${w}`] ?? ""} onChange={e => setForm({ ...form, [`price_${w}`]: e.target.value })} onBlur={() => saveFields({ [`price_${w}`]: form[`price_${w}`] || null })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t.sp_old_price_label}</label>
                  <input className="input" type="number" value={form[`old_price_${w}`] ?? ""} onChange={e => setForm({ ...form, [`old_price_${w}`]: e.target.value })} onBlur={() => saveFields({ [`old_price_${w}`]: form[`old_price_${w}`] || null })} />
                </div>
              </div>
            ))}
          </div>

          <CostMarginBlock t={t} product={form} showToast={onError} />

          <div className="drawer-section">
            <div className="drawer-section-title">
              {t.sp_descriptions_section} {!publishable && <span style={{ color: "#B45309", fontWeight: 400 }}>{t.sp_required_for_publish}</span>}
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
            <div className="drawer-section-title">{t.sp_seo_section}</div>
            <div className="form-group">
              <label className="form-label">{t.sp_seo_title_label}</label>
              <input className="input" value={form.seo_title || ""} onChange={e => setForm({ ...form, seo_title: e.target.value })} onBlur={() => saveFields({ seo_title: form.seo_title })} />
            </div>
            <div className="form-group">
              <label className="form-label">{t.sp_seo_desc_label}</label>
              <textarea className="input" rows={2} value={form.seo_description || ""} onChange={e => setForm({ ...form, seo_description: e.target.value })} onBlur={() => saveFields({ seo_description: form.seo_description })} />
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: "100%" }} disabled={savingAll} onClick={saveAll}>
            {savingAll ? "…" : t.save}
          </button>

        </div>
      </div>
    </div>
  );
}

function CostMarginBlock({ t, product, showToast }) {
  const [loading, setLoading] = useState(true);
  const [sortInfo, setSortInfo] = useState(null);
  const [bagCosts, setBagCosts] = useState({});
  const [labelCost, setLabelCost] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!product.crm_product_id) { setLoading(false); return; }
      setLoading(true);
      const [{ data: crmProduct, error: cpErr }, { data: bags, error: bagsErr }, { data: labelItem, error: labelErr }] = await Promise.all([
        supabase.from("products").select("name, country").eq("id", product.crm_product_id).maybeSingle(),
        supabase.from("warehouse_items").select("category, avg_price_net").in("category", ["bags_250", "bags_500", "bags_1000"]),
        supabase.from("warehouse_items").select("avg_price_net").eq("category", "labels").order("stock_qty", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (cpErr) showToast(t.sp_err_load_crm_product + cpErr.message);
      if (bagsErr) showToast(t.sp_err_load_bags + bagsErr.message);
      if (labelErr) showToast(t.sp_err_load_labels + labelErr.message);
      if (cancelled) return;

      const bc = {};
      (bags || []).forEach(b => {
        const w = b.category === "bags_250" ? 250 : b.category === "bags_500" ? 500 : 1000;
        bc[w] = Number(b.avg_price_net) || 0;
      });
      setBagCosts(bc);
      setLabelCost(labelItem ? Number(labelItem.avg_price_net) || 0 : 0);

      if (!crmProduct) { setSortInfo(null); setLoading(false); return; }

      let avgCostPerKg = 0;
      if (crmProduct.country === "Купаж") {
        const { data: blends, error } = await supabase.from("blend_batches").select("cost_per_kg").eq("blend_name", crmProduct.name).order("mix_date", { ascending: false }).limit(1);
        if (error) showToast(t.wf_err_load_blends + error.message);
        avgCostPerKg = blends?.[0] ? Number(blends[0].cost_per_kg) : 0;
      } else {
        const { data: roasts, error } = await supabase.from("roast_batches").select("cost_per_kg").eq("sort_name", crmProduct.name).order("roast_date", { ascending: false }).limit(1);
        if (error) showToast(t.wf_err_load_roasts + error.message);
        avgCostPerKg = roasts?.[0] ? Number(roasts[0].cost_per_kg) : 0;
      }
      if (!cancelled) {
        setSortInfo({ name: crmProduct.name, country: crmProduct.country, avgCostPerKg });
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [product.crm_product_id]); // eslint-disable-line

  if (!product.crm_product_id) return null;
  if (loading) {
    return (
      <div className="drawer-section">
        <div className="drawer-section-title">{t.sp_cost_margin_section}</div>
        <div className="empty-state">{t.loading}</div>
      </div>
    );
  }
  if (!sortInfo) {
    return (
      <div className="drawer-section">
        <div className="drawer-section-title">{t.sp_cost_margin_section}</div>
        <div className="empty-state">{t.sp_no_crm_link}</div>
      </div>
    );
  }

  return (
    <div className="drawer-section">
      <div className="drawer-section-title">{t.sp_cost_margin_section}</div>
      {sortInfo.avgCostPerKg === 0 && (
        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 8 }}>
          {tpl(t.sp_no_data_yet, { action: sortInfo.country === "Купаж" ? t.sp_blending_word : t.sp_roasting_word, name: sortInfo.name })}
        </div>
      )}
      <table className="table">
        <thead><tr><th>{t.weight}</th><th>{t.sp_bean_col}</th><th>{t.sp_bag_col}</th><th>{t.sp_label_col}</th><th>{t.sp_cost_col}</th><th>{t.price}</th><th>{t.sp_margin_col}</th></tr></thead>
        <tbody>
          {[250, 500, 1000].map(w => {
            const beanCost = sortInfo.avgCostPerKg * (w / 1000);
            const bagCost = bagCosts[w] || 0;
            const cost = beanCost + bagCost + labelCost;
            const price = Number(product[`price_${w}`]) || 0;
            const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
            return (
              <tr key={w}>
                <td>{w}{t.unit_g}</td>
                <td>{fmtMoney(beanCost)}</td>
                <td>{fmtMoney(bagCost)}</td>
                <td>{fmtMoney(labelCost)}</td>
                <td style={{ fontWeight: 600 }}>{fmtMoney(cost)}</td>
                <td>{fmtMoney(price)}</td>
                <td style={{ color: margin >= 0 ? "#16A34A" : "#DC2626", fontWeight: 600 }}>{price > 0 ? margin.toFixed(0) + "%" : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
