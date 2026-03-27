// ================= MENU MODULE WITH SECTION SWITCH =================

const menuItems = document.querySelectorAll(".menu-item");
const sideItems = document.querySelectorAll(".sidebar .nav-item");
const sideSectionItems = document.querySelectorAll(".sidebar .nav-item[data-section]");
const sections = document.querySelectorAll(".section");

function showSection(name) {
    sections.forEach(section => section.classList.remove("active-section"));
    const targetSection = document.getElementById("section-" + name);
    if (targetSection) {
        targetSection.classList.add("active-section");
        // Notify other modules (e.g. motivational quotes) when the visible screen changes.
        document.dispatchEvent(
            new CustomEvent("smartplanner:screenchange", { detail: { screen: name } })
        );
    }
}

menuItems.forEach(item => {
    item.addEventListener("click", function () {
        menuItems.forEach(i => i.classList.remove("active"));
        this.classList.add("active");

        showSection(this.dataset.section);

        // keep sidebar state reset if sidebar used later
        sideItems.forEach(i => i.classList.remove("active"));
    });
});

sideSectionItems.forEach((item) => {
    item.addEventListener("click", function () {
        if (this.classList.contains("forest-link")) {
            return;
        }

        sideItems.forEach(i => i.classList.remove("active"));
        this.classList.add("active");

        const section = this.dataset.section || "calendar";
        showSection(section);

        menuItems.forEach(i => i.classList.remove("active"));
        const bottomTarget = document.querySelector(`.menu-item[data-section="${section}"]`);
        if (bottomTarget) 
            bottomTarget.classList.add("active");
    });
});

// initial state
if (sideItems.length) {
    const allowedSections = new Set(["calendar", "timer", "history", "ai", "analytics"]);
    const requestedSection = new URLSearchParams(window.location.search).get("section");
    const initialSection = allowedSections.has(requestedSection) ? requestedSection : "calendar";

    sideItems.forEach(i => i.classList.remove("active"));
    const initialSidebarItem = document.querySelector(`.sidebar .nav-item[data-section="${initialSection}"]`);
    if (initialSidebarItem) {
        initialSidebarItem.classList.add("active");
    } else {
        const fallbackSidebarItem = document.querySelector(".sidebar .nav-item[data-section]");
        if (fallbackSidebarItem) {
            fallbackSidebarItem.classList.add("active");
        }
    }

    showSection(initialSection);

    menuItems.forEach(i => i.classList.remove("active"));
    const initialBottomTarget = document.querySelector(`.menu-item[data-section="${initialSection}"]`);
    if (initialBottomTarget) {
        initialBottomTarget.classList.add("active");
    }
}
