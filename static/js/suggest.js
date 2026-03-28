document.addEventListener("DOMContentLoaded", () => {
    const extraTaskInput = document.getElementById("extra-task-input");
    const addExtraTaskBtn = document.getElementById("add-extra-task-btn");
    const extraTasksList = document.getElementById("extra-tasks-list");
    const getSuggestionBtn = document.getElementById("get-suggestion-btn");
    
    const suggestionLoading = document.getElementById("suggestion-loading");
    const suggestionOutput = document.getElementById("suggestion-output");
    
    const suggestedTaskHighlight = document.getElementById("suggested-task-highlight");
    const suggestedTaskReason = document.getElementById("suggested-task-reason");
    const orderedTasksList = document.getElementById("ordered-tasks-list");

    const extraTasks = [];

    // Add extra task
    addExtraTaskBtn.addEventListener("click", () => {
        const text = extraTaskInput.value.trim();
        if (text) {
            extraTasks.push(text);
            updateExtraTasksList();
            extraTaskInput.value = "";
        }
    });

    extraTaskInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            addExtraTaskBtn.click();
        }
    });

    // Remove extra task
    extraTasksList.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-extra-task-btn")) {
            const index = parseInt(e.target.dataset.index, 10);
            extraTasks.splice(index, 1);
            updateExtraTasksList();
        }
    });

    function updateExtraTasksList() {
        extraTasksList.innerHTML = "";
        extraTasks.forEach((task, index) => {
            const li = document.createElement("li");
            li.innerHTML = `<span>${task}</span> <button class="remove-extra-task-btn" data-index="${index}">✖</button>`;
            extraTasksList.appendChild(li);
        });
    }

    // Get Suggestion
    getSuggestionBtn.addEventListener("click", async () => {
        const energyLevel = document.querySelector('input[name="energy"]:checked').value;
        
        // Show loading state
        suggestionLoading.style.display = "block";
        suggestionOutput.style.display = "none";
        suggestionOutput.classList.remove("fade-in");
        
        try {
            const response = await fetch("/get_suggestion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    energy_level: energyLevel,
                    extra_tasks: extraTasks
                })
            });
            
            if (response.status === 401) {
                window.location.href = "/login";
                return;
            }
            
            const data = await response.json();
            
            // Render the result
            suggestedTaskHighlight.textContent = data.best_task || "No tasks available.";
            suggestedTaskReason.textContent = data.reason || "We couldn't generate a specific reason.";
            
            orderedTasksList.innerHTML = "";
            if (data.ordered_tasks && data.ordered_tasks.length > 0) {
                data.ordered_tasks.forEach((task, index) => {
                    const item = document.createElement("div");
                    item.className = "ordered-task-item";
                    item.innerHTML = `<span class="task-number">${index + 1}</span> <span class="task-text">${task}</span>`;
                    orderedTasksList.appendChild(item);
                });
            } else {
                orderedTasksList.innerHTML = "<p>No tasks to order.</p>";
            }
            
            // Hide loading, show output with animation
            suggestionLoading.style.display = "none";
            suggestionOutput.style.display = "block";
            
            // Force reflow
            void suggestionOutput.offsetWidth;
            suggestionOutput.classList.add("fade-in");

        } catch (error) {
            console.error("Error fetching suggestion:", error);
            alert("Something went wrong while fetching suggestion.");
            suggestionLoading.style.display = "none";
        }
    });
});
