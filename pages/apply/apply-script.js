document.addEventListener('DOMContentLoaded', () => {
    initApplyPage();
});

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1501235676128088165/OMo_QFumMq_YHQ9Kp8Xe6HKn7sm3mEECis0WOH6UCSZCTrZLWaELi8_PkxpjzU_DWqn2';

function initApplyPage() {
    initModal();
    initOathUpdate();
    initFormSubmit();
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
    });
    
    function closeModal() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    closeBtn.addEventListener('click', closeModal);
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', closeModal);
    }
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closeModal();
        }
    });
}

function resetForm() {
    document.getElementById('apply-form').style.display = 'block';
    document.getElementById('form-success').style.display = 'none';
    document.getElementById('apply-form').reset();
    document.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));
    document.querySelectorAll('.form-input, .form-textarea').forEach(el => el.classList.remove('error'));
    document.querySelector('.oath-name').textContent = '[Имя Фамилия]';
}

// ========== АВТОПОДСТАНОВКА ИМЕНИ В КЛЯТВУ ==========
function initOathUpdate() {
    const nameInput = document.getElementById('full-name');
    const oathName = document.querySelector('.oath-name');
    
    nameInput.addEventListener('input', () => {
        const name = nameInput.value.trim();
        oathName.textContent = name || '[Имя Фамилия]';
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
        }
    });
}

function validateForm() {
    let isValid = true;
    
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
            showError(el, errorEl, `Поле «${field.name}» обязательно для заполнения`);
            isValid = false;
        } else if (field.id === 'ooc-age' || field.id === 'ic-age') {
            const age = parseInt(value);
            if (isNaN(age) || age < 14 || age > 99) {
                showError(el, errorEl, 'Укажите корректный возраст (14-99)');
                isValid = false;
            } else {
                clearError(el, errorEl);
            }
        } else if (field.id === 'id-photo' && !isValidURL(value)) {
            showError(el, errorEl, 'Укажите корректную ссылку');
            isValid = false;
        } else {
            clearError(el, errorEl);
        }
    });
    
    // Доп. фото — необязательно, но если заполнено — валидируем
    const extraPhoto = document.getElementById('extra-photo');
    const extraPhotoError = extraPhoto.closest('.form-group').querySelector('.form-error');
    if (extraPhoto.value.trim() && !isValidURL(extraPhoto.value.trim())) {
        showError(extraPhoto, extraPhotoError, 'Укажите корректную ссылку');
        isValid = false;
    } else {
        clearError(extraPhoto, extraPhotoError);
    }
    
    // Галочки
    const checkboxes = ['accept-charter', 'accept-data', 'accept-oath'];
    const checkboxNames = ['принятие Устава', 'обработку данных', 'клятву'];
    
    checkboxes.forEach((id, index) => {
        const checkbox = document.getElementById(id);
        if (!checkbox.checked) {
            alert(`Необходимо подтвердить: ${checkboxNames[index]}`);
            isValid = false;
        }
    });
    
    return isValid;
}

function showError(el, errorEl, message) {
    el.classList.add('error');
    errorEl.textContent = message;
    errorEl.classList.add('visible');
}

function clearError(el, errorEl) {
    el.classList.remove('error');
    if (errorEl) {
        errorEl.classList.remove('visible');
    }
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
                    `-# **Номер заявки:** ${appNumber}`,
                    `-# **Дата подачи:** ${dateTime}`,
                ].join('\n'),
                inline: false
            }
        ],
        footer: {
            text: 'Republican Party «American Dream» • Сан-Андреас',
            icon_url: 'https://media.discordapp.net/attachments/1501242595613999114/1501242702832865443/logo.png?ex=69fd56f8&is=69fc0578&hm=418d8b0402c9b4909f9ea519005807584d7a02ba0138357aee3c5105d9ff8716&=&format=webp&quality=lossless&width=944&height=833'
        }
    };
    
    const payload = {
        username: 'American Dream | Приёмная',
        avatar_url: 'https://media.discordapp.net/attachments/1501242595613999114/1501242702832865443/logo.png?ex=69fd56f8&is=69fc0578&hm=418d8b0402c9b4909f9ea519005807584d7a02ba0138357aee3c5105d9ff8716&=&format=webp&quality=lossless&width=944&height=833',
        embeds: [embed]
    };
    
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            return true;
        } else {
            console.error('Ошибка Discord:', response.status);
            alert('Ошибка при отправке заявки. Попробуйте позже.');
            return false;
        }
    } catch (error) {
        console.error('Ошибка сети:', error);
        alert('Ошибка соединения. Проверьте интернет и попробуйте снова.');
        return false;
    }
}
