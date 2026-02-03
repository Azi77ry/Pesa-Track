// Events Module

let eventReminderTimer = null;

async function loadEventsView() {
    const userId = parseInt(Auth.getCurrentUserId());
    const events = await DB.getUserEvents(userId);

    renderEvents(events);
    startEventReminderLoop();
}

function renderEvents(events) {
    const container = document.getElementById('events-list');
    if (!container) return;

    if (!events.length) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-calendar3"></i><p>No events yet</p></div>';
        return;
    }

    const sorted = events.slice().sort((a, b) => {
        const aKey = a.datetime || `${a.date}T${a.time || '00:00'}`;
        const bKey = b.datetime || `${b.date}T${b.time || '00:00'}`;
        return aKey.localeCompare(bKey);
    });

    container.innerHTML = sorted.map(evt => {
        const dateLabel = formatEventDate(evt.date);
        const timeLabel = evt.time ? formatEventTime(evt.time) : 'All day';
        return `
            <div class="event-item">
                <div class="event-meta">
                    <div class="event-title">${escapeHtml(evt.title)}</div>
                    <div class="event-sub">${dateLabel} • ${timeLabel}</div>
                    ${evt.notes ? `<div class="event-notes">${escapeHtml(evt.notes)}</div>` : ''}
                </div>
                <div class="event-actions">
                    <button class="btn btn-sm btn-outline-secondary" onclick="editEvent(${evt.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteEvent(${evt.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function showAddEventModal() {
    openEventModal();
}

async function editEvent(id) {
    const evt = await DB.get('events', id);
    if (!evt) return;
    openEventModal(evt);
}

function openEventModal(evt = null) {
    const modalEl = document.getElementById('eventModal');
    const form = document.getElementById('eventForm');
    if (!modalEl || !form) return;

    form.reset();
    document.getElementById('event-id').value = evt ? evt.id : '';
    document.getElementById('event-title').value = evt ? evt.title : '';
    document.getElementById('event-date').value = evt ? evt.date : '';
    document.getElementById('event-time').value = evt ? evt.time : '';
    document.getElementById('event-notes').value = evt ? evt.notes || '' : '';

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
}

async function handleEventSubmit(event) {
    event.preventDefault();

    const userId = parseInt(Auth.getCurrentUserId());
    const id = document.getElementById('event-id').value;
    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const notes = document.getElementById('event-notes').value.trim();

    if (!title || !date) {
        showToast('Title and date are required', 'error');
        return;
    }

    const datetime = `${date}T${time || '00:00'}`;

    const eventData = {
        userId,
        title,
        date,
        time: time || '',
        notes,
        datetime
    };

    if (id) {
        const existing = await DB.get('events', parseInt(id));
        if (!existing) return;
        eventData.id = parseInt(id);
        eventData.notifiedAt = existing.notifiedAt || null;
        await DB.update('events', eventData);
        showToast('Event updated', 'success');
    } else {
        await DB.add('events', eventData);
        showToast('Event added', 'success');
    }

    const modal = bootstrap.Modal.getInstance(document.getElementById('eventModal'));
    if (modal) modal.hide();

    loadEventsView();
}

async function deleteEvent(id) {
    if (!confirm('Delete this event?')) return;
    await DB.delete('events', id);
    showToast('Event deleted', 'success');
    loadEventsView();
}

function formatEventDate(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatEventTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h || 0, m || 0, 0, 0);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function startEventReminderLoop() {
    if (eventReminderTimer) return;
    eventReminderTimer = setInterval(checkEventReminders, 60 * 1000);
    checkEventReminders();
}

async function checkEventReminders() {
    const userId = parseInt(Auth.getCurrentUserId());
    if (!userId) return;

    const settings = await DB.getUserSettings(userId);
    if (settings && settings.notifications === false) return;

    const events = await DB.getUserEvents(userId);
    const now = new Date();
    const windowMs = 15 * 60 * 1000;

    for (const evt of events) {
        if (!evt.date) continue;
        const timeValue = evt.time || '00:00';
        const eventTime = new Date(`${evt.date}T${timeValue}`);
        const diff = eventTime.getTime() - now.getTime();
        if (diff < 0 || diff > windowMs) continue;

        if (evt.notifiedAt) {
            const last = new Date(evt.notifiedAt);
            if (!Number.isNaN(last.getTime()) && now - last < 2 * 60 * 1000) {
                continue;
            }
        }

        await notifyEvent(evt);
        evt.notifiedAt = new Date().toISOString();
        await DB.update('events', evt);
    }
}

async function notifyEvent(evt) {
    const title = 'Event Reminder';
    const body = `${evt.title} • ${formatEventTime(evt.time)} on ${formatEventDate(evt.date)}`;

    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
    } else {
        showToast(body, 'success');
    }
}
