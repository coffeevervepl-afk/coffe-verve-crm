import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { T } from "../../lib/i18n";

const fmtMoney = (n) => (n != null ? `${Number(n).toFixed(2)} zł` : "—");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ru-RU") : "—");
function tpl(str, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), str);
}

export const COUNTRY_CODES = ["PL", "DE", "CZ", "SK", "LT", "LV", "EE", "NL", "BE", "FR", "IT", "ES", "AT", "UA", "GB", "CH", "OTHER"];
export function getCountryLabels(t) {
  return {
    PL: t.country_pl, DE: t.country_de, CZ: t.country_cz, SK: t.country_sk,
    LT: t.country_lt, LV: t.country_lv, EE: t.country_ee, NL: t.country_nl,
    BE: t.country_be, FR: t.country_fr, IT: t.country_it, ES: t.country_es,
    AT: t.country_at, UA: t.country_ua, GB: t.country_gb, CH: t.country_ch,
    OTHER: t.country_other,
  };
}
const VAT_STATUS_PILL = {
  vat_payer: { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" },
  vat_eu: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  non_vat: { bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" },
};
export function getVatStatusLabels(t) {
  return { vat_payer: t.vat_payer_label, vat_eu: t.vat_eu_label, non_vat: t.non_vat_label };
}
export function vatNumberLabel(country) {
  return country === "PL" ? "NIP" : "VAT number";
}
// Мягкая проверка формата VAT/NIP по стране — только подсказка, не блокирует сохранение.
const VAT_PATTERNS = {
  PL: /^(PL)?\d{10}$/, DE: /^DE\d{9}$/, CZ: /^CZ\d{8,10}$/, SK: /^SK\d{10}$/,
  LT: /^LT(\d{9}|\d{12})$/, LV: /^LV\d{11}$/, EE: /^EE\d{9}$/, NL: /^NL\d{9}B\d{2}$/,
  BE: /^BE0\d{9}$/, FR: /^FR[A-Z0-9]{2}\d{9}$/, IT: /^IT\d{11}$/,
  ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/, AT: /^ATU\d{8}$/, GB: /^GB\d{9}$/, CH: /^CHE\d{9}$/,
};
export function vatFormatWarning(t, country, vatNumber) {
  const v = (vatNumber || "").trim().toUpperCase().replace(/[\s-]/g, "");
  if (!v) return null;
  const re = VAT_PATTERNS[country];
  if (!re) return null;
  return re.test(v) ? null : tpl(t.sup_vat_format_hint, { country: getCountryLabels(t)[country] || country });
}

export const emptySupplierForm = {
  name: "", country: "PL", vat_status: "vat_payer", vat_number: "", regon: "", krs: "",
  contact_person: "", email: "", phone: "", website: "",
  address_street: "", address_city: "", address_postal_code: "",
  iban: "", swift: "", payment_terms: "", notes: "", is_active: true,
};

export default function Suppliers({ lang }) {
  const t = T[lang];
  const COUNTRY_LABELS = getCountryLabels(t);
  const VAT_STATUS_LABELS = getVatStatusLabels(t);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [vatFilter, setVatFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("suppliers").select("*").order("name");
    if (error) showToast(t.sup_err_load + error.message);
    setSuppliers(data || []);
    setLoading(false);
  }, [t]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  async function toggleActive(s) {
    const { error } = await supabase.from("suppliers").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) { showToast(t.wf_err_save + error.message); return; }
    setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !s.is_active } : x));
  }

  function handleUpdated(updated) {
    setSuppliers(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x));
    setSelected(prev => prev && prev.id === updated.id ? { ...prev, ...updated } : prev);
  }

  const filtered = suppliers.filter(s => {
    if (countryFilter !== "all" && s.country !== countryFilter) return false;
    if (vatFilter !== "all" && s.vat_status !== vatFilter) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return s.name?.toLowerCase().includes(q) || s.vat_number?.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">{t.nav_suppliers} ({suppliers.length})</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>{t.sup_add_btn}</button>
      </div>
      <div className="content">
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input className="search-bar" style={{ flex: 1, minWidth: 200 }} placeholder={t.sup_search_placeholder} value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input" style={{ maxWidth: 180 }} value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
            <option value="all">{t.sup_filter_all_countries}</option>
            {COUNTRY_CODES.map(c => <option key={c} value={c}>{COUNTRY_LABELS[c]}</option>)}
          </select>
          <select className="input" style={{ maxWidth: 200 }} value={vatFilter} onChange={e => setVatFilter(e.target.value)}>
            <option value="all">{t.sup_filter_all_vat}</option>
            {Object.keys(VAT_STATUS_LABELS).map(k => <option key={k} value={k}>{VAT_STATUS_LABELS[k]}</option>)}
          </select>
        </div>
        {loading ? <div className="empty-state">{t.loading}</div> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{t.wh_name_col}</th><th>{t.country}</th><th>{t.sup_vat_status_col}</th>
                  <th>VAT/NIP</th><th>{t.sup_contact_col}</th><th>{t.promo_active_col}</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={7} className="empty-state">{t.sup_no_suppliers}</td></tr> : filtered.map(s => (
                  <tr key={s.id}>
                    <td style={{ cursor: "pointer", fontWeight: 500 }} onClick={() => setSelected(s)}>{s.name}</td>
                    <td style={{ color: "#6B7280" }}>{COUNTRY_LABELS[s.country] || s.country}</td>
                    <td><span className="badge" style={VAT_STATUS_PILL[s.vat_status]}>{VAT_STATUS_LABELS[s.vat_status]}</span></td>
                    <td style={{ color: "#6B7280", fontSize: 12 }}>{s.vat_number || "—"}</td>
                    <td style={{ color: "#6B7280", fontSize: 12 }}>{s.contact_person || s.email || s.phone || "—"}</td>
                    <td>
                      <label className="toggle-switch" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={!!s.is_active} onChange={() => toggleActive(s)} />
                        <span className="toggle-slider" />
                      </label>
                    </td>
                    <td>
                      <button className="action-icon-btn" title={t.edit} onClick={() => setSelected(s)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && (
        <SupplierDrawer t={t} supplier={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} onError={showToast} />
      )}
      {showAdd && (
        <SupplierFormModal t={t} mode="full" onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); fetchSuppliers(); }} onError={showToast} />
      )}
      {toast && <div className="print-toast">{toast}</div>}
    </div>
  );
}

function SupplierDrawer({ t, supplier, onClose, onUpdated, onError }) {
  const [editing, setEditing] = useState(false);
  const COUNTRY_LABELS = getCountryLabels(t);
  const VAT_STATUS_LABELS = getVatStatusLabels(t);

  if (editing) {
    return (
      <SupplierFormModal
        t={t} mode="full" supplier={supplier}
        onClose={() => setEditing(false)}
        onSaved={(updated) => { onUpdated(updated); setEditing(false); }}
        onError={onError}
      />
    );
  }

  return (
    <div className="drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer">
        <div className="drawer-header">
          <span className="drawer-title">{supplier.name}</span>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body">
          <div className="drawer-section">
            <div className="drawer-section-title">{t.sup_section_main}</div>
            <div className="detail-row"><span className="detail-label">{t.country}</span><span className="detail-value">{COUNTRY_LABELS[supplier.country] || supplier.country}</span></div>
            <div className="detail-row"><span className="detail-label">{t.sup_vat_status_col}</span><span className="detail-value">{VAT_STATUS_LABELS[supplier.vat_status]}</span></div>
            <div className="detail-row"><span className="detail-label">{vatNumberLabel(supplier.country)}</span><span className="detail-value">{supplier.vat_number || "—"}</span></div>
            {supplier.country === "PL" && (
              <>
                <div className="detail-row"><span className="detail-label">REGON</span><span className="detail-value">{supplier.regon || "—"}</span></div>
                <div className="detail-row"><span className="detail-label">KRS</span><span className="detail-value">{supplier.krs || "—"}</span></div>
              </>
            )}
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.sup_section_contacts}</div>
            <div className="detail-row"><span className="detail-label">{t.sup_contact_person_label}</span><span className="detail-value">{supplier.contact_person || "—"}</span></div>
            <div className="detail-row"><span className="detail-label">{t.email}</span><span className="detail-value">{supplier.email || "—"}</span></div>
            <div className="detail-row"><span className="detail-label">{t.phone}</span><span className="detail-value">{supplier.phone || "—"}</span></div>
            {supplier.website && <div className="detail-row"><span className="detail-label">{t.sup_website_label}</span><span className="detail-value"><a href={supplier.website} target="_blank" rel="noreferrer">{supplier.website}</a></span></div>}
            <div className="detail-row"><span className="detail-label">{t.sup_address_label}</span><span className="detail-value" style={{ textAlign: "right" }}>{[supplier.address_street, supplier.address_city, supplier.address_postal_code].filter(Boolean).join(", ") || "—"}</span></div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">{t.sup_section_payment}</div>
            <div className="detail-row"><span className="detail-label">IBAN</span><span className="detail-value">{supplier.iban || "—"}</span></div>
            <div className="detail-row"><span className="detail-label">SWIFT/BIC</span><span className="detail-value">{supplier.swift || "—"}</span></div>
            <div className="detail-row"><span className="detail-label">{t.sup_payment_terms_label}</span><span className="detail-value">{supplier.payment_terms || "—"}</span></div>
          </div>

          {supplier.notes && (
            <div className="drawer-section">
              <div className="drawer-section-title">{t.notes}</div>
              <div style={{ fontSize: 13, color: "#4B5563" }}>{supplier.notes}</div>
            </div>
          )}

          <PurchaseHistoryBlock t={t} supplierId={supplier.id} onError={onError} />

          <button className="btn btn-primary" style={{ width: "100%", marginTop: 4 }} onClick={() => setEditing(true)}>✏️ {t.edit}</button>
        </div>
      </div>
    </div>
  );
}

function PurchaseHistoryBlock({ t, supplierId, onError }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: receipts, error } = await supabase
        .from("warehouse_receipts")
        .select("id, doc_date, receipt_items(quantity, price_gross)")
        .eq("supplier_id", supplierId)
        .order("doc_date", { ascending: false });
      if (cancelled) return;
      if (error) { onError(t.sup_err_load + error.message); setLoading(false); return; }
      const list = receipts || [];
      const total = list.reduce((s, r) => s + (r.receipt_items || []).reduce((s2, li) => s2 + Number(li.quantity) * Number(li.price_gross), 0), 0);
      setStats({ count: list.length, total, lastDate: list[0]?.doc_date || null });
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [supplierId, onError, t]);

  return (
    <div className="drawer-section">
      <div className="drawer-section-title">{t.sup_section_purchase_history}</div>
      {loading ? <div className="empty-state">{t.loading}</div> : !stats || stats.count === 0 ? (
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>{t.sup_no_purchase_history}</div>
      ) : (
        <>
          <div className="detail-row"><span className="detail-label">{t.sup_total_purchases}</span><span className="detail-value" style={{ fontWeight: 700, color: "#16A34A" }}>{fmtMoney(stats.total)}</span></div>
          <div className="detail-row"><span className="detail-label">{t.sup_receipts_count}</span><span className="detail-value">{stats.count}</span></div>
          <div className="detail-row"><span className="detail-label">{t.sup_last_receipt}</span><span className="detail-value">{fmtDate(stats.lastDate)}</span></div>
        </>
      )}
    </div>
  );
}

// mode: "full" — вся форма (страница Поставщики); "quick" — минимум полей
// (быстрое создание прямо из формы «+ Приход» на Складе: Сырьё).
export function SupplierFormModal({ t, mode, supplier, onClose, onSaved, onError }) {
  const [form, setForm] = useState(supplier ? { ...emptySupplierForm, ...supplier } : emptySupplierForm);
  const [saving, setSaving] = useState(false);
  const COUNTRY_LABELS = getCountryLabels(t);
  const VAT_STATUS_LABELS = getVatStatusLabels(t);
  const isEdit = !!supplier;
  const vatWarning = vatFormatWarning(t, form.country, form.vat_number);

  function set(patch) { setForm(f => ({ ...f, ...patch })); }

  async function save() {
    if (!form.name.trim()) { onError(t.sup_name_required); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(), country: form.country, vat_status: form.vat_status,
      vat_number: form.vat_number || null, regon: form.regon || null, krs: form.krs || null,
      contact_person: form.contact_person || null, email: form.email || null, phone: form.phone || null,
      website: form.website || null, address_street: form.address_street || null,
      address_city: form.address_city || null, address_postal_code: form.address_postal_code || null,
      iban: form.iban || null, swift: form.swift || null, payment_terms: form.payment_terms || null,
      notes: form.notes || null, is_active: form.is_active,
    };
    if (isEdit) {
      const { error } = await supabase.from("suppliers").update(payload).eq("id", supplier.id);
      setSaving(false);
      if (error) { onError(t.wf_err_save + error.message); return; }
      onSaved({ id: supplier.id, ...payload });
    } else {
      const { data, error } = await supabase.from("suppliers").insert([payload]).select().single();
      setSaving(false);
      if (error) { onError(t.sup_err_load + error.message); return; }
      onSaved(data);
    }
  }

  const isQuick = mode === "quick";

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: isQuick ? 420 : 640 }}>
        <div className="modal-title">{isEdit ? `${t.sup_edit_title} — ${supplier.name}` : t.sup_new_supplier_title}</div>

        <div className="form-group"><label className="form-label">{t.sup_name_label} *</label><input className="input" value={form.name} onChange={e => set({ name: e.target.value })} autoFocus /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">{t.country}</label>
            <select className="input" value={form.country} onChange={e => set({ country: e.target.value })}>
              {COUNTRY_CODES.map(c => <option key={c} value={c}>{COUNTRY_LABELS[c]}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">{t.sup_vat_status_col}</label>
            <select className="input" value={form.vat_status} onChange={e => set({ vat_status: e.target.value })}>
              {Object.keys(VAT_STATUS_LABELS).map(k => <option key={k} value={k}>{VAT_STATUS_LABELS[k]}</option>)}
            </select>
          </div>
        </div>

        {!isQuick && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{vatNumberLabel(form.country)}</label>
                <input className="input" value={form.vat_number} onChange={e => set({ vat_number: e.target.value })} />
                {vatWarning && <div style={{ fontSize: 11, color: "#B45309", marginTop: 4 }}>⚠ {vatWarning}</div>}
              </div>
              {form.country === "PL" ? (
                <div className="form-group"><label className="form-label">REGON</label><input className="input" value={form.regon} onChange={e => set({ regon: e.target.value })} /></div>
              ) : <div />}
            </div>
            {form.country === "PL" && (
              <div className="form-group"><label className="form-label">KRS</label><input className="input" value={form.krs} onChange={e => set({ krs: e.target.value })} /></div>
            )}

            <div className="form-row">
              <div className="form-group"><label className="form-label">{t.sup_contact_person_label}</label><input className="input" value={form.contact_person} onChange={e => set({ contact_person: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{t.email}</label><input className="input" value={form.email} onChange={e => set({ email: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t.phone}</label><input className="input" value={form.phone} onChange={e => set({ phone: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{t.sup_website_label}</label><input className="input" placeholder="https://" value={form.website} onChange={e => set({ website: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t.sup_street_label}</label><input className="input" value={form.address_street} onChange={e => set({ address_street: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{t.city}</label><input className="input" value={form.address_city} onChange={e => set({ address_city: e.target.value })} /></div>
            </div>
            <div className="form-group" style={{ maxWidth: 160 }}><label className="form-label">{t.sup_postal_code_label}</label><input className="input" value={form.address_postal_code} onChange={e => set({ address_postal_code: e.target.value })} /></div>

            <div className="form-row">
              <div className="form-group"><label className="form-label">IBAN</label><input className="input" value={form.iban} onChange={e => set({ iban: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">SWIFT/BIC</label><input className="input" value={form.swift} onChange={e => set({ swift: e.target.value })} /></div>
            </div>
            <div className="form-group"><label className="form-label">{t.sup_payment_terms_label}</label><input className="input" placeholder={t.sup_payment_terms_placeholder} value={form.payment_terms} onChange={e => set({ payment_terms: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">{t.notes}</label><textarea className="input" rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })} /></div>
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>{t.cancel}</button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "…" : t.save}</button>
        </div>
      </div>
    </div>
  );
}
