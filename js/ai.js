// AI Assistant (local Q&A generated from markdown docs)
const AiAssistant = {
    sources: [
        'README.md',
        'QUICKSTART.md',
        'PROJECT_SUMMARY.md',
        'DEVELOPER.md'
    ],
    qa: [],

    async load() {
        const entries = [];

        for (const src of this.sources) {
            try {
                const res = await fetch(src);
                if (!res.ok) continue;
                const text = await res.text();
                entries.push(...this.extractQa(text));
            } catch (error) {
                // ignore missing docs
            }
        }

        this.qa = this.dedupe(entries);
        this.render();
    },

    extractQa(markdown) {
        const lines = markdown.split(/\r?\n/);
        const qa = [];
        let currentHeading = null;
        let buffer = [];

        const flush = () => {
            if (!currentHeading) return;
            const answer = buffer.join(' ').replace(/\s+/g, ' ').trim();
            if (answer.length < 10) return;
            const question = this.headingToQuestion(currentHeading);
            qa.push({ question, answer });
        };

        for (const line of lines) {
            const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
            if (headingMatch) {
                flush();
                currentHeading = headingMatch[2].trim();
                buffer = [];
                continue;
            }

            const cleaned = line.replace(/[*_`>]/g, '').trim();
            if (!cleaned) continue;
            if (cleaned.startsWith('- ') || cleaned.startsWith('* ')) {
                buffer.push(cleaned.replace(/^[-*]\s+/, ''));
            } else {
                buffer.push(cleaned);
            }
        }

        flush();
        return qa;
    },

    headingToQuestion(heading) {
        if (heading.endsWith('?')) return heading;
        return `Tell me about ${heading}`;
    },

    dedupe(items) {
        const seen = new Set();
        return items.filter(item => {
            const key = `${item.question}::${item.answer}`.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    },

    filter(query) {
        const q = query.trim().toLowerCase();
        if (!q) return this.qa;
        return this.qa.filter(item =>
            item.question.toLowerCase().includes(q) ||
            item.answer.toLowerCase().includes(q)
        );
    },

    render(list = null) {
        const container = document.getElementById('ai-qa-list');
        if (!container) return;
        const data = list || this.qa;

        if (!data.length) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-robot"></i><p>No AI answers found yet.</p></div>';
            return;
        }

        container.innerHTML = data.map(item => `
            <div class="ai-card">
                <div class="ai-question"><i class="bi bi-chat-square-text"></i>${item.question}</div>
                <div class="ai-answer">${item.answer}</div>
            </div>
        `).join('');
    }
};

function initAiAssistant() {
    const input = document.getElementById('ai-search');
    if (input) {
        input.addEventListener('input', () => {
            AiAssistant.render(AiAssistant.filter(input.value));
        });
    }

    AiAssistant.load();
    renderSuggestions();
}

function toggleAiChat() {
    const panel = document.getElementById('ai-chat-panel');
    if (!panel) return;
    const isOpen = panel.classList.toggle('open');
    panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    if (isOpen) {
        const input = document.getElementById('ai-chat-text');
        if (input) input.focus();
    }
}

function handleAiChatSubmit(event) {
    event.preventDefault();
    const input = document.getElementById('ai-chat-text');
    const container = document.getElementById('ai-chat-body');
    if (!input || !container) return;
    const question = input.value.trim();
    if (!question) return;

    container.insertAdjacentHTML('beforeend', `
        <div class="ai-chat-bubble ai-user">${escapeHtml(question)}</div>
    `);

    insertTyping();
    const answer = findBestAnswer(question);
    replaceTypingWithAnswer(answer);

    input.value = '';
    container.scrollTop = container.scrollHeight;
}

function findBestAnswer(query) {
    if (!AiAssistant.qa.length) return 'I am still loading answers. Please try again in a moment.';
    const q = query.toLowerCase();
    const scored = AiAssistant.qa.map(item => {
        const text = `${item.question} ${item.answer}`.toLowerCase();
        const score = q.split(/\s+/).reduce((acc, word) => acc + (text.includes(word) ? 1 : 0), 0);
        return { item, score };
    }).sort((a, b) => b.score - a.score);

    if (!scored[0] || scored[0].score === 0) {
        return 'I do not have a direct answer. Try rephrasing or check the Help section.';
    }
    return scored[0].item.answer;
}

function insertTyping() {
    const container = document.getElementById('ai-chat-body');
    if (!container) return;
    container.insertAdjacentHTML('beforeend', `
        <div class="ai-chat-bubble ai-bot ai-typing" id="ai-typing">
            <span></span><span></span><span></span>
        </div>
    `);
    container.scrollTop = container.scrollHeight;
}

function replaceTypingWithAnswer(answer) {
    const typing = document.getElementById('ai-typing');
    if (!typing) return;
    const bubble = document.createElement('div');
    bubble.className = 'ai-chat-bubble ai-bot';
    bubble.textContent = answer;
    typing.replaceWith(bubble);
}

function renderSuggestions() {
    const container = document.getElementById('ai-suggestions');
    if (!container) return;
    const suggestions = AiAssistant.qa.slice(0, 5).map(item => item.question);

    container.innerHTML = suggestions.map(q => `
        <button class="ai-suggestion" type="button" onclick="useSuggestion('${escapeHtmlAttr(q)}')">${escapeHtml(q)}</button>
    `).join('');
}

function useSuggestion(question) {
    const input = document.getElementById('ai-chat-text');
    if (!input) return;
    input.value = question;
    input.focus();
}

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeHtmlAttr(value) {
    return escapeHtml(value).replace(/"/g, '&quot;');
}
