import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";

// ============================================================
// SUPABASE
// ============================================================
const supabase = createClient(
  "https://dedxdwxqnmizupebaasx.supabase.co",
  "sb_publishable_sgDkHJatPTMNiIchve_LAA_5T_JUF33"
);

// ============================================================
// ПЕРЕВОДЫ
// ============================================================
const T = {
  ru: {
    dashboard: "Дашборд", clients: "Клиенты", orders: "Заказы",
    products: "Товары", warranties: "Гарантии", staff: "Сотрудники",
    settings: "Настройки", search: "Поиск...", add: "Добавить",
    save: "Сохранить", cancel: "Отмена", delete: "Удалить",
    edit: "Редактировать", close: "Закрыть", print_qr: "Скачать QR",
    total_clients: "Клиентов", total_orders: "Заказов",
    total_revenue: "Выручка", avg_check: "Средний чек",
    new_this_month: "Новых за месяц", repeat_buyers: "Повторных покупателей",
    sleeping: "Спящих клиентов", top_clients: "Топ клиентов",
    top_products: "Топ товаров", by_source: "По источнику",
    by_language: "По языку", by_city: "По городу",
    order_history: "История заказов", client_card: "Карточка клиента",
    new_order: "Новый заказ", new_client: "Новый клиент",
    status_new: "Новый", status_processing: "В обработке",
    status_shipped: "Отправлен", status_completed: "Выполнен",
    status_cancelled: "Отменён", weight: "Вес", price: "Цена",
    product: "Товар", client: "Клиент", date: "Дата",
    status: "Статус", notes: "Заметки", source: "Источник",
    city: "Город", language: "Язык", phone: "Телефон",
    email: "Email", telegram: "Telegram", roast_date: "Дата обжарки",
    warranty_requests: "Заявок по гарантии", warranty_pct: "% от заказов",
    no_data: "Нет данных", loading: "Загрузка...", error: "Ошибка",
    name: "Имя", total: "Итого", orders_count: "Заказов",
    last_order: "Последний заказ", flavor_notes: "Вкусовые ноты",
    country: "Страна", available: "Наличие", purpose: "Назначение",
    price_250: "250г (zł)", price_500: "500г (zł)", price_1000: "1000г (zł)",
    revenue_by_month: "Выручка по месяцам", activate_warranty: "Активировать гарантию",
    warranty_reason: "Причина обращения", warranty_activated: "Гарантия активирована",
    replace: "Заменить кофе", refund: "Вернуть деньги", pending: "Ожидает решения",
    resolved: "Решено", role: "Роль", owner: "Владелец", employee: "Сотрудник",
    coffee_passport: "Паспорт кофе", scan_qr: "Сканируй QR для паспорта заказа",
    months: ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"],
    username: "Username",
  },
  pl: {
    dashboard: "Pulpit", clients: "Klienci", orders: "Zamówienia",
    products: "Produkty", warranties: "Gwarancje", staff: "Pracownicy",
    settings: "Ustawienia", search: "Szukaj...", add: "Dodaj",
    save: "Zapisz", cancel: "Anuluj", delete: "Usuń",
    edit: "Edytuj", close: "Zamknij", print_qr: "Pobierz QR",
    total_clients: "Klientów", total_orders: "Zamówień",
    total_revenue: "Przychód", avg_check: "Średni rachunek",
    new_this_month: "Nowych w miesiącu", repeat_buyers: "Powracający klienci",
    sleeping: "Śpiący klienci", top_clients: "Top klientów",
    top_products: "Top produktów", by_source: "Wg źródła",
    by_language: "Wg języka", by_city: "Wg miasta",
    order_history: "Historia zamówień", client_card: "Karta klienta",
    new_order: "Nowe zamówienie", new_client: "Nowy klient",
    status_new: "Nowe", status_processing: "W trakcie",
    status_shipped: "Wysłane", status_completed: "Zrealizowane",
    status_cancelled: "Anulowane", weight: "Waga", price: "Cena",
    product: "Produkt", client: "Klient", date: "Data",
    status: "Status", notes: "Notatki", source: "Źródło",
    city: "Miasto", language: "Język", phone: "Telefon",
    email: "Email", telegram: "Telegram", roast_date: "Data palenia",
    warranty_requests: "Wnioski gwarancyjne", warranty_pct: "% zamówień",
    no_data: "Brak danych", loading: "Ładowanie...", error: "Błąd",
    name: "Imię", total: "Suma", orders_count: "Zamówień",
    last_order: "Ostatnie zamówienie", flavor_notes: "Nuty smakowe",
    country: "Kraj", available: "Dostępność", purpose: "Przeznaczenie",
    price_250: "250g (zł)", price_500: "500g (zł)", price_1000: "1000g (zł)",
    revenue_by_month: "Przychód miesięczny", activate_warranty: "Aktywuj gwarancję",
    warranty_reason: "Powód reklamacji", warranty_activated: "Gwarancja aktywowana",
    replace: "Wymienić kawę", refund: "Zwrócić pieniądze", pending: "Oczekuje",
    resolved: "Rozwiązano", role: "Rola", owner: "Właściciel", employee: "Pracownik",
    coffee_passport: "Paszport kawy", scan_qr: "Zeskanuj QR dla paszportu",
    months: ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"],
    username: "Nazwa użytkownika",
  },
  ua: {
    dashboard: "Дашборд", clients: "Клієнти", orders: "Замовлення",
    products: "Товари", warranties: "Гарантії", staff: "Співробітники",
    settings: "Налаштування", search: "Пошук...", add: "Додати",
    save: "Зберегти", cancel: "Скасувати", delete: "Видалити",
    edit: "Редагувати", close: "Закрити", print_qr: "Завантажити QR",
    total_clients: "Клієнтів", total_orders: "Замовлень",
    total_revenue: "Виручка", avg_check: "Середній чек",
    new_this_month: "Нових за місяць", repeat_buyers: "Постійних покупців",
    sleeping: "Сплячих клієнтів", top_clients: "Топ клієнтів",
    top_products: "Топ товарів", by_source: "За джерелом",
    by_language: "За мовою", by_city: "За містом",
    order_history: "Історія замовлень", client_card: "Картка клієнта",
    new_order: "Нове замовлення", new_client: "Новий клієнт",
    status_new: "Новий", status_processing: "В обробці",
    status_shipped: "Відправлено", status_completed: "Виконано",
    status_cancelled: "Скасовано", weight: "Вага", price: "Ціна",
    product: "Товар", client: "Клієнт", date: "Дата",
    status: "Статус", notes: "Нотатки", source: "Джерело",
    city: "Місто", language: "Мова", phone: "Телефон",
    email: "Email", telegram: "Telegram", roast_date: "Дата обсмажки",
    warranty_requests: "Заявок по гарантії", warranty_pct: "% від замовлень",
    no_data: "Немає даних", loading: "Завантаження...", error: "Помилка",
    name: "Ім'я", total: "Підсумок", orders_count: "Замовлень",
    last_order: "Останнє замовлення", flavor_notes: "Смакові ноти",
    country: "Країна", available: "Наявність", purpose: "Призначення",
    price_250: "250г (zł)", price_500: "500г (zł)", price_1000: "1000г (zł)",
    revenue_by_month: "Виручка по місяцях", activate_warranty: "Активувати гарантію",
    warranty_reason: "Причина звернення", warranty_activated: "Гарантію активовано",
    replace: "Замінити каву", refund: "Повернути гроші", pending: "Очікує рішення",
    resolved: "Вирішено", role: "Роль", owner: "Власник", employee: "Співробітник",
    coffee_passport: "Паспорт кави", scan_qr: "Скануй QR для паспорта замовлення",
    months: ["Січ","Лют","Бер","Кві","Тра","Чер","Лип","Сер","Вер","Жов","Лис","Гру"],
    username: "Username",
  }
};

// ============================================================
// HELPERS
// ============================================================
const STATUS_COLORS = {
  new: "#2B58A1", processing: "#FF9900", shipped: "#38B3DE",
  completed: "#38B3DE", cancelled: "#F44336"
};
const STATUS_KEYS = { new: "status_new", processing: "status_processing", shipped: "status_shipped", completed: "status_completed", cancelled: "status_cancelled" };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("ru-RU") : "—";
const fmtMoney = (n) => n ? `${Number(n).toFixed(2)} zł` : "—";

// ============================================================
// STYLES
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #F4F5F7; color: #1F2937; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #F0F2F5; }
  ::-webkit-scrollbar-thumb { background: #C8D0DC; border-radius: 3px; }
  .crm-root { display: flex; min-height: 100vh; }
  .sidebar { width: 220px; min-height: 100vh; background: #2B58A1; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; }
  .sidebar-logo { padding: 18px 16px 16px; border-bottom: 1px solid rgba(255,255,255,0.12); }
  .sidebar-logo h1 { font-size: 14px; font-weight: 700; color: #fff; letter-spacing: 0.03em; }
  .sidebar-logo p { font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 2px; }
  .sidebar-nav { flex: 1; padding: 10px 0; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 18px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.65); transition: all 0.15s; border-left: 3px solid transparent; }
  .nav-item:hover { color: #fff; background: rgba(255,255,255,0.08); }
  .nav-item.active { color: #fff; background: rgba(34,197,94,0.15); border-left-color: #22C55E; }
  .nav-icon { width: 16px; height: 16px; flex-shrink: 0; }
  .sidebar-bottom { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.12); }
  .lang-switcher { display: flex; gap: 5px; }
  .lang-btn { padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: rgba(255,255,255,0.6); font-size: 10px; cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; }
  .lang-btn.active { background: #22C55E; color: #fff; border-color: #22C55E; font-weight: 600; }
  .main { margin-left: 220px; min-height: 100vh; padding: 0; background: #F4F5F7; }
  .topbar { padding: 14px 28px; border-bottom: 1px solid #E0E4EA; display: flex; align-items: center; justify-content: space-between; background: #fff; position: sticky; top: 0; z-index: 50; }
  .topbar-title { font-size: 17px; font-weight: 700; color: #1F2937; }
  .topbar-actions { display: flex; gap: 10px; align-items: center; }
  .btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; font-family: 'Inter', sans-serif; }
  .btn-primary { background: #2B58A1; color: #fff; }
  .btn-primary:hover { background: #234A8A; }
  .btn-secondary { background: #F0F2F5; color: #374151; border: 1px solid #E0E4EA; }
  .btn-secondary:hover { background: #E4E8EF; }
  .btn-danger { background: #F44336; color: #fff; }
  .btn-sm { padding: 5px 10px; font-size: 12px; }
  .content { padding: 22px 28px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  .stat-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; display: flex; align-items: center; gap: 12px; }
  .stat-icon { width: 40px; height: 40px; border-radius: 8px; background: #DCFCE7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #16A34A; }
  .stat-icon.blue { background: #DBEAFE; color: #2B58A1; }
  .stat-label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; font-weight: 500; }
  .stat-value { font-size: 22px; font-weight: 700; color: #1F2937; line-height: 1; }
  .stat-sub { font-size: 11px; color: #9CA3AF; margin-top: 3px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .card { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 18px; }
  .card-title { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 14px; }
  .table { width: 100%; border-collapse: collapse; }
  .table th { text-align: left; padding: 9px 12px; font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #E5E7EB; background: #F9FAFB; font-weight: 600; }
  .table td { padding: 11px 12px; font-size: 13px; border-bottom: 1px solid #F3F4F6; color: #1F2937; }
  .table tr:hover td { background: #F9FAFB; }
  .table tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; color: #fff; }
  .badge-new { background: #2B58A1; }
  .badge-processing { background: #F59E0B; }
  .badge-shipped { background: #22C55E; }
  .badge-completed { background: #22C55E; }
  .badge-cancelled { background: #F44336; }
  .search-bar { width: 100%; padding: 9px 14px; background: #fff; border: 1px solid #E5E7EB; border-radius: 7px; color: #1F2937; font-size: 13px; margin-bottom: 14px; font-family: 'Inter', sans-serif; }
  .search-bar:focus { outline: none; border-color: #22C55E; }
  .input { width: 100%; padding: 9px 12px; background: #fff; border: 1px solid #E5E7EB; border-radius: 6px; color: #1F2937; font-size: 13px; font-family: 'Inter', sans-serif; }
  .input:focus { outline: none; border-color: #22C55E; }
  select.input { cursor: pointer; }
  .form-group { margin-bottom: 14px; }
  .form-label { display: block; font-size: 12px; color: #374151; font-weight: 500; margin-bottom: 6px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 28px; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
  .modal-title { font-size: 16px; font-weight: 700; color: #1F2937; margin-bottom: 20px; }
  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  .client-row { cursor: pointer; }
  .client-row:hover td { background: #F9FAFB !important; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
  .bar-chart { display: flex; flex-direction: column; gap: 8px; }
  .bar-row { display: flex; align-items: center; gap: 10px; font-size: 12px; }
  .bar-label { width: 110px; color: #4B5563; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
  .bar-track { flex: 1; height: 5px; background: #F3F4F6; border-radius: 3px; }
  .bar-fill { height: 100%; background: #22C55E; border-radius: 3px; transition: width 0.5s; }
  .bar-val { width: 60px; color: #1F2937; font-size: 11px; font-weight: 600; }
  .qr-container { text-align: center; padding: 16px; }
  .qr-container canvas { border-radius: 8px; border: 4px solid #fff; }
  .client-detail { display: flex; flex-direction: column; }
  .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid #F3F4F6; font-size: 13px; }
  .detail-label { color: #6B7280; font-size: 12px; }
  .detail-value { color: #1F2937; font-weight: 600; }
  .month-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
  .month-cell { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 6px; text-align: center; }
  .month-cell .m-name { font-size: 10px; color: #6B7280; margin-bottom: 4px; font-weight: 500; }
  .month-cell .m-val { font-size: 13px; font-weight: 700; color: #16A34A; }
  .empty-state { text-align: center; padding: 40px; color: #9CA3AF; font-size: 14px; }
  .code-tag { font-size: 10px; color: #6B7280; font-family: monospace; background: #F3F4F6; padding: 2px 6px; border-radius: 3px; }
  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .main { margin-left: 0; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .grid-2, .grid-3 { grid-template-columns: 1fr; }
  }
`;

// ============================================================
// QR GENERATOR
// ============================================================
async function generateQR(token) {
  const url = `${window.location.origin}/passport/${token}`;
  try {
    const canvas = document.createElement("canvas");
    await QRCode.toCanvas(canvas, url, { width: 200, margin: 2, color: { dark: "#000000", light: "#FFFFFF" } });
    return canvas.toDataURL("image/png");
  } catch (e) {
    return null;
  }
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [lang, setLang] = useState("ru");
  const [page, setPage] = useState("dashboard");
  const [selectedClient, setSelectedClient] = useState(null);
  const t = T[lang];

  return (
    <>
      <style>{styles}</style>
      <div className="crm-root">
        <Sidebar t={t} lang={lang} setLang={setLang} page={page} setPage={setPage} />
        <div className="main">
          {page === "dashboard" && <Dashboard t={t} setPage={setPage} />}
          {page === "clients" && <Clients t={t} onSelect={c => { setSelectedClient(c); setPage("client_detail"); }} />}
          {page === "client_detail" && <ClientDetail t={t} client={selectedClient} onBack={() => setPage("clients")} lang={lang} />}
          {page === "orders" && <Orders t={t} lang={lang} />}
          {page === "products" && <Products t={t} />}
          {page === "warranties" && <Warranties t={t} />}
          {page === "staff" && <Staff t={t} />}
        </div>
      </div>
    </>
  );
}

// ============================================================
// SIDEBAR
// ============================================================
function Sidebar({ t, lang, setLang, page, setPage }) {
  const navItems = [
    { key: "dashboard", label: t.dashboard },
    { key: "clients", label: t.clients },
    { key: "orders", label: t.orders },
    { key: "products", label: t.products },
    { key: "warranties", label: t.warranties },
    { key: "staff", label: t.staff },
  ];
  const icons = {
    dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    clients: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
    orders: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
    products: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
    warranties: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    staff: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  };
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1>Coffee Verve CRM</h1>
        <p>система управления</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <div key={item.key} className={`nav-item ${page === item.key || (page === "client_detail" && item.key === "clients") ? "active" : ""}`}
            onClick={() => setPage(item.key)}>
            <span className="nav-icon">{icons[item.key]}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="lang-switcher">
          {["ru","pl","ua"].map(l => (
            <button key={l} className={`lang-btn ${lang === l ? "active" : ""}`} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ t, setPage }) {
  const [stats, setStats] = useState({ clients: 0, orders: 0, revenue: 0, avg: 0, new_clients: 0, repeat: 0, sleeping: 0, warranty: 0 });
  const [topProducts, setTopProducts] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [bySource, setBySource] = useState([]);
  const [byLang, setByLang] = useState([]);
  const [byCity, setByCity] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersByStatus, setOrdersByStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [{ data: clients }, { data: orders }, { data: warranties }] = await Promise.all([
      supabase.from("clients").select("*"),
      supabase.from("orders").select("*, clients(name), products(name)"),
      supabase.from("warranties").select("*"),
    ]);

    const cl = clients || [], ord = orders || [], war = warranties || [];
    const completedOrders = ord.filter(o => o.status === "completed" || o.total);
    const revenue = ord.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const newClients = cl.filter(c => new Date(c.created_at) >= new Date(monthStart)).length;

    // Repeat buyers
    const clientOrderCounts = {};
    ord.forEach(o => { if (o.client_id) clientOrderCounts[o.client_id] = (clientOrderCounts[o.client_id] || 0) + 1; });
    const repeatCount = Object.values(clientOrderCounts).filter(c => c > 1).length;

    // Sleeping (no order in 30 days)
    const lastOrderByClient = {};
    ord.forEach(o => {
      if (!o.client_id) return;
      const d = new Date(o.created_at);
      if (!lastOrderByClient[o.client_id] || d > lastOrderByClient[o.client_id]) lastOrderByClient[o.client_id] = d;
    });
    const sleeping = cl.filter(c => {
      const last = lastOrderByClient[c.id];
      return last && new Date(thirtyDaysAgo) > last;
    }).length;

    // Top products
    const prodMap = {};
    ord.forEach(o => {
      const n = o.products?.name || "—";
      if (!prodMap[n]) prodMap[n] = { count: 0, revenue: 0 };
      prodMap[n].count++;
      prodMap[n].revenue += Number(o.total) || 0;
    });
    const tp = Object.entries(prodMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
    setTopProducts(tp);

    // Top clients
    const clMap = {};
    ord.forEach(o => {
      const n = o.clients?.name || "—";
      if (!clMap[n]) clMap[n] = { count: 0, total: 0 };
      clMap[n].count++;
      clMap[n].total += Number(o.total) || 0;
    });
    setTopClients(Object.entries(clMap).sort((a, b) => b[1].total - a[1].total).slice(0, 5));

    // By source
    const srcMap = {};
    cl.forEach(c => { if (c.source) srcMap[c.source] = (srcMap[c.source] || 0) + 1; });
    setBySource(Object.entries(srcMap).sort((a, b) => b[1] - a[1]));

    // By language
    const langMap = {};
    cl.forEach(c => { if (c.language) langMap[c.language] = (langMap[c.language] || 0) + 1; });
    setByLang(Object.entries(langMap).sort((a, b) => b[1] - a[1]));

    // By city
    const cityMap = {};
    cl.forEach(c => { if (c.city) cityMap[c.city] = (cityMap[c.city] || 0) + 1; });
    setByCity(Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 5));

    // Monthly revenue
    const monthly = Array(12).fill(0).map((_, i) => ({ month: i, rev: 0, cnt: 0 }));
    ord.forEach(o => {
      const m = new Date(o.created_at).getMonth();
      const y = new Date(o.created_at).getFullYear();
      if (y === now.getFullYear()) { monthly[m].rev += Number(o.total) || 0; monthly[m].cnt++; }
    });
    setMonthlyRevenue(monthly);

    // Orders by status
    const stMap = {};
    ord.forEach(o => { stMap[o.status] = (stMap[o.status] || 0) + 1; });
    setOrdersByStatus(Object.entries(stMap));

    // Recent orders
    setRecentOrders(ord.slice(-5).reverse());

    setStats({ clients: cl.length, orders: ord.length, revenue, avg: ord.length ? revenue / ord.length : 0, new_clients: newClients, repeat: repeatCount, sleeping, warranty: war.length });
    setLoading(false);
  }

  if (loading) return <div className="content"><div className="empty-state">{t.loading}</div></div>;

  const maxRev = Math.max(...topProducts.map(p => p[1].revenue), 1);
  const maxCl = Math.max(...topClients.map(c => c[1].total), 1);
  const maxSrc = Math.max(...bySource.map(s => s[1]), 1);

  return (
    <div>
      <div className="topbar"><span className="topbar-title">{t.dashboard}</span></div>
      <div className="content">
        {/* Main Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
            <div><div className="stat-label">{t.total_clients}</div><div className="stat-value">{stats.clients}</div><div className="stat-sub">+{stats.new_clients} {t.new_this_month}</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
            <div><div className="stat-label">{t.total_orders}</div><div className="stat-value">{stats.orders}</div><div className="stat-sub">{stats.repeat} {t.repeat_buyers}</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
            <div><div className="stat-label">{t.total_revenue}</div><div className="stat-value">{fmtMoney(stats.revenue)}</div><div className="stat-sub">{stats.sleeping} {t.sleeping}</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
            <div><div className="stat-label">{t.avg_check}</div><div className="stat-value">{fmtMoney(stats.avg)}</div><div className="stat-sub">{stats.warranty} {t.warranty_requests}</div></div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">{t.revenue_by_month}</div>
          <div className="month-grid">
            {monthlyRevenue.map((m, i) => (
              <div key={i} className="month-cell">
                <div className="m-name">{t.months[i]}</div>
                <div className="m-val">{m.rev > 0 ? `${m.rev.toFixed(0)} zł` : "—"}</div>
                <div style={{ fontSize: 10, color: "#555" }}>{m.cnt > 0 ? `${m.cnt} зак.` : ""}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid-2">
          {/* Top Products */}
          <div className="card">
            <div className="card-title">{t.top_products}</div>
            {topProducts.length === 0 ? <div className="empty-state">{t.no_data}</div> : (
              <div className="bar-chart">
                {topProducts.map(([name, d]) => (
                  <div key={name} className="bar-row">
                    <div className="bar-label">{name}</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(d.revenue / maxRev) * 100}%` }} /></div>
                    <div className="bar-val">{d.revenue.toFixed(0)} zł</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Clients */}
          <div className="card">
            <div className="card-title">{t.top_clients}</div>
            {topClients.length === 0 ? <div className="empty-state">{t.no_data}</div> : (
              <div className="bar-chart">
                {topClients.map(([name, d]) => (
                  <div key={name} className="bar-row">
                    <div className="bar-label">{name}</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(d.total / maxCl) * 100}%` }} /></div>
                    <div className="bar-val">{d.total.toFixed(0)} zł</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid-3">
          {/* By Source */}
          <div className="card">
            <div className="card-title">{t.by_source}</div>
            {bySource.length === 0 ? <div className="empty-state">{t.no_data}</div> : (
              <div className="bar-chart">
                {bySource.map(([src, cnt]) => (
                  <div key={src} className="bar-row">
                    <div className="bar-label">{src}</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(cnt / maxSrc) * 100}%` }} /></div>
                    <div className="bar-val">{cnt}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* By Language */}
          <div className="card">
            <div className="card-title">{t.by_language}</div>
            {byLang.length === 0 ? <div className="empty-state">{t.no_data}</div> : (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {byLang.map(([l, cnt]) => (
                  <div key={l} style={{ textAlign: "center", background: "#F9FAFB", padding: "12px 16px", borderRadius: 8, flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#2B58A1" }}>{cnt}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* By City */}
          <div className="card">
            <div className="card-title">{t.by_city}</div>
            {byCity.length === 0 ? <div className="empty-state">{t.no_data}</div> : (
              <div className="bar-chart">
                {byCity.map(([city, cnt]) => (
                  <div key={city} className="bar-row">
                    <div className="bar-label">{city}</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(cnt / byCity[0][1]) * 100}%` }} /></div>
                    <div className="bar-val">{cnt}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid-2">
          {/* Orders by Status */}
          <div className="card">
            <div className="card-title">{t.status}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {ordersByStatus.map(([st, cnt]) => (
                <div key={st} style={{ background: "#F9FAFB", padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="status-dot" style={{ background: STATUS_COLORS[st] }} />
                  <span style={{ fontSize: 13 }}>{t[STATUS_KEYS[st]]}</span>
                  <span style={{ fontWeight: 700, color: "#16A34A" }}>{cnt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card">
            <div className="card-title">{t.orders}</div>
            {recentOrders.length === 0 ? <div className="empty-state">{t.no_data}</div> : (
              <table className="table">
                <thead><tr><th>{t.client}</th><th>{t.product}</th><th>{t.total}</th><th>{t.date}</th></tr></thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o.id}>
                      <td>{o.clients?.name || "—"}</td>
                      <td style={{ color: "#6B7280" }}>{o.products?.name || "—"}</td>
                      <td style={{ color: "#16A34A" }}>{fmtMoney(o.total)}</td>
                      <td style={{ color: "#4B5563" }}>{fmtDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CLIENTS
// ============================================================
function Clients({ t, onSelect }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", telegram_id: "", username: "", language: "RU", source: "", city: "", email: "", phone: "", notes: "" });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClients(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.telegram_id?.includes(search) ||
    c.username?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  async function saveClient() {
    if (!form.name) return;
    await supabase.from("clients").insert([form]);
    setShowModal(false);
    setForm({ name: "", telegram_id: "", username: "", language: "RU", source: "", city: "", email: "", phone: "", notes: "" });
    fetchClients();
  }

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">{t.clients} ({clients.length})</span>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ {t.new_client}</button>
      </div>
      <div className="content">
        <input className="search-bar" placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} />
        {loading ? <div className="empty-state">{t.loading}</div> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead><tr><th>{t.name}</th><th>Telegram</th><th>{t.language}</th><th>{t.source}</th><th>{t.city}</th><th>{t.date}</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="empty-state">{t.no_data}</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="client-row" onClick={() => onSelect(c)}>
                    <td><div style={{ fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 11, color: "#4B5563" }}>{c.client_code}</div></td>
                    <td style={{ color: "#6B7280" }}>{c.username ? `@${c.username}` : c.telegram_id || "—"}</td>
                    <td><span className="badge" style={{ background: "#F3F4F6" }}>{c.language || "—"}</span></td>
                    <td style={{ color: "#6B7280", fontSize: 12 }}>{c.source || "—"}</td>
                    <td style={{ color: "#6B7280", fontSize: 12 }}>{c.city || "—"}</td>
                    <td style={{ color: "#4B5563", fontSize: 12 }}>{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{t.new_client}</div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t.name} *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{t.phone}</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Telegram ID</label><input className="input" value={form.telegram_id} onChange={e => setForm({ ...form, telegram_id: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{t.username}</label><input className="input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t.language}</label>
                <select className="input" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                  <option value="RU">RU</option><option value="PL">PL</option><option value="UA">UA</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">{t.source}</label>
                <select className="input" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                  <option value="">—</option>
                  {["инстаграм","телеграм","whatsapp","сайт","рекомендация","реклама в авто","другое"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t.city}</label><input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{t.email}</label><input className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="form-group"><label className="form-label">{t.notes}</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={saveClient}>{t.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CLIENT DETAIL
// ============================================================
function ClientDetail({ t, client, onBack, lang }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [orderForm, setOrderForm] = useState({ product_id: "", weight: 250, roast_date: "", notes: "" });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [currentClient, setCurrentClient] = useState(client);

  useEffect(() => {
    if (!client) return;
    setCurrentClient(client);
    setEditForm({ ...client });
    fetchOrders();
    supabase.from("products").select("*").eq("status", "active").then(({ data }) => setProducts(data || []));
  }, [client]);

  async function fetchOrders() {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*, products(*)").eq("client_id", client.id).order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  async function saveClientEdit() {
    if (!editForm) return;
    const { id, created_at, created_by, client_code, ...data } = editForm;
    await supabase.from("clients").update(data).eq("id", client.id);
    setCurrentClient({ ...currentClient, ...data });
    setShowEditModal(false);
  }

  async function saveOrder() {
    if (!orderForm.product_id) return;
    const prod = products.find(p => p.id === orderForm.product_id);
    const priceKey = `price_${orderForm.weight}`;
    const price = prod?.[priceKey] || 0;
    await supabase.from("orders").insert([{ client_id: client.id, product_id: orderForm.product_id, weight: orderForm.weight, price, total: price, roast_date: orderForm.roast_date || null, notes: orderForm.notes, status: "new" }]);
    setShowOrderModal(false);
    setOrderForm({ product_id: "", weight: 250, roast_date: "", notes: "" });
    fetchOrders();
  }

  const totalSpent = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);

  if (!currentClient) return null;

  return (
    <div>
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={onBack}>← {t.clients}</button>
          <span className="topbar-title">{currentClient.name}</span>
          <span style={{ fontSize: 12, color: "#6B7280" }}>{currentClient.client_code}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => { setEditForm({ ...currentClient }); setShowEditModal(true); }}>✏️ {t.edit}</button>
          <button className="btn btn-primary" onClick={() => setShowOrderModal(true)}>+ {t.new_order}</button>
        </div>
      </div>
      <div className="content">
        <div className="grid-2">
          {/* Client Info */}
          <div className="card">
            <div className="card-title">{t.client_card}</div>
            <div className="client-detail">
              {[
                [t.name, currentClient.name],
                ["Telegram", currentClient.username ? `@${currentClient.username}` : currentClient.telegram_id || "—"],
                [t.phone, currentClient.phone || "—"],
                [t.email, currentClient.email || "—"],
                [t.language, currentClient.language || "—"],
                [t.source, currentClient.source || "—"],
                [t.city, currentClient.city || "—"],
                [t.date, fmtDate(currentClient.created_at)],
                [t.total_orders, orders.length],
                [t.total_revenue, fmtMoney(totalSpent)],
              ].map(([l, v]) => (
                <div key={l} className="detail-row">
                  <span className="detail-label">{l}</span>
                  <span className="detail-value">{v}</span>
                </div>
              ))}
              {currentClient.notes && <div style={{ marginTop: 10, padding: 10, background: "#F9FAFB", borderRadius: 6, fontSize: 13, color: "#4B5563", border: "1px solid #E5E7EB" }}>{currentClient.notes}</div>}
            </div>
          </div>

          {/* Orders Summary */}
          <div className="card">
            <div className="card-title">{t.order_history} ({orders.length})</div>
            {loading ? <div className="empty-state">{t.loading}</div> : orders.length === 0 ? (
              <div className="empty-state">{t.no_data}</div>
            ) : (
              <table className="table">
                <thead><tr><th>#</th><th>{t.product}</th><th>{t.weight}</th><th>{t.total}</th><th>{t.status}</th><th>QR</th></tr></thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id} style={{ cursor: "pointer" }} onClick={() => setSelectedOrder(o)}>
                      <td style={{ color: "#6B7280", fontSize: 12 }}>{orders.length - i}</td>
                      <td style={{ fontWeight: 500, color: "#1F2937" }}>{o.products?.name || "—"}</td>
                      <td style={{ color: "#4B5563" }}>{o.weight}г</td>
                      <td style={{ color: "#16A34A", fontWeight: 600 }}>{fmtMoney(o.total)}</td>
                      <td><span className="badge" style={{ background: STATUS_COLORS[o.status] }}>{t[STATUS_KEYS[o.status]]}</span></td>
                      <td><button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); setSelectedOrder(o); }}>QR</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* New Order Modal */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowOrderModal(false)}>
          <div className="modal">
            <div className="modal-title">{t.new_order}</div>
            <div className="form-group"><label className="form-label">{t.product} *</label>
              <select className="input" value={orderForm.product_id} onChange={e => setOrderForm({ ...orderForm, product_id: e.target.value })}>
                <option value="">— {t.product} —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.country})</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t.weight}</label>
                <select className="input" value={orderForm.weight} onChange={e => setOrderForm({ ...orderForm, weight: Number(e.target.value) })}>
                  <option value={250}>250г</option><option value={500}>500г</option><option value={1000}>1000г</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">{t.roast_date}</label>
                <input type="date" className="input" value={orderForm.roast_date} onChange={e => setOrderForm({ ...orderForm, roast_date: e.target.value })} />
              </div>
            </div>
            {orderForm.product_id && (() => {
              const p = products.find(x => x.id === orderForm.product_id);
              const price = p?.[`price_${orderForm.weight}`];
              return price ? <div style={{ padding: "10px", background: "#F9FAFB", borderRadius: 6, marginBottom: 14, color: "#16A34A", fontSize: 14 }}>{t.price}: {fmtMoney(price)}</div> : null;
            })()}
            <div className="form-group"><label className="form-label">{t.notes}</label><textarea className="input" rows={2} value={orderForm.notes} onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={saveOrder}>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail + QR Modal */}
      {selectedOrder && <OrderQRModal t={t} order={selectedOrder} onClose={() => setSelectedOrder(null)} onRefresh={fetchOrders} />}

      {/* Edit Client Modal */}
      {showEditModal && editForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal">
            <div className="modal-title">✏️ {t.edit} — {currentClient.name}</div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t.name} *</label><input className="input" value={editForm.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{t.phone}</label><input className="input" value={editForm.phone || ""} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Telegram ID</label><input className="input" value={editForm.telegram_id || ""} onChange={e => setEditForm({ ...editForm, telegram_id: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{t.username}</label><input className="input" value={editForm.username || ""} onChange={e => setEditForm({ ...editForm, username: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t.language}</label>
                <select className="input" value={editForm.language || "RU"} onChange={e => setEditForm({ ...editForm, language: e.target.value })}>
                  <option value="RU">RU</option><option value="PL">PL</option><option value="UA">UA</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">{t.source}</label>
                <select className="input" value={editForm.source || ""} onChange={e => setEditForm({ ...editForm, source: e.target.value })}>
                  <option value="">—</option>
                  {["инстаграм","телеграм","whatsapp","сайт","рекомендация","реклама в авто","другое"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t.city}</label><input className="input" value={editForm.city || ""} onChange={e => setEditForm({ ...editForm, city: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{t.email}</label><input className="input" value={editForm.email || ""} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
            </div>
            <div className="form-group"><label className="form-label">{t.notes}</label><textarea className="input" rows={2} value={editForm.notes || ""} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={saveClientEdit}>{t.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ORDER QR MODAL
// ============================================================
function OrderQRModal({ t, order, onClose, onRefresh }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [status, setStatus] = useState(order.status);

  useEffect(() => {
    if (order.qr_token) {
      generateQR(order.qr_token).then(setQrUrl);
    }
  }, [order]);

  async function updateStatus(s) {
    await supabase.from("orders").update({ status: s }).eq("id", order.id);
    setStatus(s);
    onRefresh();
  }

  function downloadQR() {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `qr_order_${order.qr_token}.png`;
    a.click();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{t.coffee_passport}</div>
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ flex: 1 }}>
            {[
              [t.product, order.products?.name],
              [t.weight, `${order.weight}г`],
              [t.roast_date, fmtDate(order.roast_date)],
              [t.total, fmtMoney(order.total)],
              [t.date, fmtDate(order.created_at)],
              ["Вкус", order.products?.flavor_notes],
            ].map(([l, v]) => v && (
              <div key={l} className="detail-row"><span className="detail-label">{l}</span><span className="detail-value">{v}</span></div>
            ))}
            <div style={{ marginTop: 14 }}>
              <label className="form-label">{t.status}</label>
              <select className="input" value={status} onChange={e => updateStatus(e.target.value)}>
                {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{t[STATUS_KEYS[s]]}</option>)}
              </select>
            </div>
          </div>
          <div className="qr-container" style={{ minWidth: 160 }}>
            {qrUrl ? (
              <>
                <img src={qrUrl} alt="QR" style={{ width: 150, height: 150, borderRadius: 8, border: "4px solid #fff" }} />
                <div style={{ fontSize: 10, color: "#4B5563", margin: "8px 0", fontFamily: "monospace" }}>{order.qr_token}</div>
                <button className="btn btn-secondary btn-sm" onClick={downloadQR}>{t.print_qr}</button>
              </>
            ) : <div style={{ color: "#4B5563", fontSize: 12 }}>Генерация QR...</div>}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>{t.close}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ORDERS
// ============================================================
function Orders({ t, lang }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*, clients(name, client_code), products(name, flavor_notes)").order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter(o => {
    const matchStatus = filter === "all" || o.status === filter;
    const matchSearch = !search || o.clients?.name?.toLowerCase().includes(search.toLowerCase()) || o.products?.name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">{t.orders} ({filtered.length})</span>
        <div className="topbar-actions">
          {["all", "new", "processing", "shipped", "completed", "cancelled"].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(s)}>
              {s === "all" ? "Все" : t[STATUS_KEYS[s]]}
            </button>
          ))}
        </div>
      </div>
      <div className="content">
        <input className="search-bar" placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} />
        {loading ? <div className="empty-state">{t.loading}</div> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead><tr><th>#</th><th>{t.client}</th><th>{t.product}</th><th>{t.weight}</th><th>{t.total}</th><th>{t.status}</th><th>{t.date}</th><th>QR</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={8} className="empty-state">{t.no_data}</td></tr> : filtered.map((o, i) => (
                  <tr key={o.id} style={{ cursor: "pointer" }} onClick={() => setSelectedOrder(o)}>
                    <td style={{ color: "#4B5563", fontSize: 12 }}>{filtered.length - i}</td>
                    <td><div style={{ fontWeight: 500 }}>{o.clients?.name || "—"}</div><div style={{ fontSize: 11, color: "#4B5563" }}>{o.clients?.client_code}</div></td>
                    <td style={{ color: "#6B7280" }}>{o.products?.name || "—"}</td>
                    <td style={{ color: "#6B7280" }}>{o.weight}г</td>
                    <td style={{ color: "#16A34A", fontWeight: 600 }}>{fmtMoney(o.total)}</td>
                    <td><span className="badge" style={{ background: STATUS_COLORS[o.status] + "22", color: STATUS_COLORS[o.status] }}>{t[STATUS_KEYS[o.status]]}</span></td>
                    <td style={{ color: "#4B5563", fontSize: 12 }}>{fmtDate(o.created_at)}</td>
                    <td><button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); setSelectedOrder(o); }}>QR</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedOrder && <OrderQRModal t={t} order={selectedOrder} onClose={() => setSelectedOrder(null)} onRefresh={fetchOrders} />}
    </div>
  );
}

// ============================================================
// PRODUCTS
// ============================================================
function Products({ t }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const emptyProduct = { code: "", name: "", country: "", flavor_notes: "", purpose: "Эспрессо, молочные напитки", price_250: "", price_500: "", price_1000: "", status: "active" };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("code");
    setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function saveProduct() {
    if (!editing || !editing.name) return;
    const { id, ...data } = editing;
    if (id) await supabase.from("products").update(data).eq("id", id);
    else await supabase.from("products").insert([data]);
    setEditing(null);
    fetchProducts();
  }

  async function deleteProduct(id) {
    if (!window.confirm("Удалить товар?")) return;
    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
  }

  const statusLabels = { active: "✅ Есть", inactive: "❌ Нет", on_order: "⏳ Под заказ" };
  const isNew = editing && !editing.id;

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">{t.products} ({products.length})</span>
        <button className="btn btn-primary" onClick={() => setEditing({ ...emptyProduct })}>+ {t.add}</button>
      </div>
      <div className="content">
        {loading ? <div className="empty-state">{t.loading}</div> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead><tr><th>{t.name}</th><th>{t.country}</th><th>{t.flavor_notes}</th><th>{t.price_250}</th><th>{t.price_500}</th><th>{t.price_1000}</th><th>{t.available}</th><th></th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 11, color: "#4B5563" }}>{p.code}</div></td>
                    <td style={{ color: "#6B7280", fontSize: 12 }}>{p.country}</td>
                    <td style={{ color: "#6B7280", fontSize: 12, maxWidth: 200 }}>{p.flavor_notes}</td>
                    <td style={{ color: "#16A34A" }}>{p.price_250 ? `${p.price_250} zł` : "—"}</td>
                    <td style={{ color: "#16A34A" }}>{p.price_500 ? `${p.price_500} zł` : "—"}</td>
                    <td style={{ color: "#16A34A" }}>{p.price_1000 ? `${p.price_1000} zł` : "—"}</td>
                    <td><span className="badge" style={{ background: "#F3F4F6" }}>{statusLabels[p.status]}</span></td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditing({ ...p })}>{t.edit}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p.id)}>{t.delete}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal">
            <div className="modal-title">{isNew ? `+ ${t.add} ${t.products}` : editing.name}</div>
            {isNew && (
              <>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Код товара *</label><input className="input" placeholder="CV-013" value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">{t.name} *</label><input className="input" placeholder="Kenya AA" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">{t.country}</label><input className="input" placeholder="Кения" value={editing.country} onChange={e => setEditing({ ...editing, country: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">{t.purpose}</label><input className="input" value={editing.purpose} onChange={e => setEditing({ ...editing, purpose: e.target.value })} /></div>
                </div>
                <div className="form-group"><label className="form-label">{t.flavor_notes}</label><input className="input" placeholder="Смородина • Лимон • Чай" value={editing.flavor_notes} onChange={e => setEditing({ ...editing, flavor_notes: e.target.value })} /></div>
              </>
            )}
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t.price_250}</label><input type="number" className="input" value={editing.price_250 || ""} onChange={e => setEditing({ ...editing, price_250: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{t.price_500}</label><input type="number" className="input" value={editing.price_500 || ""} onChange={e => setEditing({ ...editing, price_500: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">{t.price_1000}</label><input type="number" className="input" value={editing.price_1000 || ""} onChange={e => setEditing({ ...editing, price_1000: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{t.available}</label>
                <select className="input" value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })}>
                  <option value="active">✅ Есть</option><option value="inactive">❌ Нет</option><option value="on_order">⏳ Под заказ</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={saveProduct}>{t.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// WARRANTIES
// ============================================================
function Warranties({ t }) {
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const [{ data: war }, { count }] = await Promise.all([
        supabase.from("warranties").select("*, orders(qr_token, weight, total, products(name), clients(name))").order("activated_at", { ascending: false }),
        supabase.from("orders").select("*", { count: "exact", head: true })
      ]);
      setWarranties(war || []);
      setTotal(count || 0);
      setLoading(false);
    }
    fetch();
  }, []);

  async function updateWarranty(id, data) {
    await supabase.from("warranties").update(data).eq("id", id);
    setWarranties(prev => prev.map(w => w.id === id ? { ...w, ...data } : w));
  }

  const pct = total ? ((warranties.length / total) * 100).toFixed(1) : 0;
  const resLabels = { replace: t.replace, refund: t.refund, pending: t.pending };
  const statusLabels = { new: t.status_new, processing: t.status_processing, resolved: t.resolved };

  return (
    <div>
      <div className="topbar"><span className="topbar-title">{t.warranties}</span></div>
      <div className="content">
        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
          <div className="stat-card"><div className="stat-label">{t.warranty_requests}</div><div className="stat-value">{warranties.length}</div></div>
          <div className="stat-card"><div className="stat-label">{t.warranty_pct}</div><div className="stat-value">{pct}%</div></div>
        </div>
        {loading ? <div className="empty-state">{t.loading}</div> : warranties.length === 0 ? (
          <div className="card"><div className="empty-state">{t.no_data}</div></div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead><tr><th>{t.client}</th><th>{t.product}</th><th>{t.warranty_reason}</th><th>{t.status}</th><th>Решение</th><th>{t.date}</th></tr></thead>
              <tbody>
                {warranties.map(w => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 500 }}>{w.orders?.clients?.name || "—"}</td>
                    <td style={{ color: "#6B7280" }}>{w.orders?.products?.name || "—"}</td>
                    <td style={{ color: "#6B7280", fontSize: 12, maxWidth: 200 }}>{w.reason}</td>
                    <td>
                      <select className="input" style={{ padding: "3px 6px", fontSize: 12 }} value={w.status} onChange={e => updateWarranty(w.id, { status: e.target.value })}>
                        {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="input" style={{ padding: "3px 6px", fontSize: 12 }} value={w.resolution || "pending"} onChange={e => updateWarranty(w.id, { resolution: e.target.value })}>
                        {Object.entries(resLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td style={{ color: "#4B5563", fontSize: 12 }}>{fmtDate(w.activated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// STAFF
// ============================================================
function Staff({ t }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "employee" });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("users").select("*").order("created_at");
    setStaff(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  async function saveStaff() {
    if (!form.name || !form.email) return;
    await supabase.from("users").insert([form]);
    setShowModal(false);
    setForm({ name: "", email: "", role: "employee" });
    fetchStaff();
  }

  async function deleteStaff(id) {
    await supabase.from("users").delete().eq("id", id);
    fetchStaff();
  }

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">{t.staff}</span>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ {t.add}</button>
      </div>
      <div className="content">
        {loading ? <div className="empty-state">{t.loading}</div> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead><tr><th>{t.name}</th><th>{t.email}</th><th>{t.role}</th><th>{t.date}</th><th></th></tr></thead>
              <tbody>
                {staff.length === 0 ? <tr><td colSpan={5} className="empty-state">{t.no_data}</td></tr> : staff.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ color: "#6B7280" }}>{s.email}</td>
                    <td><span className="badge" style={{ background: s.role === "owner" ? "#DCFCE7" : "#F3F4F6", color: s.role === "owner" ? "#16A34A" : "#6B7280" }}>{s.role === "owner" ? t.owner : t.employee}</span></td>
                    <td style={{ color: "#4B5563", fontSize: 12 }}>{fmtDate(s.created_at)}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => deleteStaff(s.id)}>{t.delete}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{t.add} {t.staff}</div>
            <div className="form-group"><label className="form-label">{t.name} *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">{t.email} *</label><input className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">{t.role}</label>
              <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="owner">{t.owner}</option><option value="employee">{t.employee}</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={saveStaff}>{t.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
