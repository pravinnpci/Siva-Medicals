// ========================================
// 1. BACK TO TOP BUTTON
// ========================================

function initBackToTop() {
  let backToTopButton = document.getElementById('backToTop');
  
  if (!backToTopButton) {
    backToTopButton = document.createElement('button');
    backToTopButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
    backToTopButton.id = 'backToTop';
    backToTopButton.setAttribute('title', 'Back to Top');
    backToTopButton.classList.add('hidden');
    document.body.appendChild(backToTopButton);
  }

  let isVisible = false;
  function toggleBackToTop() {
    const scrollThreshold = 150;
    const shouldShow = window.scrollY > scrollThreshold;

    if (shouldShow && !isVisible) {
      backToTopButton.classList.remove('hidden');
      backToTopButton.classList.add('show');
      isVisible = true;
    } else if (!shouldShow && isVisible) {
      backToTopButton.classList.add('hidden');
      backToTopButton.classList.remove('show');
      isVisible = false;
    }
  }

  window.addEventListener('scroll', () => {
    toggleBackToTop();
  });

  backToTopButton.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  toggleBackToTop();
}

// ========================================
// 2. LIVE DYNAMIC SITE SETTINGS LOADER
// ========================================

async function loadLiveSiteSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success || !data.settings) return;

    const s = data.settings;
    console.log('⚡ Loaded live settings:', s);

    // Update Email elements
    if (s.company_email) {
      document.querySelectorAll('.site-email').forEach(el => {
        el.textContent = s.company_email;
      });
      document.querySelectorAll('.site-email-link, a.site-email').forEach(el => {
        el.href = 'mailto:' + s.company_email;
      });
    }

    // Update Phone elements
    if (s.company_phone) {
      document.querySelectorAll('.site-phone').forEach(el => {
        el.textContent = s.company_phone;
      });
      document.querySelectorAll('.site-phone-link, a.site-phone').forEach(el => {
        el.href = 'tel:' + s.company_phone;
      });
    }

    // Update WhatsApp elements
    if (s.company_whatsapp) {
      document.querySelectorAll('.site-whatsapp').forEach(el => {
        el.textContent = s.company_whatsapp;
      });
      const cleanWa = s.company_whatsapp.replace(/[^0-9]/g, '');
      const waLink = cleanWa.length === 10 ? 'https://wa.me/91' + cleanWa : 'https://wa.me/' + cleanWa;
      document.querySelectorAll('.site-whatsapp-btn').forEach(el => {
        el.href = waLink;
      });
    }

    // Update GPay elements
    if (s.company_gpay) {
      document.querySelectorAll('.site-gpay').forEach(el => {
        el.textContent = s.company_gpay;
      });
    }

    // Update Address elements
    if (s.company_address) {
      document.querySelectorAll('.site-address').forEach(el => {
        el.textContent = s.company_address;
      });
    }

    // Update Hours elements
    if (s.company_hours) {
      document.querySelectorAll('.site-hours').forEach(el => {
        el.textContent = s.company_hours;
      });
    }
  } catch (e) {
    console.debug('Site settings note:', e.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initBackToTop();
  loadLiveSiteSettings();
});