// AI Financial Assistant & Conversational Intelligence Engine
// Features: Dynamic DB queries, In-Chat Interactive Mini Charts, Voice Input, Action Cards, Smart Insights

const AiAssistant = {
    initialized: false,
    recognition: null,
    isListening: false,
    chatChartCounter: 0,
    chatCharts: {},

    async init() {
        if (this.initialized) return;
        this.initialized = true;

        this.setupVoiceInput();
        this.renderSmartSuggestions();
    },

    // Speech-to-Text Web Speech API setup
    setupVoiceInput() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
            this.recognition = new SpeechRec();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const input = document.getElementById('ai-chat-text');
                if (input) {
                    input.value = transcript;
                    // Auto submit voice queries
                    const form = document.getElementById('ai-chat-form');
                    if (form) {
                        form.dispatchEvent(new Event('submit', { cancelable: true }));
                    }
                }
                this.stopVoiceListening();
            };

            this.recognition.onerror = () => {
                this.stopVoiceListening();
            };

            this.recognition.onend = () => {
                this.stopVoiceListening();
            };
        }
    },

    toggleVoiceListening() {
        if (!this.recognition) {
            if (typeof showToast === 'function') {
                showToast('Voice recognition is not supported on this device/browser.', 'info');
            }
            return;
        }

        if (this.isListening) {
            this.stopVoiceListening();
        } else {
            this.startVoiceListening();
        }
    },

    startVoiceListening() {
        try {
            this.isListening = true;
            this.recognition.start();
            const btn = document.getElementById('ai-voice-btn');
            if (btn) btn.classList.add('recording');
            if (typeof showToast === 'function') {
                showToast('Listening... Speak your financial question.', 'info');
            }
        } catch (e) {
            console.warn('Voice recognition error:', e);
            this.isListening = false;
        }
    },

    stopVoiceListening() {
        this.isListening = false;
        try { this.recognition.stop(); } catch(e){}
        const btn = document.getElementById('ai-voice-btn');
        if (btn) btn.classList.remove('recording');
    },

    renderSmartSuggestions() {
        const container = document.getElementById('ai-suggestions');
        if (!container) return;

        const prompts = [
            { icon: 'bi-pie-chart', label: 'Spending breakdown' },
            { icon: 'bi-calendar-check', label: 'Any bills due?' },
            { icon: 'bi-bullseye', label: 'Savings goal progress' },
            { icon: 'bi-graph-up', label: 'Cash flow summary' },
            { icon: 'bi-wallet2', label: 'Budget status' },
            { icon: 'bi-lightbulb', label: 'Tips to save money' }
        ];

        container.innerHTML = prompts.map(p => `
            <button class="ai-suggestion" type="button" onclick="useSuggestion('${escapeHtmlAttr(p.label)}')">
                <i class="bi ${p.icon} me-1"></i>${escapeHtml(p.label)}
            </button>
        `).join('');
    }
};

// ─── Query Intelligence Engine (Live Financial Database Queries) ───────────────
async function generateAiFinancialResponse(query) {
    const q = query.toLowerCase().trim();
    const userId = typeof Auth !== 'undefined' ? parseInt(Auth.getCurrentUserId()) : null;
    
    // Check smalltalk first
    const smallTalk = matchSmallTalk(q);
    if (smallTalk) {
        return { text: smallTalk };
    }

    if (!userId || typeof DB === 'undefined') {
        return { text: "Please log in to your account to query your financial records." };
    }

    const settings = await DB.getUserSettings(userId);
    const currency = typeof App !== 'undefined' ? App.getCurrencySymbol(settings?.currency || 'TZS') : 'TZS';
    const transactions = await DB.getUserTransactions(userId);
    const categories = await DB.getUserCategories(userId);
    const budgets = await DB.getUserBudgets(userId);
    const bills = await DB.getUserBills(userId);
    const goals = DB.getUserGoals ? await DB.getUserGoals(userId) : [];
    const investments = DB.getUserInvestments ? await DB.getUserInvestments(userId) : [];

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Spending Breakdown / Category Chart Query
    if (q.includes('spending') || q.includes('breakdown') || q.includes('category') || q.includes('categories') || q.includes('pie') || q.includes('doughnut') || q.includes('expense')) {
        const expenses = transactions.filter(t => t.type === 'expense');
        if (!expenses.length) {
            return {
                text: `You haven't recorded any expenses yet! Tap below to add your first expense.`,
                action: { label: 'Add Expense', onClick: 'showAddTransactionModal("expense")' }
            };
        }

        const catTotals = {};
        let totalExpense = 0;
        expenses.forEach(t => {
            const amt = parseFloat(t.amount || 0);
            totalExpense += amt;
            catTotals[t.category] = (catTotals[t.category] || 0) + amt;
        });

        const sorted = Object.keys(catTotals).map(catId => {
            const cat = categories.find(c => c.id === parseInt(catId));
            return { label: cat ? cat.name : 'Other', value: catTotals[catId] };
        }).sort((a, b) => b.value - a.value);

        const topCat = sorted[0];
        const chartId = `ai-chart-${++AiAssistant.chatChartCounter}`;

        return {
            text: `📊 <strong>Expense Analysis:</strong><br>Total expenses: <strong>${currency} ${totalExpense.toLocaleString()}</strong> across ${expenses.length} transactions.<br>Your biggest category is <strong>${topCat.label}</strong> (${currency} ${topCat.value.toLocaleString()} — ${Math.round((topCat.value / totalExpense) * 100)}%).`,
            chart: {
                id: chartId,
                type: 'doughnut',
                labels: sorted.slice(0, 5).map(s => s.label),
                data: sorted.slice(0, 5).map(s => s.value)
            },
            action: { label: 'View Full Reports', onClick: 'showReports()' }
        };
    }

    // 2. Bills Query
    if (q.includes('bill') || q.includes('bills') || q.includes('due') || q.includes('pay') || q.includes('upcoming')) {
        const unpaidBills = bills.filter(b => b.status !== 'paid' && !b.paid);
        if (!unpaidBills.length) {
            return {
                text: `🎉 You have <strong>no pending bills</strong> at the moment! All your recorded bills are paid.`,
                action: { label: 'Manage Bills', onClick: 'showBills()' }
            };
        }

        const totalUnpaid = unpaidBills.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
        const billListHtml = unpaidBills.slice(0, 4).map(b => 
            `• <strong>${escapeHtml(b.name)}</strong>: ${currency} ${parseFloat(b.amount).toLocaleString()} (Due: ${b.dueDate || 'N/A'})`
        ).join('<br>');

        return {
            text: `📅 <strong>Pending Bills (${unpaidBills.length}):</strong><br>${billListHtml}<br><br>Total outstanding: <strong>${currency} ${totalUnpaid.toLocaleString()}</strong>.`,
            action: { label: 'Pay Bills Now', onClick: 'showBills()' }
        };
    }

    // 3. Goals Query
    if (q.includes('goal') || q.includes('goals') || q.includes('target') || q.includes('savings target')) {
        if (!goals.length) {
            return {
                text: `You haven't set any financial savings goals yet. Setting goals helps you save faster for vacations, emergency funds, or big purchases!`,
                action: { label: 'Create Savings Goal', onClick: 'showAddGoalModal()' }
            };
        }

        let totalTarget = 0, totalSaved = 0;
        const goalListHtml = goals.slice(0, 3).map(g => {
            const tgt = parseFloat(g.targetAmount || 0);
            const cur = parseFloat(g.currentAmount || 0);
            totalTarget += tgt;
            totalSaved += cur;
            const pct = tgt > 0 ? Math.round((cur / tgt) * 100) : 0;
            return `• <strong>${escapeHtml(g.title)}</strong>: ${currency} ${cur.toLocaleString()} / ${currency} ${tgt.toLocaleString()} (<strong>${pct}%</strong>)`;
        }).join('<br>');

        return {
            text: `🎯 <strong>Savings Goals Progress:</strong><br>${goalListHtml}<br><br>Overall saved: <strong>${currency} ${totalSaved.toLocaleString()}</strong> of ${currency} ${totalTarget.toLocaleString()}.`,
            action: { label: 'View All Goals', onClick: 'showGoals()' }
        };
    }

    // 4. Budget Status Query
    if (q.includes('budget') || q.includes('budgets') || q.includes('limit')) {
        if (!budgets.length) {
            return {
                text: `You haven't set any category budgets yet. Creating budgets keeps your monthly spending in check!`,
                action: { label: 'Set Up Budgets', onClick: 'showAddBudgetModal()' }
            };
        }

        const budgetStatus = budgets.map(b => {
            const cat = categories.find(c => c.id === parseInt(b.categoryId));
            const catName = b.name || (cat ? cat.name : 'Category');
            const limit = parseFloat(b.amount || 0);
            const spent = transactions
                .filter(t => t.type === 'expense' && parseInt(t.category) === parseInt(b.categoryId) && t.date.startsWith(currentMonth))
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            const statusIcon = pct >= 100 ? '🚨' : (pct >= 80 ? '⚡' : '✅');
            return `${statusIcon} <strong>${escapeHtml(catName)}</strong>: ${currency} ${spent.toLocaleString()} / ${currency} ${limit.toLocaleString()} (${pct}%)`;
        }).join('<br>');

        return {
            text: `💼 <strong>Monthly Budget Status:</strong><br>${budgetStatus}`,
            action: { label: 'Manage Budgets', onClick: 'showBudgets()' }
        };
    }

    // 5. Cash Flow & Net Balance Query
    if (q.includes('cash') || q.includes('flow') || q.includes('balance') || q.includes('income') || q.includes('trend') || q.includes('chart') || q.includes('graph')) {
        let totalIncome = 0, totalExpense = 0;
        transactions.forEach(t => {
            const amt = parseFloat(t.amount || 0);
            if (t.type === 'income') totalIncome += amt;
            else if (t.type === 'expense') totalExpense += amt;
        });

        const net = totalIncome - totalExpense;
        const chartId = `ai-chart-${++AiAssistant.chatChartCounter}`;

        return {
            text: `📈 <strong>Financial Cash Flow Summary:</strong><br>• Total Income: <strong>${currency} ${totalIncome.toLocaleString()}</strong><br>• Total Expenses: <strong>${currency} ${totalExpense.toLocaleString()}</strong><br>• Net Balance: <strong>${currency} ${net.toLocaleString()}</strong>`,
            chart: {
                id: chartId,
                type: 'bar',
                labels: ['Income', 'Expenses', 'Net Balance'],
                data: [totalIncome, totalExpense, Math.max(0, net)],
                colors: ['#10b981', '#ef4444', '#3b82f6']
            },
            action: { label: 'Open Analytics', onClick: 'showReports()' }
        };
    }

    // 6. Savings Tips & Advice
    if (q.includes('tip') || q.includes('advice') || q.includes('save money') || q.includes('save') || q.includes('how to')) {
        return {
            text: `💡 <strong>Personal Finance Tips for You:</strong><br>
1. <strong>The 50/30/20 Rule:</strong> Allocate 50% for essentials, 30% for lifestyle, and 20% directly into Savings Goals.<br>
2. <strong>Set Category Budgets:</strong> Putting a monthly cap on dining and entertainment prevents impulse overspending.<br>
3. <strong>Track Every Expense:</strong> Logging daily purchases immediately gives you full visibility and accountability.<br>
4. <strong>Automate Bill Payments:</strong> Check your Bills tab regularly to avoid penalty fees.`,
            action: { label: 'Create a Budget', onClick: 'showAddBudgetModal()' }
        };
    }

    // 7. General knowledge fallback
    const bestFallback = findDocAnswer(q);
    return { text: bestFallback };
}

function findDocAnswer(query) {
    const q = query.toLowerCase();
    if (q.includes('who developed') || q.includes('author') || q.includes('developer')) {
        return 'PesaTrucker was developed by Azizi Iddi (Aziry Tech). Contact: aziziiddi555@gmail.com';
    }
    if (q.includes('license') || q.includes('key') || q.includes('activate')) {
        return 'You can check or activate your PesaTrucker license in the Profile > License section.';
    }
    if (q.includes('dark mode') || q.includes('theme')) {
        return 'You can toggle Dark Mode or system themes anytime from Settings or the top navigation bar.';
    }
    return `I can help you with your transactions, upcoming bills, category spending breakdown, budgets, and savings goals. Try asking: "Show my spending breakdown" or "Any bills due?"`;
}

function matchSmallTalk(query) {
    if (/\b(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|habari|mambo)\b/.test(query)) {
        return 'Hello! I am your PesaTrucker AI Financial Assistant. How can I assist with your finances today?';
    }
    if (/\b(thanks|thank\s+you|thx|asante)\b/.test(query)) {
        return 'You are very welcome! Let me know whenever you need financial insights.';
    }
    if (/\b(bye|goodbye|see\s+you|kwaheri)\b/.test(query)) {
        return 'Goodbye! Keep up the great financial habits!';
    }
    return '';
}

// ─── Chat Submission & In-Chat Mini Chart Rendering ───────────────────────────
async function handleAiChatSubmit(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('ai-chat-text');
    const container = document.getElementById('ai-chat-body');
    if (!input || !container) return;

    const question = input.value.trim();
    if (!question) return;

    // User message bubble
    container.insertAdjacentHTML('beforeend', `
        <div class="ai-chat-bubble ai-user">
            <div>${escapeHtml(question)}</div>
        </div>
    `);
    input.value = '';
    container.scrollTop = container.scrollHeight;

    insertTyping();

    // Generate intelligent dynamic response
    const response = await generateAiFinancialResponse(question);
    
    replaceTypingWithSmartResponse(response);
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

function replaceTypingWithSmartResponse(response) {
    const typing = document.getElementById('ai-typing');
    if (!typing) return;

    const card = document.createElement('div');
    card.className = 'ai-chat-bubble ai-bot';

    let contentHtml = `<div>${response.text}</div>`;

    // If response includes an interactive mini chart
    if (response.chart) {
        contentHtml += `
            <div class="ai-chat-chart-container mt-2">
                <canvas id="${response.chart.id}" height="180"></canvas>
            </div>
        `;
    }

    // If response includes an action shortcut button
    if (response.action) {
        contentHtml += `
            <div class="mt-2 pt-2 border-top border-light-subtle">
                <button class="btn btn-sm btn-primary rounded-pill px-3" onclick="${response.action.onClick}">
                    <i class="bi bi-arrow-right-circle me-1"></i>${response.action.label}
                </button>
            </div>
        `;
    }

    card.innerHTML = contentHtml;
    typing.replaceWith(card);

    // If chart canvas exists, render mini chart with Chart.js
    if (response.chart) {
        setTimeout(() => {
            renderMiniInChatChart(response.chart);
        }, 50);
    }

    const container = document.getElementById('ai-chat-body');
    if (container) container.scrollTop = container.scrollHeight;
}

// ─── Render Mini In-Chat Chart ────────────────────────────────────────────────
function renderMiniInChatChart(chartConfig) {
    const canvas = document.getElementById(chartConfig.id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    const colors = chartConfig.colors || defaultColors;

    if (chartConfig.type === 'doughnut') {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartConfig.labels,
                datasets: [{
                    data: chartConfig.data,
                    backgroundColor: colors,
                    borderWidth: 1.5,
                    cutout: '60%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 10, font: { size: 10 }, padding: 8 }
                    }
                }
            }
        });
    } else if (chartConfig.type === 'bar') {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartConfig.labels,
                datasets: [{
                    data: chartConfig.data,
                    backgroundColor: colors,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { ticks: { font: { size: 10 } } }
                }
            }
        });
    }
}

function toggleAiChat() {
    AiAssistant.init();
    const panel = document.getElementById('ai-chat-panel');
    if (!panel) return;
    const isOpen = panel.classList.toggle('open');
    panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    if (isOpen) {
        const input = document.getElementById('ai-chat-text');
        if (input) input.focus();
    }
}

function useSuggestion(question) {
    const input = document.getElementById('ai-chat-text');
    if (!input) return;
    input.value = question;
    const form = document.getElementById('ai-chat-form');
    if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
}

function escapeHtml(value) {
    if (value === undefined || value === null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeHtmlAttr(value) {
    return escapeHtml(value).replace(/"/g, '&quot;');
}
