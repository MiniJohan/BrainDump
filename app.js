// ┌─────────────────────────────────────────┐
// │  CONFIG                                 │
// └─────────────────────────────────────────┘
const { createClient } = supabase;
const db = createClient('https://dmmmpijwxynzmojlnuqr.supabase.co', 'sb_publishable_Ahf30a1YFkbifXcA-AoasA_roTpTpbw');



// ┌─────────────────────────────────────────┐
// │  STATE                                  │
// └─────────────────────────────────────────┘

let isSearchMode        = false;

let recognition         = null;
let isListening         = false;
let holdTimer           = null;
let finalTranscript     = '';



// ┌─────────────────────────────────────────┐
// │  ELEMENTS                               │
// └─────────────────────────────────────────┘

const thoughtsEl = document.getElementById('thoughts');
const inputEl    = document.getElementById('input');

const micBtn = document.getElementById('mic-btn');


// ┌─────────────────────────────────────────┐
// │  RENDER                                 │
// └─────────────────────────────────────────┘

async function loadThoughts() {
    const { data } = await db
        .from('thoughts')
        .select('*')
        .order('urgent', { ascending: false })
        .order('created_at', { ascending: true });
    render(data || []);
}

// ─── Full render — initial load only ─────────────────────
function render(thoughts) {
    thoughtsEl.innerHTML = '';
    thoughts.forEach(t => thoughtsEl.appendChild(createThoughtEl(t, false)));
}

// ─── Build one element ────────────────────────────────────
function createThoughtEl(t, isNew = false) {
    const div = document.createElement('div');
    div.className = 'thought' +
        (t.done   ? ' done'   : '') +
        (t.urgent ? ' urgent' : '') +
        (isNew    ? ' thought-new' : '');
    div.dataset.id = String(t.id);

    if (isNew) {
        div.addEventListener('animationend', () => {
            div.classList.remove('thought-new');
        }, { once: true });
    }

    const checkbox = document.createElement('div');
    checkbox.className = 'checkbox' + (t.done ? ' checked' : '');
    checkbox.addEventListener('click', () => toggleThought(t.id));

    const span = document.createElement('span');
    span.textContent = t.text;
    span.addEventListener('click', () => editThought(t.id, span));

    div.appendChild(checkbox);
    div.appendChild(span);

    addSwipeDelete(div, t.id);

    return div;
}



// ┌─────────────────────────────────────────┐
// │  DUMP                                   │
// └─────────────────────────────────────────┘

async function dump() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    inputEl.style.height = 'auto';

    const items = text.split(/[,;\n]+/)
        .map(i => i.trim())
        .filter(i => i)
        .map(i => ({ text: i, urgent: false, done: false }));

    const { data } = await db
        .from('thoughts')
        .insert(items)
        .select();

    if (data) {
        data.forEach(t => thoughtsEl.appendChild(createThoughtEl(t, true)));
    }
}

inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (isSearchMode) {
            // Exit search on enter
            inputEl.value = '';
            inputEl.style.fontStyle = '';
            isSearchMode = false;
            filterThoughts('');
        } else {
            dump();
        }
    }
    if (e.key === 'Escape' && isSearchMode) {
        inputEl.value = '';
        inputEl.style.fontStyle = '';
        isSearchMode = false;
        filterThoughts('');
    }
});



// ┌─────────────────────────────────────────┐
// │  TOGGLE                                 │
// └─────────────────────────────────────────┘

async function toggleThought(id) {
    const el = thoughtsEl.querySelector(`[data-id="${id}"]`);
    if (!el) return;

    const isDone = !el.classList.contains('done');
    el.classList.toggle('done', isDone);
    el.querySelector('.checkbox').classList.toggle('checked', isDone);

    await db.from('thoughts').update({ done: isDone }).eq('id', id);
}



// ┌─────────────────────────────────────────┐
// │  DELETE                                 │
// └─────────────────────────────────────────┘

function addSwipeDelete(el, id) {
    let startX    = 0;
    let startY    = 0;
    let startTime = 0;
    let isScrolling  = false;
    let isDetermined = false;

    el.addEventListener('touchstart', (e) => {
        startX       = e.touches[0].clientX;
        startY       = e.touches[0].clientY;
        startTime    = Date.now();
        isScrolling  = false;
        isDetermined = false;
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;

        if (!isDetermined) {
            if (Math.abs(deltaY) > Math.abs(deltaX)) isScrolling = true;
            isDetermined = true;
        }

        if (!isScrolling && deltaX < 0) e.preventDefault();
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
        if (isScrolling) return;

        const deltaX   = e.changedTouches[0].clientX - startX;
        const elapsed  = Date.now() - startTime;
        const velocity = Math.abs(deltaX) / elapsed;

        if (deltaX < -30 && velocity > 0.3) {
            dismissThought(el, id);
        }
    }, { passive: true });
}

function dismissThought(el, id) {
    el.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    el.style.opacity    = '0';
    el.style.transform  = 'scale(0.97)';

    setTimeout(() => {
        el.style.overflow   = 'hidden';
        el.style.height     = el.offsetHeight + 'px';
        el.style.paddingTop = '0';
        el.style.paddingBottom = '0';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                el.style.transition = 'height 0.2s ease';
                el.style.height     = '0';
            });
        });
    }, 150);

    setTimeout(async () => {
        el.remove();
        await db.from('thoughts').delete().eq('id', id);
    }, 360);
}



// ┌─────────────────────────────────────────┐
// │  SEARCH                                 │
// └─────────────────────────────────────────┘

function filterThoughts(query) {
    thoughtsEl.querySelectorAll('.thought').forEach(el => {
        const text = el.querySelector('span').textContent.toLowerCase();
        el.classList.toggle('hidden', query !== '' && !text.includes(query));
    });
}

inputEl.addEventListener('input', () => {
    const value = inputEl.value;

    if (value.startsWith('/')) {
        isSearchMode = true;
        inputEl.style.fontStyle = 'italic';
        filterThoughts(value.slice(1).trim().toLowerCase());
    } else {
        if (isSearchMode) {
            isSearchMode = false;
            inputEl.style.fontStyle = '';
            filterThoughts('');
        }
    }

    inputEl.style.height = 'auto';
    inputEl.style.height = inputEl.scrollHeight + 'px';
});



// ┌─────────────────────────────────────────┐
// │  EDIT                                   │
// └─────────────────────────────────────────┘

function editThought(id, span) {
    const original = span.textContent;
    span.contentEditable = 'true';
    span.classList.add('editing');
    span.focus();

    const range = document.createRange();
    range.selectNodeContents(span);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    async function save() {
        const newText = span.textContent.trim();
        span.contentEditable = 'false';
        span.classList.remove('editing');
        if (!newText) { span.textContent = original; return; }
        if (newText === original) return;
        span.textContent = newText;
        await db.from('thoughts').update({ text: newText }).eq('id', id);
    }

    function cancel() {
        span.contentEditable = 'false';
        span.classList.remove('editing');
        span.textContent = original;
    }

    span.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
        if (e.key === 'Escape') { cancel(); }
    });

    span.addEventListener('blur', save, { once: true });
}



// ┌─────────────────────────────────────────┐
// │  COLLAPSE DONE                          │
// └─────────────────────────────────────────┘

function updateDoneCounter() {
    const existing = thoughtsEl.querySelector('.done-counter');
    if (existing) existing.remove();

    const doneEls = [...thoughtsEl.querySelectorAll('.thought.done')];
    if (doneEls.length === 0) return;

    doneEls.forEach(el => {
        el.style.display = doneCollapsed ? 'none' : '';
    });

    const counter = document.createElement('div');
    counter.className = 'done-counter';

    // ─── Toggle label ─────────────────────────────────────
    const label = document.createElement('span');
    label.className   = 'counter-label';
    label.textContent = doneCollapsed ? `${doneEls.length} done` : 'hide done';
    label.addEventListener('click', () => {
        doneCollapsed = !doneCollapsed;
        updateDoneCounter();
    });
    counter.appendChild(label);

    // ─── Clear option — only when collapsed ───────────────
    if (doneCollapsed) {
        const sep = document.createElement('span');
        sep.className   = 'counter-sep';
        sep.textContent = '·';

        const clearEl = document.createElement('span');
        clearEl.className   = 'counter-clear';
        clearEl.textContent = 'clear';
        clearEl.addEventListener('click', async (e) => {
            e.stopPropagation();
            const ids = doneEls.map(el => el.dataset.id);
            doneEls.forEach(el => el.remove());
            counter.remove();
            await db.from('thoughts').delete().in('id', ids);
        });

        counter.appendChild(sep);
        counter.appendChild(clearEl);
    }

    thoughtsEl.appendChild(counter);
}



// ┌─────────────────────────────────────────┐
// │  VOICE                                  │
// └─────────────────────────────────────────┘

let recognition    = null;
let isListening    = false;
let silenceTimer   = null;
let interimTimer   = null;

function setupVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { micBtn.style.display = 'none'; return; }

    recognition = new SR();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = 'en-US';

    recognition.onresult = (e) => {
        clearTimeout(silenceTimer);
        clearTimeout(interimTimer);

        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const text = e.results[i][0].transcript;
            if (e.results[i].isFinal) {
                finalTranscript += text + ', ';
            } else {
                interim = text;
            }
        }

        inputEl.value = finalTranscript + interim;
        inputEl.style.height = 'auto';
        inputEl.style.height = inputEl.scrollHeight + 'px';

        // ─── Short pause → comma between thoughts ─────────
        if (interim) {
            interimTimer = setTimeout(() => {
                finalTranscript += interim + ', ';
                inputEl.value = finalTranscript;
            }, 1500);
        }

        // ─── Long silence → auto stop ─────────────────────
        silenceTimer = setTimeout(() => {
            if (isListening) recognition.stop();
        }, 4000);
    };

    recognition.onend = () => {
        isListening = false;
        micBtn.classList.remove('listening');
        inputEl.style.fontStyle = '';
        clearTimeout(silenceTimer);
        clearTimeout(interimTimer);
        finalTranscript = '';
        dump();
    };

    recognition.onerror = () => {
        isListening = false;
        micBtn.classList.remove('listening');
        inputEl.style.fontStyle = '';
        clearTimeout(silenceTimer);
        clearTimeout(interimTimer);
        finalTranscript = '';
        inputEl.value = '';
    };
}

micBtn.addEventListener('click', () => {
    if (!recognition) return;
    if (isListening) {
        recognition.stop();
    } else {
        finalTranscript = '';
        inputEl.value   = '';
        inputEl.style.fontStyle = 'italic';
        micBtn.classList.add('listening');
        recognition.start();
        isListening = true;
    }
});



// ┌─────────────────────────────────────────┐
// │  BOOT                                   │
// └─────────────────────────────────────────┘

// ─── Request mic permission on load ──────────────────────
navigator.mediaDevices?.getUserMedia({ audio: true })
    .then(stream => stream.getTracks().forEach(t => t.stop()))
    .catch(() => {});

setupVoice();
loadThoughts();