(() => {
  "use strict";
  const CFG = window.CONFIG, ARTS = window.ARTICLES, TOTAL = ARTS.length;
  const byN = Object.fromEntries(ARTS.map((a) => [a.n, a]));
  const KEY = "vienna-v2-state", THEME_KEY = "vienna-v2-theme", UI_KEY = "vienna-v2-ui";
  const DAY = 864e5, INTERVALS = [1, 3, 7, 14, 30];
  const DEADLINE = new Date(CFG.deadline).getTime(), START = new Date(CFG.start).getTime();
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const RANKS = [
    [0, "Новачок"], [30, "Студент"], [90, "Практик"], [160, "Знавець"],
    [240, "Експерт"], [330, "Майстер"], [420, "Легенда"],
  ];

  // теми: [id, назва, темна?, колір фону, колір акценту]
  const THEMES = [
    ["xmas", "Різдвяна ніч", true, "#0b1c16", "#f4c24f"],
    ["dawn", "Пряник", false, "#fff1d6", "#d2343c"],
    ["dark", "Затишна ніч", true, "#130f26", "#f6c453"],
    ["light", "Іній", false, "#eef2fa", "#c8323f"],
    ["wine", "Глінтвейн", true, "#1a0c14", "#ffc27a"],
    ["pine", "Ялинка", true, "#0c1a12", "#f2c75c"],
    ["cocoa", "Какао", true, "#1c120d", "#f2b97a"],
    ["aurora", "Полярне сяйво", true, "#06161a", "#7cf5d0"],
  ];
  const DARK_THEMES = new Set(THEMES.filter((t) => t[2]).map((t) => t[0]));
  const ACCENTS = [[null, "Із теми"], ["#1fb5b0", "Бірюза"], ["#2fa56f", "Смарагд"], ["#8a79e6", "Лаванда"], ["#e0678a", "Троянда"], ["#d9962b", "Бурштин"], ["#e8704f", "Корал"], ["#64748b", "Графіт"]];
  const AVATARS = []; // готові аватарки додаються з папки avatars/ (див. avatars/index.js)
  // власні готові аватарки з папки avatars/ (список у avatars/index.js)
  (window.CUSTOM_AVATARS || []).forEach((a) => {
    if (a && /^[a-z0-9-]{1,30}$/.test(a.id) && /^[\w.-]+\.(png|jpe?g|webp|gif|svg)$/i.test(a.file || "") && !AVATARS.some((x) => x[0] === a.id))
      AVATARS.push([a.id, String(a.name || a.id).slice(0, 30), ["#e3f4ff", "#7cc4f0"], null, a.file]);
  });
  const CARD_STYLES = [
    ["frost", "Іній"], ["snowfall", "Снігопад"], ["santa", "Дід Мороз"], ["tree", "Ялинка"], ["garland", "Гірлянда"], ["candy", "Льодяник"],
    ["ginger", "Пряник"], ["gift", "Подарунок"], ["aurora", "Північне сяйво"], ["night", "Зоряна ніч"], ["cocoa", "Какао"], ["mandarin", "Мандарин"],
    ["fireplace", "Камін"], ["fireworks", "Феєрверк"], ["sweater", "Светр"], ["gold", "Золото"],
  ];
  const SCALES = [[0.9, "A−"], [1, "A"], [1.15, "A+"], [1.3, "A++"]];
  const PHOTO_RE = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

  /* ---------- state ---------- */
  const blank = () => ({
    learned: [], hard: [], review: [], notes: {}, learnedAt: {}, nextReview: {}, reviewLevel: {},
    studyDates: [], reviewsDone: 0, ach: [], name: "", germanFirst: false, snow: null, updatedAt: 0,
    motto: "", avatar: { kind: "letter" }, accent: null, textScale: 1, theme: null, created: 0, cardStyle: "frost", garland: true, flags: [], calm: false,
  });
  function mergeStates(local, remote) {
    const remoteNewer = (remote.updatedAt || 0) > (local.updatedAt || 0);
    const newer = remoteNewer ? remote : local, older = remoteNewer ? local : remote;
    const s = normalize(JSON.parse(JSON.stringify(newer)));
    s.notes = Object.assign({}, older.notes, newer.notes);
    s.studyDates = [...new Set([...local.studyDates, ...remote.studyDates])];
    s.ach = [...new Set([...local.ach, ...remote.ach])];
    s.flags = [...new Set([...local.flags, ...remote.flags])];
    s.reviewsDone = Math.max(local.reviewsDone, remote.reviewsDone);
    s.name = local.name || remote.name; s.snow = local.snow; s.germanFirst = local.germanFirst;
    s.motto = local.motto || remote.motto;
    s.avatar = local.avatar.kind !== "letter" ? local.avatar : remote.avatar;
    s.accent = local.accent; s.textScale = local.textScale; s.theme = local.theme; s.cardStyle = local.cardStyle; s.garland = local.garland; s.calm = local.calm;
    s.created = Math.min(local.created || Infinity, remote.created || Infinity);
    s.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
    return s;
  }
  function normalize(raw) {
    const s = Object.assign(blank(), raw && typeof raw === "object" ? raw : {});
    ["learned", "hard", "review", "studyDates", "ach", "flags"].forEach((k) => { if (!Array.isArray(s[k])) s[k] = []; });
    ["notes", "learnedAt", "nextReview", "reviewLevel"].forEach((k) => { if (!s[k] || typeof s[k] !== "object") s[k] = {}; });
    s.name = String(s.name || "").slice(0, 40);
    s.motto = String(s.motto || "").slice(0, 80);
    const av = s.avatar && typeof s.avatar === "object" ? s.avatar : {};
    s.avatar = av.kind === "photo" && typeof av.photo === "string" && av.photo.length < 200000 && PHOTO_RE.test(av.photo) ? { kind: "photo", photo: av.photo }
      : av.kind === "preset" && AVATARS.some((a) => a[0] === av.id) ? { kind: "preset", id: av.id } : { kind: "letter" };
    if (!ACCENTS.some((a) => a[0] === s.accent)) s.accent = null;
    if (!SCALES.some((a) => a[0] === s.textScale)) s.textScale = 1;
    if (!THEMES.some((t) => t[0] === s.theme)) s.theme = null;
    if (!s.created) s.created = Date.now();
    if (!CARD_STYLES.some((c) => c[0] === s.cardStyle)) s.cardStyle = "frost";
    s.garland = s.garland !== false;
    s.calm = s.calm === true;
    return s;
  }
  let state;
  try { state = normalize(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { state = blank(); }
  let ui = {};
  try { ui = JSON.parse(localStorage.getItem(UI_KEY) || "{}") || {}; } catch {}

  const has = (k, n) => state[k].includes(n);
  const setFlag = (k, n, on) => { const i = state[k].indexOf(n); if (on && i < 0) state[k].push(n); if (!on && i >= 0) state[k].splice(i, 1); };
  const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const plural = (n, one, few, many) => { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many; };

  function streak() {
    const set = new Set(state.studyDates);
    let t = Date.now(), n = 0;
    if (!set.has(dayKey(t))) t -= DAY;
    while (set.has(dayKey(t))) { n++; t -= DAY; }
    return n;
  }
  const xp = () => state.learned.length * 15 + state.reviewsDone * 4 + Object.values(state.notes).filter(Boolean).length * 3;
  function rankOf(x) { let i = 0; RANKS.forEach((r, k) => { if (x >= r[0]) i = k; }); return i; }
  const isDue = (n) => has("review", n) || (has("learned", n) && (state.nextReview[n] || 0) <= Date.now());
  const dueList = () => ARTS.filter((a) => isDue(a.n)).map((a) => a.n);

  const perDay = () => { const m = {}; Object.values(state.learnedAt).forEach((t) => { const k = dayKey(t); m[k] = (m[k] || 0) + 1; }); return Math.max(0, ...Object.values(m)); };
  const noteCount = () => Object.values(state.notes).filter(Boolean).length;
  const ACH = [
    ["first", "Перша іграшка", "Вивчити 1 статтю", "✦", () => state.learned.length, 1, "Вивчення"],
    ["a5", "Гірлянда запалена", "Вивчити 5 статей", "☀", () => state.learned.length, 5, "Вивчення"],
    ["a10", "Десятка", "Вивчити 10 статей", "Ⅹ", () => state.learned.length, 10, "Вивчення"],
    ["a14", "Півдороги", "Вивчити 14 розділів", "◐", () => state.learned.length, 14, "Вивчення"],
    ["a20", "Майже знавець", "Вивчити 20 статей", "◆", () => state.learned.length, 20, "Вивчення"],
    ["a25", "Один крок до мети", "Вивчити 25 розділів", "▲", () => state.learned.length, 25, "Вивчення"],
    ["all", "Хранитель конвенції", "Вивчити всі 27 розділів", "♛", () => state.learned.length, TOTAL, "Вивчення"],
    ["art0", "Преамбула в кишені", "Вивчити преамбулу", "§", () => (has("learned", 0) ? 1 : 0), 1, "Знавець статей"],
    ["art4", "Агреман отримано", "Вивчити статтю 4 (Агреман)", "4", () => (has("learned", 4) ? 1 : 0), 1, "Знавець статей"],
    ["art9", "Persona non grata", "Вивчити статтю 9", "9", () => (has("learned", 9) ? 1 : 0), 1, "Знавець статей"],
    ["art14", "Три класи", "Вивчити статтю 14 (класи глав)", "14", () => (has("learned", 14) ? 1 : 0), 1, "Знавець статей"],
    ["art20", "Прапор над місією", "Вивчити статтю 20", "20", () => (has("learned", 20) ? 1 : 0), 1, "Знавець статей"],
    ["art41", "Закони поважаємо", "Вивчити статтю 41", "41", () => (has("learned", 41) ? 1 : 0), 1, "Знавець статей"],
    ["art49", "Ратифіковано", "Вивчити статтю 49", "49", () => (has("learned", 49) ? 1 : 0), 1, "Знавець статей"],
    ["day3", "Марафон", "Вивчити 3 статті за один день", "3×", perDay, 3, "Темп"],
    ["day5", "Спринтер", "Вивчити 5 статей за один день", "5×", perDay, 5, "Темп"],
    ["r1", "Друга зустріч", "Перше повторення", "↻", () => state.reviewsDone, 1, "Повторення"],
    ["r10", "Пам'ять міцнішає", "10 повторень", "❄", () => state.reviewsDone, 10, "Повторення"],
    ["r25", "Без прогалин", "25 повторень", "◎", () => state.reviewsDone, 25, "Повторення"],
    ["r50", "Майстер повторень", "50 повторень", "50", () => state.reviewsDone, 50, "Повторення"],
    ["r100", "Залізна пам'ять", "100 повторень", "100", () => state.reviewsDone, 100, "Повторення"],
    ["clean", "Чиста черга", "Пройти всю чергу повторення", "✓", () => (state.flags.includes("clean") ? 1 : 0), 1, "Повторення"],
    ["s3", "Тримаю темп", "3 дні поспіль", "Ⅲ", streak, 3, "Постійність"],
    ["s7", "Тиждень сили", "7 днів поспіль", "7", streak, 7, "Постійність"],
    ["s14", "Залізна звичка", "14 днів поспіль", "⚡", streak, 14, "Постійність"],
    ["s30", "Місяць поспіль", "30 днів поспіль", "30", streak, 30, "Постійність"],
    ["d5", "Постійний студент", "Вчитися 5 різних днів", "5", () => state.studyDates.length, 5, "Постійність"],
    ["d10", "Дисципліна", "Вчитися 10 різних днів", "10", () => state.studyDates.length, 10, "Постійність"],
    ["d20", "Двадцять днів", "Вчитися 20 різних днів", "20", () => state.studyDates.length, 20, "Постійність"],
    ["d30", "Тридцять днів", "Вчитися 30 різних днів", "30", () => state.studyDates.length, 30, "Постійність"],
    ["h1", "Слабке місце", "Позначити складну статтю", "!", () => state.hard.length, 1, "Нотатки і складні"],
    ["h5", "Чесний із собою", "Позначити 5 складних статей", "!!", () => state.hard.length, 5, "Нотатки і складні"],
    ["hardwin", "Складну здолано", "Вивчити статтю, яку позначили складною", "⚑", () => state.hard.filter((n) => has("learned", n)).length, 1, "Нотатки і складні"],
    ["n1", "Власна думка", "Створити нотатку", "✎", noteCount, 1, "Нотатки і складні"],
    ["n5", "Конспектувальник", "Створити 5 нотаток", "▤", noteCount, 5, "Нотатки і складні"],
    ["n10", "Особистий щоденник", "Створити 10 нотаток", "▦", noteCount, 10, "Нотатки і складні"],
    ["avatar", "З обличчям", "Обрати аватарку", "☺", () => (state.avatar.kind !== "letter" ? 1 : 0), 1, "Оформлення"],
    ["motto", "Власне гасло", "Написати девіз у профілі", "❝", () => (state.motto.trim() ? 1 : 0), 1, "Оформлення"],
    ["accent", "Мій колір", "Обрати акцентний колір", "◉", () => (state.accent ? 1 : 0), 1, "Оформлення"],
    ["cardstyle", "Стиліст", "Змінити оформлення картки в рейтингу", "▣", () => (state.cardStyle !== "frost" ? 1 : 0), 1, "Оформлення"],
    ["theme", "Модник", "Змінити тему сайту", "◑", () => (state.flags.includes("theme") ? 1 : 0), 1, "Оформлення"],
    ["rk1", "Студент", "Досягти рівня «Студент»", "♘", xp, 30, "Рівні"],
    ["rk5", "Майстер", "Досягти рівня «Майстер»", "♝", xp, 330, "Рівні"],
    ["rk6", "Легенда", "Досягти найвищого рівня", "♚", xp, 420, "Рівні"],
    ["dec19", "Святий Миколай", "Повчитися 19 грудня", "🎁", () => (state.studyDates.some((d) => d.endsWith("-12-19")) ? 1 : 0), 1, "Святкові"],
    ["dec24", "Святвечір", "Повчитися 24 грудня", "★", () => (state.studyDates.some((d) => d.endsWith("-12-24")) ? 1 : 0), 1, "Святкові"],
    ["dec25", "Різдво", "Повчитися 25 грудня", "🔔", () => (state.studyDates.some((d) => d.endsWith("-12-25")) ? 1 : 0), 1, "Святкові"],
    ["dec31", "Новорічна ніч", "Повчитися 31 грудня або 1 січня", "🎆", () => (state.studyDates.some((d) => d.endsWith("-12-31") || d.endsWith("-01-01")) ? 1 : 0), 1, "Святкові"],
    ["owl", "Нічна сова", "Повчитися вночі (00:00–05:00)", "☾", () => (state.flags.includes("owl") ? 1 : 0), 1, "Святкові"],
    ["lark", "Рання пташка", "Повчитися зранку (05:00–08:00)", "☼", () => (state.flags.includes("lark") ? 1 : 0), 1, "Святкові"],
  ];
  function fillAch(box, doneSet, withProgress) {
    box.textContent = ""; let lastGroup = "";
    ACH.forEach(([id, name, desc, ico, cur, goal, group]) => {
      if (group !== lastGroup) { const h = document.createElement("p"); h.className = "ach-group"; h.textContent = group; box.appendChild(h); lastGroup = group; }
      const done = doneSet.has(id), c = withProgress ? Math.min(cur(), goal) : 0, bar = withProgress && !done && goal > 1, d = document.createElement("div");
      d.className = "ach-item" + (done ? " done" : ""); d.tabIndex = 0; d.setAttribute("role", "button");
      d.innerHTML = '<span class="ach-ico"></span><span><b></b><small></small></span>' + (bar ? '<span class="ach-bar"><i></i></span>' : "");
      $(".ach-ico", d).textContent = ico; $("b", d).textContent = name; $("small", d).textContent = bar ? `${desc} · ${c}/${goal}` : desc;
      if (bar) $(".ach-bar i", d).style.width = (c / goal) * 100 + "%";
      const say = () => toast(`${name} — ${desc}${done ? " ✓" : bar ? ` (${c}/${goal})` : ""}`);
      d.addEventListener("click", say); d.addEventListener("keydown", (e) => { if (e.key === "Enter") say(); if (e.key === " ") e.preventDefault(); }); d.addEventListener("keyup", (e) => { if (e.key === " ") say(); });
      box.appendChild(d);
    });
  }

  // святкове конфеті з зірочок і сніжинок
  function burst(el) {
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const glyphs = ["✦", "❄", "★", "✧", "❅", "•"], colors = ["#ffd75a", "#ff6b6b", "#7be0a6", "#7cc4ff", "#ffffff", "#ffb36b"];
    for (let i = 0; i < 24; i++) {
      const s = document.createElement("span"); s.className = "fx"; s.textContent = glyphs[i % glyphs.length];
      s.style.left = cx + "px"; s.style.top = cy + "px"; s.style.color = colors[i % colors.length]; s.style.fontSize = 12 + Math.random() * 14 + "px";
      document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 120, dx = Math.cos(a) * d, dy = Math.sin(a) * d + 60;
      s.animate([{ transform: "translate(-50%,-50%) scale(.4)", opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 360}deg) scale(1)`, opacity: 0 }],
        { duration: 900 + Math.random() * 600, easing: "cubic-bezier(.2,.8,.3,1)" }).onfinish = () => s.remove();
    }
  }
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3200);
  }
  function checkAch() {
    ACH.forEach(([id, name, , , cur, goal]) => {
      if (!state.ach.includes(id) && cur() >= goal) { state.ach.push(id); toast(`🏅 Нове досягнення: ${name}`); }
    });
  }
  function save(action = true) {
    if (action && !state.studyDates.includes(dayKey())) state.studyDates.push(dayKey());
    if (action) { const h = new Date().getHours(), f = h < 5 ? "owl" : h >= 5 && h < 8 ? "lark" : null; if (f && !state.flags.includes(f)) state.flags.push(f); }
    checkAch(); state.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    renderAll(); queueCloud();
  }
  function saveUi() { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch {} }

  /* ---------- text rendering ---------- */
  // ключові терміни для режиму «Пропуски»
  const TERMS = {
    de: /(?:Entsendestaat|Empfangsstaat|Agrément|persona non grata|Missionschef|Beglaubigungsschreiben|Geschäftsträger|Botschafter|Gesandte|Internuntien|Nuntien|Immunitäten|Vorrechte|Ratifi|Notifi|Räumlichkeiten|Hoheitszeichen|Flagge|Urschrift|Generalsekretär|Rangfolge)\p{L}*/giu,
    uk: /(?:акредитуюч\p{L}+ держав\p{L}+|держав\p{L}+ перебування|агреман\p{L}*|persona non grata|глав\p{L}+ представництв\p{L}*|вірчих грамот\p{L}*|повірен\p{L}+ у справах|посл\p{L}{1,2}в|посланник\p{L}+|нунці\p{L}+|імунітет\p{L}*|привіле\p{L}+|ратифі\p{L}+|прапор\p{L}*|емблем\p{L}*|Генеральн\p{L}+ Секретар\p{L}+|старшинств\p{L}+)/giu,
  };
  function addWithGaps(p, line, re) {
    let last = 0;
    for (const m of line.matchAll(re)) {
      if (m.index > last) p.append(line.slice(last, m.index));
      const g = document.createElement("button");
      g.type = "button"; g.className = "gap"; g.textContent = m[0]; g.setAttribute("aria-label", "Пропущений термін. Натисніть, щоб показати");
      g.addEventListener("click", (e) => { e.stopPropagation(); g.classList.add("shown"); g.removeAttribute("aria-label"); });
      p.append(g); last = m.index + m[0].length;
    }
    if (last < line.length) p.append(line.slice(last));
  }
  function fillText(el, text, gapsLang) {
    el.textContent = "";
    String(text).split("\n").forEach((line) => {
      const p = document.createElement("p");
      if (/^[a-i]\)\s/.test(line)) p.className = "sub";
      if (gapsLang) addWithGaps(p, line, TERMS[gapsLang]); else p.textContent = line;
      el.appendChild(p);
    });
    const len = Math.max(el.textContent.length, 0);
    el.className = "text" + (len > 1100 ? " xl" : len > 650 ? " long" : "");
    el.scrollTop = 0;
  }
  function paintCard(prefix, a, deFirst, cloze) {
    const [f, b] = deFirst ? ["de", "uk"] : ["uk", "de"];
    const lang = { uk: "Українська", de: "Deutsch" };
    const head = (x, l) => (a.n === 0 ? (l === "uk" ? "Преамбула" : "Präambel") : (l === "uk" ? `Стаття ${a.n}` : `Artikel ${a.n}`)) + (x ? "" : "");
    const front = prefix === "" ? "front" : "rvFront", back = prefix === "" ? "back" : "rvBack";
    const title = (l) => (a.n === 0 ? head(a, l) : head(a, l) + " · " + (l === "uk" ? a.tu : a.td));
    $(`#${front}Title`).textContent = title(f);
    $(`#${back}Title`).textContent = title(b);
    fillText($(`#${front}Text`), a[f], cloze ? f : null); fillText($(`#${back}Text`), a[b]);
    if (prefix === "") { $("#frontLang").textContent = lang[f]; $("#backLang").textContent = lang[b]; }
    else { const fl = $("#rvCard .front .face-lang"), bl = $("#rvCard .back .face-lang"); fl.textContent = lang[f]; bl.textContent = lang[b]; }
  }
  // доступність: прихована сторона картки не озвучується скрінрідером
  function syncFaces(card) {
    const both = card.classList.contains("both"), fl = card.classList.contains("flipped");
    const fh = !both && fl, bh = !both && !fl, fe = $(".front", card), be = $(".back", card);
    fe.setAttribute("aria-hidden", String(fh)); be.setAttribute("aria-hidden", String(bh)); fe.inert = fh; be.inert = bh;
    card.setAttribute("aria-pressed", String(fl));
  }
  function flipCard(card) {
    if (card.classList.contains("both")) return;
    card.classList.toggle("flipped"); syncFaces(card);
  }
  function unflip(card) {
    if (!card.classList.contains("flipped")) return syncFaces(card);
    card.classList.add("noanim"); card.style.transition = "none"; card.classList.remove("flipped"); void card.offsetWidth; card.style.transition = ""; card.classList.remove("noanim"); syncFaces(card);
  }
  // великі статті: зменшуємо шрифт, доки текст не влізе без прокрутки (мінімум 12 px)
  function fitText(el) {
    el.style.fontSize = ""; el.classList.remove("scrolls");
    if (!el.clientHeight) return;
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollHeight > el.clientHeight + 1 && size > 12) { size -= 0.5; el.style.fontSize = size + "px"; }
    el.classList.toggle("scrolls", el.scrollHeight > el.clientHeight + 1);
  }
  const fitAll = () => $$(".face .text").forEach(fitText);
  // за замовчуванням «дві мови» лише на дуже широких екранах (≥1500 px), де вистачає місця; вручну — від 960 px
  const isBoth = () => matchMedia("(min-width: 960px)").matches && (ui.mode ? ui.mode === "both" : matchMedia("(min-width: 1500px)").matches);

  /* ---------- articles view ---------- */
  let filter = "all", order = ARTS.map((a) => a.n), idx = 0;
  const passes = (n) => ({
    all: true, learned: has("learned", n), hard: has("hard", n), review: has("review", n), todo: !has("learned", n),
  })[filter];
  const list = () => order.filter(passes);
  const current = () => list()[idx];

  function renderArticles() {
    const L = list();
    if (idx >= L.length) idx = Math.max(0, L.length - 1);
    $$("#chips .chip").forEach((c) => c.classList.toggle("active", c.dataset.f === filter));
    const empty = !L.length;
    $("#emptyState").hidden = !empty; $("#card").style.visibility = empty ? "hidden" : "visible";
    $(".controls").hidden = empty; $(".card-tools").hidden = empty;
    const both = isBoth(), cardEl = $("#card");
    cardEl.classList.toggle("both", both); if (both) cardEl.classList.remove("flipped");
    $("#flip").hidden = both; $("#modeBtn").hidden = !matchMedia("(min-width: 960px)").matches;
    $("#modeBtn").classList.toggle("on", both); { const t = both ? "Одна мова (перевертання)" : "Дві мови поруч"; $("#modeBtn").title = t; $("#modeBtn").setAttribute("aria-label", t); }
    syncFaces(cardEl);
    $("#cardCount").textContent = empty ? "0 / 0" : `${idx + 1} / ${L.length}`;
    if (!empty) {
      const n = L[idx], a = byN[n];
      paintCard("", a, state.germanFirst);
      $("#card").classList.toggle("is-learned", has("learned", n));
      $("#mHard").classList.toggle("on", has("hard", n));
      $("#mReview").classList.toggle("on", has("review", n));
      $("#mNote").classList.toggle("on", !!state.notes[n]);
      { const t = state.notes[n] ? "Нотатка (є запис)" : "Нотатка"; $("#mNote").title = t; $("#mNote").setAttribute("aria-label", t); }
      const ml = $("#mLearned"), isL = has("learned", n); ml.classList.toggle("done", isL); ml.classList.toggle("primary", !isL); { const t = isL ? "Вивчено — натисніть, щоб зняти" : "Вивчено"; ml.title = t; ml.setAttribute("aria-label", t); }
      ui.n = n; saveUi(); fitAll();
    }
    const ol = $("#artList"); ol.textContent = "";
    order.forEach((n) => {
      const a = byN[n], li = document.createElement("li"), b = document.createElement("button");
      const marks = [];
      if (has("learned", n)) marks.push(["ok", "вивчена"]); if (has("hard", n)) marks.push(["hard", "складна"]); if (has("review", n)) marks.push(["rv", "повторити"]);
      b.innerHTML = `<span class="n">${n === 0 ? "§" : n}</span><span class="t"></span><span class="dots" aria-hidden="true">${marks.map(([c]) => `<i class="dt ${c}"></i>`).join("")}</span>` +
        (marks.length ? `<span class="sr">${marks.map((m) => m[1]).join(", ")}</span>` : "");
      $(".t", b).textContent = a.tu;
      if (current() === n) b.classList.add("cur");
      b.addEventListener("click", () => {
        if (!passes(n)) { filter = "all"; ui.filter = filter; saveUi(); }
        idx = list().indexOf(n); unflip($("#card")); closeList(); renderArticles();
      });
      li.appendChild(b); ol.appendChild(li);
    });
    const cur = $(".cur", ol); if (cur && ol.scrollHeight > ol.clientHeight) cur.scrollIntoView({ block: "nearest" });
  }
  function go(d) {
    const L = list(); if (!L.length) return;
    idx = (idx + d + L.length) % L.length; unflip($("#card")); renderArticles();
  }
  function markLearned() {
    const n = current(); if (n == null) return;
    if (has("learned", n)) { setFlag("learned", n, false); delete state.nextReview[n]; save(false); return; }
    setFlag("learned", n, true); setFlag("review", n, false);
    state.learnedAt[n] = Date.now(); state.nextReview[n] = Date.now() + DAY; state.reviewLevel[n] = 0;
    toast("Вивчено! +15 XP"); burst($("#mLearned"));
    const wasLast = idx >= list().length - 1;
    save();
    if (filter === "todo") { unflip($("#card")); renderArticles(); } else if (!wasLast) go(1);
  }
  const closeList = () => $("#studyList").classList.remove("open");
  // відкрити статтю в режимі карток (з чужого профілю)
  function openArticle(n) { filter = "all"; idx = Math.max(0, list().indexOf(n)); unflip($("#card")); show("articles"); }
  function wireArticles() {
    $("#card").addEventListener("click", () => flipCard($("#card")));
    $("#flip").addEventListener("click", () => flipCard($("#card")));
    $("#card").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); flipCard($("#card")); } });
    $("#modeBtn").addEventListener("click", () => { ui.mode = isBoth() ? "flip" : "both"; saveUi(); renderArticles(); });
    $("#listBtn").addEventListener("click", () => $("#studyList").classList.add("open"));
    $("#listClose").addEventListener("click", closeList);
    addEventListener("keydown", (e) => { if (e.key === "Escape") closeList(); });
    matchMedia("(min-width: 960px)").addEventListener("change", () => { closeList(); if (ui.view === "articles") renderArticles(); });
    $("#prev").addEventListener("click", () => go(-1));
    $("#next").addEventListener("click", () => go(1));
    $("#mLearned").addEventListener("click", markLearned);
    $("#mHard").addEventListener("click", () => { const n = current(); setFlag("hard", n, !has("hard", n)); save(false); });
    $("#mReview").addEventListener("click", () => { const n = current(); const on = !has("review", n); setFlag("review", n, on); if (on) toast("Додано до повторення"); save(false); });
    $("#mNote").addEventListener("click", () => { const n = current(); $("#noteTitle").textContent = `Нотатка · ${n === 0 ? "преамбула" : "стаття " + n}`; $("#noteText").value = state.notes[n] || ""; $("#noteDlg").showModal(); $("#noteText").focus(); });
    $("#noteDlg").addEventListener("close", () => {
      if ($("#noteDlg").returnValue !== "ok") return;
      const n = current(), v = $("#noteText").value.trim();
      if (v) state.notes[n] = v; else delete state.notes[n]; save();
    });
    $("#chips").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; filter = c.dataset.f; ui.filter = filter; idx = 0; unflip($("#card")); renderArticles(); });
    $("#resetFilter").addEventListener("click", () => { filter = "all"; ui.filter = filter; idx = 0; renderArticles(); });
    $("#shuffle").addEventListener("click", () => {
      order = order.slice(); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      idx = 0; unflip($("#card")); renderArticles(); toast("Картки перемішано");
    });
    let sx = null;
    $("#card").addEventListener("pointerdown", (e) => (sx = e.clientX));
    $("#card").addEventListener("pointerup", (e) => {
      if (sx == null) return; const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 70) { e.preventDefault(); go(dx < 0 ? 1 : -1); }
    });
  }

  /* ---------- review ---------- */
  let rq = [], ri = 0;
  function startReview(all) {
    if (all) state.learned.forEach((n) => (state.nextReview[n] = Date.now()));
    rq = dueList(); ri = 0; unflip($("#rvCard")); renderReview();
  }
  function renderReview() {
    const empty = !rq.length;
    $("#reviewEmpty").hidden = !empty; $("#reviewBox").hidden = empty;
    if (empty) return;
    if (ri >= rq.length) ri = 0;
    $("#rvCount").textContent = `${ri + 1} / ${rq.length}`;
    paintCard("rv", byN[rq[ri]], state.germanFirst, !!ui.cloze);
    syncFaces($("#rvCard")); fitAll();
  }
  function wireReview() {
    const paintCloze = () => { $("#clozeBtn").classList.toggle("on", !!ui.cloze); $("#clozeBtn").setAttribute("aria-pressed", String(!!ui.cloze)); };
    paintCloze();
    $("#clozeBtn").addEventListener("click", () => { ui.cloze = !ui.cloze; saveUi(); paintCloze(); unflip($("#rvCard")); renderReview(); });
    $("#rvCard").addEventListener("click", () => flipCard($("#rvCard")));
    $("#rvCard").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); flipCard($("#rvCard")); } });
    $("#reviewAll").addEventListener("click", () => { if (!state.learned.length) return toast("Спершу вивчіть хоча б одну статтю"); startReview(true); save(false); });
    $("#rvAgain").addEventListener("click", () => {
      const n = rq.splice(ri, 1)[0]; rq.push(n); state.reviewLevel[n] = 0; unflip($("#rvCard")); renderReview();
    });
    $("#rvKnow").addEventListener("click", () => {
      const n = rq.splice(ri, 1)[0], lv = (state.reviewLevel[n] || 0) + 1;
      state.reviewLevel[n] = lv; state.nextReview[n] = Date.now() + INTERVALS[Math.min(lv, INTERVALS.length - 1)] * DAY;
      setFlag("review", n, false); state.reviewsDone++; burst($("#rvKnow"));
      unflip($("#rvCard")); save(); if (ri >= rq.length) ri = 0; renderReview();
      if (!rq.length) { toast("Черга пройдена"); if (!state.flags.includes("clean")) { state.flags.push("clean"); save(false); } }
    });
  }

  /* ---------- home ---------- */
  function renderHome() {
    const L = state.learned.length, due = dueList().length;
    $("#sLearned").textContent = L; $("#sStreak").textContent = streak();
    $("#sDue").textContent = due; $("#sHard").textContent = state.hard.length;
    const b = $("#reviewBadge"); b.textContent = due; b.hidden = !due;
    const x = xp(), ri2 = rankOf(x), next = RANKS[ri2 + 1];
    $("#rankName").textContent = RANKS[ri2][1]; $("#rankXp").textContent = `${x} XP`;
    const lo = RANKS[ri2][0], hi = next ? next[0] : lo;
    $("#rankBar").style.width = (next ? ((x - lo) / (hi - lo)) * 100 : 100) + "%";
    $("#rankNext").textContent = next ? `До рівня «${next[1]}»: ще ${hi - x} XP` : "Найвищий рівень досягнуто";
    $("#profileRank").textContent = RANKS[ri2][1];
    const hr = new Date().getHours(), hello = hr >= 5 && hr < 11 ? "Доброго ранку" : hr >= 11 && hr < 17 ? "Гарного дня" : hr >= 17 && hr < 23 ? "Затишного вечора" : "Тихої ночі";
    $("#greet").textContent = hello + (state.name ? ", " + state.name : "") + " ✦";

    const now = Date.now(), left = DEADLINE - now, remaining = TOTAL - L;
    const timeFrac = Math.min(1, Math.max(0, (now - START) / (DEADLINE - START))), doneFrac = L / TOTAL;
    $("#routeTime").style.width = timeFrac * 100 + "%"; $("#routeDone").style.width = doneFrac * 100 + "%";
    $("#routeText").textContent = left <= 0 ? "Дедлайн настав" : remaining === 0 ? "Усе вивчено 🎉" :
      doneFrac > timeFrac + 0.02 ? `попереду графіка · ${Math.round(doneFrac * 100)}% вивчено` : doneFrac >= timeFrac - 0.02 ? `за графіком · ${Math.round(doneFrac * 100)}% вивчено` : `відстаєте від графіка · ${Math.round(doneFrac * 100)}% вивчено, ${Math.round(timeFrac * 100)}% часу минуло`;

    const daysLeft = Math.max(1, Math.ceil(left / DAY)), todayDone = Object.values(state.learnedAt).filter((t) => t >= startOfToday()).length;
    if (remaining === 0) { $("#planMain").textContent = "Усе вивчено"; $("#planSub").textContent = due ? `Лишилось ${due} ${plural(due, "картка", "картки", "карток")} для повторення.` : "Заходьте повторювати за розкладом."; }
    else {
      const target = Math.max(1, Math.ceil(remaining / daysLeft)), perWeek = Math.ceil(remaining / (daysLeft / 7));
      $("#planMain").textContent = `${target} ${plural(target, "стаття", "статті", "статей")} на день`;
      $("#planSub").textContent = `Сьогодні: ${todayDone} · лишилось ${remaining} · ≈ ${perWeek} на тиждень`;
    }
    fillAch($("#achGrid"), new Set(state.ach), true);
  }
  function tick() {
    const left = Math.max(0, DEADLINE - Date.now()), p = (n, l = 2) => String(n).padStart(l, "0");
    $("#cdDays").textContent = p(Math.floor(left / DAY), 3);
    $("#cdHours").textContent = p(Math.floor(left / 36e5) % 24);
    $("#cdMin").textContent = p(Math.floor(left / 6e4) % 60);
    $("#cdSec").textContent = p(Math.floor(left / 1e3) % 60);
  }

  /* ---------- navigation ---------- */
  function show(view) {
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
    $$(".nav-btn[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === (view === "user" ? "ranking" : view)));
    ui.view = view === "user" ? "ranking" : view; document.documentElement.dataset.view = ui.view; saveUi(); window.scrollTo({ top: 0 });
    if (view === "review") startReview(false);
    if (view === "ranking") loadBoard();
    if (view === "articles") renderArticles();
    if (view === "profile") renderProfilePage();
    if (view === "user") renderUser();
    $("#profileBtn").classList.toggle("active", view === "profile");
    requestAnimationFrame(fitAll);
  }
  function wireNav() {
    $$(".nav-btn[data-view]").forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));
    $("#startCards").addEventListener("click", () => {
      const nextA = ARTS.find((a) => !has("learned", a.n));
      filter = "all"; idx = Math.max(0, list().indexOf(nextA ? nextA.n : order[0])); unflip($("#card")); show("articles");
    });
    $("#startReview").addEventListener("click", () => show("review"));
    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input,textarea,dialog") || e.ctrlKey || e.metaKey || e.altKey) return;
      const v = ui.view;
      const flipEl = v === "articles" ? $("#card") : v === "review" ? $("#rvCard") : null;
      if (!flipEl) return;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); flipCard(flipEl); }
      else if (v === "articles" && e.key === "ArrowRight") go(1);
      else if (v === "articles" && e.key === "ArrowLeft") go(-1);
    });
  }

  /* ---------- profile / settings ---------- */
  const displayName = () => state.name || cloud.profileName || "Гість";
  function applyTheme(t) {
    if (!THEMES.some((x) => x[0] === t)) t = "light";
    document.documentElement.dataset.theme = t; state.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    $("meta[name=theme-color]").content = THEMES.find((x) => x[0] === t)[3];
  }
  // акцентний колір і розмір тексту карток
  function applyLook() {
    const r = document.documentElement.style, c = state.accent;
    if (!c) ["--accent", "--accent-ink", "--accent-soft"].forEach((k) => r.removeProperty(k));
    else {
      const [R, G, B] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
      r.setProperty("--accent", c); r.setProperty("--accent-ink", (0.299 * R + 0.587 * G + 0.114 * B) / 255 > 0.62 ? "#06223e" : "#fff");
      r.setProperty("--accent-soft", `color-mix(in srgb, ${c} 16%, transparent)`);
    }
    r.setProperty("--ts", String(state.textScale || 1));
    document.documentElement.classList.toggle("no-garland", state.garland === false);
    document.documentElement.classList.toggle("calm", state.calm === true);
  }
  function paintAvatar(el, av, name) {
    el.textContent = ""; el.style.background = ""; el.style.backgroundImage = "";
    if (av?.kind === "photo" && PHOTO_RE.test(av.photo || "")) { el.style.backgroundImage = `url("${av.photo}")`; el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center"; return; }
    const p = av?.kind === "preset" && AVATARS.find((a) => a[0] === av.id);
    if (p && p[4]) { el.style.backgroundImage = `url("avatars/${p[4]}")`; el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center"; return; }
    el.textContent = (name || "?").trim().charAt(0).toUpperCase() || "?";
  }
  async function photoFromFile(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const S = 192, c = document.createElement("canvas"); c.width = c.height = S;
      const g = c.getContext("2d"), m = Math.min(img.width, img.height);
      g.fillStyle = "#fff"; g.fillRect(0, 0, S, S);
      g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
      return c.toDataURL("image/jpeg", 0.85);
    } finally { URL.revokeObjectURL(url); }
  }
  function bestStreak() {
    const days = [...new Set(state.studyDates)].sort();
    let best = 0, cur = 0, prev = null;
    for (const k of days) {
      const t = new Date(k + "T00:00:00").getTime();
      cur = prev !== null && Math.round((t - prev) / DAY) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = t;
    }
    return best;
  }
  function renderProfile() {
    const name = displayName();
    $("#profileName").textContent = name; paintAvatar($("#avatar"), state.avatar, name);
    renderStyleChips();
    if (ui.view === "profile") renderProfilePage();
  }
  function renderProfilePage() {
    const name = displayName(), L = state.learned.length, x = xp(), ri2 = rankOf(x), next = RANKS[ri2 + 1];
    paintAvatar($("#pfAvatar"), state.avatar, name);
    $("#pfName").textContent = name; $("#pfMotto").textContent = state.motto; $("#pfMotto").hidden = !state.motto;
    $("#pfRank").textContent = RANKS[ri2][1]; $("#pfXp").textContent = `${x} XP`;
    const lo = RANKS[ri2][0], hi = next ? next[0] : lo;
    $("#pfBar").style.width = (next ? ((x - lo) / (hi - lo)) * 100 : 100) + "%";
    $("#pfNext").textContent = next ? `До рівня «${next[1]}»: ще ${hi - x} XP` : "Найвищий рівень";
    const nameIn = $("#pfNameIn"), mottoIn = $("#pfMottoIn");
    if (document.activeElement !== nameIn) nameIn.value = state.name;
    if (document.activeElement !== mottoIn) mottoIn.value = state.motto;
    const tiles = [
      ["Вивчено", `${L} / ${TOTAL}`], ["Серія", `${streak()} дн.`], ["Найкраща серія", `${bestStreak()} дн.`], ["Днів навчання", state.studyDates.length],
      ["Повторень", state.reviewsDone], ["Нотаток", Object.values(state.notes).filter(Boolean).length], ["Складних", state.hard.length],
      ["Досягнень", `${state.ach.length} / ${ACH.length}`], ["Досвід", `${x} XP`], ["З нами з", new Date(state.created).toLocaleDateString("uk-UA", { day: "numeric", month: "long" })],
    ];
    const sb = $("#pfStats"); sb.textContent = "";
    tiles.forEach(([l, v]) => { const d = document.createElement("div"); d.className = "pf-stat"; d.innerHTML = "<span></span><b></b>"; $("span", d).textContent = l; $("b", d).textContent = v; sb.appendChild(d); });

    const cur = document.documentElement.dataset.theme, tg = $("#themeGrid"); tg.textContent = "";
    THEMES.forEach(([id, label, , bg, ac]) => {
      const b = document.createElement("button"); b.type = "button"; b.dataset.t = id; b.className = "theme-card" + (cur === id ? " on" : ""); b.setAttribute("aria-pressed", String(cur === id));
      b.innerHTML = "<i class='sw'><u></u></i><span></span>"; $("i", b).style.background = bg; $("u", b).style.background = ac; $("span", b).textContent = label; tg.appendChild(b);
    });
    const ag = $("#accentGrid"); ag.textContent = "";
    ACCENTS.forEach(([c, label]) => {
      const b = document.createElement("button"); b.type = "button"; b.dataset.c = c || ""; b.title = label; b.setAttribute("aria-label", `Акцент: ${label}`);
      b.className = "accent-dot" + ((state.accent || null) === c ? " on" : "") + (c ? "" : " auto"); b.setAttribute("aria-pressed", String((state.accent || null) === c));
      if (c) b.style.background = c; ag.appendChild(b);
    });
    const vg = $("#avatarGrid"); vg.textContent = "";
    [{ kind: "letter" }, ...AVATARS.map((a) => ({ kind: "preset", id: a[0] }))].forEach((av) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "av-opt" + (state.avatar.kind === av.kind && state.avatar.id === av.id ? " on" : "");
      b.dataset.k = av.kind; b.dataset.id = av.id || ""; b.setAttribute("aria-label", av.kind === "letter" ? "Перша літера імені" : `Аватарка: ${AVATARS.find((a) => a[0] === av.id)[1]}`);
      if (av.kind === "preset") b.title = AVATARS.find((a) => a[0] === av.id)[1];
      const a = document.createElement("span"); a.className = "avatar"; paintAvatar(a, av, name); b.appendChild(a); vg.appendChild(b);
    });
    const cg = $("#csGrid"); cg.textContent = "";
    CARD_STYLES.forEach(([id, label]) => {
      const b = document.createElement("button"); b.type = "button"; b.dataset.cs = id; b.className = "cs-card" + (state.cardStyle === id ? " on" : "");
      b.setAttribute("aria-pressed", String(state.cardStyle === id)); b.setAttribute("aria-label", `Оформлення картки: ${label}`);
      b.appendChild(rkRowEl("★", { name, rank: RANKS[ri2][1], learned: L, streak: streak(), motto: state.motto, av: state.avatar, cs: id, compact: true }, false));
      const t = document.createElement("span"); t.className = "cs-name"; t.textContent = label; b.appendChild(t); cg.appendChild(b);
    });
    $("#avPhotoDel").hidden = state.avatar.kind !== "photo";
    $$("#scaleSeg button").forEach((b) => b.classList.toggle("on", Number(b.dataset.s) === state.textScale));
    $("#deFirst").checked = state.germanFirst; $("#snowOn").checked = snow.enabled(); $("#garlandOn").checked = state.garland !== false; $("#calmOn").checked = !!state.calm;
    if (!$("#authBox").contains(document.activeElement)) renderAuthBox();
  }
  function wireProfile() {
    $("#profileBtn").addEventListener("click", () => show("profile"));
    $("#pfNameIn").addEventListener("input", (e) => { state.name = e.target.value.slice(0, 40); save(false); });
    $("#pfMottoIn").addEventListener("input", (e) => { state.motto = e.target.value.slice(0, 80); save(false); });
    $("#themeGrid").addEventListener("click", (e) => { const b = e.target.closest(".theme-card"); if (!b) return; applyTheme(b.dataset.t); if (!state.flags.includes("theme")) state.flags.push("theme"); save(false); renderProfilePage(); });
    $("#accentGrid").addEventListener("click", (e) => { const b = e.target.closest(".accent-dot"); if (!b) return; state.accent = b.dataset.c || null; applyLook(); save(false); });
    $("#scaleSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.textScale = Number(b.dataset.s); applyLook(); save(false); requestAnimationFrame(fitAll); });
    $("#avatarGrid").addEventListener("click", (e) => {
      const b = e.target.closest(".av-opt"); if (!b) return;
      state.avatar = b.dataset.k === "preset" ? { kind: "preset", id: b.dataset.id } : { kind: "letter" }; save(false);
    });
    const pick = (e) => { const b = e.target.closest("[data-cs]"); if (b) setCardStyle(b.dataset.cs); };
    $("#csGrid").addEventListener("click", pick); $("#csChips").addEventListener("click", pick);
    $("#avPhotoBtn").addEventListener("click", () => $("#avFile").click());
    $("#avFile").addEventListener("change", async (e) => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return;
      if (!f.type.startsWith("image/")) return toast("Оберіть файл-зображення");
      try {
        const photo = await photoFromFile(f);
        if (!PHOTO_RE.test(photo) || photo.length > 150000) return toast("Фото завелике, спробуйте інше");
        state.avatar = { kind: "photo", photo }; save(false); toast("Аватарку оновлено");
      } catch { toast("Не вдалося прочитати фото"); }
    });
    $("#avPhotoDel").addEventListener("click", () => { state.avatar = { kind: "letter" }; save(false); });
    $("#deFirst").addEventListener("change", (e) => { state.germanFirst = e.target.checked; save(false); });
    $("#snowOn").addEventListener("change", (e) => { state.snow = e.target.checked; save(false); snow.sync(); });
    $("#garlandOn").addEventListener("change", (e) => { state.garland = e.target.checked; applyLook(); save(false); });
    $("#calmOn").addEventListener("change", (e) => { state.calm = e.target.checked; applyLook(); snow.sync(); save(false); });
    $("#resetAll").addEventListener("click", () => {
      if (!confirm("Скинути весь прогрес на цьому пристрої? Профіль і вигляд збережуться. Це не можна скасувати.")) return;
      const { name, motto, avatar, accent, textScale, theme, snow: sn, germanFirst, created, cardStyle, garland, calm } = state;
      state = normalize({ name, motto, avatar, accent, textScale, theme, snow: sn, germanFirst, created, cardStyle, garland, calm }); filter = "all"; idx = 0; save(false); toast("Прогрес скинуто");
    });
  }

  /* ---------- cloud (optional) ---------- */
  const cloud = { client: null, user: null, profileName: "", timer: null, mode: "signin", error: "" };
  function initCloud() {
    const c = CFG.cloud || {};
    if (!c.enabled || !c.url || !c.key || !window.supabase) return;
    cloud.client = window.supabase.createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true } });
    cloud.client.auth.onAuthStateChange((_e, session) => { onSession(session); });
    cloud.client.auth.getSession().then(({ data }) => onSession(data.session));
  }
  async function onSession(session) {
    cloud.user = session?.user || null;
    if (!cloud.user) { cloud.profileName = ""; renderProfile(); return; }
    cloud.profileName = cloud.user.user_metadata?.display_name || state.name || "";
    if (!state.name && cloud.profileName) state.name = cloud.profileName;
    const { data, error } = await cloud.client.from("v2_study_progress").select("state").eq("user_id", cloud.user.id).maybeSingle();
    if (!error && data?.state) {
      state = mergeStates(state, normalize(data.state));
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    }
    renderAll(); saveCloud();
  }
  function queueCloud() { if (!cloud.user) return; clearTimeout(cloud.timer); cloud.timer = setTimeout(saveCloud, 600); }
  async function saveCloud() {
    if (!cloud.user || !cloud.client) return;
    const stamp = new Date().toISOString();
    await cloud.client.from("v2_study_progress").upsert({ user_id: cloud.user.id, state, updated_at: stamp }, { onConflict: "user_id" });
    const name = (state.name || cloud.profileName || "").trim();
    if (!name) return;
    const base = {
      user_id: cloud.user.id, display_name: name.slice(0, 40), learned_count: state.learned.length,
      hard_count: state.hard.length, streak: streak(), xp: xp(), updated_at: stamp,
    };
    const av = state.avatar;
    const pub = { learned: state.learned, hard: state.hard, ach: state.ach, reviewsDone: state.reviewsDone, notes: Object.values(state.notes).filter(Boolean).length, days: state.studyDates.length, best: bestStreak(), created: state.created };
    const mid = { ...base, card_style: state.cardStyle, motto: state.motto || "", avatar: av.kind === "preset" ? av.id : "", avatar_photo: av.kind === "photo" ? av.photo : "" };
    // пробуємо від повного набору колонок до базового (колонки з'являються після виконання SQL)
    for (const row of [{ ...mid, public_stats: pub }, mid, base]) {
      const { error } = await cloud.client.from("v2_group_profiles").upsert(row, { onConflict: "user_id" });
      if (!error) break;
    }
  }
  function renderAuthBox() {
    const box = $("#authBox"); box.textContent = "";
    const f = document.createElement("div"); f.className = "form";
    if (!cloud.client) {
      f.innerHTML = '<p class="muted">Прогрес зберігається в цьому браузері.</p>'; box.appendChild(f);
      return;
    }
    if (cloud.user) {
      f.innerHTML = '<p>Ви увійшли як <b></b></p><p class="muted">Прогрес синхронізується між пристроями.</p><button class="btn" id="signOut">Вийти</button>';
      $("b", f).textContent = cloud.user.email || displayName(); box.appendChild(f);
      $("#signOut", box).addEventListener("click", async () => { await cloud.client.auth.signOut(); });
      return;
    }
    const up = cloud.mode === "signup";
    f.innerHTML = `${up ? "<label class='field'>Ім'я в рейтингу<input type='text' id='aName' maxlength='40' autocomplete='nickname' required /></label>" : ""}<label class="field">Email<input type="email" id="aEmail" autocomplete="email" required /></label><label class="field">Пароль<input type="password" id="aPass" minlength="6" placeholder="від 6 символів" autocomplete="${up ? "new-password" : "current-password"}" required /></label><div class="err" id="aErr"></div><button class="btn primary" id="aGo">${up ? "Створити акаунт" : "Увійти"}</button><button class="link" id="aSwitch">${up ? "Вже є акаунт? Увійти" : "Вперше тут? Створити акаунт"}</button>`;
    box.appendChild(f); $("#aErr", box).textContent = cloud.error;
    $("#aSwitch", box).addEventListener("click", () => { cloud.mode = up ? "signin" : "signup"; cloud.error = ""; renderAuthBox(); });
    $("#aGo", box).addEventListener("click", async () => {
      const email = $("#aEmail", box).value.trim(), password = $("#aPass", box).value, name = up ? $("#aName", box).value.trim() : "";
      if (!email || password.length < 6 || (up && !name)) { cloud.error = "Заповніть усі поля (пароль від 6 символів)."; renderAuthBox(); return; }
      const res = up ? await cloud.client.auth.signUp({ email, password, options: { data: { display_name: name } } }) : await cloud.client.auth.signInWithPassword({ email, password });
      cloud.error = res.error ? res.error.message : (up && !res.data.session ? "Перевірте пошту для підтвердження." : "");
      if (up && name && !state.name) { state.name = name; save(false); }
      renderAuthBox();
    });
  }

  /* ---------- ranking ---------- */
  // рядок рейтингу будуємо через DOM (дані інших користувачів не вставляємо як HTML)
  function rkRowEl(pos, p, me) {
    const row = document.createElement("div");
    row.className = "rk-row" + (me ? " me" : "") + (p.compact ? " compact" : "") + " cs-" + (CARD_STYLES.some((c) => c[0] === p.cs) ? p.cs : "frost") + (Number(pos) >= 1 && Number(pos) <= 3 ? " top" + pos : "");
    row.innerHTML = '<div class="rk-pos"></div><span class="avatar sm"></span><div class="rk-name"><b></b><small></small><em></em></div><div class="rk-score"></div>';
    $(".rk-pos", row).textContent = pos; paintAvatar($(".avatar", row), p.av, p.name);
    $("b", row).textContent = p.name; $("small", row).textContent = `${p.rank} · серія ${p.streak} дн.`;
    const m = $("em", row); m.textContent = p.motto || ""; m.hidden = !p.motto;
    $(".rk-score", row).innerHTML = `${Number(p.learned) || 0}<small class="muted"> / ${TOTAL}</small>`;
    return row;
  }
  function renderBoardLocal() {
    if (ui.view !== "ranking" || cloud.client) return;
    const body = $("#rankBody"); body.textContent = "";
    body.appendChild(rkRowEl(1, { name: displayName(), rank: RANKS[rankOf(xp())][1], learned: state.learned.length, streak: streak(), motto: state.motto, av: state.avatar, cs: state.cardStyle }, true));
  }
  // вибір оформлення своєї картки в рейтингу
  function renderStyleChips() {
    const box = $("#csChips"); box.textContent = "";
    CARD_STYLES.forEach(([id, label]) => {
      const b = document.createElement("button"); b.type = "button"; b.dataset.cs = id; b.textContent = label;
      b.className = "cs-chip cs-" + id + (state.cardStyle === id ? " on" : ""); b.setAttribute("aria-pressed", String(state.cardStyle === id)); box.appendChild(b);
    });
  }
  function setCardStyle(id) {
    if (!CARD_STYLES.some((c) => c[0] === id)) return;
    state.cardStyle = id; save(false);
    $$("#rankBody .rk-row.me").forEach((r) => { r.className = r.className.replace(/\bcs-\w+/, "cs-" + id); });
  }
  async function loadBoard() {
    const body = $("#rankBody");
    if (!cloud.client) return renderBoardLocal();
    if (!cloud.user) { body.innerHTML = '<div><p>Увійдіть, щоб побачити рейтинг групи й потрапити до нього.</p><div class="row" style="margin-top:12px"><button class="btn primary" id="rkLogin">Увійти або зареєструватися</button></div></div>'; $("#rkLogin").addEventListener("click", () => show("profile")); return; }
    body.innerHTML = "<div>Завантажую…</div>";
    const q = (cols) => cloud.client.from("v2_group_profiles").select(cols).order("learned_count", { ascending: false }).order("xp", { ascending: false });
    const base = "user_id,display_name,learned_count,hard_count,streak,xp";
    let data = null, error = null;
    for (const cols of [base + ",motto,avatar,avatar_photo,card_style,public_stats", base + ",motto,avatar,avatar_photo,card_style", base]) {
      ({ data, error } = await q(cols)); if (!error) break;
    }
    if (error) { body.innerHTML = '<div><p class="err">Не вдалося завантажити рейтинг. Перевірте, що виконано supabase-v2.sql.</p><p class="muted" style="margin-top:8px"></p></div>'; $("p.muted", body).textContent = `Деталі: ${error.code || ""} ${error.message || ""}`; console.error("ranking", error); return; }
    body.textContent = "";
    if (!data.length) { body.innerHTML = "<div>Поки що нікого. Вивчіть першу статтю — і ви тут!</div>"; return; }
    data.forEach((r, i) => {
      const av = r.avatar_photo && PHOTO_RE.test(r.avatar_photo) && r.avatar_photo.length < 200000 ? { kind: "photo", photo: r.avatar_photo }
        : r.avatar && AVATARS.some((a) => a[0] === r.avatar) ? { kind: "preset", id: r.avatar } : { kind: "letter" };
      const row = rkRowEl(i + 1, { name: r.display_name, rank: RANKS[rankOf(r.xp)][1], learned: r.learned_count, streak: r.streak, motto: String(r.motto || "").slice(0, 80), av, cs: r.card_style }, r.user_id === cloud.user.id);
      row.tabIndex = 0; row.setAttribute("role", "button"); row.title = "Відкрити профіль";
      const open = () => (r.user_id === cloud.user.id ? show("profile") : openUser(r, av));
      row.addEventListener("click", open); row.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); if (e.key === " ") e.preventDefault(); }); row.addEventListener("keyup", (e) => { if (e.key === " ") open(); });
      body.appendChild(row);
    });
  }

  /* ---------- чужий профіль ---------- */
  let viewedUser = null;
  function openUser(r, av) { viewedUser = { r, av }; show("user"); }
  function renderUser() {
    if (!viewedUser) return show("ranking");
    const { r, av } = viewedUser, ps = r.public_stats && typeof r.public_stats === "object" ? r.public_stats : null;
    const ints = (a) => (Array.isArray(a) ? a.filter((n) => Number.isInteger(n) && byN[n]) : null);
    const learned = ints(ps?.learned), hard = ints(ps?.hard) || [], ach = Array.isArray(ps?.ach) ? ps.ach.filter((x) => ACH.some((a) => a[0] === x)) : [];
    const name = String(r.display_name || "Учасник").slice(0, 40), xpN = Number(r.xp) || 0, ri2 = rankOf(xpN), next = RANKS[ri2 + 1];
    const csId = CARD_STYLES.some((c) => c[0] === r.card_style) ? r.card_style : "frost";
    $("#uvBanner").className = "pf-banner uv-banner cs-" + csId;
    paintAvatar($("#uvAvatar"), av, name);
    $("#uvName").textContent = name; const m = String(r.motto || "").slice(0, 80); $("#uvMotto").textContent = m; $("#uvMotto").hidden = !m;
    $("#uvRank").textContent = RANKS[ri2][1]; $("#uvXp").textContent = xpN + " XP";
    const lo = RANKS[ri2][0], hi = next ? next[0] : lo;
    $("#uvBar").style.width = (next ? ((xpN - lo) / (hi - lo)) * 100 : 100) + "%";
    $("#uvNext").textContent = next ? `До рівня «${next[1]}»: ще ${hi - xpN} XP` : "Найвищий рівень";
    const L = learned ? learned.length : Number(r.learned_count) || 0;
    const tiles = [["Вивчено", `${L} / ${TOTAL}`], ["Серія", `${Number(r.streak) || 0} дн.`], ["Найкраща серія", ps?.best != null ? `${Number(ps.best) || 0} дн.` : "—"],
      ["Днів навчання", ps?.days != null ? Number(ps.days) || 0 : "—"], ["Повторень", ps?.reviewsDone != null ? Number(ps.reviewsDone) || 0 : "—"], ["Нотаток", ps?.notes != null ? Number(ps.notes) || 0 : "—"],
      ["Складних", hard.length || Number(r.hard_count) || 0], ["Досягнень", `${ach.length} / ${ACH.length}`], ["Досвід", xpN + " XP"],
      ["З нами з", ps?.created ? new Date(Number(ps.created)).toLocaleDateString("uk-UA", { day: "numeric", month: "long" }) : "—"]];
    const sb = $("#uvStats"); sb.textContent = "";
    tiles.forEach(([l, v]) => { const d = document.createElement("div"); d.className = "pf-stat"; d.innerHTML = "<span></span><b></b>"; $("span", d).textContent = l; $("b", d).textContent = v; sb.appendChild(d); });
    fillAch($("#uvAch"), new Set(ach), false);
    const ar = $("#uvArts"); ar.textContent = "";
    if (!learned) { $("#uvArtCount").textContent = ""; ar.textContent = "Поки нічого"; ar.className = "uv-arts muted"; return; }
    ar.className = "uv-arts"; $("#uvArtCount").textContent = `· вивчено ${learned.length} з ${TOTAL}`;
    ARTS.forEach((a) => {
      const d = document.createElement("button"), ok = learned.includes(a.n), hd = hard.includes(a.n); d.type = "button";
      d.className = "uv-art" + (ok ? " ok" : "") + (hd ? " hard" : ""); d.innerHTML = "<b></b><span></span>";
      $("b", d).textContent = a.n === 0 ? "§" : a.n; $("span", d).textContent = a.tu; d.title = (ok ? "Вивчена" : "Не вивчена") + (hd ? ", складна" : "");
      d.addEventListener("click", () => openArticle(a.n));
      ar.appendChild(d);
    });
  }

  /* ---------- snow ---------- */
  const snow = (() => {
    const cv = $("#snow"), ctx = cv.getContext("2d"); let flakes = [], raf = 0, W = 0, H = 0;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    function size() { const r = devicePixelRatio || 1; W = innerWidth; H = innerHeight; cv.width = W * r; cv.height = H * r; ctx.setTransform(r, 0, 0, r, 0, 0); }
    function make() { return { x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2.2 + .6, v: Math.random() * .7 + .25, d: Math.random() * Math.PI * 2 }; }
    let last = 0;
    function frame(t) {
      if (t - last < 33) { raf = requestAnimationFrame(frame); return; } // ~30 к/с
      last = t; ctx.clearRect(0, 0, W, H);
      const dark = DARK_THEMES.has(document.documentElement.dataset.theme);
      ctx.fillStyle = dark ? "rgba(235,245,255,.75)" : "rgba(255,255,255,.95)"; ctx.strokeStyle = dark ? "transparent" : "rgba(120,170,215,.35)";
      flakes.forEach((f) => {
        f.d += .01; f.y += f.v; f.x += Math.sin(f.d) * .35;
        if (f.y > H + 5) { f.y = -5; f.x = Math.random() * W; }
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); if (!dark) ctx.stroke();
      });
      raf = requestAnimationFrame(frame);
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; ctx.clearRect(0, 0, W, H); }
    // null = авто: на телефоні й сенсорних екранах вимкнено, щоб не розряджати батарею
    const enabled = () => !state.calm && (state.snow === null || state.snow === undefined ? !(matchMedia("(pointer: coarse)").matches || innerWidth < 700) : !!state.snow);
    function sync() {
      stop(); if (!enabled() || reduce.matches || document.hidden) return;
      size(); flakes = Array.from({ length: innerWidth < 700 ? 35 : 70 }, make); raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", () => { if (raf) { size(); } });
    document.addEventListener("visibilitychange", sync);
    return { sync, enabled };
  })();

  /* ---------- іконки меню ---------- */
  const ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    articles: '<path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M9 8h6M9 12h6"/>',
    review: '<path d="M4 12a8 8 0 0114-5l2 2"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 01-14 5l-2-2"/><path d="M4 20v-5h5"/>',
    ranking: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H4v1a4 4 0 004 4M16 6h4v1a4 4 0 01-4 4"/><path d="M12 13v4M8 20h8"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  };
  function paintIcons() {
    $$(".nav-btn").forEach((b) => {
      const k = b.dataset.view || "profile", i = $("i", b);
      if (i && ICONS[k]) i.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
    });
  }

  /* ---------- boot ---------- */
  // згортання лівого меню та правого списку розділів (запам'ятовується)
  function applyLayout() {
    const R = document.documentElement.classList;
    R.toggle("rail-collapsed", !!ui.railCollapsed); R.toggle("list-hidden", !!ui.listHidden);
    const rt = $("#railToggle"), t1 = ui.railCollapsed ? "Показати меню" : "Згорнути меню";
    rt.setAttribute("aria-expanded", String(!ui.railCollapsed)); rt.title = t1; rt.setAttribute("aria-label", t1);
    const lt = $("#listToggle"), t2 = ui.listHidden ? "Показати список розділів" : "Сховати список розділів";
    lt.setAttribute("aria-expanded", String(!ui.listHidden)); lt.title = t2; lt.setAttribute("aria-label", t2); lt.classList.toggle("on", !!ui.listHidden);
    $(".rc-label", rt).textContent = t1; $(".lt-label", lt).textContent = ui.listHidden ? "Показати розділи" : "Сховати розділи"; lt.title = $(".lt-label", lt).textContent; lt.setAttribute("aria-label", t2);
    const lo = $("#listOpen"); lo.setAttribute("aria-expanded", String(!ui.listHidden)); lo.title = t2; lo.setAttribute("aria-label", t2);
    requestAnimationFrame(fitAll); setTimeout(fitAll, 300);
  }

  /* ===== Chill-джаз радіо ===== */
  const music = (() => {
    const STATIONS = [
      { name: "Мікс", sub: "Різні станції навмання", mix: true },
      { name: "Chill jazz", sub: "Radio Swiss Jazz", src: ["https://stream.srg-ssr.ch/m/rsj/mp3_128"] },
      { name: "Різдвяний лаунж", sub: "SomaFM · Christmas Lounge", src: ["https://ice1.somafm.com/christmas-128-mp3", "https://ice2.somafm.com/christmas-128-mp3"] },
      { name: "Xmas in Frisko", sub: "SomaFM · святковий мікс", src: ["https://ice1.somafm.com/xmasinfrisko-128-mp3", "https://ice2.somafm.com/xmasinfrisko-128-mp3"] },
      { name: "Jolly Ol' Soul", sub: "SomaFM · святковий соул", src: ["https://ice1.somafm.com/jollysoul-128-mp3", "https://ice2.somafm.com/jollysoul-128-mp3"] }
    ];
    const KEY = "vienna-v2-music";
    let st = { on: false, vol: 40, s: 0, last: 1 };
    try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
    if (!STATIONS[st.s]) st.s = 0;
    let audio = null, idx = 0, playing = false, cur = st.s || 1, tries = 0;
    // реальна станція: у режимі «Мікс» — випадкова, не та, що була востаннє
    function pick() {
      idx = 0;
      if (st.s !== 0) { cur = st.s; return; }
      const pool = []; for (let i = 1; i < STATIONS.length; i++) if (i !== st.last) pool.push(i);
      cur = pool[Math.floor(Math.random() * pool.length)]; st.last = cur; save();
    }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
    const ICON_PLAY = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
    const ICON_PAUSE = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
    const ICON_NEXT = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5v13l8-6.5zM17 5v14"/></svg>';
    const ICON_VOL = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h4l5 4v-13l-5 4zM16.5 9a4 4 0 0 1 0 6"/></svg>';
    const html = (id) => '<div class="mu-top"><button type="button" class="mu-play" aria-label="Увімкнути музику">' + ICON_PLAY + '</button>'
      + '<div class="mu-text"><span class="mu-line"><i class="mu-eq" aria-hidden="true"><s></s><s></s><s></s></i><b class="mu-name"></b></span><small class="mu-sub"></small></div>'
      + '<button type="button" class="mu-next" aria-label="Наступна станція" title="Наступна станція">' + ICON_NEXT + '</button></div>'
      + '<label class="mu-vol">' + ICON_VOL + '<input type="range" min="0" max="100" step="1" aria-label="Гучність музики" /><output class="mu-pct"></output></label>';
    function paint() {
      const S = STATIONS[st.s];
      $$(".music").forEach((m) => {
        m.classList.toggle("on", st.on);
        const p = $(".mu-play", m); p.innerHTML = st.on ? ICON_PAUSE : ICON_PLAY;
        const t = st.on ? "Вимкнути музику" : "Увімкнути музику"; p.setAttribute("aria-label", t); p.title = t; p.setAttribute("aria-pressed", String(st.on));
        $(".mu-name", m).textContent = S.name; $(".mu-sub", m).textContent = S.mix && st.on ? "Зараз: " + STATIONS[cur].name : S.sub;
        const r = $("input", m); r.value = st.vol; r.style.setProperty("--p", st.vol + "%"); $(".mu-pct", m).textContent = st.vol + "%";
      });
    }
    function ensure() {
      if (audio) return audio;
      audio = new Audio(); audio.preload = "none"; audio.volume = st.vol / 100;
      audio.addEventListener("error", () => {
        if (!st.on || !audio.getAttribute("src")) return;
        const list = STATIONS[cur].src;
        if (idx < list.length - 1) { idx++; start(); return; }
        if (st.s === 0 && ++tries < 3) { pick(); paint(); start(); return; }
        st.on = false; save(); paint(); playing = false; toast("Не вдалося підключити радіо. Спробуй іншу станцію.");
      });
      return audio;
    }
    function start() {
      const a = ensure(); a.src = STATIONS[cur].src[idx];
      const p = a.play(); playing = true;
      if (p && p.catch) p.catch(() => { playing = false; });
      if ("mediaSession" in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: STATIONS[cur].name, artist: STATIONS[cur].sub });
    }
    function stop() { if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); } playing = false; }
    function set(on) { st.on = on; tries = 0; if (on) pick(); save(); paint(); if (on) start(); else stop(); }
    function next() { st.s = (st.s + 1) % STATIONS.length; tries = 0; if (st.on) pick(); save(); paint(); if (st.on) start(); }
    function init() {
      $$(".music").forEach((m) => {
        m.innerHTML = html();
        $(".mu-play", m).addEventListener("click", () => set(!st.on));
        $(".mu-next", m).addEventListener("click", next);
        $("input", m).addEventListener("input", (e) => { st.vol = +e.target.value; save(); if (audio) audio.volume = st.vol / 100; paint(); });
      });
      paint();
      if (st.on) {
        const kick = () => { if (st.on && !playing) { tries = 0; pick(); paint(); start(); } };
        ["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, kick, { once: true }));
      }
    }
    return { init };
  })();

  function wireLayout() {
    $$(".rail .nav-btn").forEach((b) => { const s = $("span", b); if (s) b.title = s.textContent.trim(); });
    $("#railToggle").addEventListener("click", () => { ui.railCollapsed = !ui.railCollapsed; saveUi(); applyLayout(); });
    $("#listToggle").addEventListener("click", () => { ui.listHidden = !ui.listHidden; saveUi(); applyLayout(); });
    $("#listOpen").addEventListener("click", () => { ui.listHidden = false; saveUi(); applyLayout(); $("#listToggle").focus(); });
    applyLayout();
  }
  function renderAll() { renderHome(); renderProfile(); applyLook(); if (ui.view === "articles") renderArticles(); if (ui.view === "review") renderReview(); }
  function boot() {
    applyTheme(document.documentElement.dataset.theme || "light"); applyLook();
    let fitTimer; addEventListener("resize", () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitAll, 120); });
    document.fonts?.ready.then(fitAll);
    const syncFolds = () => { const desk = matchMedia("(min-width: 961px)").matches; $$("details.fold").forEach((d) => (d.open = desk || d.hasAttribute("data-open-mobile"))); };
    syncFolds(); matchMedia("(min-width: 961px)").addEventListener("change", syncFolds);
    paintIcons(); music.init(); wireLayout(); wireNav(); wireArticles(); wireReview(); wireProfile();
    $("#rankRefresh").addEventListener("click", loadBoard);
    $("#uvBack").addEventListener("click", () => show("ranking"));
    if (ui.n != null && byN[ui.n]) { const i = list().indexOf(ui.n); idx = i >= 0 ? i : 0; }
    renderHome(); renderProfile(); tick(); setInterval(tick, 1000); setInterval(renderHome, 60000);
    show(["home", "articles", "review", "ranking", "profile"].includes(ui.view) ? ui.view : "home");
    snow.sync(); initCloud();
    checkAch(); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  boot();
})();
