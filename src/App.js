import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { supabase } from "./lib/supabaseClient";
import ShopOrders from "./modules/shop/ShopOrders";
import ShopProducts from "./modules/shop/ShopProducts";
import ShopReviews from "./modules/shop/ShopReviews";
import ShopPromoCodes from "./modules/shop/ShopPromoCodes";
import ShopCustomers from "./modules/shop/ShopCustomers";
import ShopAnalytics from "./modules/shop/ShopAnalytics";

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
    new_order: "Новый заказ", new_client: "Новый клиент", print_label: "Этикетка", print_sending: "Отправка...", print_ok: "✅ Отправлено в печать!", print_err: "❌ Ошибка. Проверь N8N webhook.",
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
    reviews: "Отзывы", review_pending: "На модерации", review_approved: "Опубликован",
    review_rejected: "Отклонён", review_author: "Автор", review_rating: "Рейтинг",
    review_text: "Текст", review_response: "Ответ продавца", review_approve: "✅ Опубликовать",
    review_reject: "❌ Отклонить", review_all: "Все", review_filter: "Фильтр",
    review_save_response: "Сохранить ответ", review_product: "Товар",
    discounts: "Скидки", loyalty: "Лояльность",
    promo_code: "Промокод", promo_type: "Тип", promo_value: "Значение",
    promo_min_order: "Мин. заказ", promo_valid_until: "Действует до",
    promo_max_uses: "Лимит", promo_used: "Исп.", promo_category: "Категория",
    promo_active: "Активен", promo_create: "Создать промокод",
    promo_fixed: "Фиксированный (zł)", promo_percent: "Процент (%)",
    promo_one_per: "1 раз на клиента", promo_generate: "Сгенерировать",
    level_classic: "Classic", level_gold: "Gold", level_platinum: "Platinum",
    level_b2b: "B2B", spent_12m: "Оборот за 12м",
    loyalty_config: "Настройки лояльности", loyalty_clients: "Клиенты по уровням",
    recalc: "Пересчитать уровень", recalc_ok: "Уровень пересчитан",
    b2b_client: "B2B клиент", b2b_discount: "Скидка B2B (%)",
    referral_code_lbl: "Реф. код", referral_rewarded: "Реферал вознаграждён",
    gold_threshold: "Порог Gold (zł)", platinum_threshold: "Порог Platinum (zł)",
    classic_discount: "Скидка Classic (%)", gold_discount: "Скидка Gold (%)",
    platinum_discount: "Скидка Platinum (%)", shop_loyalty: "Лояльность (магазин)",
    no_shop_user: "Не зарегистрирован в магазине",
    inactive_90: "Неактивные 90+ дней", min_discount_lbl: "Скидка гарантирована до",
    last_purchase_lbl: "Посл. покупка", days_inactive_lbl: "Дней без покупок",
    guaranteed_until: "Гарантировано до",
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
    new_order: "Nowe zamówienie", print_label: "Etykieta", print_sending: "Wysyłanie...", print_ok: "✅ Wysłano do druku!", print_err: "❌ Błąd. Sprawdź webhook N8N.", new_client: "Nowy klient",
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
    reviews: "Opinie", review_pending: "Do moderacji", review_approved: "Opublikowana",
    review_rejected: "Odrzucona", review_author: "Autor", review_rating: "Ocena",
    review_text: "Treść", review_response: "Odpowiedź sprzedawcy", review_approve: "✅ Opublikuj",
    review_reject: "❌ Odrzuć", review_all: "Wszystkie", review_filter: "Filtr",
    review_save_response: "Zapisz odpowiedź", review_product: "Produkt",
    discounts: "Rabaty", loyalty: "Lojalność",
    promo_code: "Kod promo", promo_type: "Typ", promo_value: "Wartość",
    promo_min_order: "Min. zamówienie", promo_valid_until: "Ważny do",
    promo_max_uses: "Limit", promo_used: "Użyty", promo_category: "Kategoria",
    promo_active: "Aktywny", promo_create: "Utwórz kod promo",
    promo_fixed: "Stały (zł)", promo_percent: "Procent (%)",
    promo_one_per: "1 raz na klienta", promo_generate: "Generuj",
    level_classic: "Classic", level_gold: "Gold", level_platinum: "Platinum",
    level_b2b: "B2B", spent_12m: "Obrót 12m",
    loyalty_config: "Konfiguracja lojalnościowa", loyalty_clients: "Klienci wg poziomów",
    recalc: "Przelicz poziom", recalc_ok: "Poziom przeliczony",
    b2b_client: "Klient B2B", b2b_discount: "Rabat B2B (%)",
    referral_code_lbl: "Kod ref.", referral_rewarded: "Polecający nagrodzony",
    gold_threshold: "Próg Gold (zł)", platinum_threshold: "Próg Platinum (zł)",
    classic_discount: "Rabat Classic (%)", gold_discount: "Rabat Gold (%)",
    platinum_discount: "Rabat Platinum (%)", shop_loyalty: "Lojalność (sklep)",
    no_shop_user: "Nie zarejestrowany w sklepie",
    inactive_90: "Nieaktywni 90+ dni", min_discount_lbl: "Rabat gwarantowany do",
    last_purchase_lbl: "Ost. zakup", days_inactive_lbl: "Dni bez zakupu",
    guaranteed_until: "Gwarantowane do",
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
    new_order: "Нове замовлення", print_label: "Етикетка", print_sending: "Надсилання...", print_ok: "✅ Надіслано на друк!", print_err: "❌ Помилка. Перевір N8N webhook.", new_client: "Новий клієнт",
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
    reviews: "Відгуки", review_pending: "На модерації", review_approved: "Опубліковано",
    review_rejected: "Відхилено", review_author: "Автор", review_rating: "Рейтинг",
    review_text: "Текст", review_response: "Відповідь продавця", review_approve: "✅ Опублікувати",
    review_reject: "❌ Відхилити", review_all: "Всі", review_filter: "Фільтр",
    review_save_response: "Зберегти відповідь", review_product: "Товар",
    discounts: "Знижки", loyalty: "Лояльність",
    promo_code: "Промокод", promo_type: "Тип", promo_value: "Значення",
    promo_min_order: "Мін. замовлення", promo_valid_until: "Діє до",
    promo_max_uses: "Ліміт", promo_used: "Вик.", promo_category: "Категорія",
    promo_active: "Активний", promo_create: "Створити промокод",
    promo_fixed: "Фіксований (zł)", promo_percent: "Відсоток (%)",
    promo_one_per: "1 раз на клієнта", promo_generate: "Згенерувати",
    level_classic: "Classic", level_gold: "Gold", level_platinum: "Platinum",
    level_b2b: "B2B", spent_12m: "Оборот за 12м",
    loyalty_config: "Налаштування лояльності", loyalty_clients: "Клієнти за рівнями",
    recalc: "Перерахувати рівень", recalc_ok: "Рівень перераховано",
    b2b_client: "B2B клієнт", b2b_discount: "Знижка B2B (%)",
    referral_code_lbl: "Реф. код", referral_rewarded: "Реферал винагороджено",
    gold_threshold: "Поріг Gold (zł)", platinum_threshold: "Поріг Platinum (zł)",
    classic_discount: "Знижка Classic (%)", gold_discount: "Знижка Gold (%)",
    platinum_discount: "Знижка Platinum (%)", shop_loyalty: "Лояльність (магазин)",
    no_shop_user: "Не зареєстрований у магазині",
    inactive_90: "Неактивні 90+ днів", min_discount_lbl: "Знижка гарантована до",
    last_purchase_lbl: "Остання покупка", days_inactive_lbl: "Днів без покупки",
    guaranteed_until: "Гарантовано до",
  }
};

// ============================================================
// HELPERS
// ============================================================
const STATUS_COLORS = {
  new: "#2B58A1", processing: "#F59E0B", shipped: "#8B5CF6",
  completed: "#22C55E", cancelled: "#F44336"
};
const STATUS_PILL = {
  new:        { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  processing: { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" },
  shipped:    { bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE" },
  completed:  { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" },
  cancelled:  { bg: "#FFF1F2", color: "#BE123C", border: "#FECDD3" },
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
  .nav-badge { background: #EF4444; color: #fff; border-radius: 10px; font-size: 10px; font-weight: 700; padding: 1px 6px; margin-left: auto; min-width: 18px; text-align: center; animation: pulse-badge 2s infinite; }
  @keyframes pulse-badge { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
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
  .status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid; }
  .status-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
  .status-select-pill { padding: 4px 8px; font-size: 11px; font-weight: 600; border-radius: 20px; border: 1px solid; cursor: pointer; font-family: 'Inter', sans-serif; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236B7280'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; padding-right: 22px; }
  .client-avatar { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; flex-shrink: 0; }
  .lang-pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; }
  .lang-ru { background: #EFF6FF; color: #1D4ED8; }
  .lang-ua { background: #FEF9C3; color: #854D0E; }
  .lang-pl { background: #FEF2F2; color: #B91C1C; }
  .lang-other { background: #F3F4F6; color: #4B5563; }
  .action-icon-btn { background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 5px; border-radius: 5px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; font-size: 13px; }
  .action-icon-btn:hover { background: #F3F4F6; color: #374151; }
  .action-icon-btn.danger:hover { background: #FEF2F2; color: #DC2626; }
  .stat-card-big { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 18px 20px; }
  .stat-card-big.green { border-left: 3px solid #22C55E; }
  .stat-card-big .big-label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500; margin-bottom: 4px; }
  .stat-card-big .big-value { font-size: 28px; font-weight: 700; color: #1F2937; line-height: 1.1; }
  .stat-card-big .big-sub { font-size: 12px; color: #22C55E; margin-top: 4px; font-weight: 500; }
  .bar-month { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
  .bar-month-fill { width: 100%; border-radius: 3px 3px 0 0; background: #E5E7EB; min-height: 4px; transition: height 0.4s; }
  .bar-month-fill.active { background: #22C55E; }
  .bar-month-label { font-size: 9px; color: #9CA3AF; font-weight: 500; }
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
  .level-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; }
  .level-classic { background: #F3F4F6; color: #4B5563; border: 1px solid #D1D5DB; }
  .level-gold { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
  .level-platinum { background: #EDE9FE; color: #4C1D95; border: 1px solid #DDD6FE; }
  .level-b2b { background: #DBEAFE; color: #1E3A8A; border: 1px solid #BFDBFE; }
  .promo-tag { display: inline-block; font-size: 11px; font-family: monospace; font-weight: 700; background: #EFF6FF; color: #1D4ED8; padding: 2px 8px; border-radius: 4px; border: 1px solid #BFDBFE; letter-spacing: 0.05em; }
  .toggle-switch { position: relative; display: inline-block; width: 34px; height: 18px; }
  .toggle-switch input { opacity: 0; width: 0; height: 0; }
  .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #D1D5DB; border-radius: 18px; transition: 0.2s; }
  .toggle-slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: 0.2s; }
  .toggle-switch input:checked + .toggle-slider { background: #22C55E; }
  .toggle-switch input:checked + .toggle-slider:before { transform: translateX(16px); }
  .config-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .config-item { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; }
  .config-item label { display: block; font-size: 10px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .config-item input { width: 100%; padding: 6px 8px; border: 1px solid #E5E7EB; border-radius: 5px; font-size: 14px; font-weight: 700; color: #1F2937; font-family: 'Inter', sans-serif; text-align: center; }
  .config-item input:focus { outline: none; border-color: #22C55E; }
  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .main { margin-left: 0; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .grid-2, .grid-3 { grid-template-columns: 1fr; }
  }
  .nav-section-label { padding: 14px 18px 6px; font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.08em; }
  .nav-item.disabled { cursor: default; opacity: 0.45; }
  .nav-item.disabled:hover { background: none; color: rgba(255,255,255,0.65); }
  .nav-soon { margin-left: auto; font-size: 9px; background: rgba(255,255,255,0.12); padding: 1px 6px; border-radius: 8px; }
  .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 200; display: flex; justify-content: flex-end; }
  .drawer { background: #fff; width: 100%; max-width: 480px; height: 100vh; overflow-y: auto; box-shadow: -8px 0 32px rgba(0,0,0,0.14); animation: drawer-in 0.2s ease-out; }
  @keyframes drawer-in { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .drawer-header { padding: 18px 22px; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: #fff; z-index: 2; }
  .drawer-title { font-size: 15px; font-weight: 700; color: #1F2937; }
  .drawer-close { background: none; border: none; cursor: pointer; color: #9CA3AF; font-size: 20px; line-height: 1; padding: 4px; }
  .drawer-close:hover { color: #374151; }
  .drawer-body { padding: 18px 22px; }
  .drawer-section { margin-bottom: 20px; }
  .drawer-section-title { font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
  .composition-tip { position: relative; cursor: help; border-bottom: 1px dotted #9CA3AF; }
  .composition-tip:hover .composition-tip-box { display: block; }
  .composition-tip-box { display: none; position: absolute; top: 100%; left: 0; z-index: 30; background: #1F2937; color: #fff; font-size: 11px; padding: 8px 10px; border-radius: 6px; white-space: nowrap; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
  .channel-menu { position: absolute; background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.14); z-index: 40; min-width: 160px; overflow: hidden; }
  .channel-item { padding: 9px 14px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; color: #1F2937; }
  .channel-item:hover { background: #F3F4F6; }
  .channel-item.disabled { color: #C0C5CC; cursor: not-allowed; }
  .channel-item.disabled:hover { background: none; }
  .chip-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 14px; font-size: 12px; background: #F3F4F6; color: #374151; cursor: pointer; border: 1px solid transparent; user-select: none; }
  .chip.selected { background: #DCFCE7; color: #16A34A; border-color: #BBF7D0; }
  .chip-input { display: inline-flex; }
  .img-thumb-list { display: flex; gap: 10px; flex-wrap: wrap; }
  .img-thumb { position: relative; width: 72px; height: 72px; border-radius: 8px; overflow: hidden; border: 2px solid #E5E7EB; cursor: grab; flex-shrink: 0; }
  .img-thumb.main { border-color: #22C55E; }
  .img-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .img-thumb .img-remove { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; cursor: pointer; line-height: 1; }
  .img-thumb-add { width: 72px; height: 72px; border-radius: 8px; border: 2px dashed #D1D5DB; display: flex; align-items: center; justify-content: center; color: #9CA3AF; cursor: pointer; font-size: 22px; flex-shrink: 0; }
  .drag-row.dragging { opacity: 0.4; }
  .drag-handle { cursor: grab; color: #C0C5CC; padding: 0 6px; }
  .tabs-row { display: flex; gap: 6px; margin-bottom: 10px; }
  .tab-btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #E5E7EB; background: #F9FAFB; font-size: 12px; cursor: pointer; color: #6B7280; font-family: 'Inter', sans-serif; }
  .tab-btn.active { background: #2B58A1; color: #fff; border-color: #2B58A1; }
  .old-price { text-decoration: line-through; color: #9CA3AF; font-size: 11px; margin-right: 4px; }
  .inline-edit-cell { cursor: text; border-bottom: 1px dashed transparent; }
  .inline-edit-cell:hover { border-bottom-color: #9CA3AF; }
`;

// ============================================================
// QR GENERATOR
// ============================================================
async function generateQR(token, lang) {
  const langParam = lang ? `?lang=${lang}` : "";
  const url = `${window.location.origin}/passport/${token}${langParam}`;
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

// ============================================================
// PASSPORT PAGE (публичная страница для клиентов по QR)
// ============================================================
function PassportPage({ token }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLang, setActiveLang] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formReason, setFormReason] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formSent, setFormSent] = useState(false);
  const [formSending, setFormSending] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      const { data, error } = await supabase
        .from("orders")
        .select("*, products(*), clients(*)")
        .eq("qr_token", token)
        .single();
      if (error || !data) setError(true);
      else setOrder(data);
      setLoading(false);
    }
    fetchOrder();
  }, [token]);

  const STATUS_LABELS = {
    new:        { ru: "Новый",        pl: "Nowe",        ua: "Новий",        color: "#3B82F6" },
    processing: { ru: "В обработке",  pl: "W trakcie",   ua: "В обробці",    color: "#F59E0B" },
    roasting:   { ru: "Обжаривается", pl: "Palenie",     ua: "Обсмажується", color: "#F97316" },
    shipped:    { ru: "Отправлен",    pl: "Wysłane",     ua: "Відправлено",  color: "#8B5CF6" },
    delivered:  { ru: "Доставлен",    pl: "Dostarczono", ua: "Доставлено",   color: "#22C55E" },
    completed:  { ru: "Выполнен",     pl: "Zrealizowano",ua: "Виконано",     color: "#22C55E" },
    cancelled:  { ru: "Отменён",      pl: "Anulowane",   ua: "Скасовано",    color: "#EF4444" },
  };

  const PT = {
    ru: {
      title: "Паспорт заказа", loading: "Загрузка...", not_found: "Заказ не найден",
      order_num: "Номер заказа", weight: "Вес", roast_date: "Дата обжарки",
      order_date: "Дата заказа", status: "Статус", flavor: "Вкусовые ноты",
      unit_g: "г", locale: "ru-RU",
      problem_btn: "⚠️ Проблема с заказом",
      form_title: "Заявка на возврат",
      form_reason_label: "Причина обращения",
      reasons: ["Дефект обжарки", "Не тот товар", "Повреждена упаковка", "Другое"],
      form_comment: "Комментарий (необязательно)",
      form_send: "Отправить заявку",
      form_sending: "Отправляем...",
      form_cancel: "Отмена",
      form_success: "✅ Заявка принята! Менеджер свяжется с вами.",
    },
    pl: {
      title: "Paszport zamówienia", loading: "Ładowanie...", not_found: "Zamówienie nie znalezione",
      order_num: "Numer zamówienia", weight: "Waga", roast_date: "Data palenia",
      order_date: "Data zamówienia", status: "Status", flavor: "Nuty smakowe",
      unit_g: "g", locale: "pl-PL",
      problem_btn: "⚠️ Problem z zamówieniem",
      form_title: "Wniosek o zwrot",
      form_reason_label: "Powód reklamacji",
      reasons: ["Wada palenia", "Zły produkt", "Uszkodzone opakowanie", "Inne"],
      form_comment: "Komentarz (opcjonalnie)",
      form_send: "Wyślij wniosek",
      form_sending: "Wysyłanie...",
      form_cancel: "Anuluj",
      form_success: "✅ Wniosek przyjęty! Menedżer skontaktuje się z Tobą.",
    },
    ua: {
      title: "Паспорт замовлення", loading: "Завантаження...", not_found: "Замовлення не знайдено",
      order_num: "Номер замовлення", weight: "Вага", roast_date: "Дата обсмажки",
      order_date: "Дата замовлення", status: "Статус", flavor: "Смакові ноти",
      unit_g: "г", locale: "uk-UA",
      problem_btn: "⚠️ Проблема із замовленням",
      form_title: "Заявка на повернення",
      form_reason_label: "Причина звернення",
      reasons: ["Дефект обсмажки", "Не той товар", "Пошкоджена упаковка", "Інше"],
      form_comment: "Коментар (необов'язково)",
      form_send: "Надіслати заявку",
      form_sending: "Надсилаємо...",
      form_cancel: "Скасувати",
      form_success: "✅ Заявку прийнято! Менеджер зв'яжеться з вами.",
    },
  };

  const passportStyles = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0F172A; font-family: 'Segoe UI', sans-serif; }
    .passport-wrap { min-height: 100vh; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); display: flex; align-items: center; justify-content: center; padding: 24px; }
    .passport-card { background: #1E293B; border-radius: 20px; max-width: 420px; width: 100%; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5); border: 1px solid #334155; }
    .passport-header { background: linear-gradient(135deg, #2B58A1, #1a3d7a); padding: 28px 24px; text-align: center; }
    .passport-logo { font-size: 13px; color: rgba(255,255,255,0.6); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px; }
    .passport-title { font-size: 22px; font-weight: 700; color: #fff; }
    .passport-body { padding: 24px; }
    .passport-product { font-size: 20px; font-weight: 700; color: #F1F5F9; margin-bottom: 4px; }
    .passport-origin { font-size: 13px; color: #94A3B8; margin-bottom: 20px; }
    .passport-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #334155; }
    .passport-row:last-of-type { border-bottom: none; }
    .passport-label { font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
    .passport-value { font-size: 14px; color: #E2E8F0; font-weight: 500; }
    .passport-status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; color: #fff; }
    .passport-flavor { background: #0F172A; border-radius: 10px; padding: 14px; margin: 16px 0; }
    .passport-flavor-label { font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .passport-flavor-text { font-size: 14px; color: #CBD5E1; font-style: italic; }
    .passport-footer { background: #0F172A; padding: 16px 24px; text-align: center; font-size: 12px; color: #475569; }
    .passport-coffee-icon { font-size: 40px; margin-bottom: 10px; }
    .loading { text-align: center; color: #64748B; padding: 60px; font-size: 16px; }
    .error { text-align: center; color: #EF4444; padding: 60px; font-size: 16px; }
    .lang-switch { display: flex; gap: 8px; justify-content: center; padding: 12px; background: #0F172A; }
    .lang-btn { background: #1E293B; border: 1px solid #334155; color: #94A3B8; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
    .lang-btn.active { background: #2B58A1; border-color: #2B58A1; color: #fff; }
    .problem-section { padding: 0 24px 20px; }
    .problem-btn { width: 100%; padding: 12px; background: #1a1a2e; border: 1px solid #F59E0B; color: #F59E0B; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .problem-btn:hover { background: #2a1f00; }
    .warranty-form { background: #0F172A; border-radius: 12px; padding: 20px; margin-top: 12px; }
    .warranty-form-title { font-size: 16px; font-weight: 700; color: #F1F5F9; margin-bottom: 16px; }
    .warranty-label { font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block; }
    .warranty-select { width: 100%; background: #1E293B; border: 1px solid #334155; color: #E2E8F0; border-radius: 8px; padding: 10px 12px; font-size: 14px; margin-bottom: 12px; outline: none; }
    .warranty-textarea { width: 100%; background: #1E293B; border: 1px solid #334155; color: #E2E8F0; border-radius: 8px; padding: 10px 12px; font-size: 14px; resize: none; height: 80px; outline: none; margin-bottom: 12px; font-family: inherit; }
    .warranty-actions { display: flex; gap: 8px; }
    .warranty-submit { flex: 1; background: #2B58A1; color: #fff; border: none; border-radius: 8px; padding: 11px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .warranty-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .warranty-cancel { background: #1E293B; color: #94A3B8; border: 1px solid #334155; border-radius: 8px; padding: 11px 16px; font-size: 14px; cursor: pointer; }
    .warranty-success { text-align: center; color: #22C55E; font-size: 15px; font-weight: 600; padding: 16px 0; }
  `;

  const urlLang = new URLSearchParams(window.location.search).get("lang")?.toLowerCase();
  const rawLang = urlLang && PT[urlLang] ? urlLang : (order?.clients?.language?.toLowerCase() || "ru");
  const lang = activeLang || (PT[rawLang] ? rawLang : "ru");
  const t = PT[lang];

  async function submitWarranty() {
    if (!formReason) return;
    setFormSending(true);
    const reason = formComment ? `${formReason}: ${formComment}` : formReason;
    await supabase.from("warranties").insert({
      order_id: order.id,
      reason,
      status: "new",
      resolution: "pending",
      activated_at: new Date().toISOString(),
    });
    setFormSending(false);
    setFormSent(true);
  }

  if (loading) return (
    <>
      <style>{passportStyles}</style>
      <div className="passport-wrap"><div className="loading">☕ {PT.ru.loading}</div></div>
    </>
  );

  if (error) return (
    <>
      <style>{passportStyles}</style>
      <div className="passport-wrap"><div className="error">❌ {PT.ru.not_found}</div></div>
    </>
  );

  const statusInfo = STATUS_LABELS[order.status] || { ru: order.status, pl: order.status, ua: order.status, color: "#64748B" };
  const orderNum = `#CVC-${order.qr_token?.slice(0,8).toUpperCase() || order.id?.slice(0,8).toUpperCase()}`;
  const productName = order.products?.name || "—";
  const origin = order.products?.origin || "";
  const flavorKey = lang === "pl" ? "flavor_notes_pl" : lang === "ua" ? "flavor_notes_ua" : "flavor_notes";
  const flavor = order.products?.[flavorKey] || order.products?.flavor_notes || "";

  return (
    <>
      <style>{passportStyles}</style>
      <div className="passport-wrap">
        <div className="passport-card">
          <div className="passport-header">
            <div className="passport-coffee-icon">☕</div>
            <div className="passport-logo">Coffee Verve</div>
            <div className="passport-title">{t.title}</div>
          </div>
          <div className="lang-switch">
            {["ru","pl","ua"].map(l => (
              <button key={l} className={"lang-btn" + (lang === l ? " active" : "")}
                onClick={() => setActiveLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="passport-body">
            <div className="passport-product">{productName}</div>
            {origin && <div className="passport-origin">🌍 {origin}</div>}
            {flavor && (
              <div className="passport-flavor">
                <div className="passport-flavor-label">{t.flavor}</div>
                <div className="passport-flavor-text">✨ {flavor}</div>
              </div>
            )}
            <div className="passport-row">
              <span className="passport-label">{t.order_num}</span>
              <span className="passport-value">{orderNum}</span>
            </div>
            <div className="passport-row">
              <span className="passport-label">{t.weight}</span>
              <span className="passport-value">{order.weight}{t.unit_g}</span>
            </div>
            {order.roast_date && (
              <div className="passport-row">
                <span className="passport-label">{t.roast_date}</span>
                <span className="passport-value">{new Date(order.roast_date).toLocaleDateString(t.locale)}</span>
              </div>
            )}
            <div className="passport-row">
              <span className="passport-label">{t.order_date}</span>
              <span className="passport-value">{new Date(order.created_at).toLocaleDateString(t.locale)}</span>
            </div>
            <div className="passport-row">
              <span className="passport-label">{t.status}</span>
              <span className="passport-status" style={{ background: statusInfo.color }}>{statusInfo[lang]}</span>
            </div>
          </div>
          <div className="problem-section">
            {!showForm && (
              <button className="problem-btn" onClick={() => setShowForm(true)}>
                {t.problem_btn}
              </button>
            )}
            {showForm && (
              <div className="warranty-form">
                <div className="warranty-form-title">{t.form_title}</div>
                {formSent ? (
                  <div className="warranty-success">{t.form_success}</div>
                ) : (
                  <>
                    <label className="warranty-label">{t.form_reason_label}</label>
                    <select className="warranty-select" value={formReason} onChange={e => setFormReason(e.target.value)}>
                      <option value="">—</option>
                      {t.reasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <label className="warranty-label">{t.form_comment}</label>
                    <textarea className="warranty-textarea" value={formComment} onChange={e => setFormComment(e.target.value)} />
                    <div className="warranty-actions">
                      <button className="warranty-cancel" onClick={() => setShowForm(false)}>{t.form_cancel}</button>
                      <button className="warranty-submit" disabled={!formReason || formSending} onClick={submitWarranty}>
                        {formSending ? t.form_sending : t.form_send}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="passport-footer">
            Coffee Verve · Warszawa · Specialty Coffee
          </div>
        </div>
      </div>
    </>
  );
}


// ============================================================
// MAIN APP
// ============================================================
function CRMApp() {
  const [lang, setLang] = useState("ru");
  const [page, setPage] = useState("dashboard");
  const [selectedClient, setSelectedClient] = useState(null);
  const [newWarranties, setNewWarranties] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [openShopOrderId, setOpenShopOrderId] = useState(null);
  const t = T[lang];

  function openShopOrder(orderId) {
    setOpenShopOrderId(orderId);
    setPage("shop_orders");
  }

  // Счётчик отзывов на модерации + Realtime
  useEffect(() => {
    async function fetchPendingReviews() {
      const { count } = await supabase
        .from("shop_reviews")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingReviews(count || 0);
    }
    fetchPendingReviews();
    const channel = supabase
      .channel("shop_reviews-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_reviews" }, () => {
        fetchPendingReviews();
      })
      .subscribe();
    const interval = setInterval(fetchPendingReviews, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // Загружаем счётчик и подписываемся на Realtime
  useEffect(() => {
    async function fetchWarrantyCount() {
      const { count } = await supabase
        .from("warranties")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");
      setNewWarranties(count || 0);
    }
    fetchWarrantyCount();

    // Realtime подписка — обновление мгновенное при любом изменении warranties
    const channel = supabase
      .channel("warranties-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "warranties" }, () => {
        fetchWarrantyCount();
      })
      .subscribe();

    // Fallback polling каждые 30 сек (на случай если Realtime недоступен)
    const interval = setInterval(fetchWarrantyCount, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // При открытии раздела Гарантии — перезапрашиваем реальный счётчик из базы
  useEffect(() => {
    if (page === "warranties") {
      supabase
        .from("warranties")
        .select("*", { count: "exact", head: true })
        .eq("status", "new")
        .then(({ count }) => setNewWarranties(count || 0));
    }
  }, [page]);

  return (
    <>
      <style>{styles}</style>
      <div className="crm-root">
        <Sidebar t={t} lang={lang} setLang={setLang} page={page} setPage={setPage} newWarranties={newWarranties} pendingReviews={pendingReviews} />
        <div className="main">
          {page === "dashboard" && <Dashboard t={t} setPage={setPage} />}
          {page === "clients" && <Clients t={t} onSelect={c => { setSelectedClient(c); setPage("client_detail"); }} />}
          {page === "client_detail" && <ClientDetail t={t} client={selectedClient} onBack={() => setPage("clients")} lang={lang} />}
          {page === "orders" && <Orders t={t} lang={lang} />}
          {page === "products" && <Products t={t} lang={lang} />}
          {page === "warranties" && <Warranties t={t} />}
          {page === "staff" && <Staff t={t} />}
          {page === "shop_orders" && <ShopOrders openOrderId={openShopOrderId} onOpenOrderHandled={() => setOpenShopOrderId(null)} />}
          {page === "shop_products" && <ShopProducts />}
          {page === "reviews" && <ShopReviews />}
          {page === "discounts" && <ShopPromoCodes />}
          {page === "loyalty" && <LoyaltyAdmin t={t} />}
          {page === "shop_customers" && <ShopCustomers onOpenOrder={openShopOrder} />}
          {page === "shop_analytics" && <ShopAnalytics />}
        </div>
      </div>
    </>
  );
}

export default function App() {
  const passportMatch = window.location.pathname.match(/^\/passport\/([\w-]+)$/);
  if (passportMatch) {
    return <PassportPage token={passportMatch[1]} />;
  }
  return <CRMApp />;
}

// ============================================================
// SIDEBAR
// ============================================================
function Sidebar({ t, lang, setLang, page, setPage, newWarranties, pendingReviews }) {
  const coreItems = [
    { key: "dashboard", label: t.dashboard },
    { key: "clients", label: t.clients },
    { key: "orders", label: t.orders },
    { key: "products", label: t.products },
    { key: "warranties", label: t.warranties },
    { key: "staff", label: t.staff },
  ];
  const shopItems = [
    { key: "shop_orders", label: "Заказы магазина" },
    { key: "shop_products", label: "Товары магазина" },
    { key: "reviews", label: t.reviews, badge: pendingReviews },
    { key: "discounts", label: "Промокоды" },
    { key: "loyalty", label: t.loyalty },
    { key: "shop_customers", label: "Покупатели" },
    { key: "shop_analytics", label: "Аналитика магазина" },
  ];
  const icons = {
    dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    clients: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
    orders: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
    products: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
    warranties: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    staff: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    discounts: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    loyalty: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    reviews: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    shop_orders: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
    shop_products: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
    shop_customers: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    shop_analytics: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  };
  const renderItem = (item) => (
    <div key={item.key}
      className={`nav-item ${item.soon ? "disabled" : ""} ${page === item.key || (page === "client_detail" && item.key === "clients") ? "active" : ""}`}
      onClick={() => !item.soon && setPage(item.key)}>
      <span className="nav-icon">{icons[item.key]}</span>
      <span>{item.label}</span>
      {item.key === "warranties" && newWarranties > 0 && <span className="nav-badge">{newWarranties}</span>}
      {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
      {item.soon && <span className="nav-soon">Скоро</span>}
    </div>
  );
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1>Coffee Verve CRM</h1>
        <p>система управления</p>
      </div>
      <nav className="sidebar-nav">
        {coreItems.map(renderItem)}
        <div className="nav-section-label">Магазин</div>
        {shopItems.map(renderItem)}
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
  const [avgCycle, setAvgCycle] = useState(0);
  const [popularWeight, setPopularWeight] = useState({});
  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

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
    setTopProducts(Object.entries(prodMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5));

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

    // Средний цикл покупки (дней между заказами одного клиента)
    const clientDates = {};
    ord.forEach(o => {
      if (!o.client_id) return;
      if (!clientDates[o.client_id]) clientDates[o.client_id] = [];
      clientDates[o.client_id].push(new Date(o.created_at));
    });
    const cycles = [];
    Object.values(clientDates).forEach(dates => {
      if (dates.length < 2) return;
      dates.sort((a, b) => a - b);
      for (let i = 1; i < dates.length; i++) {
        cycles.push((dates[i] - dates[i-1]) / 86400000);
      }
    });
    setAvgCycle(cycles.length ? Math.round(cycles.reduce((s, c) => s + c, 0) / cycles.length) : 0);

    // Популярный вес
    const weightMap = { 250: 0, 500: 0, 1000: 0 };
    ord.forEach(o => { if (o.weight && weightMap[o.weight] !== undefined) weightMap[o.weight]++; });
    setPopularWeight(weightMap);

    setStats({ clients: cl.length, orders: ord.length, revenue, avg: ord.length ? revenue / ord.length : 0, new_clients: newClients, repeat: repeatCount, sleeping, warranty: war.length });
    setLoading(false);
  }

  if (loading) return <div className="content"><div className="empty-state">{t.loading}</div></div>;

  const maxRev = Math.max(...topProducts.map(p => p[1].revenue), 1);
  const maxCl = Math.max(...topClients.map(c => c[1].total), 1);
  const maxSrc = Math.max(...bySource.map(s => s[1]), 1);
  const maxWeight = Math.max(...Object.values(popularWeight), 1);

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">{t.dashboard}</span>
        <button className="btn btn-primary" onClick={() => setShowQuickOrder(true)}>+ {t.new_order}</button>
      </div>
      <div className="content">
        {/* Main Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
          <div className="stat-card-big green">
            <div className="big-label">
              <svg style={{ display: "inline", verticalAlign: "-2px", marginRight: 5 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              {t.total_revenue}
            </div>
            <div className="big-value">{fmtMoney(stats.revenue)}</div>
            <div className="big-sub">+{stats.orders} {t.total_orders.toLowerCase()} · ср. чек {fmtMoney(stats.avg)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
            <div><div className="stat-label">{t.total_clients}</div><div className="stat-value">{stats.clients}</div><div className="stat-sub">+{stats.new_clients} {t.new_this_month}</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
            <div><div className="stat-label">{t.avg_check}</div><div className="stat-value">{fmtMoney(stats.avg)}</div><div className="stat-sub">{stats.warranty} {t.warranty_requests}</div></div>
          </div>
        </div>

        {/* Monthly Revenue — bar chart */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">{t.revenue_by_month}</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
            {(() => {
              const maxRev2 = Math.max(...monthlyRevenue.map(m => m.rev), 1);
              return monthlyRevenue.map((m, i) => (
                <div key={i} className="bar-month">
                  <div className={`bar-month-fill${m.rev > 0 ? " active" : ""}`} style={{ height: `${Math.max((m.rev / maxRev2) * 64, m.rev > 0 ? 8 : 4)}px` }} title={m.rev > 0 ? `${m.rev.toFixed(0)} zł · ${m.cnt} зак.` : ""} />
                  <div className="bar-month-label">{t.months[i]}</div>
                </div>
              ));
            })()}
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

        {/* Аналитика — цикл покупки и популярный вес */}
        <div className="grid-2">
          <div className="card">
            <div className="card-title">📊 Средний цикл покупки</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ textAlign: "center", flex: 1, background: "#F0FDF4", borderRadius: 8, padding: "14px 10px" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#16A34A" }}>{avgCycle || "—"}</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>дней между заказами</div>
              </div>
              <div style={{ flex: 2, fontSize: 13, color: "#4B5563", lineHeight: 1.6 }}>
                {avgCycle > 0 ? (
                  <>
                    <div>Клиенты возвращают в среднем через <strong style={{ color: "#16A34A" }}>{avgCycle} дн.</strong></div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF" }}>
                      {avgCycle <= 14 ? "🔥 Высокая лояльность" : avgCycle <= 30 ? "✅ Хорошая частота" : "⚠️ Стоит напомнить о себе"}
                    </div>
                  </>
                ) : <div style={{ color: "#9CA3AF" }}>Нужно минимум 2 заказа от одного клиента</div>}
              </div>
            </div>
            <div className="card-title" style={{ marginTop: 8 }}>🏆 Топ клиентов</div>
            {topClients.length === 0 ? <div className="empty-state" style={{ padding: 16 }}>{t.no_data}</div> : (
              <div className="bar-chart">
                {topClients.map(([name, d]) => (
                  <div key={name} className="bar-row">
                    <div className="bar-label">{name}</div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(d.total / maxCl) * 100}%` }} /></div>
                    <div className="bar-val">{fmtMoney(d.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">⚖️ Популярный вес упаковки</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {[250, 500, 1000].map(w => (
                <div key={w} style={{ flex: 1, textAlign: "center", background: popularWeight[w] === Math.max(...Object.values(popularWeight)) && popularWeight[w] > 0 ? "#F0FDF4" : "#F9FAFB", border: `1px solid ${popularWeight[w] === Math.max(...Object.values(popularWeight)) && popularWeight[w] > 0 ? "#86EFAC" : "#E5E7EB"}`, borderRadius: 8, padding: "12px 8px" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#1F2937" }}>{popularWeight[w] || 0}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>{w}г</div>
                  <div style={{ marginTop: 6 }}>
                    <div style={{ height: 4, background: "#E5E7EB", borderRadius: 2 }}>
                      <div style={{ height: "100%", background: "#22C55E", borderRadius: 2, width: `${maxWeight > 0 ? (popularWeight[w] / maxWeight) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="card-title" style={{ marginTop: 8 }}>🏙️ {t.by_city}</div>
            {byCity.length === 0 ? <div className="empty-state" style={{ padding: 12 }}>{t.no_data}</div> : (
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
      </div>

      {/* Быстрый заказ */}
      {showQuickOrder && <QuickOrderModal t={t} onClose={() => setShowQuickOrder(false)} onDone={() => { setShowQuickOrder(false); fetchAll(); }} />}
    </div>
  );
}

// ============================================================
// QUICK ORDER MODAL
// ============================================================
function QuickOrderModal({ t, onClose, onDone }) {
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [form, setForm] = useState({ client_id: "", product_id: "", weight: 250, notes: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("clients").select("id, name, client_code").order("name"),
      supabase.from("products").select("*").eq("status", "active").order("name"),
    ]).then(([{ data: cl }, { data: pr }]) => {
      setClients(cl || []);
      setProducts(pr || []);
      setLoading(false);
    });
  }, []);

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.client_code?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectedProduct = products.find(p => p.id === form.product_id);
  const price = selectedProduct?.[`price_${form.weight}`] || 0;

  async function save() {
    if (!form.client_id || !form.product_id) return;
    await supabase.from("orders").insert([{
      client_id: form.client_id,
      product_id: form.product_id,
      weight: form.weight,
      price,
      total: price,
      notes: form.notes,
      status: "new"
    }]);
    onDone();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">+ {t.new_order}</div>
        {loading ? <div className="empty-state">{t.loading}</div> : (
          <>
            <div className="form-group">
              <label className="form-label">{t.client} *</label>
              <input className="input" style={{ marginBottom: 6 }} placeholder="Поиск клиента..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
              <select className="input" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                <option value="">— выберите клиента —</option>
                {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.client_code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t.product} *</label>
              <select className="input" value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}>
                <option value="">— выберите товар —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.country})</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t.weight}</label>
                <select className="input" value={form.weight} onChange={e => setForm({ ...form, weight: Number(e.target.value) })}>
                  <option value={250}>250г</option>
                  <option value={500}>500г</option>
                  <option value={1000}>1000г</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t.price}</label>
                <div className="input" style={{ background: "#F0FDF4", color: "#16A34A", fontWeight: 600, display: "flex", alignItems: "center" }}>
                  {price ? fmtMoney(price) : "—"}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t.notes}</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>{t.cancel}</button>
          <button className="btn btn-primary" onClick={save} disabled={!form.client_id || !form.product_id}>{t.save}</button>
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
        <input className="search-bar" placeholder="Поиск по имени, Telegram, телефону..." value={search} onChange={e => setSearch(e.target.value)} />
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
const LEVEL_COLORS = {
  classic:  "level-classic",
  gold:     "level-gold",
  platinum: "level-platinum",
};

function LevelBadge({ level, t }) {
  if (!level) return <span className="level-badge level-classic">{t.level_classic}</span>;
  const cls = LEVEL_COLORS[level] || "level-classic";
  const lbl = t["level_" + level] || level;
  return <span className={`level-badge ${cls}`}>{lbl}</span>;
}

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
  const [shopUser, setShopUser] = useState(null);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcMsg, setRecalcMsg] = useState("");

  useEffect(() => {
    if (!client) return;
    setCurrentClient(client);
    setEditForm({ ...client });
    setShopUser(null);
    setRecalcMsg("");
    fetchOrders();
    supabase.from("products").select("*").eq("status", "active").then(({ data }) => setProducts(data || []));
    if (client.email) {
      supabase.from("shop_users")
        .select("id,email,loyalty_level,spent_12m,discount_pct,referral_code,referred_by,referral_rewarded_at,is_b2b,b2b_discount,is_guest,min_discount_until,last_purchase_at")
        .eq("email", client.email)
        .maybeSingle()
        .then(({ data }) => setShopUser(data || null));
    }
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

  async function recalcLoyalty() {
    if (!shopUser) return;
    setRecalcLoading(true);
    setRecalcMsg("");
    await supabase.rpc("recalc_loyalty", { p_user_id: shopUser.id });
    const { data } = await supabase.from("shop_users")
      .select("id,loyalty_level,spent_12m,discount_pct,referral_rewarded_at")
      .eq("id", shopUser.id).maybeSingle();
    if (data) setShopUser(prev => ({ ...prev, ...data }));
    setRecalcLoading(false);
    setRecalcMsg(t.recalc_ok);
    setTimeout(() => setRecalcMsg(""), 3000);
  }

  async function toggleB2B(checked) {
    if (!shopUser) return;
    const discount = checked ? (shopUser.b2b_discount || 10) : 0;
    await supabase.from("shop_users")
      .update({ is_b2b: checked, b2b_discount: discount, discount_pct: checked ? discount : null })
      .eq("id", shopUser.id);
    setShopUser(prev => ({ ...prev, is_b2b: checked, b2b_discount: discount }));
  }

  async function saveB2BDiscount(val) {
    if (!shopUser?.is_b2b) return;
    const n = parseInt(val) || 0;
    await supabase.from("shop_users").update({ b2b_discount: n, discount_pct: n }).eq("id", shopUser.id);
    setShopUser(prev => ({ ...prev, b2b_discount: n }));
  }

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
            {/* Аватар + имя */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #F3F4F6" }}>
              <div className="client-avatar" style={{ background: "#DBEAFE", color: "#1D4ED8" }}>
                {(currentClient.name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#1F2937" }}>{currentClient.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <span className={`lang-pill lang-${(currentClient.language || "other").toLowerCase()}`}>{(currentClient.language || "—").toUpperCase()}</span>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>{currentClient.client_code}</span>
                </div>
              </div>
            </div>
            <div className="client-detail">
              {[
                ["Telegram", currentClient.username ? `@${currentClient.username}` : currentClient.telegram_id || "—"],
                [t.phone, currentClient.phone || "—"],
                [t.email, currentClient.email || "—"],
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
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", gap: 10 }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                <span style={{ fontSize: 13, color: "#9CA3AF" }}>Заказов пока нет</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowOrderModal(true)}>+ {t.new_order}</button>
              </div>
            ) : (
              <table className="table">
                <thead><tr><th>#</th><th>{t.product}</th><th>{t.weight}</th><th>{t.date}</th><th>{t.total}</th><th>{t.status}</th><th>QR</th></tr></thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id} style={{ cursor: "pointer" }} onClick={() => setSelectedOrder(o)}>
                      <td style={{ color: "#6B7280", fontSize: 12 }}>{orders.length - i}</td>
                      <td style={{ fontWeight: 500, color: "#1F2937" }}>{o.products?.name || "—"}</td>
                      <td style={{ color: "#4B5563" }}>{o.weight}г</td>
                      <td style={{ color: "#6B7280", fontSize: 12 }}>{fmtDate(o.created_at)}</td>
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

        {/* Shop Loyalty Panel */}
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>{t.shop_loyalty}</div>
            {shopUser && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={recalcLoyalty}
                disabled={recalcLoading}
              >
                {recalcLoading ? "…" : "↻ " + t.recalc}
              </button>
            )}
          </div>
          {recalcMsg && <div style={{ color: "#16A34A", fontSize: 12, marginBottom: 8, fontWeight: 500 }}>✓ {recalcMsg}</div>}
          {!shopUser ? (
            <div style={{ color: "#9CA3AF", fontSize: 13, padding: "12px 0" }}>{t.no_shop_user}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{t.status}</div>
                <LevelBadge level={shopUser.loyalty_level || "classic"} t={t} />
              </div>
              <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{t.spent_12m}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1F2937" }}>{fmtMoney(shopUser.spent_12m || 0)}</div>
              </div>
              <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{t.promo_value}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#16A34A" }}>
                  {shopUser.is_b2b ? (shopUser.b2b_discount || 0) : (shopUser.discount_pct || 0)}%
                </div>
              </div>
              <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{t.b2b_client}</div>
                <label className="toggle-switch" style={{ marginTop: 2 }}>
                  <input type="checkbox" checked={!!shopUser.is_b2b} onChange={e => toggleB2B(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              {shopUser.is_b2b && (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, color: "#1D4ED8", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{t.b2b_discount}</div>
                  <input
                    type="number" min={0} max={50} defaultValue={shopUser.b2b_discount || 10}
                    className="input" style={{ width: 70, padding: "4px 8px", fontSize: 14, fontWeight: 700 }}
                    onBlur={e => saveB2BDiscount(e.target.value)}
                  />
                </div>
              )}
              {/* Last purchase + inactive warning */}
              <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{t.last_purchase_lbl}</div>
                {shopUser.last_purchase_at ? (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtDate(shopUser.last_purchase_at)}</div>
                    {new Date(shopUser.last_purchase_at) < new Date(Date.now() - 90*86400000) && (
                      <div style={{ marginTop: 4, fontSize: 10, color: "#DC2626", fontWeight: 600 }}>⚠ {t.inactive_90}</div>
                    )}
                  </>
                ) : <div style={{ color: "#9CA3AF", fontSize: 12 }}>—</div>}
              </div>

              {/* Guaranteed discount */}
              {shopUser.min_discount_until && new Date(shopUser.min_discount_until) > new Date() && (
                <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, color: "#16A34A", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{t.guaranteed_until}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#15803D" }}>{fmtDate(shopUser.min_discount_until)}</div>
                </div>
              )}

              {shopUser.referral_code && (
                <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, gridColumn: "span 2" }}>
                  <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{t.referral_code_lbl}</div>
                  <span className="promo-tag">{shopUser.referral_code}</span>
                  {shopUser.referral_rewarded_at && (
                    <div style={{ marginTop: 4, fontSize: 11, color: "#16A34A" }}>✓ {t.referral_rewarded} {fmtDate(shopUser.referral_rewarded_at)}</div>
                  )}
                </div>
              )}
            </div>
          )}
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
      {selectedOrder && <OrderQRModal t={t} lang={lang} order={selectedOrder} onClose={() => setSelectedOrder(null)} onRefresh={fetchOrders} />}

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
function OrderQRModal({ t, lang, order, onClose, onRefresh }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [status, setStatus] = useState(order.status);

  useEffect(() => {
    if (order.qr_token) {
      const clientLang = order.clients?.language?.toLowerCase() || "ru";
      generateQR(order.qr_token, clientLang).then(setQrUrl);
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
              [t.flavor_notes, order.products?.[lang === "pl" ? "flavor_notes_pl" : lang === "ua" ? "flavor_notes_ua" : "flavor_notes"] || order.products?.flavor_notes],
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
const N8N_WEBHOOK_URL = "https://n8n.coffeeverve.pl/webhook/bartender-print";

function Orders({ t, lang }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [printingId, setPrintingId] = useState(null);
  const [printToast, setPrintToast] = useState(null);

  async function printLabel(e, order) {
    e.stopPropagation();
    setPrintingId(order.id);
    const passportUrl = `${window.location.origin}/passport/${order.qr_token}?lang=${order.clients?.language?.toLowerCase() || "ru"}`;
    const payload = {
      order_id: order.id,
      client_code: order.clients?.client_code || "",
      product: order.products?.name || "",
      weight: order.weight,
      roast_date: order.roast_date || "",
      order_date: order.created_at,
      passport_url: passportUrl,
      qr_token: order.qr_token,
    };
    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setPrintToast(res.ok ? t.print_ok : t.print_err);
    } catch {
      setPrintToast(t.print_err);
    }
    setPrintingId(null);
    setTimeout(() => setPrintToast(null), 3000);
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*, clients(name, client_code, language), products(name, flavor_notes, flavor_notes_pl, flavor_notes_ua)").order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function changeStatus(id, status) {
    await supabase.from("orders").update({ status }).eq("id", id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  }

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
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewOrder(true)}>+ {t.new_order}</button>
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
                  <tr key={o.id}>
                    <td style={{ color: "#4B5563", fontSize: 12 }}>{filtered.length - i}</td>
                    <td style={{ cursor: "pointer" }} onClick={() => setSelectedOrder(o)}>
                      <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                        {o.clients?.name || "—"}
                        {o.shop_order_id && <span title="Заказ с сайта">🛒</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#4B5563" }}>{o.clients?.client_code}</div>
                    </td>
                    <td style={{ color: "#6B7280" }}>{o.products?.name || "—"}</td>
                    <td style={{ color: "#6B7280" }}>{o.weight}г</td>
                    <td style={{ color: "#16A34A", fontWeight: 600 }}>{fmtMoney(o.total)}</td>
                    <td>
                      <select
                        className="status-select-pill"
                        style={{ background: STATUS_PILL[o.status]?.bg, color: STATUS_PILL[o.status]?.color, borderColor: STATUS_PILL[o.status]?.border }}
                        value={o.status}
                        onChange={e => { e.stopPropagation(); changeStatus(o.id, e.target.value); }}
                      >
                        {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{t[STATUS_KEYS[s]]}</option>)}
                      </select>
                    </td>
                    <td style={{ color: "#4B5563", fontSize: 12 }}>{fmtDate(o.created_at)}</td>
                    <td style={{ whiteSpace: "nowrap", display: "flex", gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOrder(o)}>QR</button>
                      <button className="btn-print" disabled={printingId === o.id} onClick={e => printLabel(e, o)}>
                        {printingId === o.id ? "..." : "🖨"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedOrder && <OrderQRModal t={t} lang={lang} order={selectedOrder} onClose={() => setSelectedOrder(null)} onRefresh={fetchOrders} />}
      {showNewOrder && <QuickOrderModal t={t} onClose={() => setShowNewOrder(false)} onDone={() => { setShowNewOrder(false); fetchOrders(); }} />}
      {printToast && <div className="print-toast">{printToast}</div>}
    </div>
  );
}

// ============================================================
// PRODUCTS
// ============================================================
function Products({ t, lang }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
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

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.country?.toLowerCase().includes(search.toLowerCase()) ||
    p.flavor_notes?.toLowerCase().includes(search.toLowerCase()) ||
    p.code?.toLowerCase().includes(search.toLowerCase())
  );

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
        <input className="search-bar" placeholder="Поиск по названию, стране, вкусу..." value={search} onChange={e => setSearch(e.target.value)} />
        {loading ? <div className="empty-state">{t.loading}</div> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead><tr><th>{t.name}</th><th>{t.country}</th><th>{t.flavor_notes}</th><th>{t.price_250}</th><th>{t.price_500}</th><th>{t.price_1000}</th><th>{t.available}</th><th></th></tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 11, color: "#4B5563" }}>{p.code}</div></td>
                    <td style={{ color: "#6B7280", fontSize: 12 }}>{p.country}</td>
                    <td style={{ color: "#6B7280", fontSize: 12, maxWidth: 200 }}>{p[lang === "pl" ? "flavor_notes_pl" : lang === "ua" ? "flavor_notes_ua" : "flavor_notes"] || p.flavor_notes}</td>
                    <td style={{ color: "#16A34A" }}>{p.price_250 ? `${p.price_250} zł` : "—"}</td>
                    <td style={{ color: "#16A34A" }}>{p.price_500 ? `${p.price_500} zł` : "—"}</td>
                    <td style={{ color: "#16A34A" }}>{p.price_1000 ? `${p.price_1000} zł` : "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: p.status === "active" ? "#22C55E" : p.status === "on_order" ? "#F59E0B" : "#F44336" }} title={p.status === "active" ? "В наличии" : p.status === "on_order" ? "Под заказ" : "Нет"} />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="action-icon-btn" title={t.edit} onClick={() => setEditing({ ...p })}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="action-icon-btn danger" title={t.delete} onClick={() => deleteProduct(p.id)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
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

// ============================================================
// LOYALTY ADMIN — настройки + клиенты по уровням
// ============================================================
function LoyaltyAdmin({ t }) {
  const [config, setConfig]       = useState({});
  const [clients, setClients]     = useState([]);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [savingCfg, setSavingCfg] = useState(false);
  const [cfgMsg, setCfgMsg]       = useState("");

  useEffect(() => {
    loadConfig();
    loadClients();
  }, []);

  async function loadConfig() {
    const { data } = await supabase.from("loyalty_config").select("key,value");
    if (data) {
      const obj = {};
      data.forEach(r => { obj[r.key] = r.value; });
      setConfig(obj);
    }
  }

  async function loadClients() {
    setLoading(true);
    const { data } = await supabase
      .from("shop_users")
      .select("id,email,name,loyalty_level,spent_12m,discount_pct,is_b2b,b2b_discount,referral_rewarded_at,is_guest,min_discount_until,last_purchase_at")
      .order("spent_12m", { ascending: false, nullsFirst: false });
    setClients(data || []);
    setLoading(false);
  }

  async function saveConfig() {
    setSavingCfg(true);
    setCfgMsg("");
    const updates = Object.entries(config).map(([key, value]) =>
      supabase.from("loyalty_config").update({ value: String(value) }).eq("key", key)
    );
    await Promise.all(updates);
    setSavingCfg(false);
    setCfgMsg("✓ Сохранено");
    setTimeout(() => setCfgMsg(""), 3000);
  }

  const CONFIG_LABELS = {
    gold_threshold:    t.gold_threshold,
    platinum_threshold: t.platinum_threshold,
    classic_discount:  t.classic_discount,
    gold_discount:     t.gold_discount,
    platinum_discount: t.platinum_discount,
  };

  const ninety = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const filtered = clients.filter(c => {
    const matchLevel = filter === "all"      ? true
      : filter === "b2b"                     ? c.is_b2b
      : filter === "inactive"                ? (!c.last_purchase_at || new Date(c.last_purchase_at) < ninety)
      : (c.loyalty_level || "classic") === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || (c.email || "").toLowerCase().includes(q)
      || (c.name || "").toLowerCase().includes(q);
    return matchLevel && matchSearch;
  });

  const counts = {
    all:      clients.length,
    classic:  clients.filter(c => !c.is_b2b && (c.loyalty_level || "classic") === "classic").length,
    gold:     clients.filter(c => !c.is_b2b && c.loyalty_level === "gold").length,
    platinum: clients.filter(c => !c.is_b2b && c.loyalty_level === "platinum").length,
    b2b:      clients.filter(c => c.is_b2b).length,
    inactive: clients.filter(c => !c.last_purchase_at || new Date(c.last_purchase_at) < ninety).length,
  };

  const FILTERS = [
    { key: "all",      label: t.review_all },
    { key: "classic",  label: t.level_classic },
    { key: "gold",     label: t.level_gold },
    { key: "platinum", label: t.level_platinum },
    { key: "b2b",      label: t.level_b2b },
    { key: "inactive", label: t.inactive_90, warn: true },
  ];

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">{t.loyalty}</span>
      </div>
      <div className="content">
        {/* Config Editor */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>{t.loyalty_config}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {cfgMsg && <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 500 }}>{cfgMsg}</span>}
              <button className="btn btn-primary btn-sm" onClick={saveConfig} disabled={savingCfg}>
                {savingCfg ? "…" : t.save}
              </button>
            </div>
          </div>
          <div className="config-grid">
            {Object.keys(CONFIG_LABELS).map(key => (
              <div key={key} className="config-item">
                <label>{CONFIG_LABELS[key]}</label>
                <input
                  type="number" min={0} value={config[key] || ""}
                  onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          {/* Visual thresholds hint */}
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#F9FAFB", borderRadius: 8, fontSize: 12, color: "#4B5563", display: "flex", gap: 20 }}>
            <span><span className="level-badge level-classic">{t.level_classic}</span> 0 – {Number(config.gold_threshold || 600) - 1} zł → {config.classic_discount || 5}%</span>
            <span><span className="level-badge level-gold">{t.level_gold}</span> {config.gold_threshold || 600} – {Number(config.platinum_threshold || 1800) - 1} zł → {config.gold_discount || 10}%</span>
            <span><span className="level-badge level-platinum">{t.level_platinum}</span> {config.platinum_threshold || 1800}+ zł → {config.platinum_discount || 15}%</span>
          </div>
        </div>

        {/* Client Level List */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E7EB" }}>
            <div className="card-title" style={{ marginBottom: 10 }}>{t.loyalty_clients}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {FILTERS.map(f => (
                <button key={f.key}
                  className={"btn btn-sm " + (filter === f.key ? "btn-primary" : "btn-secondary")}
                  style={f.warn && filter !== f.key && counts[f.key] > 0
                    ? { borderColor: "#FCA5A5", color: "#DC2626" } : {}}
                  onClick={() => setFilter(f.key)}>
                  {f.label} <span style={{ opacity: 0.7, fontSize: 11 }}>({counts[f.key]})</span>
                </button>
              ))}
              <input
                className="search-bar"
                style={{ margin: 0, flex: 1, minWidth: 180, maxWidth: 280 }}
                placeholder={t.search}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          {loading ? (
            <div className="empty-state">{t.loading}</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">{t.no_data}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t.name} / {t.email}</th>
                  <th>{t.status}</th>
                  <th>{t.spent_12m}</th>
                  <th>{t.promo_value}</th>
                  <th>{t.last_purchase_lbl}</th>
                  <th>{t.min_discount_lbl}</th>
                  <th>{t.referral_rewarded}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const isInactive = !c.last_purchase_at || new Date(c.last_purchase_at) < ninety;
                  const minActive  = c.min_discount_until && new Date(c.min_discount_until) > new Date();
                  return (
                  <tr key={c.id} style={isInactive ? { background: "#FFF7F7" } : {}}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name || "—"}</div>
                      <div style={{ fontSize: 11, color: "#6B7280" }}>{c.email}</div>
                      {c.is_guest && <span style={{ fontSize: 10, color: "#9CA3AF" }}>guest</span>}
                    </td>
                    <td>
                      {c.is_b2b
                        ? <span className="level-badge level-b2b">{t.level_b2b}</span>
                        : <LevelBadge level={c.loyalty_level || "classic"} t={t} />}
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmtMoney(c.spent_12m || 0)}</td>
                    <td style={{ color: "#16A34A", fontWeight: 600 }}>
                      {c.is_b2b ? (c.b2b_discount || 0) : (c.discount_pct || 0)}%
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {c.last_purchase_at ? (
                        <span style={{ color: isInactive ? "#DC2626" : "#6B7280" }}>
                          {fmtDate(c.last_purchase_at)}
                          {isInactive && <span style={{ marginLeft: 4, fontSize: 10, background: "#FEE2E2", color: "#DC2626", padding: "1px 5px", borderRadius: 4 }}>90+</span>}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {minActive ? (
                        <span style={{ color: "#16A34A", fontWeight: 500 }}>✓ {fmtDate(c.min_discount_until)}</span>
                      ) : "—"}
                    </td>
                    <td style={{ fontSize: 12, color: "#6B7280" }}>
                      {c.referral_rewarded_at ? (
                        <span style={{ color: "#16A34A" }}>✓ {fmtDate(c.referral_rewarded_at)}</span>
                      ) : "—"}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
