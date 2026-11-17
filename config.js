// Налаштування v2.
// Рейтинг працює через Supabase з НОВИМИ таблицями v2_* (старі рейтинги не чіпаємо).
// Щоб увімкнути: виконайте supabase-v2.sql у SQL Editor проєкту, потім поставте enabled: true.
window.CONFIG = {
  deadline: "2027-03-01T00:00:00+02:00",
  start: "2026-11-17T00:00:00+02:00",
  cloud: {
    enabled: true,
    url: "https://xwdxfbgazlplyiglzecm.supabase.co",
    key: "sb_publishable_yNV81pVLwznAKRN2fH3PBQ_ptbNVmFh",
  },
};
