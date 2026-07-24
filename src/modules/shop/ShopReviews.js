import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { T } from "../../lib/i18n";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("ru-RU") : "—";
const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
function tpl(str, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), str);
}

export default function ShopReviews({ lang }) {
  const t = T[lang];
  const TABS = [
    { key: "pending", label: t.review_pending },
    { key: "approved", label: t.rev_tab_approved },
    { key: "rejected", label: t.rev_tab_rejected },
  ];
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [replyFor, setReplyFor] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 6000);
  }

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shop_reviews")
      .select("*, shop_products(name_ru), shop_orders(order_number, created_at)")
      .order("created_at", { ascending: false });
    if (error) showToast(t.rev_err_load + error.message);
    setReviews(data || []);
    setLoading(false);
  }, [t]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  async function setStatus(review, status) {
    const { error } = await supabase.from("shop_reviews").update({ status, updated_at: new Date().toISOString() }).eq("id", review.id);
    if (error) { showToast(t.wf_err_save + error.message); return; }
    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, status } : r));

    if (status === "approved") {
      const { data, error: promoError } = await supabase.rpc("grant_review_promo", { p_review_id: review.id });
      if (promoError) showToast(t.rev_promo_fail + promoError.message);
      else if (data?.ok) showToast(tpl(t.rev_promo_ok, { code: data.code }));
      else showToast(t.rev_promo_generic_fail + (data?.error || t.rev_promo_create_failed));
    }
  }

  async function saveReply(review, text) {
    const { error } = await supabase.from("shop_reviews").update({ moderator_response: text.trim() || null, updated_at: new Date().toISOString() }).eq("id", review.id);
    if (error) { showToast(t.rev_err_save_reply + error.message); return; }
    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, moderator_response: text.trim() || null } : r));
    setReplyFor(null);
    showToast(t.rev_reply_saved);
  }

  const filtered = reviews.filter(r => r.status === tab);
  const countOf = (key) => reviews.filter(r => r.status === key).length;

  return (
    <div>
      <div className="topbar"><span className="topbar-title">{t.reviews}</span></div>
      <div className="content">
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {TABS.map(tb => (
            <button key={tb.key} className={"btn btn-sm " + (tab === tb.key ? "btn-primary" : "btn-secondary")} onClick={() => setTab(tb.key)}>
              {tb.label} ({countOf(tb.key)})
            </button>
          ))}
        </div>
        {loading ? <div className="empty-state">{t.loading}</div>
          : filtered.length === 0 ? <div className="card"><div className="empty-state">{t.rev_no_reviews}</div></div>
          : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {filtered.map(r => (
              <div key={r.id} className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#2C1810", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {r.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                      {r.author_name}
                      {r.shop_orders && <span className="badge" style={{ background: "#DCFCE7", color: "#16A34A", fontSize: 9 }}>{t.rev_verified_purchase}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{r.shop_products?.name_ru || "—"}</div>
                  </div>
                  <div style={{ marginLeft: "auto", color: "#F59E0B", fontSize: 16, whiteSpace: "nowrap" }}>{stars(r.rating)}</div>
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>
                  {t.rev_review_label}{fmtDate(r.created_at)}{r.shop_orders && tpl(t.rev_purchase_label, { date: fmtDate(r.shop_orders.created_at), num: r.shop_orders.order_number })}
                </div>
                <p style={{ color: "#374151", fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>{r.review_text}</p>
                {r.image_urls && r.image_urls.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {r.image_urls.map((src, i) => (
                      <img key={i} src={src} alt="" onClick={() => setLightbox(src)}
                        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #E5E7EB", cursor: "pointer" }} />
                    ))}
                  </div>
                )}
                {r.moderator_response && (
                  <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#4B5563", marginBottom: 10 }}>
                    <b>{t.rev_shop_response_label}</b> {r.moderator_response}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  {tab !== "approved" && (
                    <button className="btn btn-sm" style={{ background: "#DCFCE7", color: "#16A34A" }} onClick={() => setStatus(r, "approved")}>{t.rev_approve_btn}</button>
                  )}
                  {tab !== "rejected" && (
                    <button className="btn btn-sm" style={{ background: "#FEE2E2", color: "#DC2626" }} onClick={() => setStatus(r, "rejected")}>{t.rev_reject_btn}</button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => setReplyFor(r)}>{t.rev_reply_btn}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {replyFor && <ReplyModal t={t} review={replyFor} onClose={() => setReplyFor(null)} onSave={saveReply} />}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <img src={lightbox} alt="" style={{ maxHeight: "90vh", maxWidth: "92vw", objectFit: "contain", borderRadius: 8 }} />
        </div>
      )}
      {toast && <div className="print-toast">{toast}</div>}
    </div>
  );
}

function ReplyModal({ t, review, onClose, onSave }) {
  const [text, setText] = useState(review.moderator_response || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(review, text);
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-title">{tpl(t.rev_reply_title, { name: review.author_name })}</div>
        <p style={{ color: "#374151", fontSize: 13, background: "#F9FAFB", padding: "8px 10px", borderRadius: 8, marginBottom: 12 }}>{review.review_text}</p>
        <div className="form-group">
          <label className="form-label">{t.rev_shop_response_field_label}</label>
          <textarea className="input" rows={4} style={{ resize: "vertical" }} value={text} onChange={e => setText(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>{t.cancel}</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? "…" : t.save}</button>
        </div>
      </div>
    </div>
  );
}
