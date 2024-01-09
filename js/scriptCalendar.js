document.addEventListener('DOMContentLoaded', function () {
  const today = new Date();
  const calendarElement = document.getElementById('calendar');
  const prevButton = document.getElementById('prev');
  const nextButton = document.getElementById('next');
  const monthDropdown = document.getElementById('monthDropdown');
  const monthLabel = document.getElementById('monthLabel');
  const yearLabel = document.getElementById('yearLabel');
  const selectedDates = new Set();
  window.selectedDates = selectedDates;
  const chanceElement = document.getElementById('chance');
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();

  const monthNames = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];
  const dayNames = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  monthLabel.textContent = monthNames[currentMonth];
  yearLabel.textContent = currentYear.toString();

  function updateChanceText() {
    const count = selectedDates.size;
    let text = '';
    if (count === 0) {
      text = '- (selecteer data)';
    } else if (count >= 1 && count <= 4) {
      text = 'klein-gemiddeld';
    } else if (count >= 5 && count <= 8) {
      text = 'gemiddeld';
    } else {
      text = 'gemiddeld-groot';
    }
    chanceElement.textContent = text;
  }

  function toggleMonthDropdown() {
    monthDropdown.style.display = monthDropdown.style.display === 'none' ? 'block' : 'none';
    highlightCurrentMonthInDropdown();
  }

  function highlightCurrentMonthInDropdown() {
    document.querySelectorAll('.month-option').forEach(function (option) {
      option.classList.remove('current-month');
      if (parseInt(option.getAttribute('data-month')) === currentMonth) {
        option.classList.add('current-month');
      }
    });
  }

  function updateCalendarForMonth(month) {
    currentMonth = month;
    renderCalendar(month, currentYear);
    monthLabel.textContent = monthNames[month];
    toggleMonthDropdown();
  }

  monthLabel.addEventListener('click', toggleMonthDropdown);

  document.querySelectorAll('.month-option').forEach(monthOption => {
    monthOption.addEventListener('click', function () {
      const selectedMonth = parseInt(this.getAttribute('data-month'), 10);
      updateCalendarForMonth(selectedMonth);
    });
  });

  function addEventListenersToDays() {
    const days = calendarElement.querySelectorAll('td:not(.disabled):not(.not-current-month)');
    days.forEach(day => {
      day.addEventListener('click', function () {
        const date = this.getAttribute('data-date');
        if (selectedDates.has(date)) {
          selectedDates.delete(date);
          this.classList.remove('selected-date');
        } else {
          selectedDates.add(date);
          this.classList.add('selected-date');
        }
        if (window.updateCourseDates) {
          window.updateCourseDates();
        }
        updateChanceText();
      });
    });
  }

  function isDateEnabled(date) {
    const currentDate = new Date();
    const maxDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 5, currentDate.getDate());
    return date <= maxDate && date >= currentDate && date.getDay() !== 6 && date.getDay() !== 0;
  }

  function renderCalendar(month, year) {
    monthLabel.textContent = monthNames[month];
    yearLabel.textContent = year;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = 32 - new Date(year, month, 32).getDate();

    let calendar = `<table class="calendar-table"><thead><tr>`;
    dayNames.forEach(day => {
      calendar += `<th>${day}</th>`;
    });
    calendar += `</tr></thead><tbody><tr>`;

    const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;

    const previousMonth = new Date(year, month, 0);
    const previousMonthDays = previousMonth.getDate();
    for (let i = 0; i < firstDayAdjusted; i++) {
      calendar += `<td class="not-current-month disabled">${previousMonthDays - firstDayAdjusted + i + 1}</td>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      let currentDate = new Date(year, month, day);
      let dateStr = currentDate.toISOString().split('T')[0];
      let isEnabled = isDateEnabled(currentDate);
      let tdClass = !isEnabled ? 'disabled' : '';
      tdClass += selectedDates.has(dateStr) ? ' selected-date' : '';

      if (currentDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
        tdClass += ' today';
      }

      calendar += `<td class="${tdClass}" data-date="${dateStr}">${day}</td>`;
      if ((firstDayAdjusted + day) % 7 === 0 && day !== daysInMonth) {
        calendar += `</tr><tr>`;
      }
    }

    let daysAdded = 1;
    while ((firstDayAdjusted + daysInMonth + daysAdded - 1) % 7 !== 0) {
      calendar += `<td class="not-current-month disabled">${daysAdded}</td>`;
      daysAdded++;
    }

    calendar += `</tr></tbody></table>`;
    calendarElement.innerHTML = calendar;

    addEventListenersToDays();
  }

  if (prevButton) {
    prevButton.addEventListener('click', function (event) {
      event.preventDefault();
      if (currentMonth === 0) {
        currentMonth = 11;
        currentYear--;
      } else {
        currentMonth--;
      }
      renderCalendar(currentMonth, currentYear);
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', function (event) {
      event.preventDefault();
      if (currentMonth === 11) {
        currentMonth = 0;
        currentYear++;
      } else {
        currentMonth++;
      }
      renderCalendar(currentMonth, currentYear);
    });
  }

  renderCalendar(currentMonth, currentYear);
  highlightCurrentMonthInDropdown();
  updateChanceText();
});
