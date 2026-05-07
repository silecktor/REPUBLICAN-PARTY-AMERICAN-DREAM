document.addEventListener('DOMContentLoaded', () => {
    initApplyPage();
});

// ========== WEBHOOK ИЗ ENV (ТОЛЬКО ЧЕРЕЗ ПЕРЕМЕННУЮ СРЕДЫ) ==========
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1501235676128088165/OMo_QFumMq_YHQ9Kp8Xe6HKn7sm3mEECis0WOH6UCSZCTrZLWaELi8_PkxpjzU_DWqn2';


function initApplyPage() {
    initModal();
    initOathUpdate();
    initFormSubmit();
    initDraft();
}

// ========== КАСТОМНОЕ УВЕДОМЛЕНИЕ (правый нижний угол, с кнопкой закрыть, 3 секунды) ==========
let currentNotification = null;
let notificationTimeout = null;

function showNotification(message, isError = false) {
    // Удаляем старое уведомление
    if (currentNotification) {
        currentNotification.remove();
        if (notificationTimeout) clearTimeout(notificationTimeout);
    }
    
    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    if (isError) notification.classList.add('error');
    
    notification.innerHTML = `
        <div class="notification-text">${escapeHTML(message)}</div>
        <button class="notification-close">✕</button>
    `;
    
    document.body.appendChild(notification);
    currentNotification = notification;
    
    // Кнопка закрытия
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.add('hiding');
        setTimeout(() => {
            if (notification.parentNode) notification.remove();
            if (currentNotification === notification) currentNotification = null;
        }, 300);
        if (notificationTimeout) clearTimeout(notificationTimeout);
    });
    
    // Авто-закрытие через 3 секунды
    notificationTimeout = setTimeout(() => {
        if (currentNotification === notification) {
            notification.classList.add('hiding');
            setTimeout(() => {
                if (notification.parentNode) notification.remove();
                if (currentNotification === notification) currentNotification = null;
            }, 300);
        }
    }, 3000);
}

// ========== ЧЕРНОВИК (sessionStorage, 2 минуты) ==========
function initDraft() {
    const form = document.getElementById('apply-form');
    if (!form) return;

    let saveTimeout;
    function saveDraft() {
        const formData = new FormData(form);
        const draft = {};
        for (let [key, value] of formData.entries()) {
            draft[key] = value;
        }
        draft['accept-charter'] = document.getElementById('accept-charter')?.checked || false;
        draft['accept-data'] = document.getElementById('accept-data')?.checked || false;
        draft['accept-oath'] = document.getElementById('accept-oath')?.checked || false;
        draft['timestamp'] = Date.now();
        sessionStorage.setItem('applyDraft', JSON.stringify(draft));
    }

    function autoSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveDraft, 500);
    }

    form.querySelectorAll('input, textarea, select').forEach(el => {
        el.addEventListener('input', autoSave);
        el.addEventListener('change', autoSave);
    });
    document.getElementById('accept-charter')?.addEventListener('change', autoSave);
    document.getElementById('accept-data')?.addEventListener('change', autoSave);
    document.getElementById('accept-oath')?.addEventListener('change', autoSave);

    window.restoreDraft = () => {
        const raw = sessionStorage.getItem('applyDraft');
        if (!raw) return;
        try {
            const draft = JSON.parse(raw);
            if (Date.now() - draft.timestamp > 120000) {
                sessionStorage.removeItem('applyDraft');
                return;
            }
            for (let key in draft) {
                if (key === 'timestamp') continue;
                const el = document.getElementById(key);
                if (el) {
                    if (el.type === 'checkbox') el.checked = draft[key];
                    else el.value = draft[key];
                }
            }
            const nameInput = document.getElementById('full-name');
            if (nameInput) {
                const oathName = document.querySelector('.oath-name');
                oathName.textContent = nameInput.value.trim() || '[Имя Фамилия]';
            }
        } catch(e) { console.warn('Ошибка восстановления черновика', e); }
    };
}

// ========== МОДАЛЬНОЕ ОКНО ==========
function initModal() {
    const overlay = document.getElementById('modal-overlay');
    const openBtn = document.getElementById('open-modal-btn');
    const closeBtn = document.getElementById('modal-close');
    const closeSuccessBtn = document.getElementById('close-success-btn');
    
    openBtn.addEventListener('click', () => {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        resetForm();
        if (window.restoreDraft) window.restoreDraft();
    });
    
    function closeModal() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    closeBtn.addEventListener('click', closeModal);
    if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closeModal);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
    });
}

function resetForm() {
    document.getElementById('apply-form').style.display = 'block';
    document.getElementById('form-success').style.display = 'none';
    document.getElementById('apply-form').reset();
    document.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));
    document.querySelectorAll('.form-input, .form-textarea').forEach(el => el.classList.remove('error'));
    document.querySelector('.oath-name').textContent = '[Имя Фамилия]';
    sessionStorage.removeItem('applyDraft');
}

// ========== АВТОПОДСТАНОВКА ИМЕНИ В КЛЯТВУ ==========
function initOathUpdate() {
    const nameInput = document.getElementById('full-name');
    const oathName = document.querySelector('.oath-name');
    nameInput.addEventListener('input', () => {
        oathName.textContent = nameInput.value.trim() || '[Имя Фамилия]';
    });
}

// ========== ВАЛИДАЦИЯ И ОТПРАВКА ==========
function initFormSubmit() {
    const form = document.getElementById('apply-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        
        const data = collectFormData();
        const success = await sendToDiscord(data);
        
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        
        if (success) {
            form.style.display = 'none';
            document.getElementById('form-success').style.display = 'block';
            sessionStorage.removeItem('applyDraft');
        }
    });
}

function validateForm() {
    let isValid = true;
    let firstErrorField = null;
    
    const fields = [
        { id: 'full-name', name: 'Имя Фамилия' },
        { id: 'ooc-age', name: 'OOC возраст' },
        { id: 'ic-age', name: 'IC возраст' },
        { id: 'id-card', name: 'ID-карта' },
        { id: 'discord', name: 'Discord' },
        { id: 'id-photo', name: 'Ссылка на фото ID-карты' },
        { id: 'why-join', name: 'Почему хотите вступить' },
        { id: 'goals', name: 'Чего хотите добиться' }
    ];
    
    fields.forEach(field => {
        const el = document.getElementById(field.id);
        const errorEl = el.closest('.form-group').querySelector('.form-error');
        const value = el.value.trim();
        
        if (!value) {
            const msg = `Поле «${field.name}» обязательно для заполнения`;
            showError(el, errorEl, msg);
            if (isValid) {
                showNotification(msg, true);
                firstErrorField = el;
            }
            isValid = false;
        } else if (field.id === 'ooc-age' || field.id === 'ic-age') {
            const age = parseInt(value);
            if (isNaN(age) || age < 14 || age > 99) {
                const msg = 'Укажите корректный возраст (14-99)';
                showError(el, errorEl, msg);
                if (isValid) {
                    showNotification(msg, true);
                    firstErrorField = el;
                }
                isValid = false;
            } else {
                clearError(el, errorEl);
            }
        } else if (field.id === 'id-photo' && !isValidURL(value)) {
            const msg = 'Укажите корректную ссылку на фото ID-карты';
            showError(el, errorEl, msg);
            if (isValid) {
                showNotification(msg, true);
                firstErrorField = el;
            }
            isValid = false;
        } else {
            clearError(el, errorEl);
        }
    });
    
    const extraPhoto = document.getElementById('extra-photo');
    const extraPhotoError = extraPhoto.closest('.form-group').querySelector('.form-error');
    if (extraPhoto.value.trim() && !isValidURL(extraPhoto.value.trim())) {
        const msg = 'Укажите корректную ссылку на дополнительное фото';
        showError(extraPhoto, extraPhotoError, msg);
        if (isValid) {
            showNotification(msg, true);
            firstErrorField = extraPhoto;
        }
        isValid = false;
    } else {
        clearError(extraPhoto, extraPhotoError);
    }
    
    // КАСТОМНЫЕ УВЕДОМЛЕНИЯ ДЛЯ ЧЕКБОКСОВ (без alert)
    const checkboxes = ['accept-charter', 'accept-data', 'accept-oath'];
    const checkboxNames = ['принятие Устава', 'обработку данных', 'клятву'];
    
    for (let i = 0; i < checkboxes.length; i++) {
        const id = checkboxes[i];
        const checkbox = document.getElementById(id);
        if (!checkbox.checked) {
            const msg = `Необходимо подтвердить: ${checkboxNames[i]}`;
            showNotification(msg, true);
            isValid = false;
            break;
        }
    }
    
    if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    return isValid;
}

function showError(el, errorEl, message) {
    el.classList.add('error');
    errorEl.textContent = message;
    errorEl.classList.add('visible');
}

function clearError(el, errorEl) {
    el.classList.remove('error');
    if (errorEl) errorEl.classList.remove('visible');
}

function isValidURL(str) {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

function collectFormData() {
    return {
        name: document.getElementById('full-name').value.trim(),
        oocAge: document.getElementById('ooc-age').value.trim(),
        icAge: document.getElementById('ic-age').value.trim(),
        idCard: document.getElementById('id-card').value.trim(),
        discord: document.getElementById('discord').value.trim(),
        idPhoto: document.getElementById('id-photo').value.trim(),
        extraPhoto: document.getElementById('extra-photo').value.trim(),
        whyJoin: document.getElementById('why-join').value.trim(),
        goals: document.getElementById('goals').value.trim()
    };
}

function generateApplicationNumber() {
    const now = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `AD-${now.toString(36).toUpperCase()}-${random}`;
}

function getCurrentDateTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

async function sendToDiscord(data) {
    const appNumber = generateApplicationNumber();
    const dateTime = getCurrentDateTime();
    
    const embed = {
        title: '🦅 Новая заявка на вступление',
        description: `**${data.name}** желает вступить в партию American Dream.`,
        color: 0xec8627,
        timestamp: new Date().toISOString(),
        author: {
            name: 'American Dream | Заявки',
            icon_url: 'https://cdn.discordapp.com/attachments/1501242595613999114/1501242702832865443/logo.png?ex=69fb5cb8&is=69fa0b38&hm=2d97ec940b2871cc483981dbc6d471f3c6c7959c76f7418390fe6dbb30d65959&'
        },
        fields: [
            {
                name: '👤 Личные данные',
                value: [
                    `**Имя:** ${data.name}`,
                    `**OOC возраст:** ${data.oocAge}`,
                    `**IC возраст:** ${data.icAge}`,
                    `**ID-карта:** ${data.idCard}`,
                    `**Discord:** ${data.discord}`
                ].join('\n'),
                inline: true
            },
            {
                name: '📎 Документы',
                value: [
                    `**Фото ID:** [Ссылка](${data.idPhoto})`,
                    data.extraPhoto ? `**Доп. фото:** [Ссылка](${data.extraPhoto})` : '**Доп. фото:** не приложено'
                ].join('\n'),
                inline: true
            },
            {
                name: '📝 Мотивация',
                value: data.whyJoin,
                inline: false
            },
            {
                name: '🎯 Цели',
                value: data.goals,
                inline: false
            },
            {
                name: '📋 Техническая информация',
                value: [
                    `**Номер заявки:** ${appNumber}`,
                    `**Дата подачи:** ${dateTime}`,
                    `**Статус:** Ожидает рассмотрения`,
                    `**IP заявителя:** скрыт`
                ].join('\n'),
                inline: false
            }
        ],
        footer: {
            text: 'Republican Party «American Dream» • Сан-Андреас',
            icon_url: 'https://i.imgur.com/logo-placeholder.png'
        }
    };
    
    const payload = {
        username: 'American Dream | Приёмная',
        avatar_url: 'https://i.imgur.com/logo-placeholder.png',
        embeds: [embed]
    };
    
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showNotification('Заявка успешно отправлена!', false);
            return true;
        } else {
            console.error('Ошибка Discord:', response.status);
            showNotification('Ошибка при отправке заявки. Попробуйте позже.', true);
            return false;
        }
    } catch (error) {
        console.error('Ошибка сети:', error);
        showNotification('Ошибка соединения. Проверьте интернет и попробуйте снова.', true);
        return false;
    }
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
