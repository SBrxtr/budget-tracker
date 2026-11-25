const ALARM_KEY = "humanAlarm_schedule";
const ALARM_TIERS = { tier1: "P50.00", tier2: "P70.00", tier3: "P100.00" };
let alarmSchedule = {};
let alarmView = { year: new Date().getFullYear(), month: new Date().getMonth() };

function loadAlarmSchedule() {
  try {
    const raw = localStorage.getItem(ALARM_KEY);
    alarmSchedule = raw ? JSON.parse(raw) : {};
  } catch (e) { alarmSchedule = {}; }
}
function saveAlarmSchedule() {
  try { localStorage.setItem(ALARM_KEY, JSON.stringify(alarmSchedule)); } catch (e) {}
}
function getAlarmEntry(dateStr) {
  const e = alarmSchedule ? alarmSchedule[dateStr] : null;
  if (!e) { return { serviceLevel: "", note: "", client: false }; }
  return { serviceLevel: e.serviceLevel || "", note: e.note || "", client: !!e.client };
}
function setAlarmEntry(dateStr, serviceLevel, note) {
  alarmSchedule[dateStr] = { serviceLevel: serviceLevel, note: note };
  saveAlarmSchedule();
}
const ALARM_REST_KEY = "humanAlarm_restdays";
function getAlarmRestDays() {
  try {
    const raw = localStorage.getItem(ALARM_REST_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(Number).filter(function (n) { return !isNaN(n); }) : [];
  } catch (e) { return []; }
}
function setAlarmRestDays(arr) { try { localStorage.setItem(ALARM_REST_KEY, JSON.stringify(arr || [])); } catch (e) {} }
function alarmIsRestDay(dateStr) {
  if (!dateStr) { return false; }
  const parts = String(dateStr).split("-");
  if (parts.length < 3) { return false; }
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const dow = d.getDay();
  return getAlarmRestDays().indexOf(dow) !== -1;
}
function alarmServicePrice(level) { return ALARM_TIERS[level] || ""; }
function alarmIsRedLevel(level) { return level === "tier1" || level === "tier2" || level === "tier3"; }
function alarmIsGreenLevel(level) { return level === "none"; }
function alarmToDateStr(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function alarmTodayStr() { return alarmToDateStr(new Date()); }
function alarmFormatDateNice(dateStr) {
  const parts = String(dateStr || "").split("-");
  if (parts.length < 3) return dateStr;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function alarmBuildMonthCells(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDow; i++) { cells.push({ dateStr: null, day: 0, inMonth: false }); }
  for (let d = 1; d <= daysInMonth; d++) { cells.push({ dateStr: alarmToDateStr(new Date(year, month, d)), day: d, inMonth: true }); }
  while (cells.length % 7 !== 0) { cells.push({ dateStr: null, day: 0, inMonth: false }); }
  return cells;
}
function alarmRenderCalendar(containerId, opts) {
  opts = opts || {};
  const container = document.getElementById(containerId);
  function draw() {
    const label = new Date(alarmView.year, alarmView.month, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    container.innerHTML =
      '<div class="alarm-cal-head">' +
        '<button type="button" class="alarm-nav" data-action="prev" aria-label="Previous month">&#8249;</button>' +
        '<div class="alarm-month">' + label + '</div>' +
        '<button type="button" class="alarm-nav" data-action="next" aria-label="Next month">&#8250;</button>' +
      '</div>' +
      '<div class="alarm-weekdays">' +
        '<div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>' +
      '</div>' +
      '<div class="alarm-grid"></div>';
    const grid = container.querySelector(".alarm-grid");
    const cells = alarmBuildMonthCells(alarmView.year, alarmView.month);
    cells.forEach(function (c) {
      const el = document.createElement("div");
      el.className = "alarm-cell" + (c.inMonth ? "" : " out");
      if (c.dateStr) {
        el.dataset.date = c.dateStr;
        el.textContent = c.day;
        const entry = getAlarmEntry(c.dateStr);
        const isRest = alarmIsRestDay(c.dateStr);
        const red = !isRest && alarmIsRedLevel(entry.serviceLevel);
        const green = !isRest && alarmIsGreenLevel(entry.serviceLevel);
        if (isRest) { el.classList.add("alarm-yellow"); }
        else {
          if (red) { el.classList.add("alarm-red"); }
          if (green) { el.classList.add("alarm-green"); }
        }
        if (c.dateStr === alarmTodayStr()) { el.classList.add("alarm-today"); }
        if (opts.readOnly) { el.classList.add("alarm-readonly"); }
        if (!opts.readOnly && opts.onSelect) { el.classList.add("alarm-clickable"); }
        let labelText = "";
        if (red) { labelText = alarmServicePrice(entry.serviceLevel); }
        else { labelText = entry.note || (green ? "Add Note" : ""); }
        if (labelText) {
          const lbl = document.createElement("div");
          lbl.className = "alarm-cell-label";
          lbl.textContent = labelText;
          el.appendChild(lbl);
        }
      }
      grid.appendChild(el);
    });
    const prevBtn = container.querySelector('[data-action="prev"]');
    const nextBtn = container.querySelector('[data-action="next"]');
    if (prevBtn) { prevBtn.addEventListener("click", function () { alarmView.month--; if (alarmView.month < 0) { alarmView.month = 11; alarmView.year--; } draw(); }); }
    if (nextBtn) { nextBtn.addEventListener("click", function () { alarmView.month++; if (alarmView.month > 11) { alarmView.month = 0; alarmView.year++; } draw(); }); }
  }
  draw();
}
