// Bills Module

// Show Add Bill Modal
function showAddBillModal() {
    const modal = new bootstrap.Modal(document.getElementById('billModal'));
    const form = document.getElementById('billForm');
    
    
    // Reset form
    form.reset();
    document.getElementById('bill-id').value = '';
    
    // Set default due date (next month)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('bill-due-date').value = nextMonth.toISOString().split('T')[0];
    
    modal.show();
}

// Handle Bill Submit
async function handleBillSubmit(event) {
    event.preventDefault();
    
    const userId = parseInt(Auth.getCurrentUserId());
    const id = document.getElementById('bill-id').value;
    const name = document.getElementById('bill-name').value;
    const amount = parseFloat(document.getElementById('bill-amount').value);
    const dueDate = document.getElementById('bill-due-date').value;
    const recurring = document.getElementById('bill-recurring').value;
    const category = parseInt(document.getElementById('bill-category').value);
    
    const bill = {
        userId,
        name,
        amount,
        dueDate,
        recurring,
        category,
        paid: false,
        createdAt: new Date().toISOString()
    };
    
    try {
        if (id) {
            // Update existing bill
            bill.id = parseInt(id);
            const existingBill = await DB.get('bills', bill.id);
            bill.paid = existingBill.paid;
            await DB.update('bills', bill);
            showToast('Bill updated successfully', 'success');
        } else {
            // Add new bill
            await DB.add('bills', bill);
            showToast('Bill added successfully', 'success');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('billModal'));
        modal.hide();
        
        // Reload bills view
        loadBillsView();
        
        // Add to sync queue
        await addToSyncQueue('bill', bill);
        
    } catch (error) {
        showToast('Error saving bill: ' + error.message, 'error');
    }
}

// Load Bills View
async function loadBillsView() {
    const userId = parseInt(Auth.getCurrentUserId());
    const bills = await DB.getUserBills(userId);
    const categories = await DB.getUserCategories(userId);
    const settings = await DB.getUserSettings(userId);
    const currency = App.getCurrencySymbol(settings?.currency || 'USD');
    
    const container = document.getElementById('bills-list');
    
    if (bills.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-receipt"></i><p>No bills added yet</p></div>';
        return;
    }
    
    // Sort by due date
    bills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    // Group by status
    const unpaid = bills.filter(b => !b.paid);
    const paid = bills.filter(b => b.paid);
    const now = new Date();
    
    container.innerHTML = `
        <div class="row g-4">
            ${unpaid.length > 0 ? `
                <div class="col-12">
                    <h4 class="mb-3">Unpaid Bills</h4>
                    ${unpaid.map(bill => renderBillCard(bill, categories, currency, now)).join('')}
                </div>
            ` : ''}
            
            ${paid.length > 0 ? `
                <div class="col-12">
                    <h4 class="mb-3">Paid Bills</h4>
                    ${paid.map(bill => renderBillCard(bill, categories, currency, now)).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Render Bill Card
function renderBillCard(bill, categories, currency, now) {
    const category = categories.find(c => c.id === bill.category);
    const categoryName = category ? category.name : 'Unknown';
    const icon = category ? category.icon : 'receipt';
    
    const dueDate = new Date(bill.dueDate);
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    const isOverdue = !bill.paid && daysUntilDue < 0;
    const isDueSoon = !bill.paid && daysUntilDue >= 0 && daysUntilDue <= 7;
    
    let statusClass = '';
    let statusBadge = '';
    
    if (bill.paid) {
        statusClass = 'paid';
        statusBadge = '<span class="badge bg-success">Paid</span>';
    } else if (isOverdue) {
        statusClass = 'overdue';
        statusBadge = `<span class="badge bg-danger">Overdue by ${Math.abs(daysUntilDue)} days</span>`;
    } else if (isDueSoon) {
        statusBadge = `<span class="badge bg-warning">Due in ${daysUntilDue} days</span>`;
    }
    
    return `
        <div class="bill-item ${statusClass} mb-3">
            <div class="d-flex justify-content-between align-items-start">
                <div class="d-flex align-items-start flex-grow-1">
                    <div class="icon-box bg-primary me-3" style="width: 50px; height: 50px;">
                        <i class="bi bi-${icon}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h5 class="mb-1">${bill.name}</h5>
                        <div class="text-muted small mb-2">
                            <i class="bi bi-tag me-1"></i>${categoryName}
                            ${bill.recurring !== 'none' ? ` • <i class="bi bi-arrow-repeat ms-2 me-1"></i>${bill.recurring}` : ''}
                        </div>
                        <div class="text-muted small">
                            <i class="bi bi-calendar me-1"></i>Due: ${dueDate.toLocaleDateString()}
                        </div>
                        ${statusBadge ? `<div class="mt-2">${statusBadge}</div>` : ''}
                    </div>
                </div>
                <div class="text-end ms-3">
                    <div class="h4 mb-2">${App.formatCurrency(bill.amount, currency)}</div>
                    <div class="btn-group">
                        ${!bill.paid ? `
                            <button class="btn btn-sm btn-success" onclick="markBillAsPaid(${bill.id})">
                                <i class="bi bi-check-circle"></i> Pay
                            </button>
                        ` : ''}
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" href="#" onclick="editBill(${bill.id})"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                                ${bill.paid ? `
                                    <li><a class="dropdown-item" href="#" onclick="markBillAsUnpaid(${bill.id})"><i class="bi bi-x-circle me-2"></i>Mark Unpaid</a></li>
                                ` : ''}
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="deleteBill(${bill.id})"><i class="bi bi-trash me-2"></i>Delete</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Edit Bill
async function editBill(id) {
    const bill = await DB.get('bills', id);
    
    if (!bill) {
        showToast('Bill not found', 'error');
        return;
    }
    
    // Fill form
    document.getElementById('bill-id').value = bill.id;
    document.getElementById('bill-name').value = bill.name;
    document.getElementById('bill-amount').value = bill.amount;
    document.getElementById('bill-due-date').value = bill.dueDate;
    document.getElementById('bill-recurring').value = bill.recurring;
    document.getElementById('bill-category').value = bill.category;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('billModal'));
    modal.show();
}

// Delete Bill
async function deleteBill(id) {
    if (!confirm('Are you sure you want to delete this bill?')) {
        return;
    }
    
    try {
        await DB.delete('bills', id);
        showToast('Bill deleted successfully', 'success');
        
        // Reload bills view
        loadBillsView();
        
        // Add to sync queue
        await addToSyncQueue('delete_bill', { id });
        
    } catch (error) {
        showToast('Error deleting bill: ' + error.message, 'error');
    }
}

// Mark Bill as Paid
async function markBillAsPaid(id) {
    try {
        const bill = await DB.get('bills', id);
        
        if (!bill) {
            showToast('Bill not found', 'error');
            return;
        }
        
        bill.paid = true;
        bill.paidAt = new Date().toISOString();
        
        await DB.update('bills', bill);
        
        // Create expense transaction
        const userId = parseInt(Auth.getCurrentUserId());
        const transaction = {
            userId,
            type: 'expense',
            amount: bill.amount,
            category: bill.category,
            date: new Date().toISOString().split('T')[0],
            note: `Payment for: ${bill.name}`,
            updatedAt: new Date().toISOString(),
            synced: false
        };
        
        await DB.add('transactions', transaction);
        
        // Handle recurring bills
        if (bill.recurring !== 'none') {
            const nextDueDate = new Date(bill.dueDate);
            
            if (bill.recurring === 'monthly') {
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            } else if (bill.recurring === 'quarterly') {
                nextDueDate.setMonth(nextDueDate.getMonth() + 3);
            } else if (bill.recurring === 'yearly') {
                nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            }
            
            // Create next bill
            const nextBill = {
                ...bill,
                dueDate: nextDueDate.toISOString().split('T')[0],
                paid: false,
                paidAt: null,
                createdAt: new Date().toISOString()
            };
            delete nextBill.id;
            
            await DB.add('bills', nextBill);
        }
        
        showToast('Bill marked as paid', 'success');
        
        // Reload bills view
        loadBillsView();
        
        // Reload dashboard if visible
        if (!document.getElementById('dashboard-view').classList.contains('d-none')) {
            App.loadDashboard();
        }
        
        // Add to sync queue
        await addToSyncQueue('bill', bill);
        await addToSyncQueue('transaction', transaction);
        
    } catch (error) {
        showToast('Error marking bill as paid: ' + error.message, 'error');
    }
}

// Mark Bill as Unpaid
async function markBillAsUnpaid(id) {
    try {
        const bill = await DB.get('bills', id);
        
        if (!bill) {
            showToast('Bill not found', 'error');
            return;
        }
        
        bill.paid = false;
        bill.paidAt = null;
        
        await DB.update('bills', bill);
        
        showToast('Bill marked as unpaid', 'success');
        
        // Reload bills view
        loadBillsView();
        
        // Add to sync queue
        await addToSyncQueue('bill', bill);
        
    } catch (error) {
        showToast('Error marking bill as unpaid: ' + error.message, 'error');
    }
}
