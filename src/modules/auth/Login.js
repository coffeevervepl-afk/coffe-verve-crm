import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Login({ justSignedOut }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [toast, setToast] = useState(justSignedOut ? "Вы вышли из системы" : null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) { setError("Неверный email или пароль"); return; }
    setEmail("");
    setPassword("");
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/set-password",
    });
    setLoading(false);
    setForgotSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F4F5F7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#2B58A1" }}>Coffee Verve CRM</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
            {mode === "login" ? "Вход в Coffee Verve CRM" : "Восстановление пароля"}
          </div>
        </div>

        {toast && (
          <div style={{ background: "#F0FDF4", color: "#15803D", fontSize: 12, borderRadius: 8, padding: "8px 12px", marginBottom: 16, textAlign: "center" }}>
            {toast}
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={handleLogin} autoComplete="off">
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "#374151", fontWeight: 500, marginBottom: 6 }}>Email</label>
              <input className="input" type="email" required autoFocus autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "#374151", fontWeight: 500, marginBottom: 6 }}>Пароль</label>
              <input className="input" type="password" required autoComplete="off" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <button className="btn btn-primary" style={{ width: "100%", marginBottom: 12 }} disabled={loading} type="submit">
              {loading ? "…" : "Войти"}
            </button>
            <div style={{ textAlign: "center" }}>
              <button type="button" onClick={() => { setMode("forgot"); setError(""); }} style={{ background: "none", border: "none", color: "#2B58A1", fontSize: 12, cursor: "pointer" }}>
                Забыли пароль?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgot} autoComplete="off">
            {forgotSent ? (
              <div style={{ fontSize: 13, color: "#374151", marginBottom: 16 }}>
                Если такой email зарегистрирован, письмо со ссылкой для сброса пароля отправлено.
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, color: "#374151", fontWeight: 500, marginBottom: 6 }}>Email</label>
                <input className="input" type="email" required autoFocus autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            )}
            {!forgotSent && (
              <button className="btn btn-primary" style={{ width: "100%", marginBottom: 12 }} disabled={loading} type="submit">
                {loading ? "…" : "Отправить письмо"}
              </button>
            )}
            <div style={{ textAlign: "center" }}>
              <button type="button" onClick={() => { setMode("login"); setError(""); setForgotSent(false); }} style={{ background: "none", border: "none", color: "#2B58A1", fontSize: 12, cursor: "pointer" }}>
                ← Назад ко входу
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
