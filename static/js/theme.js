// ================= THEME TOGGLE MODULE =================

document.addEventListener("DOMContentLoaded", function() {

    const themeToggle = document.getElementById("theme-toggle");
    const htmlElement = document.documentElement;
    const body = document.body;

    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem("theme") || "dark";
    
    // Initialize theme on page load
    if (savedTheme === "light") {
        body.classList.add("light-mode");
        themeToggle.textContent = "☀️";
    } else {
        body.classList.remove("light-mode");
        themeToggle.textContent = "🌙";
    }

    // Theme toggle event listener
    themeToggle.addEventListener("click", function() {
        body.classList.toggle("light-mode");

        // Check current theme and update icon + localStorage
        if (body.classList.contains("light-mode")) {
            localStorage.setItem("theme", "light");
            themeToggle.textContent = "☀️";
        } else {
            localStorage.setItem("theme", "dark");
            themeToggle.textContent = "🌙";
        }
    });

});
