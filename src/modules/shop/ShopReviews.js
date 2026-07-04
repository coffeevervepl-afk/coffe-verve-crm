import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("ru-RU") : "—";
const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

const TABS = [
  { key: "pending", label: "На модерации" },
  { key: "approved", label: "Одобрены" },
  { key: "rejected", label: "Отклонены" },
];

export default function ShopReviews() {
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [replyFor, setReplyFor] = useState(null);
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
    if (error) showToast("Ошибка загрузки отзывов: " + error.message);
    setReviews(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  async function setStatus(review, status) {
    const { error } = await supabase.from("shop_reviews").update({ status, updated_at: new Date().toISOString() }).eq("id", review.id);
    if (error) { showToast("Не удалось сохранить: " + error.message); return; }
    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, status } : r));

    if (status === "approved") {
      const { data, error: promoError } = await supabase.rpc("grant_review_promo", { p_review_id: review.id });
      if (promoError) showToast("Отзыв одобрен, но промокод не начислился: " + promoError.message);
      else if (data?.ok) showToast(`Отзыв одобрен! Промокод для покупателя: ${data.code} (−5 zł). Отправьте вручную.`);
      else showToast("Отзыв одобрен. Промокод: " + (data?.error || "не удалось создать"));
    }
  }

  async function saveReply(review, text) {
    const { error } = await supabase.from("shop_reviews").update({ moderator_response: text.trim() || null, updated_at: new Date().toISOString() }).eq("id", review.id);
    if (error) { showToast("Не удалось сохранить ответ: " + error.message); return; }
    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, moderator_response: text.trim() || null } : r));
    setReplyFor(null);
    showToast("Ответ сохранён");
  }

  const filtered = reviews.filter(r => r.status === tab);
  const countOf = (key) => reviews.filter(r => r.status === key).length;

  return (
    <div>
      <div className="topbar"><span className="topbar-title">Отзывы</span></div>
      <div className="content">
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {TABS.map(tb => (
            <button key={tb.key} className={"btn btn-sm " + (tab === tb.key ? "btn-primary" : "btn-secondary")} onClick={() => setTab(tb.key)}>
              {tb.label} ({countOf(tb.key)})
            </button>
          ))}
        </div>
        {loading ? <div className="empty-state">Загрузка...</div>
          : filtered.length === 0 ? <div className="card"><div className="empty-state">Нет отзывов</div></div>
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
                      {r.shop_orders && <span className="badge" style={{ background: "#DCFCE7", color: "#16A34A", fontSize: 9 }}>Подтверждённая покупка</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{r.shop_products?.name_ru || "—"}</div>
                  </div>
                  <div style={{ marginLeft: "auto", color: "#F59E0B", fontSize: 16, whiteSpace: "nowrap" }}>{stars(r.rating)}</div>
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>
                  Отзыв: {fmtDate(r.created_at)}{r.shop_orders && ` · Покупка: ${fmtDate(r.shop_orders.created_at)} (№${r.shop_orders.order_number})`}
                </div>
                <p style={{ color: "#374151", fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>{r.review_text}</p>
                {r.moderator_response && (
                  <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#4B5563", marginBottom: 10 }}>
                    <b>Ответ магазина:</b> {r.moderator_response}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  {tab !== "approved" && (
                    <button className="btn btn-sm" style={{ background: "#DCFCE7", color: "#16A34A" }} onClick={() => setStatus(r, "approved")}>✓ Одобрить</button>
                  )}
                  {tab !== "rejected" && (
                    <button className="btn btn-sm" style={{ background: "#FEE2E2", color: "#DC2626" }} onClick={() => setStatus(r, "rejected")}>✗ Отклонить</button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => setReplyFor(r)}>💬 Ответить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {replyFor && <ReplyModal review={replyFor} onClose={() => setReplyFor(null)} onSave={saveReply} />}
      {toast && <div className="print-toast">{toast}</div>}
    </div>
  );
}

function ReplyModal({ review, onClose, onSave }) {
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
        <div className="modal-title">Ответ на отзыв {review.author_name}</div>
        <p style={{ color: "#374151", fontSize: 13, background: "#F9FAFB", padding: "8px 10px", borderRadius: 8, marginBottom: 12 }}>{review.review_text}</p>
        <div className="form-group">
          <label className="form-label">Ответ магазина (виден на витрине под отзывом)</label>
          <textarea className="input" rows={4} style={{ resize: "vertical" }} value={text} onChange={e => setText(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? "…" : "Сохранить"}</button>
        </div>
      </div>
    </div>
  );
}
