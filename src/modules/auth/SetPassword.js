import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Пароль должен быть не короче 6 символов"); return; }
    if (password !== confirm) { setError("Пароли не совпадают"); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setDone(true);
    setTimeout(() => { window.location.href = "/"; }, 1500);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F4F5F7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#2B58A1" }}>Coffee Verve CRM</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Установите пароль</div>
        </div>
        {done ? (
          <div style={{ fontSize: 13, color: "#16A34A", textAlign: "center" }}>Пароль сохранён, переходим в CRM…</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "#374151", fontWeight: 500, marginBottom: 6 }}>Новый пароль</label>
              <input className="input" type="password" required autoFocus value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "#374151", fontWeight: 500, marginBottom: 6 }}>Повторите пароль</label>
              <input className="input" type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            {error && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading} type="submit">
              {loading ? "…" : "Сохранить пароль"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
