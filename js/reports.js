// Reports Module — Advanced Data Visualizations, Interactive Graphs, Spending Insights & Tax Analytics

let categoryChart = null;
let trendChart = null;
let comparisonChart = null;
let netWorthChart = null;
let budgetRadarChart = null;
let assetAllocChart = null;

// ─── Theme & Visual Styling Utilities ─────────────────────────────────────────
function getChartTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        isDark,
        textColor: isDark ? '#cbd5e1' : '#64748b',
        mutedColor: isDark ? '#94a3b8' : '#94a3b8',
        gridColor: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.16)',
        surfaceColor: isDark ? '#1e293b' : '#ffffff',
        tooltipBg: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(15, 23, 42, 0.90)',
        palette: [
            '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', 
            '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#e11d48'
        ]
    };
}

function createGradient(ctx, colorStart, colorEnd, height = 280) {
    if (!ctx) return colorStart;
    try {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, colorStart);
        grad.addColorStop(1, colorEnd);
        return grad;
    } catch (e) {
        return colorStart;
    }
}

// ─── Date Range Filters ────────────────────────────────────────────────────────
function getReportDateRange(transactions) {
    if (!Array.isArray(transactions)) return [];
    const periodEl = document.getElementById('report-period');
    const fromEl = document.getElementById('report-date-from');
    const toEl = document.getElementById('report-date-to');
    const period = periodEl ? periodEl.value : 'month';
    const now = new Date();

    if (period === 'custom' && fromEl && toEl) {
        const from = fromEl.value, to = toEl.value;
        return transactions.filter(t => (!from || t.date >= from) && (!to || t.date <= to));
    }
    if (period === '7d') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const start = d.toISOString().split('T')[0];
        return transactions.filter(t => t.date >= start);
    }
    if (period === '30d') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const start = d.toISOString().split('T')[0];
        return transactions.filter(t => t.date >= start);
    }
    if (period === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        return transactions.filter(t => t.date >= start);
    }
    if (period === 'quarter') {
        const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().split('T')[0];
        return transactions.filter(t => t.date >= qStart);
    }
    if (period === 'year') {
        const yearStart = `${now.getFullYear()}-01-01`;
        return transactions.filter(t => t.date >= yearStart);
    }
    return transactions; // 'all'
}

// ─── Main Reports Loader ──────────────────────────────────────────────────────
async function loadReportsView() {
    try {
        const userId = parseInt(Auth.getCurrentUserId());
        if (!userId || isNaN(userId)) return;

        const allTransactions = (await DB.getUserTransactions(userId)) || [];
        const categories = (await DB.getUserCategories(userId)) || [];
        const budgets = (await DB.getUserBudgets(userId)) || [];
        const investments = DB.getUserInvestments ? ((await DB.getUserInvestments(userId)) || []) : [];
        const settings = (await DB.getUserSettings(userId)) || {};
        const currency = typeof App !== 'undefined' ? App.getCurrencySymbol(settings?.currency || 'TZS') : 'TZS';

        const filteredTransactions = getReportDateRange(allTransactions);

        // Update summary metrics cards
        renderReportMetrics(filteredTransactions, currency);

        // Render charts safely with try/catch
        try { await renderCategoryChart(filteredTransactions, categories, currency); } catch(e) { console.warn(e); }
        try { await renderTrendChart(allTransactions, currency); } catch(e) { console.warn(e); }
        try { await renderComparisonChart(allTransactions, currency); } catch(e) { console.warn(e); }
        try { await renderNetWorthChart(allTransactions, investments, currency); } catch(e) { console.warn(e); }
        try { await renderBudgetRadarChart(filteredTransactions, budgets, categories, currency); } catch(e) { console.warn(e); }
        try { await renderAssetAllocationChart(investments, currency); } catch(e) { console.warn(e); }

        // Render text analytics & insights
        loadSpendingInsights(filteredTransactions, categories, currency);
        loadTaxEstimation(filteredTransactions, currency);

        // Show/hide custom date picker row
        const periodEl = document.getElementById('report-period');
        const customRow = document.getElementById('report-date-range-row');
        if (customRow && periodEl) {
            customRow.classList.toggle('d-none', periodEl.value !== 'custom');
        }
    } catch (err) {
        console.error('Error loading reports view:', err);
    }
}

function onReportPeriodChange() {
    const period = document.getElementById('report-period')?.value;
    const customRow = document.getElementById('report-date-range-row');
    if (customRow) {
        customRow.classList.toggle('d-none', period !== 'custom');
    }
    loadReportsView();
}

function setQuickReportPeriod(period) {
    const periodEl = document.getElementById('report-period');
    if (periodEl) {
        periodEl.value = period;
        onReportPeriodChange();
    }
}

// ─── 0. Report Metric Summary Cards ───────────────────────────────────────────
function renderReportMetrics(transactions, currency) {
    const container = document.getElementById('report-metrics-summary');
    if (!container) return;

    let income = 0, expense = 0;
    (transactions || []).forEach(t => {
        const amt = parseFloat(t.amount || 0);
        if (t.type === 'income') income += amt;
        else if (t.type === 'expense') expense += amt;
    });

    const net = income - expense;
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

    container.innerHTML = `
        <div class="row g-3 mb-4">
            <div class="col-6 col-md-3">
                <div class="card panel-card p-3 text-center">
                    <div class="small text-muted mb-1">Total Inflow</div>
                    <div class="h5 text-success fw-bold mb-0">${currency} ${income.toLocaleString()}</div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="card panel-card p-3 text-center">
                    <div class="small text-muted mb-1">Total Outflow</div>
                    <div class="h5 text-danger fw-bold mb-0">${currency} ${expense.toLocaleString()}</div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="card panel-card p-3 text-center">
                    <div class="small text-muted mb-1">Net Cashflow</div>
                    <div class="h5 ${net >= 0 ? 'text-primary' : 'text-danger'} fw-bold mb-0">${currency} ${net.toLocaleString()}</div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="card panel-card p-3 text-center">
                    <div class="small text-muted mb-1">Savings Rate</div>
                    <div class="h5 ${savingsRate >= 20 ? 'text-success' : 'text-warning'} fw-bold mb-0">${savingsRate}%</div>
                </div>
            </div>
        </div>
    `;
}

// ─── 1. Category Expense Donut Chart (With Center Total) ───────────────────────
async function renderCategoryChart(transactions, categories, currency) {
    const canvas = document.getElementById('categoryChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const theme = getChartTheme();

    const expenses = (transactions || []).filter(t => t.type === 'expense');
    const grouped = {};
    let totalExpense = 0;

    expenses.forEach(t => {
        const amt = parseFloat(t.amount || 0);
        totalExpense += amt;
        if (!grouped[t.category]) grouped[t.category] = 0;
        grouped[t.category] += amt;
    });

    const sorted = Object.keys(grouped).map(catId => {
        const cat = (categories || []).find(c => c.id === parseInt(catId));
        return { label: cat ? cat.name : 'Other', value: grouped[catId] };
    }).sort((a, b) => b.value - a.value);

    if (categoryChart) {
        try { categoryChart.destroy(); } catch(e){}
    }

    if (sorted.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const labels = sorted.map(s => s.label);
    const data = sorted.map(s => s.value);
    const bgColors = sorted.map((_, i) => theme.palette[i % theme.palette.length]);

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: theme.surfaceColor,
                hoverOffset: 12,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: theme.textColor,
                        font: { size: 12, family: 'Outfit, sans-serif' },
                        boxWidth: 12,
                        padding: 14,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: theme.tooltipBg,
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            const pct = totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(1) : 0;
                            return ` ${currency} ${val.toLocaleString()} (${pct}%)`;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 700
            }
        }
    });
}

// ─── 2. Cash Flow Wave / Area Trend Chart ──────────────────────────────────────
async function renderTrendChart(transactions, currency) {
    const canvas = document.getElementById('trendChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const theme = getChartTheme();

    const monthlyData = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        const isoPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = { income: 0, expense: 0, isoPrefix };
    }

    (transactions || []).forEach(t => {
        Object.keys(monthlyData).forEach(key => {
            if (t.date && t.date.startsWith(monthlyData[key].isoPrefix)) {
                if (t.type === 'income') monthlyData[key].income += parseFloat(t.amount || 0);
                else if (t.type === 'expense') monthlyData[key].expense += parseFloat(t.amount || 0);
            }
        });
    });

    const labels = Object.keys(monthlyData);
    const incomeData = labels.map(k => monthlyData[k].income);
    const expenseData = labels.map(k => monthlyData[k].expense);

    if (trendChart) {
        try { trendChart.destroy(); } catch(e){}
    }

    const incomeGrad = createGradient(ctx, 'rgba(16, 185, 129, 0.28)', 'rgba(16, 185, 129, 0.01)', 240);
    const expenseGrad = createGradient(ctx, 'rgba(239, 68, 68, 0.28)', 'rgba(239, 68, 68, 0.01)', 240);

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: incomeGrad,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    borderWidth: 3
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: '#ef4444',
                    backgroundColor: expenseGrad,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ef4444',
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: theme.textColor, font: { family: 'Outfit, sans-serif' }, boxWidth: 12, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: theme.tooltipBg,
                    titleColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${currency} ${ctx.raw.toLocaleString()}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: theme.mutedColor, font: { family: 'Outfit, sans-serif' } }
                },
                y: {
                    grid: { color: theme.gridColor },
                    ticks: {
                        color: theme.mutedColor,
                        callback: (val) => `${currency} ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
                    }
                }
            }
        }
    });
}

// ─── 3. Monthly Comparison Bar Chart ──────────────────────────────────────────
async function renderComparisonChart(transactions, currency) {
    const canvas = document.getElementById('comparisonChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const theme = getChartTheme();

    const monthlyData = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = d.toLocaleString('default', { month: 'short' });
        const isoPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = { income: 0, expense: 0, net: 0, isoPrefix };
    }

    (transactions || []).forEach(t => {
        Object.keys(monthlyData).forEach(key => {
            if (t.date && t.date.startsWith(monthlyData[key].isoPrefix)) {
                if (t.type === 'income') monthlyData[key].income += parseFloat(t.amount || 0);
                else if (t.type === 'expense') monthlyData[key].expense += parseFloat(t.amount || 0);
            }
        });
    });

    const labels = Object.keys(monthlyData);
    const incomeData = labels.map(k => monthlyData[k].income);
    const expenseData = labels.map(k => monthlyData[k].expense);

    if (comparisonChart) {
        try { comparisonChart.destroy(); } catch(e){}
    }

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#10b981',
                    borderRadius: 8,
                    borderSkipped: false
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: '#f87171',
                    borderRadius: 8,
                    borderSkipped: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: theme.textColor, boxWidth: 12, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: theme.tooltipBg,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${currency} ${ctx.raw.toLocaleString()}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: theme.mutedColor }
                },
                y: {
                    grid: { color: theme.gridColor },
                    ticks: {
                        color: theme.mutedColor,
                        callback: (val) => `${currency} ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
                    }
                }
            }
        }
    });
}

// ─── 4. Net Worth & Cumulative Wealth Growth Chart ────────────────────────────
async function renderNetWorthChart(transactions, investments, currency) {
    const canvas = document.getElementById('netWorthChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const theme = getChartTheme();

    const invTotal = (investments || []).reduce((sum, inv) => sum + parseFloat(inv.currentValue || inv.amount || 0), 0);

    const now = new Date();
    const monthlyNet = [];
    const labels = [];
    let runningBalance = invTotal;

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = d.toLocaleString('default', { month: 'short' });
        const isoPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        labels.push(monthKey);

        let inc = 0, exp = 0;
        (transactions || []).forEach(t => {
            if (t.date && t.date.startsWith(isoPrefix)) {
                if (t.type === 'income') inc += parseFloat(t.amount || 0);
                else if (t.type === 'expense') exp += parseFloat(t.amount || 0);
            }
        });
        runningBalance += (inc - exp);
        monthlyNet.push(Math.max(0, runningBalance));
    }

    if (netWorthChart) {
        try { netWorthChart.destroy(); } catch(e){}
    }

    const grad = createGradient(ctx, 'rgba(59, 130, 246, 0.32)', 'rgba(59, 130, 246, 0.02)', 240);

    netWorthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Estimated Net Worth',
                data: monthlyNet,
                borderColor: '#3b82f6',
                backgroundColor: grad,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#2563eb',
                pointRadius: 5,
                pointHoverRadius: 8,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: theme.tooltipBg,
                    padding: 12,
                    callbacks: {
                        label: (ctx) => ` Net Worth: ${currency} ${ctx.raw.toLocaleString()}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: theme.mutedColor } },
                y: {
                    grid: { color: theme.gridColor },
                    ticks: {
                        color: theme.mutedColor,
                        callback: (val) => `${currency} ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
                    }
                }
            }
        }
    });
}

// ─── 5. Budget vs Actual Spending Radar Chart ─────────────────────────────────
async function renderBudgetRadarChart(transactions, budgets, categories, currency) {
    const canvas = document.getElementById('budgetRadarChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const theme = getChartTheme();

    if (budgetRadarChart) {
        try { budgetRadarChart.destroy(); } catch(e){}
    }

    if (!budgets || !budgets.length) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const labels = [];
    const budgetVals = [];
    const spentVals = [];

    budgets.slice(0, 6).forEach(b => {
        const cat = (categories || []).find(c => c.id === parseInt(b.categoryId));
        labels.push(cat ? cat.name : 'Category');
        budgetVals.push(parseFloat(b.amount || 0));

        const spent = (transactions || [])
            .filter(t => t.type === 'expense' && parseInt(t.category) === parseInt(b.categoryId))
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        spentVals.push(spent);
    });

    budgetRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Budget Limit',
                    data: budgetVals,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderWidth: 2,
                    pointRadius: 3
                },
                {
                    label: 'Actual Spent',
                    data: spentVals,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderWidth: 2,
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: theme.textColor, boxWidth: 10, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: theme.tooltipBg,
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${currency} ${ctx.raw.toLocaleString()}`
                    }
                }
            },
            scales: {
                r: {
                    grid: { color: theme.gridColor },
                    pointLabels: { color: theme.textColor, font: { size: 11 } },
                    ticks: { display: false }
                }
            }
        }
    });
}

// ─── 6. Investment Asset Allocation Polar Area Chart ──────────────────────────
async function renderAssetAllocationChart(investments, currency) {
    const canvas = document.getElementById('assetAllocChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const theme = getChartTheme();

    if (assetAllocChart) {
        try { assetAllocChart.destroy(); } catch(e){}
    }

    if (!investments || !investments.length) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const grouped = {};
    investments.forEach(inv => {
        const type = inv.type || 'Other';
        if (!grouped[type]) grouped[type] = 0;
        grouped[type] += parseFloat(inv.currentValue || inv.amount || 0);
    });

    const labels = Object.keys(grouped);
    const data = labels.map(k => grouped[k]);
    const colors = labels.map((_, i) => theme.palette[i % theme.palette.length]);

    assetAllocChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.map(c => c + 'aa'),
                borderColor: theme.surfaceColor,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: theme.textColor, boxWidth: 10, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: theme.tooltipBg,
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${currency} ${ctx.raw.toLocaleString()}`
                    }
                }
            },
            scales: {
                r: {
                    grid: { color: theme.gridColor },
                    ticks: { display: false }
                }
            }
        }
    });
}

// ─── Download High-Res Chart Image ────────────────────────────────────────────
function downloadChartImage(canvasId, fileName = 'chart.png') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    try {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        if (typeof showToast === 'function') {
            showToast('Chart exported as image!', 'success');
        }
    } catch(e) {
        console.warn('Could not export chart:', e);
    }
}

// ─── Spending Insights Engine ──────────────────────────────────────────────────
function loadSpendingInsights(transactions, categories, currency) {
    const container = document.getElementById('spending-insights');
    if (!container) return;

    const expenses = (transactions || []).filter(t => t.type === 'expense');
    if (expenses.length === 0) {
        container.innerHTML = '<div class="text-muted small">No expense data recorded yet for this timeframe.</div>';
        return;
    }

    const catTotals = {};
    let totalExpense = 0;
    expenses.forEach(t => {
        const amt = parseFloat(t.amount || 0);
        totalExpense += amt;
        catTotals[t.category] = (catTotals[t.category] || 0) + amt;
    });

    const topCatId = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0];
    const topCat = (categories || []).find(c => c.id === parseInt(topCatId));
    const topCatName = topCat ? topCat.name : 'Top Category';
    const topCatAmount = catTotals[topCatId] || 0;
    const topCatPct = totalExpense > 0 ? Math.round((topCatAmount / totalExpense) * 100) : 0;

    const avgPerTx = Math.round(totalExpense / expenses.length);

    container.innerHTML = `
        <div class="d-flex flex-wrap gap-2">
            <div class="insight-chip">
                <i class="bi bi-fire text-danger me-1"></i>
                Top Expense: <strong>${escapeHtml(topCatName)}</strong> (${currency} ${topCatAmount.toLocaleString()} — ${topCatPct}%)
            </div>
            <div class="insight-chip">
                <i class="bi bi-calculator text-primary me-1"></i>
                Avg / Transaction: <strong>${currency} ${avgPerTx.toLocaleString()}</strong>
            </div>
            <div class="insight-chip">
                <i class="bi bi-receipt text-success me-1"></i>
                Total Entries: <strong>${expenses.length}</strong>
            </div>
        </div>
    `;
}

// ─── Tax Estimation Engine ────────────────────────────────────────────────────
function loadTaxEstimation(transactions, currency) {
    const container = document.getElementById('tax-estimation');
    if (!container) return;

    const totalIncome = (transactions || [])
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const estDeductions = (transactions || [])
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) * 0.15;

    const taxableIncome = Math.max(0, totalIncome - estDeductions);
    const estTax = Math.round(taxableIncome * 0.18);

    container.innerHTML = `
        <div class="row g-3">
            <div class="col-6 col-md-3">
                <div class="small text-muted">Gross Earnings</div>
                <div class="fw-semibold">${currency} ${totalIncome.toLocaleString()}</div>
            </div>
            <div class="col-6 col-md-3">
                <div class="small text-muted">Estimated Deductions</div>
                <div class="fw-semibold text-success">${currency} ${Math.round(estDeductions).toLocaleString()}</div>
            </div>
            <div class="col-6 col-md-3">
                <div class="small text-muted">Taxable Base</div>
                <div class="fw-semibold">${currency} ${Math.round(taxableIncome).toLocaleString()}</div>
            </div>
            <div class="col-6 col-md-3">
                <div class="small text-muted">Estimated Tax</div>
                <div class="fw-bold text-danger">${currency} ${estTax.toLocaleString()}</div>
            </div>
        </div>
    `;
}

// ─── CSV Export Functionality ─────────────────────────────────────────────────
async function exportReportCSV() {
    try {
        const userId = parseInt(Auth.getCurrentUserId());
        const transactions = (await DB.getUserTransactions(userId)) || [];
        const categories = (await DB.getUserCategories(userId)) || [];

        const headers = ['Date', 'Type', 'Category', 'Amount', 'Description'];
        const rows = transactions.map(t => {
            const cat = categories.find(c => c.id === parseInt(t.category));
            return [
                t.date || '',
                t.type || '',
                `"${(cat ? cat.name : 'Unknown').replace(/"/g, '""')}"`,
                t.amount || 0,
                `"${(t.description || '').replace(/"/g, '""')}"`
            ];
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `pesatrucker_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (typeof showToast === 'function') {
            showToast('Report downloaded as CSV!', 'success');
        }
    } catch(e) {
        console.error('CSV export failed:', e);
    }
}
