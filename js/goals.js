// Goals Module — Financial Goals & Goal Tracking

// ─── DB Store helpers (goals stored in 'goals' object store) ─────────────────
async function getGoalStore(mode = 'readonly') {
    return new Promise((resolve, reject) => {
        if (!DB.db.objectStoreNames.contains('goals')) {
            reject(new Error('Goals store not found'));
            return;
        }
        const tx = DB.db.transaction(['goals'], mode);
        resolve(tx.objectStore('goals'));
    });
}

async function getUserGoals(userId) {
    try {
        if (!DB.db.objectStoreNames.contains('goals')) return [];
        return DB.getAllByIndex('goals', 'userId', userId);
    } catch { return []; }
}

// ─── Show Add Goal Modal ──────────────────────────────────────────────────────
function showAddGoalModal(existingGoal = null) {
    const modalEl = document.getElementById('goalModal');
    if (!modalEl) return;
    const form = document.getElementById('goalForm');
    if (form) form.reset();

    document.getElementById('goal-id').value = existingGoal ? existingGoal.id : '';
    if (existingGoal) {
        document.getElementById('goal-name').value = existingGoal.name || '';
        document.getElementById('goal-target').value = existingGoal.target || '';
        document.getElementById('goal-deadline').value = existingGoal.deadline || '';
        document.getElementById('goal-saved').value = existingGoal.saved || 0;
        document.getElementById('goal-icon').value = existingGoal.icon || 'trophy';
    }

    const title = modalEl.querySelector('.modal-title');
    if (title) title.textContent = existingGoal ? 'Edit Goal' : 'New Goal';

    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

// ─── Handle Goal Submit ───────────────────────────────────────────────────────
async function handleGoalSubmit(event) {
    event.preventDefault();
    const userId = parseInt(Auth.getCurrentUserId());
    const id = document.getElementById('goal-id').value;
    const name = document.getElementById('goal-name').value.trim();
    const target = parseFloat(document.getElementById('goal-target').value);
    const deadline = document.getElementById('goal-deadline').value;
    const saved = parseFloat(document.getElementById('goal-saved').value) || 0;
    const icon = document.getElementById('goal-icon').value || 'trophy';

    if (!name || !target) { showToast('Please fill in name and target amount', 'error'); return; }

    const goal = { userId, name, target, deadline, saved, icon, updatedAt: new Date().toISOString() };

    try {
        if (id) {
            goal.id = parseInt(id);
            await DB.update('goals', goal);
            showToast('Goal updated', 'success');
        } else {
            goal.createdAt = new Date().toISOString();
            await DB.add('goals', goal);
            showToast('Goal created!', 'success');
        }
        bootstrap.Modal.getInstance(document.getElementById('goalModal'))?.hide();
        loadGoalsView();
    } catch (e) {
        showToast('Error saving goal: ' + e.message, 'error');
    }
}

// ─── Contribute to Goal ───────────────────────────────────────────────────────
async function contributeToGoal(goalId) {
    const amount = parseFloat(prompt('Enter amount to add to this goal:'));
    if (isNaN(amount) || amount <= 0) return;

    const goal = await DB.get('goals', goalId);
    if (!goal) return;

    goal.saved = (goal.saved || 0) + amount;
    goal.updatedAt = new Date().toISOString();
    await DB.update('goals', goal);

    // Also create an income transaction so it appears in history
    const userId = parseInt(Auth.getCurrentUserId());
    const settings = await DB.getUserSettings(userId);
    const currency = App.getCurrencySymbol(settings?.currency || 'TZS');
    showToast(`${currency}${amount.toFixed(2)} added to "${goal.name}"`, 'success');
    loadGoalsView();
}

// ─── Delete Goal ─────────────────────────────────────────────────────────────
async function deleteGoal(goalId) {
    const ok = await UIConfirm.danger('This goal and its progress will be removed.', 'Delete Goal?');
    if (!ok) return;
    await DB.delete('goals', goalId);
    showToast('Goal deleted', 'success');
    loadGoalsView();
}

// ─── Load Goals View ──────────────────────────────────────────────────────────
async function loadGoalsView() {
    const container = document.getElementById('goals-list');
    if (!container) return;

    const userId = parseInt(Auth.getCurrentUserId());
    const goals = await getUserGoals(userId);
    const settings = await DB.getUserSettings(userId);
    const currency = App.getCurrencySymbol(settings?.currency || 'TZS');

    if (!goals.length) {
        container.innerHTML = renderEmptyState('trophy', 'No goals yet', 'Set a savings goal and track your progress.', 'showAddGoalModal()', 'Add Goal');
        return;
    }

    container.innerHTML = goals.map(goal => {
        const pct = Math.min((goal.saved / goal.target) * 100, 100);
        const remaining = Math.max(goal.target - goal.saved, 0);
        const deadlineLabel = goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'No deadline';
        const isComplete = goal.saved >= goal.target;
        let statusClass = isComplete ? 'success' : pct >= 80 ? 'warning' : 'primary';

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card goal-card${isComplete ? ' goal-complete' : ''}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div class="d-flex align-items-center gap-2">
                                <div class="icon-box bg-${statusClass}" style="width:40px;height:40px;font-size:1rem;">
                                    <i class="bi bi-${goal.icon || 'trophy'}"></i>
                                </div>
                                <div>
                                    <h5 class="mb-0">${goal.name}</h5>
                                    <small class="text-muted"><i class="bi bi-calendar me-1"></i>${deadlineLabel}</small>
                                </div>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-link text-muted" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li><a class="dropdown-item" href="#" onclick="contributeToGoal(${goal.id})"><i class="bi bi-plus-circle me-2"></i>Add Funds</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="showAddGoalModal(${JSON.stringify(goal).replace(/"/g, '&quot;')})"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteGoal(${goal.id})"><i class="bi bi-trash me-2"></i>Delete</a></li>
                                </ul>
                            </div>
                        </div>

                        <div class="mb-2">
                            <div class="d-flex justify-content-between mb-1">
                                <span class="text-muted small">Saved</span>
                                <span class="fw-bold">${currency}${goal.saved.toFixed(2)}</span>
                            </div>
                            <div class="progress" style="height:8px;border-radius:8px;">
                                <div class="progress-bar bg-${statusClass}" style="width:${pct}%;border-radius:8px;transition:width 0.6s ease;"></div>
                            </div>
                        </div>

                        <div class="d-flex justify-content-between text-muted small">
                            <span>Target: ${currency}${goal.target.toFixed(2)}</span>
                            <span>${pct.toFixed(0)}% complete</span>
                        </div>

                        <div class="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
                            <span class="text-muted small">Remaining: <strong class="text-${statusClass}">${currency}${remaining.toFixed(2)}</strong></span>
                            ${isComplete
                                ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Goal Reached!</span>'
                                : `<button class="btn btn-sm btn-primary" onclick="contributeToGoal(${goal.id})"><i class="bi bi-plus me-1"></i>Add Funds</button>`
                            }
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// ─── Show Goals View ──────────────────────────────────────────────────────────
function showGoals() {
    showView('goals-view');
    loadGoalsView();
}
