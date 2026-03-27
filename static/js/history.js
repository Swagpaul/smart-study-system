// ================= HISTORY MODULE (PRO VERSION) =================

document.addEventListener("DOMContentLoaded", function() {

    const historyDatesContainer = document.getElementById("history-dates");
    const historyTasksContainer = document.getElementById("history-tasks");
    const historyProgressFill = document.getElementById("history-progress-fill");
    const historyProgressText = document.getElementById("history-progress-text");
    const historyDateTitle = document.getElementById("history-date-title");

    let currentActiveBtn = null;

    function getLast7Days() {
        const days = [];
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            days.push(d.toISOString().split("T")[0]);
        }

        return days;
    }

    async function loadHistoryForDate(date) {

        const response = await fetch(`/tasks?date=${date}`);
        const tasks = await response.json();

        historyTasksContainer.innerHTML = "";
        historyDateTitle.innerText = "History for " + date;

        if (tasks.length === 0) {
            historyTasksContainer.innerHTML = "<p>No tasks for this day.</p>";
            historyProgressFill.style.width = "0%";
            historyProgressText.innerText = "0%";
            return;
        }

        let completed = 0;

        tasks.forEach(task => {

            if (task.completed) completed++;

            const div = document.createElement("div");
            div.className = "history-task";
            div.style.marginBottom = "10px";

            div.innerHTML = `
                <strong>${task.title}</strong>
                <span style="margin-left:10px;">
                    ${task.completed ? "✔️ Completed" : "❌ Not Completed"}
                </span>
            `;

            historyTasksContainer.appendChild(div);
        });

        let percent = Math.round((completed / tasks.length) * 100);

        historyProgressFill.style.width = percent + "%";
        historyProgressText.innerText = percent + "%";
    }

    const days = getLast7Days();
    historyDatesContainer.innerHTML = "";

    days.forEach((date, index) => {

        const btn = document.createElement("button");
        btn.textContent = date;
        btn.className = "history-date-btn";

        btn.addEventListener("click", () => {

            if (currentActiveBtn) {
                currentActiveBtn.classList.remove("active-date");
            }

            btn.classList.add("active-date");
            currentActiveBtn = btn;

            loadHistoryForDate(date);
        });

        historyDatesContainer.appendChild(btn);

        // Auto load today's date (first button)
        if (index === 0) {
            btn.classList.add("active-date");
            currentActiveBtn = btn;
            loadHistoryForDate(date);
        }

    });

});