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
  try { localStorage.setItem(ALARM_KEY, JSON.stringify(alarmSchedule)); } catch (error) { console.error("Could not save calendar data:", error); }
}
function getAlarmEntry(dateStr) {
  const entry = alarmSchedule[dateStr];
  if (typeof entry === "string") {
    return { serviceLevel: entry, note: "", paid: false };
  }
  return entry && typeof entry === "object"
    ? { serviceLevel: entry.serviceLevel || "", note: entry.note || "", paid: entry.paid === true }
    : { serviceLevel: "", note: "", paid: false };
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
function makeIconButton(title, action, dateStr) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-btn " + action;
  button.title = title;
  button.setAttribute("aria-label", title + " for " + dateStr);
  button.dataset.action = action;
  button.dataset.date = dateStr;
  const paths = {
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    remove: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>'
  };
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths[action] + '</svg>';
  return button;
}
function alarmRenderUnpaidSummary() {
  const countElement = document.getElementById("unpaidDaysCount");
  const listElement = document.getElementById("unpaidDaysList");
  const totalElement = document.getElementById("unpaidTotalAmount");
  if (!countElement || !listElement || !totalElement) return;

  const unpaid = Object.keys(alarmSchedule).map(function(dateStr) {
    const entry = getAlarmEntry(dateStr);
    const tier = ALARM_TIERS[entry.serviceLevel];
    if (!tier || entry.paid) return null;
    const parts = dateStr.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return {
      dateStr: dateStr,
      date: date,
      amount: Number(tier.price.replace(/[^0-9.]/g, "")) || 0
    };
  }).filter(Boolean).sort(function(a, b) { return a.date - b.date; });

  const total = unpaid.reduce(function(sum, item) { return sum + item.amount; }, 0);
  countElement.textContent = String(unpaid.length);
  listElement.textContent = unpaid.length
    ? unpaid.map(function(item) {
        return item.date.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
      }).join(" • ")
    : "No unpaid days.";
  totalElement.textContent = "P" + total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      const hasNote = !tier && entry.note.trim().length > 0;
      cell.dataset.date = dateStr;
      cell.setAttribute("role", "button");
      cell.setAttribute("tabindex", "0");
      cell.setAttribute("aria-label", alarmFormatDateNice(dateStr) + (tier ? ", " + tier.name + (entry.paid ? ", paid" : ", unpaid") : hasNote ? ", " + entry.note : ", add label"));
      if (tier) cell.classList.add(entry.paid ? "alarm-green" : "alarm-red");
      else if (hasNote) cell.classList.add("alarm-note");
      if (dateStr === today) cell.classList.add("alarm-today");

      const dayNumber = document.createElement("span");
      dayNumber.textContent = String(Number(dateStr.slice(-2)));
      cell.appendChild(dayNumber);

      if (tier) {
        const label = document.createElement("div");
        label.className = "alarm-cell-label";
        label.textContent = tier.name + ": " + tier.price;
        cell.appendChild(label);

        const paidLabel = document.createElement("label");
        paidLabel.className = "alarm-paid";
        paidLabel.addEventListener("click", event => event.stopPropagation());
        const paidCheckbox = document.createElement("input");
        paidCheckbox.type = "checkbox";
        paidCheckbox.checked = entry.paid;
        paidCheckbox.dataset.paidDate = dateStr;
        paidCheckbox.setAttribute("aria-label", "Mark " + dateStr + " as paid");
        paidLabel.appendChild(paidCheckbox);
        paidLabel.appendChild(document.createTextNode(entry.paid ? "Paid" : "Unpaid"));
        cell.appendChild(paidLabel);
      } else if (hasNote) {
        const note = document.createElement("div");
        note.className = "alarm-cell-note";
        note.textContent = entry.note;
        cell.appendChild(note);
      }

      if (tier || hasNote) {
        const actions = document.createElement("div");
        actions.className = "cell-actions";
        actions.appendChild(makeIconButton("Remove Label", "remove", dateStr));
        cell.appendChild(actions);
      }
    }
    grid.appendChild(cell);
  });
  alarmRenderUnpaidSummary();
}
function updateAlarmServicePrice() {
  const level = document.getElementById("serviceLevel").value;
  const tier = ALARM_TIERS[level];
  const notes = document.getElementById("labelNotes");
  const price = document.getElementById("servicePrice");
  const serviceLabel = document.querySelector('label[for="serviceLevel"]');
  if (level === "notes") {
    if (serviceLabel) serviceLabel.style.display = "none";
    price.style.display = "none";
    notes.classList.add("visible");
    notes.focus();
  } else {
    if (serviceLabel) serviceLabel.style.display = "block";
    price.style.display = "block";
    notes.classList.remove("visible");
    price.textContent = tier ? tier.name + ": " + tier.price : "Select Service Level";
  }
}
function openAlarmModal(dateStr) {
  selectedAlarmDate = dateStr;
  const entry = getAlarmEntry(dateStr);
  const select = document.getElementById("serviceLevel");
  const notes = document.getElementById("labelNotes");
  select.value = Object.prototype.hasOwnProperty.call(ALARM_TIERS, entry.serviceLevel) ? entry.serviceLevel : (entry.note ? "notes" : "");
  notes.value = entry.note;
  const editing = !!(select.value || entry.note);
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
function showCalendarError(error) {
  const container = document.getElementById("alarmCalendar");
  if (container) container.innerHTML = '<p style="color:#b91c1c;font-size:14px">The calendar could not load. Please refresh the page. ' + String(error && error.message ? error.message : "") + '</p>';
}
function initAlarmCalendar() {
  try {
    loadAlarmSchedule();
    alarmRenderCalendar();
    document.getElementById("alarmCalendar").addEventListener("click", function(event) {
      const monthButton = event.target.closest("button[data-month]");
      if (monthButton) {
        alarmView.month += Number(monthButton.dataset.month);
        if (alarmView.month < 0) { alarmView.month = 11; alarmView.year--; }
        if (alarmView.month > 11) { alarmView.month = 0; alarmView.year++; }
        alarmRenderCalendar();
        return;
      }
      const actionButton = event.target.closest("button[data-action]");
      if (actionButton) {
        const dateStr = actionButton.dataset.date;
        if (actionButton.dataset.action === "remove") {
          delete alarmSchedule[dateStr];
          saveAlarmSchedule();
          alarmRenderCalendar();
        }
        return;
      }
      if (event.target.closest("input[data-paid-date]")) return;
      const cell = event.target.closest(".alarm-cell[data-date]");
      if (cell) openAlarmModal(cell.dataset.date);
    });
    document.getElementById("alarmCalendar").addEventListener("change", function(event) {
      const checkbox = event.target.closest("input[data-paid-date]");
      if (!checkbox) return;
      const dateStr = checkbox.dataset.paidDate;
      const entry = getAlarmEntry(dateStr);
      if (!Object.prototype.hasOwnProperty.call(ALARM_TIERS, entry.serviceLevel)) return;
      alarmSchedule[dateStr] = { serviceLevel: entry.serviceLevel, note: entry.note, paid: checkbox.checked };
      saveAlarmSchedule();
      alarmRenderCalendar();
    });
    document.getElementById("alarmCalendar").addEventListener("keydown", function(event) {
      if ((event.key === "Enter" || event.key === " ") && event.target.matches(".alarm-cell[data-date]")) {
        event.preventDefault();
        openAlarmModal(event.target.dataset.date);
      }
    });
    document.getElementById("serviceLevel").addEventListener("change", updateAlarmServicePrice);
    document.getElementById("saveLabel").addEventListener("click", function() {
      const level = document.getElementById("serviceLevel").value;
      const notes = document.getElementById("labelNotes").value.trim();
      if (!selectedAlarmDate) return;
      if (Object.prototype.hasOwnProperty.call(ALARM_TIERS, level)) {
        const previous = getAlarmEntry(selectedAlarmDate);
        alarmSchedule[selectedAlarmDate] = { serviceLevel: level, note: "", paid: previous.serviceLevel === level ? previous.paid : false };
      } else if (level === "notes" && notes) {
        alarmSchedule[selectedAlarmDate] = { serviceLevel: "", note: notes, paid: false };
      } else {
        document.getElementById(level === "notes" ? "labelNotes" : "serviceLevel").focus();
        return;
      }
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
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAlarmCalendar);
else initAlarmCalendar();
})();