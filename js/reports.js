// Reports and Analytics Module

let categoryChart, trendChart, comparisonChart;

// Load Reports View
async function loadReportsView() {
    const userId = parseInt(Auth.getCurrentUserId());
    const transactions = await DB.getUserTransactions(userId);
    const categories = await DB.getUserCategories(userId);
    
    // Load all charts
    await loadCategoryChart(transactions, categories);
    await loadTrendChart(transactions);
    await loadComparisonChart(transactions);
}

// Category Pie Chart
async function loadCategoryChart(transactions, categories) {
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
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Monthly Trend Line Chart
async function loadTrendChart(transactions) {
    const now = new Date();
    const months = [];
    const incomeData = [];
    const expenseData = [];
    
    // Get last 12 months
    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
    
    const ctx = document.getElementById('trendChart');
    
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
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
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
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

// Income vs Expenses Comparison Bar Chart
async function loadComparisonChart(transactions) {
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
                    backgroundColor: '#10b981',
                    borderRadius: 8
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: '#ef4444',
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}
