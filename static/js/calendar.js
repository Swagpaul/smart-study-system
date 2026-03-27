// ================= CALENDAR + NOTES MODULE =================

const storageKey = "smartplanner_calendar_notes";
let currentDate = new Date();
let selectedDateString = formatDateKey(currentDate);
let activeFilter = "all";
let editingNoteId = null;

const calendarMonthYear = document.getElementById("calendar-month-year");
const calendarGrid = document.getElementById("calendar-grid");
const notesTitle = document.getElementById("notes-title");
const notesCount = document.getElementById("notes-count");
const notesList = document.getElementById("notes-list");
const upcomingList = document.getElementById("upcoming-list");
const filterButtons = document.querySelectorAll(".filter-btn");

const noteForm = document.getElementById("note-form");
const noteTitleInput = document.getElementById("note-title");
const noteDescInput = document.getElementById("note-desc");
const noteTimeInput = document.getElementById("note-time");
const noteImportantInput = document.getElementById("note-important");
const noteSubmitBtn = document.getElementById("note-submit");
const upcomingSection = document.querySelector(".upcoming-section");

function loadNotesFromStorage() {
    try {
        const raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        console.error("Unable to parse storage", err);
        return {};
    }
}

function saveNotesToStorage(data) {
    localStorage.setItem(storageKey, JSON.stringify(data));
}

function getNotesForDate(dateKey) {
    const all = loadNotesFromStorage();
    return Array.isArray(all[dateKey]) ? all[dateKey] : [];
}

function setNotesForDate(dateKey, notes) {
    const all = loadNotesFromStorage();
    all[dateKey] = notes;
    saveNotesToStorage(all);
}

function getDateWithNotesSet() {
    const all = loadNotesFromStorage();
    return new Set(Object.keys(all).filter(key => Array.isArray(all[key]) && all[key].length));
}

function getDateString(date) {
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateKey(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function renderCalendar() {
    calendarGrid.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    calendarMonthYear.textContent = firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    weekDays.forEach(w => {
        const div = document.createElement('div');
        div.className = 'calendar-weekday';
        div.textContent = w;
        calendarGrid.appendChild(div);
    });

    const startOffset = firstDay.getDay();
    for (let i = 0; i < startOffset; i++) {
        const placeholder = document.createElement('div');
        placeholder.className = 'calendar-day';
        placeholder.style.visibility = 'hidden';
        calendarGrid.appendChild(placeholder);
    }

    const dateWithNotes = getDateWithNotesSet();
    const todayKey = formatDateKey(new Date());

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.textContent = day;

        const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const notesForDay = getNotesForDate(key);
        const noteCount = notesForDay.length;

        if (noteCount > 0) {
            cell.classList.add('has-notes');

            const dotsBox = document.createElement('div');
            dotsBox.className = 'calendar-day-dots';

            for (let i = 0; i < noteCount && i < 7; i++) {
                const smallDot = document.createElement('div');
                smallDot.className = 'calendar-day-dot';
                dotsBox.appendChild(smallDot);
            }

            if (noteCount > 7) {
                const moreLabel = document.createElement('span');
                moreLabel.textContent = `+${noteCount - 7}`;
                moreLabel.style.fontSize = '10px';
                moreLabel.style.color = 'var(--text-secondary)';
                moreLabel.style.marginLeft = '4px';
                dotsBox.appendChild(moreLabel);
            }

            cell.appendChild(dotsBox);
        }

        if (key === todayKey) {
            cell.classList.add('today');
        }

        if (key === selectedDateString) {
            cell.classList.add('selected');
        }

        cell.addEventListener('click', () => {
            selectedDateString = key;
            renderCalendar();
            renderNotes();
        });

        calendarGrid.appendChild(cell);
    }

    renderNotes();
}

function renderNotes() {
    const notes = getNotesForDate(selectedDateString);

    notesTitle.textContent = `Notes for ${getDateString(new Date(selectedDateString))}`;

    const completedCount = notes.filter(n => n.completed).length;
    notesCount.textContent = `Total: ${notes.length} • Completed: ${completedCount}`;

    const filtered = notes.filter(note => {
        const isImportant = note.important === true || note.important === 'true' || note.important === 1 || note.important === '1';
        const isCompleted = note.completed === true || note.completed === 'true' || note.completed === 1 || note.completed === '1';

        if (activeFilter === 'important') return isImportant;
        if (activeFilter === 'completed') return isCompleted;
        return true;
    });

    notesList.innerHTML = '';

    if (activeFilter === 'all') {
        noteForm.style.display = 'grid';
        upcomingSection.style.display = 'block';
    } else {
        noteForm.style.display = 'none';
        upcomingSection.style.display = 'none';
    }

    if (!filtered.length) {
        notesList.innerHTML = '<p style="color: var(--text-secondary);">No notes found for this filter.</p>';
        return;
    }

    filtered.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card fade-transition';
        card.classList.add(note.completed ? 'completed' : 'pending');

        const title = document.createElement('h4');
        title.className = 'note-title';
        title.textContent = note.title || 'Untitled';

        const meta = document.createElement('div');
        meta.className = 'note-meta';
        const flags = [];
        if (note.important) flags.push('⭐ Important');
        if (note.completed) flags.push('✅ Completed');
        if (note.reminderAt) flags.push(`⏰ ${note.reminderAt}`);
        meta.textContent = `${note.time || ''} · ${new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${flags.length ? '• ' + flags.join(' • ') : ''}`;

        const desc = document.createElement('p');
        desc.className = 'note-description';
        desc.textContent = note.description || '(No description)';

        const statusWrap = document.createElement('div');
        statusWrap.style.display = 'flex';
        statusWrap.style.alignItems = 'center';
        statusWrap.style.gap = '8px';
        statusWrap.style.marginBottom = '8px';

        const completeCheck = document.createElement('input');
        completeCheck.type = 'checkbox';
        completeCheck.id = `completed-${note.id}`;
        completeCheck.checked = note.completed || false;

        const completeLabel = document.createElement('label');
        completeLabel.htmlFor = completeCheck.id;
        completeLabel.style.fontSize = '0.88rem';
        completeLabel.style.color = 'var(--text-secondary)';
        completeLabel.textContent = 'Completed';

        completeCheck.addEventListener('change', () => {
            note.completed = completeCheck.checked;
            const existing = getNotesForDate(selectedDateString);
            const updated = existing.map(item => item.id === note.id ? note : item);
            setNotesForDate(selectedDateString, updated);
            renderNotes();
        });

        statusWrap.appendChild(completeCheck);
        statusWrap.appendChild(completeLabel);

        card.appendChild(title);
        card.appendChild(meta);
        card.appendChild(statusWrap);
        card.appendChild(desc);

        const actions = document.createElement('div');
        actions.className = 'note-actions';

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => {
            editingNoteId = note.id;
            noteTitleInput.value = note.title;
            noteDescInput.value = note.description;
            noteTimeInput.value = note.time || '';
            noteImportantInput.checked = note.important || false;
            noteSubmitBtn.textContent = 'Update Note';
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            const existing = getNotesForDate(selectedDateString);
            const remaining = existing.filter(item => item.id !== note.id);
            setNotesForDate(selectedDateString, remaining);
            renderCalendar();
            renderNotes();
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        card.appendChild(actions);

        notesList.appendChild(card);
    });
}

function renderUpcoming() {
    upcomingList.innerHTML = '';
    const all = loadNotesFromStorage();
    const today = new Date();

    let upcoming = [];
    for (let day = 0; day <= 3; day++) {
        const dt = new Date(today);
        dt.setDate(dt.getDate() + day);
        const key = formatDateKey(dt);
        const notes = getNotesForDate(key);
        notes.forEach(note => {
            upcoming.push({ date: key, note });
        });
    }

    upcoming.sort((a, b) => {
        if (a.date === b.date) return (a.note.time || '').localeCompare(b.note.time || '');
        return a.date.localeCompare(b.date);
    });

    if (!upcoming.length) {
        upcomingList.innerHTML = '<p style="color: var(--text-secondary);">No upcoming tasks in next 3 days</p>';
        return;
    }

    upcoming.slice(0, 8).forEach(entry => {
        const item = document.createElement('div');
        item.className = 'upcoming-item';
        item.innerHTML = `<strong>${entry.date}</strong>: ${entry.note.title || '(No Title)'} ${entry.note.time ? "@ " + entry.note.time : ''}`;
        upcomingList.appendChild(item);
    });
}

function clearForm() {
    noteTitleInput.value = '';
    noteDescInput.value = '';
    noteTimeInput.value = '';
    noteImportantInput.checked = false;
    editingNoteId = null;
    noteSubmitBtn.textContent = 'Add Note';
}

noteForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = noteTitleInput.value.trim();
    const description = noteDescInput.value.trim();
    const time = noteTimeInput.value;
    const important = noteImportantInput.checked;
    const completed = false; // completion controlled on card checkbox

    if (!description && !title) {
        alert('Please add a title or description.');
        return;
    }

    const notes = getNotesForDate(selectedDateString);

    if (editingNoteId !== null) {
        const idx = notes.findIndex(n => n.id === editingNoteId);
        if (idx !== -1) {
            notes[idx] = {
                ...notes[idx],
                title,
                description,
                time,
                important,
                completed
            };
        }
    } else {
        const newNote = {
            id: Date.now(),
            title,
            description,
            time,
            important,
            completed,
            createdAt: new Date().toISOString(),
            reminderAt: null
        };
        notes.push(newNote);
    }

    setNotesForDate(selectedDateString, notes);
    clearForm();
    renderCalendar();
    renderNotes();
    renderUpcoming();
});

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderNotes();
    });
});

document.getElementById('calendar-prev').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('calendar-next').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

window.addEventListener('storage', () => {
    renderCalendar();
    renderNotes();
    renderUpcoming();
});

// initialize
renderCalendar();
renderUpcoming();
