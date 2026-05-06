document.addEventListener('DOMContentLoaded', () => {
    initProgramPage();
});

function initProgramPage() {
    initProgramScrollAnimations();
}

// ========== АНИМАЦИЯ ПОЯВЛЕНИЯ ПРИ СКРОЛЛЕ ==========
function initProgramScrollAnimations() {
    const sections = document.querySelectorAll('.fade-in-section');
    
    if (sections.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -30px 0px'
    });
    
    sections.forEach((section, index) => {
        // Добавляем задержку для каскадного появления
        section.style.transitionDelay = `${index * 0.08}s`;
        observer.observe(section);
    });
}