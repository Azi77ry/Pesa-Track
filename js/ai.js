// AI Assistant (local Q&A generated from markdown docs)
const AiAssistant = {
    sources: [
        'README.md',
        'QUICKSTART.md',
        'PROJECT_SUMMARY.md',
        'DEVELOPER.md'
    ],
    fallbackQa: [
        { question: 'Hi', answer: 'Hi! How can I help you with PesaTrucker today?' },
        { question: 'Hello', answer: 'Hello! Ask me anything about PesaTrucker features or how to use them.' },
        { question: 'How are you?', answer: 'I am here and ready to help. What would you like to do?' },
        { question: 'Thank you', answer: 'You are welcome! If you need anything else, just ask.' },
        { question: 'What can you do?', answer: 'I can answer questions about PesaTrucker, help you find features, and explain how things work.' },
        { question: 'Help', answer: 'Sure. Try asking about transactions, budgets, reports, or settings.' },
        { question: 'How do I add a transaction?', answer: 'Open Transactions, tap Add, fill in amount, category, date, and save.' },
        { question: 'How do I edit a transaction?', answer: 'Open Transactions, select the entry, make changes, then save.' },
        { question: 'How do I delete a transaction?', answer: 'Open Transactions, select the entry, and choose Delete.' },
        { question: 'How do I categorize transactions?', answer: 'When adding or editing a transaction, choose a category from the list before saving.' },
        { question: 'How do I create a budget?', answer: 'Open Budgets, tap Add Budget, set a category and limit, then save.' },
        { question: 'How do I adjust a budget limit?', answer: 'Open Budgets, select the budget, update the limit, and save.' },
        { question: 'How do I see budget progress?', answer: 'Open Budgets to view spent vs. limit for each category.' },
        { question: 'Where can I view reports?', answer: 'Open Reports from the menu to see summaries and insights.' },
        { question: 'How do I export a report?', answer: 'Open Reports and use the export option to download your data.' },
        { question: 'How do I change settings?', answer: 'Open Settings from the menu to update preferences.' },
        { question: 'How do I update my profile?', answer: 'Open Settings or Profile, edit your details, and save.' },
        { question: 'Who owns PesaTrucker?', answer: 'PesaTrucker is owned by Aziry Tech.' },
        { question: 'Who developed PesaTrucker?', answer: 'PesaTrucker was developed by Azizi Iddi.' },
        { question: 'Developer contact', answer: 'You can contact the developer at aziziiddi555@gmail.com.' },
        { question: 'Good morning', answer: 'Good morning! How can I help you today?' },
        { question: 'Good afternoon', answer: 'Good afternoon! What would you like to do?' },
        { question: 'Good evening', answer: 'Good evening! How can I help?' },
        { question: 'Nice to meet you', answer: 'Nice to meet you too! How can I assist?' },
        { question: 'What is this app?', answer: 'PesaTrucker helps you manage personal finances, track spending, and monitor budgets.' },
        { question: 'Who are you?', answer: 'I am the PesaTrucker assistant. I can help you find features and explain how the app works.' },
        { question: 'Can you help me?', answer: 'Absolutely. Tell me what you want to do, and I will guide you.' },
        { question: 'What can I ask?', answer: 'You can ask about transactions, budgets, reports, and settings.' },
        { question: 'I need help', answer: 'Sure. Ask a question like "How do I add a transaction?"' },
        { question: 'Are you there?', answer: 'Yes, I am here. How can I help?' }
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

        entries.push(...this.fallbackQa);
        this.qa = this.dedupe(entries);
        this.render();
        renderSuggestions();
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
    if (AiAssistant.initialized) return;
    AiAssistant.initialized = true;
    const input = document.getElementById('ai-search');
    if (input) {
        input.addEventListener('input', () => {
            AiAssistant.render(AiAssistant.filter(input.value));
        });
    }

    AiAssistant.load();
}

function toggleAiChat() {
    initAiAssistant();
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

function handleAiInlineSubmit(event) {
    event.preventDefault();
    const input = document.getElementById('ai-inline-text');
    const container = document.getElementById('ai-inline-body');
    if (!input || !container) return;
    const question = input.value.trim();
    if (!question) return;

    container.insertAdjacentHTML('beforeend', `
        <div class="ai-chat-bubble ai-user">${escapeHtml(question)}</div>
    `);

    const answer = findBestAnswer(question);
    container.insertAdjacentHTML('beforeend', `
        <div class="ai-chat-bubble ai-bot">${escapeHtml(answer)}</div>
    `);

    input.value = '';
    container.scrollTop = container.scrollHeight;
}

function findBestAnswer(query) {
    if (!AiAssistant.qa.length) return 'I am still loading answers. Please try again in a moment.';
    const q = query.toLowerCase();
    const smallTalk = matchSmallTalk(q);
    if (smallTalk) return smallTalk;
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

function matchSmallTalk(query) {
    if (/\b(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening)\b/.test(query)) {
        return 'Hi! How can I help you with PesaTrucker today?';
    }
    if (/\b(thanks|thank\s+you|thx)\b/.test(query)) {
        return 'You are welcome! Let me know if you want help with anything else.';
    }
    if (/\b(bye|goodbye|see\s+you)\b/.test(query)) {
        return 'Goodbye! Come back anytime if you need help.';
    }
    if (/\b(how\s+are\s+you|how\s+is\s+it\s+going)\b/.test(query)) {
        return 'I am doing great and ready to help. What can I assist with?';
    }
    return '';
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

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Escapes a string of HTML content to prevent XSS attacks.
 * @param {string} value - The string to escape.
 * @returns {string} The escaped string.
 * @example
 * const unsafe = '<script>alert("XSS");</script>';
 * const safe = escapeHtml(unsafe);
 * console.log(safe);
 * // Output: &lt;script&gt;alert(&quot;XSS&quot;);&lt;/script&gt;
/*******  e2359ac9-785b-4b83-8ce6-902b05546b1d  *******/
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


