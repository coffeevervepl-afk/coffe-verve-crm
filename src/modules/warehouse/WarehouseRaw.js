import { useState, useEffect, useCallback, Fragment } from "react";
import { supabase } from "../../lib/supabaseClient";
import { T } from "../../lib/i18n";

function getCategoryLabels(t) {
  return {
    green_beans: t.whr_cat_green_beans,
    bags_250: t.whr_cat_bags_250,
    bags_500: t.whr_cat_bags_500,
    bags_1000: t.whr_cat_bags_1000,
    labels: t.whr_cat_labels,
    shipping_materials: t.whr_cat_shipping_materials,
    supplies: t.whr_cat_supplies,
  };
}
const CATEGORIES = ["green_beans", "bags_250", "bags_500", "bags_1000", "labels", "shipping_materials", "supplies"];
function getUnitLabels(t) {
  return { kg: t.unit_kg, pcs: t.unit_pcs };
}
function getMovementLabels(t) {
  return {
    receipt: t.whr_mv_receipt,
    roast_consume: t.whr_mv_roast_consume,
    roast_produce: t.whr_mv_roast_produce,
    blend_consume: t.whr_mv_blend_consume,
    blend_produce: t.whr_mv_blend_produce,
    sale: t.whr_mv_sale,
    manual_write_off: t.whr_mv_manual_write_off,
    return: t.whr_mv_return,
  };
}
function getWriteOffReasons(t) {
  return [
    { value: "defect", label: t.whr_reason_defect },
    { value: "sample", label: t.whr_reason_sample },
    { value: "test", label: t.whr_reason_test },
    { value: "other", label: t.whr_reason_other },
  ];
}
const VAT_RATES = [23, 8, 5, 0];

function defaultUnitForCategory(cat) {
  return cat === "green_beans" ? "kg" : "pcs";
}
const fmtMoney = (n) => (n != null ? `${Number(n).toFixed(2)} zł` : "—");
const fmtQty = (n, unit, unitLabels) => (n != null ? `${Number(n).toFixed(unit === "kg" ? 3 : 0)} ${unitLabels[unit] || ""}` : "—");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ru-RU") : "—");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("ru-RU") : "—");

export default function WarehouseRaw({ lang }) {
  const t = T[lang];
  const CATEGORY_LABELS = getCategoryLabels(t);
  const UNIT_LABELS = getUnitLabels(t);
  const [tab, setTab] = useState("stock");
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingCell, setEditingCell] = useState(null);
  const [cellValue, setCellValue] = useState("");
  const [toast, setToast] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    const { data, error } = await supabase.from("warehouse_items").select("*").order("category").order("name");
    if (error) showToast(t.whr_err_load_stock + error.message);
    setItems(data || []);
    setLoadingItems(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function startEdit(it) {
    setEditingCell(it.id);
    setCellValue(it.min_stock != null ? String(it.min_stock) : "");
  }

  async function commitEdit(it) {
    const num = cellValue === "" ? 0 : Number(cellValue);
    setEditingCell(null);
    const { error } = await supabase.from("warehouse_items").update({ min_stock: num }).eq("id", it.id);
    if (error) { showToast(t.wf_err_save + error.message); return; }
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, min_stock: num } : x));
  }

  const filteredItems = items.filter(it => categoryFilter === "all" || it.category === categoryFilter);

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">{t.whr_title}</span>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowWriteOffModal(true)}>{t.whr_write_off_btn}</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowReceiptModal(true)}>{t.whr_receipt_btn}</button>
        </div>
      </div>
      <div className="content">
        <div className="tabs-row">
          <button className={`tab-btn ${tab === "stock" ? "active" : ""}`} onClick={() => setTab("stock")}>{t.whr_tab_stock}</button>
          <button className={`tab-btn ${tab === "receipts" ? "active" : ""}`} onClick={() => setTab("receipts")}>{t.whr_tab_receipts}</button>
          <button className={`tab-btn ${tab === "journal" ? "active" : ""}`} onClick={() => setTab("journal")}>{t.whr_tab_journal}</button>
        </div>

        {tab === "stock" && (
          <>
            <div className="tabs-row">
              <button className={`tab-btn ${categoryFilter === "all" ? "active" : ""}`} onClick={() => setCategoryFilter("all")}>{t.whr_all_categories}</button>
              {CATEGORIES.map(c => (
                <button key={c} className={`tab-btn ${categoryFilter === c ? "active" : ""}`} onClick={() => setCategoryFilter(c)}>{CATEGORY_LABELS[c]}</button>
              ))}
            </div>
            {loadingItems ? <div className="empty-state">{t.loading}</div> : (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t.wh_name_col}</th><th>{t.whr_category_col}</th><th>{t.wh_remaining_col}</th><th>{t.wh_min_stock_col}</th>
                      <th>{t.whr_price_net_col}</th><th>{t.whr_stock_value_col}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? <tr><td colSpan={6} className="empty-state">{t.whr_no_items}</td></tr> : filteredItems.map(it => {
                      const low = it.min_stock > 0 && it.stock_qty <= it.min_stock;
                      return (
                        <tr key={it.id}>
                          <td style={{ cursor: "pointer", fontWeight: 500 }} onClick={() => setSelectedItem(it)}>{it.name}</td>
                          <td style={{ color: "#6B7280" }}>{CATEGORY_LABELS[it.category]}</td>
                          <td>
                            {fmtQty(it.stock_qty, it.unit, UNIT_LABELS)}
                            {low && <span className="status-pill" style={{ marginLeft: 8, background: "#FFFBEB", color: "#B45309", borderColor: "#FDE68A" }}>{t.wh_low_stock}</span>}
                          </td>
                          <td className="inline-edit-cell" onClick={() => startEdit(it)}>
                            {editingCell === it.id ? (
                              <input
                                className="input" style={{ width: 80, padding: "3px 6px" }} autoFocus
                                value={cellValue}
                                onChange={e => setCellValue(e.target.value)}
                                onBlur={() => commitEdit(it)}
                                onKeyDown={e => e.key === "Enter" && commitEdit(it)}
                              />
                            ) : fmtQty(it.min_stock, it.unit, UNIT_LABELS)}
                          </td>
                          <td>{fmtMoney(it.avg_price_net)}</td>
                          <td style={{ fontWeight: 600 }}>{fmtMoney(it.avg_price_net * it.stock_qty)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "receipts" && <ReceiptsTab t={t} showToast={showToast} />}
        {tab === "journal" && <JournalTab t={t} items={items} showToast={showToast} />}
      </div>

      {showReceiptModal && (
        <ReceiptModal
          t={t}
          items={items}
          onClose={() => setShowReceiptModal(false)}
          onDone={() => { setShowReceiptModal(false); fetchItems(); }}
          showToast={showToast}
        />
      )}
      {showWriteOffModal && (
        <WriteOffModal
          t={t}
          items={items}
          onClose={() => setShowWriteOffModal(false)}
          onDone={() => { setShowWriteOffModal(false); fetchItems(); }}
          showToast={showToast}
        />
      )}
      {selectedItem && (
        <ItemHistoryDrawer t={t} item={selectedItem} onClose={() => setSelectedItem(null)} showToast={showToast} />
      )}
      {toast && <div className="print-toast">{toast}</div>}
    </div>
  );
}

// ============================================================
// ПРИХОДЫ (список документов)
// ============================================================
function ReceiptsTab({ t, showToast }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const UNIT_LABELS = getUnitLabels(t);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("warehouse_receipts")
        .select("*, receipt_items(quantity, price_net, price_gross, warehouse_items(name, unit))")
        .order("created_at", { ascending: false });
      if (error) showToast(t.whr_err_load_receipts + error.message);
      setReceipts(data || []);
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line

  if (loading) return <div className="empty-state">{t.loading}</div>;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="table">
        <thead>
          <tr><th>{t.whr_date_col}</th><th>{t.whr_doc_col}</th><th>{t.whr_supplier_col}</th><th>{t.whr_positions_col}</th><th>{t.whr_sum_gross_col}</th></tr>
        </thead>
        <tbody>
          {receipts.length === 0 ? <tr><td colSpan={5} className="empty-state">{t.whr_no_receipts}</td></tr> : receipts.map(r => {
            const total = (r.receipt_items || []).reduce((s, li) => s + Number(li.quantity) * Number(li.price_gross), 0);
            const expanded = expandedId === r.id;
            return (
              <Fragment key={r.id}>
                <tr style={{ cursor: "pointer" }} onClick={() => setExpandedId(expanded ? null : r.id)}>
                  <td>{fmtDate(r.doc_date)}</td>
                  <td style={{ fontWeight: 500 }}>{r.doc_number || "—"}</td>
                  <td style={{ color: "#6B7280" }}>{r.supplier || "—"}</td>
                  <td>{(r.receipt_items || []).length}</td>
                  <td style={{ fontWeight: 600 }}>{fmtMoney(total)}</td>
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={5} style={{ background: "#F9FAFB", padding: "10px 16px" }}>
                      {(r.receipt_items || []).map((li, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px solid #F3F4F6" }}>
                          <span>{li.warehouse_items?.name}</span>
                          <span style={{ color: "#6B7280" }}>{fmtQty(li.quantity, li.warehouse_items?.unit, UNIT_LABELS)} × {fmtMoney(li.price_net)} {t.whr_net_word} ({fmtMoney(li.price_gross)} {t.whr_gross_word})</span>
                        </div>
                      ))}
                      {r.comment && <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{r.comment}</div>}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// ЖУРНАЛ ДВИЖЕНИЙ
// ============================================================
function JournalTab({ t, items, showToast }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [itemFilter, setItemFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const MOVEMENT_LABELS = getMovementLabels(t);
  const WRITE_OFF_REASONS = getWriteOffReasons(t);
  const UNIT_LABELS = getUnitLabels(t);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("warehouse_movements")
        .select("*, warehouse_items(name, category, unit)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) showToast(t.whr_err_load_journal + error.message);
      setMovements(data || []);
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line

  const filtered = movements.filter(m => {
    if (typeFilter !== "all" && m.movement_type !== typeFilter) return false;
    if (itemFilter !== "all" && m.item_id !== itemFilter) return false;
    if (fromDate && new Date(m.created_at) < new Date(fromDate)) return false;
    if (toDate && new Date(m.created_at) > new Date(toDate + "T23:59:59")) return false;
    return true;
  });

  return (
    <div>
      <div className="form-row" style={{ marginBottom: 14, gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
        <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">{t.whr_all_types}</option>
          {Object.entries(MOVEMENT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select className="input" value={itemFilter} onChange={e => setItemFilter(e.target.value)}>
          <option value="all">{t.whr_all_positions}</option>
          {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
        </select>
        <input className="input" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <input className="input" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
      </div>
      {loading ? <div className="empty-state">{t.loading}</div> : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr><th>{t.whr_date_col}</th><th>{t.wh_type_col}</th><th>{t.whr_position_col}</th><th>{t.whr_change_col}</th><th>{t.whr_doc_col}</th><th>{t.whr_comment_col}</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={6} className="empty-state">{t.whr_no_movements}</td></tr> : filtered.map(m => (
                <tr key={m.id}>
                  <td style={{ fontSize: 12, color: "#4B5563" }}>{fmtDateTime(m.created_at)}</td>
                  <td>{MOVEMENT_LABELS[m.movement_type] || m.movement_type}</td>
                  <td>{m.warehouse_items?.name || "—"}</td>
                  <td style={{ fontWeight: 600, color: m.qty_change >= 0 ? "#16A34A" : "#DC2626" }}>
                    {m.qty_change >= 0 ? "+" : ""}{fmtQty(m.qty_change, m.unit, UNIT_LABELS)}
                  </td>
                  <td style={{ color: "#6B7280" }}>{m.reference || "—"}</td>
                  <td style={{ color: "#6B7280", fontSize: 12 }}>{[m.reason && WRITE_OFF_REASONS.find(r => r.value === m.reason)?.label, m.comment].filter(Boolean).join(" — ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// МОДАЛКА: НОВЫЙ ПРИХОД
// ============================================================
function emptyLine() {
  return {
    key: Math.random().toString(36).slice(2),
    itemId: "", newName: "", newCategory: "green_beans", newUnit: "kg",
    quantity: "", vatRate: 23, priceMode: "gross", priceGross: "", priceNet: "",
  };
}

function computePrices(line) {
  const vat = Number(line.vatRate) || 0;
  if (line.priceMode === "gross") {
    const gross = Number(line.priceGross) || 0;
    const net = gross / (1 + vat / 100);
    return { net, gross };
  }
  const net = Number(line.priceNet) || 0;
  const gross = net * (1 + vat / 100);
  return { net, gross };
}

function ReceiptModal({ t, items, onClose, onDone, showToast }) {
  const [docNumber, setDocNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const CATEGORY_LABELS = getCategoryLabels(t);
  const UNIT_LABELS = getUnitLabels(t);

  function updateLine(key, patch) {
    setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l));
  }
  function addLine() { setLines(prev => [...prev, emptyLine()]); }
  function removeLine(key) { setLines(prev => prev.filter(l => l.key !== key)); }

  async function save() {
    const validLines = lines.filter(l => {
      const hasItem = l.itemId === "__new__" ? l.newName.trim() : l.itemId;
      const { net } = computePrices(l);
      return hasItem && Number(l.quantity) > 0 && net > 0;
    });
    if (!validLines.length) { showToast(t.whr_fill_one_line); return; }
    setSaving(true);

    const { data: receipt, error: receiptErr } = await supabase
      .from("warehouse_receipts")
      .insert([{ doc_number: docNumber || null, supplier: supplier || null, doc_date: docDate, comment: comment || null }])
      .select().single();
    if (receiptErr) { showToast(t.whr_err_create_doc + receiptErr.message); setSaving(false); return; }

    for (const line of validLines) {
      let itemId = line.itemId;
      let currentStock = 0;
      let currentAvg = 0;
      let unit = line.newUnit;

      if (itemId === "__new__") {
        const { data: newItem, error: itemErr } = await supabase
          .from("warehouse_items")
          .insert([{ name: line.newName.trim(), category: line.newCategory, unit: line.newUnit, stock_qty: 0, avg_price_net: 0, min_stock: 0 }])
          .select().single();
        if (itemErr) { showToast(t.whr_err_create_item + itemErr.message); setSaving(false); return; }
        itemId = newItem.id;
      } else {
        const existing = items.find(it => it.id === itemId);
        currentStock = Number(existing?.stock_qty) || 0;
        currentAvg = Number(existing?.avg_price_net) || 0;
        unit = existing?.unit;
      }

      const { net, gross } = computePrices(line);
      const quantity = Number(line.quantity);

      const { error: liErr } = await supabase.from("receipt_items").insert([{
        receipt_id: receipt.id, item_id: itemId, quantity, vat_rate: Number(line.vatRate), price_net: net, price_gross: gross,
      }]);
      if (liErr) { showToast(t.whr_err_save_line + liErr.message); setSaving(false); return; }

      const newStock = currentStock + quantity;
      const newAvg = (currentStock * currentAvg + quantity * net) / newStock;
      const { error: updErr } = await supabase.from("warehouse_items").update({ stock_qty: newStock, avg_price_net: newAvg }).eq("id", itemId);
      if (updErr) { showToast(t.whr_err_update_stock + updErr.message); setSaving(false); return; }

      await supabase.from("warehouse_movements").insert([{
        movement_type: "receipt", item_id: itemId, qty_change: quantity, unit, reference: docNumber || null, comment: null,
      }]);
    }

    setSaving(false);
    onDone();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-title">{t.whr_receipt_btn}</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t.whr_fv_number}</label>
            <input className="input" value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="FV/2026/..." />
          </div>
          <div className="form-group">
            <label className="form-label">{t.whr_supplier_col}</label>
            <input className="input" value={supplier} onChange={e => setSupplier(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">{t.whr_doc_date}</label>
          <input className="input" type="date" value={docDate} onChange={e => setDocDate(e.target.value)} style={{ maxWidth: 200 }} />
        </div>

        {lines.map(line => (
          <div key={line.key} style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, marginBottom: 10, position: "relative" }}>
            {lines.length > 1 && (
              <button className="action-icon-btn danger" style={{ position: "absolute", top: 6, right: 6 }} onClick={() => removeLine(line.key)}>✕</button>
            )}
            <div className="form-group">
              <label className="form-label">{t.whr_position_col}</label>
              <select className="input" value={line.itemId} onChange={e => updateLine(line.key, { itemId: e.target.value })}>
                <option value="">{t.whr_select_position}</option>
                {CATEGORIES.map(cat => {
                  const catItems = items.filter(it => it.category === cat);
                  if (!catItems.length) return null;
                  return (
                    <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                      {catItems.map(it => <option key={it.id} value={it.id}>{it.name} ({t.whr_remaining_word} {fmtQty(it.stock_qty, it.unit, UNIT_LABELS)})</option>)}
                    </optgroup>
                  );
                })}
                <option value="__new__">{t.whr_new_position_opt}</option>
              </select>
            </div>
            {line.itemId === "__new__" && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t.wh_name_col}</label>
                  <input className="input" value={line.newName} onChange={e => updateLine(line.key, { newName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t.whr_category_col}</label>
                  <select
                    className="input" value={line.newCategory}
                    onChange={e => updateLine(line.key, { newCategory: e.target.value, newUnit: defaultUnitForCategory(e.target.value) })}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.whr_unit_label}</label>
                  <select className="input" value={line.newUnit} onChange={e => updateLine(line.key, { newUnit: e.target.value })}>
                    <option value="kg">{t.unit_kg}</option>
                    <option value="pcs">{t.unit_pcs}</option>
                  </select>
                </div>
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t.whr_quantity_label}</label>
                <input className="input" type="number" value={line.quantity} onChange={e => updateLine(line.key, { quantity: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.whr_vat_rate_label}</label>
                <select className="input" value={line.vatRate} onChange={e => updateLine(line.key, { vatRate: e.target.value })}>
                  {VAT_RATES.map(v => <option key={v} value={v}>{v}%</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <div className="form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label className="toggle-switch">
                  <input type="checkbox" checked={line.priceMode === "net"} onChange={e => updateLine(line.key, { priceMode: e.target.checked ? "net" : "gross" })} />
                  <span className="toggle-slider" />
                </label>
                {t.whr_enter_net_label}
              </div>
              <div className="form-row">
                {line.priceMode === "gross" ? (
                  <input className="input" type="number" placeholder={t.whr_price_gross_placeholder} value={line.priceGross} onChange={e => updateLine(line.key, { priceGross: e.target.value })} />
                ) : (
                  <input className="input" type="number" placeholder={t.whr_price_net_placeholder} value={line.priceNet} onChange={e => updateLine(line.key, { priceNet: e.target.value })} />
                )}
                <div style={{ fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center" }}>
                  {(() => { const { net, gross } = computePrices(line); return `${t.whr_net_word} ${fmtMoney(net)} · ${t.whr_gross_word} ${fmtMoney(gross)}`; })()}
                </div>
              </div>
            </div>
          </div>
        ))}
        <button className="btn btn-secondary btn-sm" onClick={addLine}>{t.whr_add_position_btn}</button>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="form-label">{t.whr_comment_col}</label>
          <input className="input" value={comment} onChange={e => setComment(e.target.value)} />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>{t.cancel}</button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? t.whr_saving : t.save}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// МОДАЛКА: РУЧНОЕ СПИСАНИЕ
// ============================================================
function WriteOffModal({ t, items, onClose, onDone, showToast }) {
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("defect");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const CATEGORY_LABELS = getCategoryLabels(t);
  const UNIT_LABELS = getUnitLabels(t);
  const WRITE_OFF_REASONS = getWriteOffReasons(t);

  const item = items.find(it => it.id === itemId);

  async function save() {
    if (!item) { showToast(t.whr_select_position_error); return; }
    const num = Number(quantity);
    if (!(num > 0)) { showToast(t.whr_enter_quantity_error); return; }
    if (num > Number(item.stock_qty)) { showToast(`${t.whr_insufficient_stock}${fmtQty(item.stock_qty, item.unit, UNIT_LABELS)}`); return; }
    setSaving(true);

    const newStock = Number(item.stock_qty) - num;
    const { error: updErr } = await supabase.from("warehouse_items").update({ stock_qty: newStock }).eq("id", item.id);
    if (updErr) { showToast(t.wf_err_save + updErr.message); setSaving(false); return; }

    await supabase.from("warehouse_movements").insert([{
      movement_type: "manual_write_off", item_id: item.id, qty_change: -num, unit: item.unit, reason, comment: comment || null,
    }]);

    setSaving(false);
    onDone();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{t.whr_write_off_title}</div>
        <div className="form-group">
          <label className="form-label">{t.whr_position_col}</label>
          <select className="input" value={itemId} onChange={e => setItemId(e.target.value)}>
            <option value="">{t.whr_select_position}</option>
            {CATEGORIES.map(cat => {
              const catItems = items.filter(it => it.category === cat);
              if (!catItems.length) return null;
              return (
                <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                  {catItems.map(it => <option key={it.id} value={it.id}>{it.name} ({t.whr_remaining_word} {fmtQty(it.stock_qty, it.unit, UNIT_LABELS)})</option>)}
                </optgroup>
              );
            })}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t.whr_quantity_label} {item && `(${UNIT_LABELS[item.unit]})`}</label>
          <input className="input" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">{t.whr_reason_label}</label>
          <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
            {WRITE_OFF_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t.whr_comment_col}</label>
          <input className="input" value={comment} onChange={e => setComment(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>{t.cancel}</button>
          <button className="btn btn-danger" disabled={saving} onClick={save}>{saving ? t.whr_writing_off : t.whr_write_off_btn}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ИСТОРИЯ ПОЗИЦИИ (drawer)
// ============================================================
function ItemHistoryDrawer({ t, item, onClose, showToast }) {
  const [receiptLines, setReceiptLines] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const CATEGORY_LABELS = getCategoryLabels(t);
  const UNIT_LABELS = getUnitLabels(t);
  const MOVEMENT_LABELS = getMovementLabels(t);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: ri, error: riErr }, { data: mv, error: mvErr }] = await Promise.all([
        supabase.from("receipt_items").select("*, warehouse_receipts(doc_number, supplier, doc_date)").eq("item_id", item.id).order("created_at", { ascending: false }),
        supabase.from("warehouse_movements").select("*").eq("item_id", item.id).order("created_at", { ascending: false }),
      ]);
      if (riErr) showToast(t.whr_err_load_receipts + riErr.message);
      if (mvErr) showToast(t.whr_err_load_journal + mvErr.message);
      setReceiptLines(ri || []);
      setMovements(mv || []);
      setLoading(false);
    }
    load();
  }, [item.id]); // eslint-disable-line

  return (
    <div className="drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer">
        <div className="drawer-header">
          <div className="drawer-title">{item.name}</div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-body">
          <div className="drawer-section">
            <div className="detail-row"><span className="detail-label">{t.whr_category_col}</span><span className="detail-value">{CATEGORY_LABELS[item.category]}</span></div>
            <div className="detail-row"><span className="detail-label">{t.wh_remaining_col}</span><span className="detail-value">{fmtQty(item.stock_qty, item.unit, UNIT_LABELS)}</span></div>
            <div className="detail-row"><span className="detail-label">{t.wh_min_stock_col}</span><span className="detail-value">{fmtQty(item.min_stock, item.unit, UNIT_LABELS)}</span></div>
            <div className="detail-row"><span className="detail-label">{t.whr_avg_price_net}</span><span className="detail-value">{fmtMoney(item.avg_price_net)}</span></div>
            <div className="detail-row"><span className="detail-label">{t.whr_stock_value_col}</span><span className="detail-value">{fmtMoney(item.avg_price_net * item.stock_qty)}</span></div>
          </div>

          {loading ? <div className="empty-state">{t.loading}</div> : (
            <>
              <div className="drawer-section">
                <div className="drawer-section-title">{t.whr_receipts_history_title}</div>
                {receiptLines.length === 0 ? <div className="empty-state">{t.whr_no_receipts_history}</div> : receiptLines.map(li => (
                  <div key={li.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
                    <span>{fmtDate(li.warehouse_receipts?.doc_date)} · {li.warehouse_receipts?.doc_number || "—"} · {li.warehouse_receipts?.supplier || "—"}</span>
                    <span style={{ color: "#6B7280" }}>+{fmtQty(li.quantity, item.unit, UNIT_LABELS)} {t.whr_by_price} {fmtMoney(li.price_net)}</span>
                  </div>
                ))}
              </div>
              <div className="drawer-section">
                <div className="drawer-section-title">{t.whr_movements_title}</div>
                {movements.length === 0 ? <div className="empty-state">{t.whr_no_movements_history}</div> : movements.map(m => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
                    <span>{fmtDateTime(m.created_at)} · {MOVEMENT_LABELS[m.movement_type] || m.movement_type}</span>
                    <span style={{ fontWeight: 600, color: m.qty_change >= 0 ? "#16A34A" : "#DC2626" }}>{m.qty_change >= 0 ? "+" : ""}{fmtQty(m.qty_change, item.unit, UNIT_LABELS)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
