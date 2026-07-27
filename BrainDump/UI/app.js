const thoughtsEl = document.getElementById('thoughts');
const inputEl    = document.getElementById('input');
const clearBtn   = document.getElementById('clear-btn');

async function loadThoughts() {
    const res = await fetch('/api/thoughts');
    const thoughts = await res.json();
    render(thoughts);
}

function render(thoughts) {
    thoughtsEl.innerHTML = '';

    if (thoughts.length === 0) {
        thoughtsEl.innerHTML = '<p class="empty">nothing yet.</p>';
        return;
    }

    thoughts.forEach(t => {
        const div = document.createElement('div');
        div.className = 'thought' + (t.done ? ' done' : '');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!t.done;
        checkbox.addEventListener('change', () => toggleThought(t.id));

        const span = document.createElement('span');
        span.textContent = t.text;

        div.appendChild(checkbox);
        div.appendChild(span);
        thoughtsEl.appendChild(div);
    });
}

inputEl.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        const text = inputEl.value.trim();
        if (!text) return;

        const res = await fetch('/api/thoughts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const thoughts = await res.json();
        render(thoughts);
        inputEl.value = '';
    }
});

inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = inputEl.scrollHeight + 'px';
});

async function toggleThought(id) {
    const res = await fetch(`/api/thoughts/${id}/toggle`, { method: 'PATCH' });
    const thoughts = await res.json();
    render(thoughts);
}

clearBtn.addEventListener('click', async () => {
    const res = await fetch('/api/thoughts/done', { method: 'DELETE' });
    const thoughts = await res.json();
    render(thoughts);
});

loadThoughts();