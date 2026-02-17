const steps = document.querySelectorAll(".step");
const indicators = document.querySelectorAll(".steps span");
let currentStep = 0;

function showStep(index) {
  steps.forEach(s => s.classList.remove("active"));
  indicators.forEach(i => i.classList.remove("active"));
  steps[index].classList.add("active");
  indicators[index].classList.add("active");
  currentStep = index;
}

/* step navigation */
document.querySelectorAll(".next").forEach(btn =>
  btn.onclick = () => showStep(currentStep + 1)
);

document.querySelectorAll(".back").forEach(btn =>
  btn.onclick = () => showStep(currentStep - 1)
);

/* selectable cards */
document.querySelectorAll(".selectable").forEach(el => {
  el.onclick = () => {
    el.parentElement
      .querySelectorAll(".selectable")
      .forEach(i => i.classList.remove("selected"));
    el.classList.add("selected");
  };
});

/* calendar */
const monthYear = document.getElementById("monthYear");
const datesContainer = document.getElementById("calendarDates");
let date = new Date();

function renderCalendar() {
  datesContainer.innerHTML = "";
  const year = date.getFullYear();
  const month = date.getMonth();

  monthYear.innerText = date.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    datesContainer.innerHTML += `<span></span>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const span = document.createElement("span");
    span.innerText = d;
    span.onclick = () => {
      document.querySelectorAll(".dates span")
        .forEach(s => s.classList.remove("active"));
      span.classList.add("active");
    };
    datesContainer.appendChild(span);
  }
}

renderCalendar();

document.getElementById("prevMonth").onclick = () => {
  date.setMonth(date.getMonth() - 1);
  renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
  date.setMonth(date.getMonth() + 1);
  renderCalendar();
};
