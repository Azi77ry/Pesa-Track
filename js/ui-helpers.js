// UI Helpers Module — Styled Dialogs, Undo, Keyboard Shortcuts, Swipe Gestures

// ─── Styled Confirm Dialog (replaces confirm()) ─────────────────────────────
const UIConfirm = {
    _resolve: null,

    show(message, opts = {}) {
        return new Promise(resolve => {
            this._resolve = resolve;
            const { title = 'Are you sure?', confirmText = 'Confirm', confirmClass = 'btn-danger', icon = 'bi-exclamation-triangle' } = opts;

            const existing = document.getElementById('ui-confirm-modal');
            if (existing) existing.remove();

            const el = document.createElement('div');
            el.id = 'ui-confirm-modal';
            el.className = 'modal fade';
            el.setAttribute('tabindex', '-1');
            el.setAttribute('data-bs-backdrop', 'true');
            el.innerHTML = `
                <div class="modal-dialog modal-dialog-centered modal-sm">
                    <div class="modal-content border-0">
                        <div class="modal-body text-center p-4">
                            <div class="confirm-icon-wrap mb-3">
                                <i class="bi ${icon}"></i>
                            </div>
                            <h5 class="fw-bold mb-2">${title}</h5>
                            <p class="text-muted mb-4" style="font-size:0.93rem;">${message}</p>
                            <div class="d-flex gap-2">
                                <button class="btn btn-outline-secondary flex-fill" id="ui-confirm-cancel">Cancel</button>
                                <button class="btn ${confirmClass} flex-fill" id="ui-confirm-ok">${confirmText}</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(el);

            const modal = new bootstrap.Modal(el, { backdrop: true });
            el.querySelector('#ui-confirm-ok').onclick = () => { modal.hide(); resolve(true); };
            el.querySelector('#ui-confirm-cancel').onclick = () => { modal.hide(); resolve(false); };
            el.addEventListener('hidden.bs.modal', () => { el.remove(); resolve(false); }, { once: true });
            modal.show();
        });
    },

    async danger(message, title = 'Delete this item?') {
        return this.show(message, { title, confirmText: 'Delete', confirmClass: 'btn-danger', icon: 'bi-trash' });
    },

    async warn(message, title = 'Warning') {
        return this.show(message, { title, confirmText: 'Proceed', confirmClass: 'btn-warning', icon: 'bi-exclamation-triangle' });
    }
};


// ─── Undo Toast System ───────────────────────────────────────────────────────
const UndoManager = {
    _timer: null,
    _pending: null,

    push(label, undoFn) {
        if (this._timer) clearTimeout(this._timer);
        this._pending = undoFn;

        const container = document.getElementById('undo-toast-container');
        if (!container) return;

        const toast = document.getElementById('undo-toast');
        const labelEl = document.getElementById('undo-toast-label');
        if (labelEl) labelEl.textContent = label;

        toast.classList.add('show');
        this._timer = setTimeout(() => {
            toast.classList.remove('show');
            this._pending = null;
        }, 5000);
    },

    undo() {
        if (this._pending) {
            if (this._timer) clearTimeout(this._timer);
            this._pending();
            this._pending = null;
            const toast = document.getElementById('undo-toast');
            if (toast) toast.classList.remove('show');
        }
    },

    dismiss() {
        if (this._timer) clearTimeout(this._timer);
        this._pending = null;
        const toast = document.getElementById('undo-toast');
        if (toast) toast.classList.remove('show');
    }
};


// ─── Empty State Renderer ────────────────────────────────────────────────────
function renderEmptyState(icon, title, subtitle = '', actionLabel = '', actionFn = null) {
    return `
        <div class="empty-state-rich">
            <div class="empty-state-icon">
                <i class="bi bi-${icon}"></i>
            </div>
            <div class="empty-state-title">${title}</div>
            ${subtitle ? `<div class="empty-state-subtitle">${subtitle}</div>` : ''}
            ${actionLabel && actionFn ? `<button class="btn btn-primary btn-sm mt-3" onclick="${actionFn}">${actionLabel}</button>` : ''}
        </div>`;
}


// ─── Swipe-to-Delete for Touch ───────────────────────────────────────────────
function enableSwipeToDelete(containerEl, getItemId, onDelete) {
    let startX = 0, currentEl = null, threshold = 80;

    containerEl.addEventListener('touchstart', (e) => {
        const item = e.target.closest('[data-swipe-id]');
        if (!item) return;
        currentEl = item;
        startX = e.touches[0].clientX;
        item.style.transition = 'none';
    }, { passive: true });

    containerEl.addEventListener('touchmove', (e) => {
        if (!currentEl) return;
        const deltaX = e.touches[0].clientX - startX;
        if (deltaX < 0) {
            currentEl.style.transform = `translateX(${Math.max(deltaX, -120)}px)`;
            currentEl.style.opacity = 1 + deltaX / 200;
        }
    }, { passive: true });

    containerEl.addEventListener('touchend', (e) => {
        if (!currentEl) return;
        const deltaX = e.changedTouches[0].clientX - startX;
        currentEl.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

        if (deltaX < -threshold) {
            const id = getItemId(currentEl);
            if (id != null) {
                currentEl.style.transform = 'translateX(-100%)';
                currentEl.style.opacity = '0';
                setTimeout(() => onDelete(id), 300);
            } else {
                currentEl.style.transform = '';
                currentEl.style.opacity = '';
            }
        } else {
            currentEl.style.transform = '';
            currentEl.style.opacity = '';
        }
        currentEl = null;
    });
}


// ─── Keyboard Shortcuts ──────────────────────────────────────────────────────
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Skip if typing in input
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        if (e.metaKey || e.ctrlKey) {
            switch (e.key) {
                case 'i': e.preventDefault(); showAddTransactionModal('income'); break;
                case 'e': e.preventDefault(); showAddTransactionModal('expense'); break;
                case 'b': e.preventDefault(); showAddBudgetModal(); break;
                case 'p': e.preventDefault(); showAddBillModal(); break;
            }
            return;
        }
        switch (e.key) {
            case '1': showDashboard(); break;
            case '2': showActivity(); break;
            case '3': showInsights(); break;
            case '4': showProfileHome(); break;
            case 'n': toggleQuickAddSheet(); break;
        }
    });
}

document.addEventListener('DOMContentLoaded', setupKeyboardShortcuts);
