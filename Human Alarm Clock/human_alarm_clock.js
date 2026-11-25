(() => {
"use strict";
const ALARM_KEY = "humanAlarm_schedule";
const ALARM_TIERS = {
  tier1: { name: "Tier 1", price: "P50.00" },
  tier2: { name: "Tier 2", price: "P70.00" },
  tier3: { name: "Tier 3", price: "P100.00" }
};
let alarmSchedule = {};
let alarmView = { year: new Date().getFullYear(), month: new Date().getMonth() };
let selectedAlarmDate = null;

function loadAlarmSchedule() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ALARM_KEY) || "{}");
    alarmSchedule = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_) { alarmSchedule = {}; }
}
function saveAlarmSchedule() {
  try { localStorage.setItem(ALARM_KEY, JSON.stringify(alarmSchedule)); } catch (_) {}
}
function getAlarmEntry(dateStr) {
  const entry = alarmSchedule[dateStr];
  return entry && typeof entry === "object"
    ? { serviceLevel: entry.serviceLevel || "", note: entry.note || "" }
    : { serviceLevel: "", note: "" };
}
function alarmToDateStr(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
function alarmFormatDateNice(dateStr) {
  const parts = dateStr.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
}
function alarmBuildMonthCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let day = 1; day <= days; day++) cells.push(alarmToDateStr(new Date(year, month, day)));
  while (cells.length % 7) cells.push(null);
  return cells;
}
function createAlarmIconButton(title, action, dateStr) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-btn " + action;
  button.title = title;
  button.setAttribute("aria-label", title + " for " + dateStr);
  button.dataset.action = action;
  button.dataset.date = dateStr;
  const paths = {
    add: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    remove: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>'
  };
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths[action] + '</svg>';
  return button;
}
function alarmRenderCalendar() {
  const container = document.getElementById("alarmCalendar");
  if (!container) throw new Error("Calendar container #alarmCalendar was not found.");
  const monthLabel = new Date(alarmView.year, alarmView.month, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  container.innerHTML =
    '<div class="alarm-cal-head">' +
      '<button type="button" class="alarm-nav" data-month="-1" aria-label="Previous month">‹</button>' +
      '<div class="alarm-month">' + monthLabel + '</div>' +
      '<button type="button" class="alarm-nav" data-month="1" aria-label="Next month">›</button>' +
    '</div>' +
    '<div class="alarm-weekdays"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>' +
    '<div class="alarm-grid"></div>';
  const grid = container.querySelector(".alarm-grid");
  const today = alarmToDateStr(new Date());
  alarmBuildMonthCells(alarmView.year, alarmView.month).forEach(function(dateStr) {
    const cell = document.createElement("div");
    cell.className = "alarm-cell" + (dateStr ? "" : " out");
    if (dateStr) {
      const entry = getAlarmEntry(dateStr);
      const tier = Object.prototype.hasOwnProperty.call(ALARM_TIERS, entry.serviceLevel) ? ALARM_TIERS[entry.serviceLevel] : null;
      cell.dataset.date = dateStr;
      if (tier) cell.classList.add("alarm-red");
      if (dateStr === today) cell.classList.add("alarm-today");
      const dayNumber = document.createElement("span");
      dayNumber.textContent = String(Number(dateStr.slice(-2)));
      cell.appendChild(dayNumber);
      const actions = document.createElement("div");
      actions.className = "cell-actions";
      if (tier) {
        actions.appendChild(createAlarmIconButton("Edit Label", "edit", dateStr));
        actions.appendChild(createAlarmIconButton("Remove Label", "remove", dateStr));
        const label = document.createElement("div");
        label.className = "alarm-cell-label";
        label.textContent = tier.name + ": " + tier.price;
        cell.appendChild(label);
      } else {
        actions.appendChild(createAlarmIconButton("Add Label", "add", dateStr));
      }
      cell.appendChild(actions);
    }
    grid.appendChild(cell);
  });
}
function openAlarmModal(dateStr) {
  selectedAlarmDate = dateStr;
  const entry = getAlarmEntry(dateStr);
  const select = document.getElementById("serviceLevel");
  select.value = Object.prototype.hasOwnProperty.call(ALARM_TIERS, entry.serviceLevel) ? entry.serviceLevel : "";
  const editing = !!select.value;
  document.getElementById("modalDate").textContent = alarmFormatDateNice(dateStr);
  document.getElementById("modalTitle").textContent = editing ? "Edit Label" : "Add Label";
  document.getElementById("saveLabel").textContent = editing ? "Save Changes" : "Add Label";
  updateAlarmServicePrice();
  document.getElementById("labelModal").classList.add("open");
}
function closeAlarmModal() {
  document.getElementById("labelModal").classList.remove("open");
  selectedAlarmDate = null;
}
function updateAlarmServicePrice() {
  const tier = ALARM_TIERS[document.getElementById("serviceLevel").value];
  document.getElementById("servicePrice").textContent = tier ? tier.name + ": " + tier.price : "Select Service Level";
}
function showCalendarError(error) {
  const container = document.getElementById("alarmCalendar");
  if (container) container.innerHTML = '<p style="color:#b91c1c;font-size:14px">The calendar could not load. Please refresh the page. ' + String(error && error.message ? error.message : "") + '</p>';
}
function initAlarmCalendar() {
  try {
    loadAlarmSchedule();
    alarmRenderCalendar();
    document.getElementById("alarmCalendar").addEventListener("click", function(event) {
      const button = event.target.closest("button[data-action], button[data-month]");
      if (!button) return;
      if (button.dataset.month !== undefined) {
        alarmView.month += Number(button.dataset.month);
        if (alarmView.month < 0) { alarmView.month = 11; alarmView.year--; }
        if (alarmView.month > 11) { alarmView.month = 0; alarmView.year++; }
        alarmRenderCalendar();
        return;
      }
      const dateStr = button.dataset.date;
      if (button.dataset.action === "add" || button.dataset.action === "edit") openAlarmModal(dateStr);
      if (button.dataset.action === "remove") {
        delete alarmSchedule[dateStr];
        saveAlarmSchedule();
        alarmRenderCalendar();
      }
    });
    document.getElementById("serviceLevel").addEventListener("change", updateAlarmServicePrice);
    document.getElementById("saveLabel").addEventListener("click", function() {
      const level = document.getElementById("serviceLevel").value;
      if (!selectedAlarmDate || !Object.prototype.hasOwnProperty.call(ALARM_TIERS, level)) {
        document.getElementById("serviceLevel").focus();
        return;
      }
      alarmSchedule[selectedAlarmDate] = { serviceLevel: level, note: "" };
      saveAlarmSchedule();
      closeAlarmModal();
      alarmRenderCalendar();
    });
    document.getElementById("closeModal").addEventListener("click", closeAlarmModal);
    document.getElementById("cancelModal").addEventListener("click", closeAlarmModal);
    document.getElementById("labelModal").addEventListener("click", function(event) {
      if (event.target === this) closeAlarmModal();
    });
    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape" && document.getElementById("labelModal").classList.contains("open")) closeAlarmModal();
    });
  } catch (error) {
    console.error("Human Alarm Clock initialization failed:", error);
    showCalendarError(error);
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAlarmCalendar);
} else {
  initAlarmCalendar();
}
})();