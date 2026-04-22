// Reports and Analytics Module

let categoryChart, trendChart, comparisonChart;

function createLineGradient(ctx, color) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    if (color === 'blue') {
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.02)');
    } else {
        gradient.addColorStop(0, 'rgba(22, 163, 74, 0.24)');
        gradient.addColorStop(1, 'rgba(22, 163, 74, 0.02)');
    }
    return gradient;
}

function getChartTextColor() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? '#cbd5e1' : '#64748b';
}

function getChartGridColor() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.18)';
}

function getChartSurfaceColor() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? '#0f172a' : '#ffffff';
}

function getLegendLabelColor(index) {
    const palette = ['#1d4ed8', '#22c55e', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#a3a3a3', '#f97316', '#6366f1'];
    return palette[index % palette.length];
}

// Load Reports View
async function loadReportsView() {
    const userId = parseInt(Auth.getCurrentUserId());
    const transactions = await DB.getUserTransactions(userId);
    const categories = await DB.getUserCategories(userId);
    const settings = await DB.getUserSettings(userId);
    const currency = App.getCurrencySymbol(settings?.currency || 'TZS');
    
    // Load all charts
    await loadCategoryChart(transactions, categories, currency);
    await loadTrendChart(transactions, currency);
    await loadComparisonChart(transactions, currency);
}

// Category Pie Chart
async function loadCategoryChart(transactions, categories, currency) {
    const expenses = transactions.filter(t => t.type === 'expense');
    
    // Group by category
    const grouped = {};
    expenses.forEach(t => {
        if (!grouped[t.category]) {
            grouped[t.category] = 0;
        }
        grouped[t.category] += parseFloat(t.amount);
    });
    
    const data = Object.keys(grouped).map(catId => {
        const category = categories.find(c => c.id === parseInt(catId));
        return {
            label: category ? category.name : 'Unknown',
            value: grouped[catId]
        };
    });
    
    // Sort by value
    data.sort((a, b) => b.value - a.value);
    
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    const totalExpenses = data.reduce((sum, item) => sum + item.value, 0);
    const textColor = getChartTextColor();
    const surfaceColor = getChartSurfaceColor();
    
    // Destroy existing chart
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                data: data.map(d => d.value),
                backgroundColor: [
                    '#1d4ed8', '#22c55e', '#0ea5e9', '#f59e0b', '#8b5cf6',
                    '#ef4444', '#14b8a6', '#a3a3a3', '#f97316', '#6366f1'
                ],
                borderWidth: 3,
                borderColor: surfaceColor,
                hoverOffset: 6,
                spacing: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '58%',
            plugins: {
                legend: {
                    position: 'right',
                    align: 'center',
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 10,
                        boxHeight: 10,
                        padding: 18,
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        generateLabels(chart) {
                            const baseLabels = Chart.overrides.doughnut.plugins.legend.labels.generateLabels(chart);
                            return baseLabels.map((label, index) => {
                                const value = data[index]?.value || 0;
                                const percentage = totalExpenses ? Math.round((value / totalExpenses) * 100) : 0;
                                return {
                                    ...label,
                                    text: `${label.text} ${percentage}%`,
                                    strokeStyle: getLegendLabelColor(index),
                                    fillStyle: getLegendLabelColor(index),
                                    lineWidth: 0
                                };
                            });
                        },
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${currency}${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Monthly Trend Line Chart
async function loadTrendChart(transactions, currency) {
    const now = new Date();
    const months = [];
    const incomeData = [];
    const expenseData = [];
    
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    const chartTextColor = getChartTextColor();
    const gridColor = getChartGridColor();
    const incomeGradient = createLineGradient(ctx.getContext('2d'), 'green');
    const expenseGradient = createLineGradient(ctx.getContext('2d'), 'blue');

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        months.push(monthName);
        
        // Filter transactions for this month
        const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getFullYear() === date.getFullYear() && 
                   tDate.getMonth() === date.getMonth();
        });
        
        const income = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const expense = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        incomeData.push(income);
        expenseData.push(expense);
    }
    
    // Destroy existing chart
    if (trendChart) {
        trendChart.destroy();
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#16a34a',
                    backgroundColor: incomeGradient,
                    tension: 0.42,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    borderWidth: 3
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: '#2563eb',
                    backgroundColor: expenseGradient,
                    tension: 0.42,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: chartTextColor,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 10,
                        boxHeight: 10,
                        padding: 16,
                        font: {
                            size: 12,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: getChartSurfaceColor(),
                    titleColor: chartTextColor,
                    bodyColor: chartTextColor,
                    borderColor: gridColor,
                    borderWidth: 1,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${currency}${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: chartTextColor
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: chartTextColor,
                        callback: function(value) {
                            return currency + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

// Income vs Expenses Comparison Bar Chart
async function loadComparisonChart(transactions, currency) {
    const now = new Date();
    const months = [];
    const incomeData = [];
    const expenseData = [];
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        months.push(monthName);
        
        // Filter transactions for this month
        const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getFullYear() === date.getFullYear() && 
                   tDate.getMonth() === date.getMonth();
        });
        
        const income = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const expense = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        incomeData.push(income);
        expenseData.push(expense);
    }
    
    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;
    const chartTextColor = getChartTextColor();
    const gridColor = getChartGridColor();
    
    // Destroy existing chart
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#16a34a',
                    borderRadius: 8
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: '#2563eb',
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: chartTextColor,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 10,
                        boxHeight: 10,
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: getChartSurfaceColor(),
                    titleColor: chartTextColor,
                    bodyColor: chartTextColor,
                    borderColor: gridColor,
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${currency}${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: chartTextColor
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: chartTextColor,
                        callback: function(value) {
                            return currency + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}
