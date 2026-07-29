// ─── Supabase setup ───────────────────────────────────────
const { createClient } = supabase;
const db = createClient(
    'https://dmmmpijwxynzmojlnuqr.supabase.co',
    'sb_publishable_Ahf30a1YFkbifXcA-AoasA_roTpTpbw'
);

// ─── Elements ─────────────────────────────────────────────
const thoughtsEl = document.getElementById('thoughts');
const inputEl    = document.getElementById('input');
const clearBtn   = document.getElementById('clear-btn');
const micBtn     = document.getElementById('mic-btn');

// ─── Initial load ─────────────────────────────────────────
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
    if (thoughts.length === 0) {
        thoughtsEl.innerHTML = '<p class="empty">nothing yet.</p>';
        return;
    }
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

    const deleteReveal = document.createElement('div');
    deleteReveal.className = 'delete-reveal';
    deleteReveal.textContent = 'delete';

    const content = document.createElement('div');
    content.className = 'thought-content';

    const checkbox = document.createElement('div');
    checkbox.className = 'checkbox' + (t.done ? ' checked' : '');
    checkbox.addEventListener('click', () => toggleThought(t.id));

    const span = document.createElement('span');
    span.textContent = t.text;
    span.addEventListener('click', () => editThought(t.id, span));

    content.appendChild(checkbox);
    content.appendChild(span);
    div.appendChild(deleteReveal);
    div.appendChild(content);

    addSwipeDelete(div, content, t.id);

    return div;
}

// ─── Dump ─────────────────────────────────────────────────
inputEl.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const text = inputEl.value.trim();
        if (!text) return;

        inputEl.value = '';
        inputEl.style.height = 'auto';

        const empty = thoughtsEl.querySelector('.empty');
        if (empty) empty.remove();

        const items = text.split(/[,;\n]+/)
            .map(i => i.trim())
            .filter(i => i)
            .map(i => ({ text: i, done: false, urgent: false }));

        const { data } = await db
            .from('thoughts')
            .insert(items)
            .select();

        if (data) {
            data.forEach(t => thoughtsEl.appendChild(createThoughtEl(t, true)));
        }
    }
});

// ─── Auto-grow textarea ───────────────────────────────────
inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = inputEl.scrollHeight + 'px';
});

// ─── Toggle ───────────────────────────────────────────────
async function toggleThought(id) {
    const el = thoughtsEl.querySelector(`[data-id="${id}"]`);
    if (!el) return;

    const isDone = !el.classList.contains('done');
    el.classList.toggle('done');
    el.querySelector('.checkbox').classList.toggle('checked');

    await db
        .from('thoughts')
        .update({ done: isDone })
        .eq('id', id);
}

// ─── Clear done ───────────────────────────────────────────
clearBtn.addEventListener('click', async () => {
    await db.from('thoughts').delete().eq('done', true);
    thoughtsEl.querySelectorAll('.thought.done').forEach(el => el.remove());
    if (thoughtsEl.querySelectorAll('.thought').length === 0) {
        thoughtsEl.innerHTML = '<p class="empty">nothing yet.</p>';
    }
});

// ─── Edit ─────────────────────────────────────────────────
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

function addSwipeDelete(el, content, id) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwiping = false;
    let isScrolling = false;

    el.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentX = 0;
        isSwiping = false;
        isScrolling = false;
        content.style.transition = '';
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;

        if (!isSwiping && !isScrolling) {
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                isScrolling = true;
                return;
            }
            if (Math.abs(deltaX) > 6) isSwiping = true;
        }

        if (!isSwiping || isScrolling || deltaX > 0) return;

        e.preventDefault();
        currentX = deltaX;
        content.style.transform = `translateX(${deltaX}px)`;
    }, { passive: false });

    el.addEventListener('touchend', () => {
        if (!isSwiping) return;

        if (currentX < -80) {
            content.style.transition = 'transform 0.2s ease';
            content.style.transform = 'translateX(-110%)';

            setTimeout(() => {
                el.style.transition = 'max-height 0.2s ease, opacity 0.2s ease';
                el.style.maxHeight = el.offsetHeight + 'px';
                el.style.overflow = 'hidden';
                requestAnimationFrame(() => {
                    el.style.maxHeight = '0';
                    el.style.opacity = '0';
                });
            }, 180);

            setTimeout(async () => {
                el.remove();
                if (!thoughtsEl.querySelector('.thought')) {
                    thoughtsEl.innerHTML = '<p class="empty">nothing yet.</p>';
                }
                await db.from('thoughts').delete().eq('id', id);
            }, 400);

        } else {
            content.style.transition = 'transform 0.2s ease';
            content.style.transform = 'translateX(0)';
            setTimeout(() => {
                content.style.transition = '';
                content.style.transform = '';
            }, 200);
        }
    }, { passive: true });
}

// ─── Voice ────────────────────────────────────────────────
let recognition = null;
let isListening = false;

function setupVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { micBtn.style.display = 'none'; return; }

    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
        const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
        inputEl.value = transcript;
        inputEl.style.height = 'auto';
        inputEl.style.height = inputEl.scrollHeight + 'px';
    };

    recognition.onend  = () => { isListening = false; micBtn.classList.remove('listening'); };
    recognition.onerror = () => { isListening = false; micBtn.classList.remove('listening'); };
}

micBtn.addEventListener('click', () => {
    if (!recognition) return;
    if (isListening) { recognition.stop(); }
    else { inputEl.value = ''; recognition.start(); isListening = true; micBtn.classList.add('listening'); }
});

setupVoice();
loadThoughts();