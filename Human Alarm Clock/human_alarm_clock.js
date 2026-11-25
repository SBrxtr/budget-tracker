(() => {
"use strict";
const ALARM_KEY = "humanAlarm_schedule";
const REST_DAYS_KEY = "humanAlarm_restDays";
let restDayScheduleHistory = [];
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
function normalizeRestDays(days) {
  return Array.isArray(days)
    ? Array.from(new Set(days.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))).slice(0, 2).sort((a, b) => a - b)
    : [];
}
function loadRestDays() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REST_DAYS_KEY) || "[]");
    if (Array.isArray(parsed)) {
      // Older versions stored only the two weekdays; preserve that pattern for all earlier dates.
      const legacyDays = normalizeRestDays(parsed);
      restDayScheduleHistory = legacyDays.length ? [{ startDate: "0001-01-01", days: legacyDays }] : [];
    } else if (parsed && Array.isArray(parsed.history)) {
      restDayScheduleHistory = parsed.history
        .filter(item => item && /^\d{4}-\d{2}-\d{2}$/.test(item.startDate || ""))
        .map(item => ({ startDate: item.startDate, days: normalizeRestDays(item.days) }))
        .filter(item => item.days.length === 2)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
    } else if (parsed && Array.isArray(parsed.days)) {
      const legacyDays = normalizeRestDays(parsed.days);
      const startDate = /^\d{4}-\d{2}-\d{2}$/.test(parsed.startDate || "") ? parsed.startDate : "0001-01-01";
      restDayScheduleHistory = legacyDays.length ? [{ startDate, days: legacyDays }] : [];
    } else {
      restDayScheduleHistory = [];
    }
  } catch (_) { restDayScheduleHistory = []; }
}
function saveRestDays() {
  try { localStorage.setItem(REST_DAYS_KEY, JSON.stringify({ history: restDayScheduleHistory })); }
  catch (error) { console.error("Could not save work schedule:", error); }
}
function getRestDaysForDate(dateStr) {
  let active = [];
  for (const item of restDayScheduleHistory) {
    if (item.startDate > dateStr) break;
    active = item.days;
  }
  return active;
}
function isRestDayDate(dateStr) {
  const weekday = new Date(dateStr + "T12:00:00").getDay();
  return getRestDaysForDate(dateStr).includes(weekday);
}
function getSundayOfWeek(date) {
  const sunday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
  return alarmToDateStr(sunday);
}
function getSundayFromDateValue(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue || "")) return null;
  const parts = dateValue.split("-").map(Number);
  const chosenDate = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(chosenDate.getTime()) || alarmToDateStr(chosenDate) !== dateValue) return null;
  return getSundayOfWeek(chosenDate);
}
function updateRestDayHint() {
  const selected = document.querySelectorAll(".rest-day-choice:checked").length;
  const hint = document.getElementById("restDayHint");
  if (hint) hint.textContent = selected + " of 2 days selected";
  const save = document.getElementById("saveWorkSchedule");
  if (save) save.disabled = selected !== 2;
}
function openWorkScheduleModal() {
  const weekInput = document.getElementById("workScheduleStartWeek");
  const initialWeek = getSundayOfWeek(new Date());
  weekInput.value = initialWeek;
  updateRestDayChoicesForWeek();
  document.querySelectorAll(".rest-day-choice").forEach(function(choice) {
    choice.disabled = false;
  });
  updateRestDayHint();
  document.getElementById("workScheduleModal").classList.add("open");
}
function updateRestDayChoicesForWeek() {
  const sunday = getSundayFromDateValue(document.getElementById("workScheduleStartWeek").value);
  const activeDays = sunday ? getRestDaysForDate(sunday) : [];
  document.querySelectorAll(".rest-day-choice").forEach(function(choice) {
    choice.checked = activeDays.includes(Number(choice.value));
  });
  updateRestDayHint();
}
function closeWorkScheduleModal() {
  document.getElementById("workScheduleModal").classList.remove("open");
}
function saveWorkScheduleSelection() {
  const selected = Array.from(document.querySelectorAll(".rest-day-choice:checked")).map(choice => Number(choice.value));
  const weekInput = document.getElementById("workScheduleStartWeek");
  const sunday = getSundayFromDateValue(weekInput.value);
  if (selected.length !== 2 || !sunday) {
    updateRestDayHint();
    if (!sunday) weekInput.focus();
    return;
  }
  const today = alarmToDateStr(new Date());
  const effectiveStart = sunday < today ? today : sunday;
  // Keep all earlier schedule periods; replace only this date and later periods.
  restDayScheduleHistory = restDayScheduleHistory.filter(item => item.startDate < effectiveStart);
  restDayScheduleHistory.push({ startDate: effectiveStart, days: selected.sort((a, b) => a - b) });
  restDayScheduleHistory.sort((a, b) => a.startDate.localeCompare(b.startDate));
  saveRestDays();
  closeWorkScheduleModal();
  alarmRenderCalendar();
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
      const isRestDay = isRestDayDate(dateStr);
      if (isRestDay) {
        cell.classList.add("alarm-rest", "alarm-locked");
        cell.setAttribute("aria-disabled", "true");
        cell.setAttribute("aria-label", alarmFormatDateNice(dateStr) + ", Rest Day, unavailable for labels or notes");
        cell.setAttribute("tabindex", "-1");
        cell.removeAttribute("role");
      } else {
        cell.setAttribute("role", "button");
        cell.setAttribute("tabindex", "0");
      }
      else if (tier) cell.classList.add(entry.paid ? "alarm-green" : "alarm-red");
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

      if (isRestDay) {
        const restLabel = document.createElement("div");
        restLabel.className = "alarm-rest-label";
        restLabel.textContent = "Rest Day";
        cell.appendChild(restLabel);
      }

      if ((tier || hasNote) && !isRestDay) {
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
  if (isRestDayDate(dateStr)) return;
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
    loadRestDays();
    alarmRenderCalendar();

    document.getElementById("openWorkSchedule").addEventListener("click", openWorkScheduleModal);
    document.getElementById("closeWorkSchedule").addEventListener("click", closeWorkScheduleModal);
    document.getElementById("cancelWorkSchedule").addEventListener("click", closeWorkScheduleModal);
    document.getElementById("saveWorkSchedule").addEventListener("click", saveWorkScheduleSelection);
    document.getElementById("workScheduleStartWeek").addEventListener("change", updateRestDayChoicesForWeek);
    document.getElementById("workScheduleModal").addEventListener("click", function(event) {
      if (event.target === this) closeWorkScheduleModal();
    });
    document.querySelectorAll(".rest-day-choice").forEach(function(choice) {
      choice.addEventListener("change", function() {
        const selected = Array.from(document.querySelectorAll(".rest-day-choice:checked"));
        if (selected.length > 2) choice.checked = false;
        updateRestDayHint();
      });
    });
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
        if (actionButton.dataset.action === "remove" && !isRestDayDate(dateStr)) {
          delete alarmSchedule[dateStr];
          saveAlarmSchedule();
          alarmRenderCalendar();
        }
        return;
      }
      if (event.target.closest("input[data-paid-date]")) return;
      const cell = event.target.closest(".alarm-cell[data-date]");
      if (cell && !isRestDayDate(cell.dataset.date)) openAlarmModal(cell.dataset.date);
    });
    document.getElementById("alarmCalendar").addEventListener("change", function(event) {
      const checkbox = event.target.closest("input[data-paid-date]");
      if (!checkbox) return;
      const dateStr = checkbox.dataset.paidDate;
      if (isRestDayDate(dateStr)) { alarmRenderCalendar(); return; }
      const entry = getAlarmEntry(dateStr);
      if (!Object.prototype.hasOwnProperty.call(ALARM_TIERS, entry.serviceLevel)) return;
      alarmSchedule[dateStr] = { serviceLevel: entry.serviceLevel, note: entry.note, paid: checkbox.checked };
      saveAlarmSchedule();
      alarmRenderCalendar();
    });
    document.getElementById("alarmCalendar").addEventListener("keydown", function(event) {
      if ((event.key === "Enter" || event.key === " ") && event.target.matches(".alarm-cell[data-date]") && !isRestDayDate(event.target.dataset.date)) {
        event.preventDefault();
        openAlarmModal(event.target.dataset.date);
      }
    });
    document.getElementById("serviceLevel").addEventListener("change", updateAlarmServicePrice);
    document.getElementById("saveLabel").addEventListener("click", function() {
      const level = document.getElementById("serviceLevel").value;
      const notes = document.getElementById("labelNotes").value.trim();
      if (!selectedAlarmDate || isRestDayDate(selectedAlarmDate)) return;
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
      if (event.key === "Escape" && document.getElementById("workScheduleModal").classList.contains("open")) closeWorkScheduleModal();
    });
  } catch (error) {
    console.error("Human Alarm Clock initialization failed:", error);
    showCalendarError(error);
  }
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAlarmCalendar);
else initAlarmCalendar();
})();