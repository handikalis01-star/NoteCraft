let notes = JSON.parse(localStorage.getItem('notecraft_notes')) || [
    {
        id: '1',
        title: 'Selamat Datang di NoteCraft 👋',
        category: 'Pribadi',
        content: '# Panduan Singkat NoteCraft\n\nAplikasi catatan ini mendukung **Markdown** penuh dan tersimpan otomatis di *LocalStorage* browser Anda!\n\n### Fitur Utama:\n- **Pencarian Real-time**: Cari catatan berdasarkan judul atau isi.\n- **Kategori Tag**: Kelompokkan catatan ke dalam kategori Pribadi, Kerja, atau Ide.\n- **Markdown Preview**: Lihat hasil format secara langsung.\n- **Penyimpanan Permanen**: Data aman meskipun browser ditutup.',
        updatedAt: new Date().toISOString()
    }
];

let activeNoteId = notes.length > 0 ? notes[0].id : null;
let currentSearchQuery = '';
let currentCategoryFilter = 'all';
let currentViewMode = 'edit';

// DOM Elements
const notesListContainer = document.getElementById('notesListContainer');
const emptyState = document.getElementById('emptyState');
const noteTitleInput = document.getElementById('noteTitleInput');
const noteCategorySelect = document.getElementById('noteCategorySelect');
const noteContentInput = document.getElementById('noteContentInput');
const markdownPreview = document.getElementById('markdownPreview');
const btnEdit = document.getElementById('btnEdit');
const btnPreview = document.getElementById('btnPreview');
const statTotal = document.getElementById('statTotal');
const statWords = document.getElementById('statWords');
const lastModifiedText = document.getElementById('lastModifiedText');
const currentNoteWords = document.getElementById('currentNoteWords');

function initApp() {
    saveToLocalStorage();
    renderNotesList();
    loadActiveNoteToEditor();
    updateStats();
}

function saveToLocalStorage() {
    localStorage.setItem('notecraft_notes', JSON.stringify(notes));
}

function renderNotesList() {
    let filteredNotes = notes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(currentSearchQuery.toLowerCase()) || 
                              note.content.toLowerCase().includes(currentSearchQuery.toLowerCase());
        const matchesCategory = currentCategoryFilter === 'all' || note.category === currentCategoryFilter;
        return matchesSearch && matchesCategory;
    });

    // Sort by latest updated
    filteredNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (filteredNotes.length === 0) {
        notesListContainer.innerHTML = `
            <div class="text-center py-10 px-4 text-slate-500 text-xs">
                <i class="fa-solid fa-folder-open text-2xl mb-2 opacity-40"></i>
                <p>Tidak ada catatan ditemukan.</p>
            </div>
        `;
        return;
    }

    notesListContainer.innerHTML = filteredNotes.map(note => {
        const isActive = note.id === activeNoteId;
        const dateStr = new Date(note.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        
        const badgeColor = note.category === 'Pribadi' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                           note.category === 'Kerja' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                           'bg-amber-500/10 text-amber-400 border-amber-500/20';

        return `
            <div onclick="selectNote('${note.id}')" 
                class="p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isActive 
                    ? 'bg-indigo-600/10 border-indigo-500/50 shadow-md shadow-indigo-500/5' 
                    : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                }">
                <div class="flex items-start justify-between gap-2 mb-1">
                    <h4 class="font-bold text-sm text-slate-200 truncate ${isActive ? 'text-indigo-300' : ''}">${escapeHtml(note.title || 'Catatan Tanpa Judul')}</h4>
                    <span class="text-[10px] px-2 py-0.5 rounded-md border font-semibold ${badgeColor}">${note.category}</span>
                </div>
                <p class="text-xs text-slate-400 truncate mb-2">${escapeHtml(note.content || 'Belum ada isi catatan...')}</p>
                <div class="flex items-center justify-between text-[10px] text-slate-500">
                    <span><i class="fa-regular fa-clock mr-1"></i>${dateStr}</span>
                </div>
            </div>
        `;
    }).join('');
}

function selectNote(id) {
    activeNoteId = id;
    loadActiveNoteToEditor();
    renderNotesList();
}

function loadActiveNoteToEditor() {
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) {
        emptyState.classList.remove('hidden');
        noteTitleInput.value = '';
        noteContentInput.value = '';
        return;
    }

    emptyState.classList.add('hidden');
    noteTitleInput.value = note.title;
    noteCategorySelect.value = note.category;
    noteContentInput.value = note.content;
    
    const dateStr = new Date(note.updatedAt).toLocaleString('id-ID');
    lastModifiedText.innerText = `Terakhir disimpan: ${dateStr}`;

    updateWordCount(note.content);
    if (currentViewMode === 'preview') {
        renderMarkdownPreview();
    }
}

function createNewNote() {
    const newNote = {
        id: Date.now().toString(),
        title: 'Catatan Baru Tanpa Judul',
        category: currentCategoryFilter === 'all' ? 'Pribadi' : currentCategoryFilter,
        content: '# Catatan Baru\n\nMulai ketik di sini...',
        updatedAt: new Date().toISOString()
    };

    notes.unshift(newNote);
    activeNoteId = newNote.id;
    saveToLocalStorage();
    renderNotesList();
    loadActiveNoteToEditor();
    updateStats();
    noteTitleInput.focus();
    noteTitleInput.select();
}

function autoSaveNote() {
    if (!activeNoteId) return;

    const noteIndex = notes.findIndex(n => n.id === activeNoteId);
    if (noteIndex === -1) return;

    notes[noteIndex].title = noteTitleInput.value;
    notes[noteIndex].category = noteCategorySelect.value;
    notes[noteIndex].content = noteContentInput.value;
    notes[noteIndex].updatedAt = new Date().toISOString();

    saveToLocalStorage();
    renderNotesList();
    updateStats();
    updateWordCount(notes[noteIndex].content);

    const dateStr = new Date(notes[noteIndex].updatedAt).toLocaleString('id-ID');
    lastModifiedText.innerText = `Terakhir disimpan: ${dateStr}`;

    if (currentViewMode === 'preview') {
        renderMarkdownPreview();
    }
}

function deleteActiveNote() {
    if (!activeNoteId) return;

    notes = notes.filter(n => n.id !== activeNoteId);
    activeNoteId = notes.length > 0 ? notes[0].id : null;

    saveToLocalStorage();
    renderNotesList();
    loadActiveNoteToEditor();
    updateStats();
}

function handleSearch(e) {
    currentSearchQuery = e.target.value;
    renderNotesList();
}

function filterByCategory(tag) {
    currentCategoryFilter = tag;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.getAttribute('data-tag') === tag) {
            btn.className = "filter-btn px-3 py-1.5 rounded-xl font-medium bg-indigo-600 text-white transition-all whitespace-nowrap cursor-pointer";
        } else {
            btn.className = "filter-btn px-3 py-1.5 rounded-xl font-medium bg-slate-800 text-slate-400 hover:text-white transition-all whitespace-nowrap cursor-pointer";
        }
    });

    renderNotesList();
}

function switchView(mode) {
    currentViewMode = mode;
    if (mode === 'edit') {
        btnEdit.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white transition-all cursor-pointer";
        btnPreview.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all cursor-pointer";
        noteContentInput.classList.remove('hidden');
        markdownPreview.classList.add('hidden');
    } else {
        btnPreview.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white transition-all cursor-pointer";
        btnEdit.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all cursor-pointer";
        noteContentInput.classList.add('hidden');
        markdownPreview.classList.remove('hidden');
        renderMarkdownPreview();
    }
}

function renderMarkdownPreview() {
    const content = noteContentInput.value || '';
    if (typeof marked !== 'undefined') {
        markdownPreview.innerHTML = marked.parse(content);
    } else {
        markdownPreview.innerHTML = `<p class="text-amber-400">Library Marked.js belum dimuat.</p>`;
    }
}

function updateStats() {
    statTotal.innerText = notes.length;

    const totalWords = notes.reduce((acc, note) => {
        const words = note.content.trim() ? note.content.trim().split(/\s+/).length : 0;
        return acc + words;
    }, 0);

    statWords.innerText = totalWords;
}

function updateWordCount(text) {
    const count = text.trim() ? text.trim().split(/\s+/).length : 0;
    currentNoteWords.innerText = `${count} kata`;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

window.onload = function() {
    initApp();
};