// ====================================================
// CONTACT FORM & PRESCRIPTION SUBMISSION (DYNAMIC CONFIG)
// ====================================================

let EMAILJS_CONFIG = {
  serviceId: 'sivamedical',
  templateId: 'template_2fzsb0d',
  publicKey: 'cWmO8pjToTEkzUc5Z'
};

let SITE_SETTINGS = {
  company_phone: '9952930484',
  company_whatsapp: '9952930484',
  company_email: 'sapravin46@gmail.com'
};

document.addEventListener('DOMContentLoaded', async function() {
  const contactForm = document.getElementById('contactForm');
  const categorySelect = document.getElementById('category');
  const prescriptionFileGroup = document.getElementById('prescriptionFileGroup');
  const prescriptionFile = document.getElementById('prescriptionFile');

  // 1. Fetch live public settings dynamically from server / .env
  try {
    const setRes = await fetch('/api/settings');
    if (setRes.ok) {
      const setData = await setRes.json();
      if (setData.success && setData.settings) {
        SITE_SETTINGS = { ...SITE_SETTINGS, ...setData.settings };
        if (setData.settings.emailjs_service_id) EMAILJS_CONFIG.serviceId = setData.settings.emailjs_service_id;
        if (setData.settings.emailjs_template_id) EMAILJS_CONFIG.templateId = setData.settings.emailjs_template_id;
        if (setData.settings.emailjs_public_key) EMAILJS_CONFIG.publicKey = setData.settings.emailjs_public_key;
      }
    }
  } catch(e) {}

  // 2. Initialize EmailJS
  if (typeof emailjs !== 'undefined' && EMAILJS_CONFIG.publicKey) {
    try {
      emailjs.init(EMAILJS_CONFIG.publicKey);
      console.log('✅ EmailJS initialized dynamically');
    } catch(e) {
      console.debug('EmailJS init note:', e.message);
    }
  }

  // Load live site settings dynamically
  if (typeof loadLiveSiteSettings === 'function') {
    loadLiveSiteSettings();
  }

  // Show/hide prescription upload based on category
  if (categorySelect) {
    categorySelect.addEventListener('change', function() {
      const val = this.value.toLowerCase();
      if (val === 'with_prescription' || val.includes('prescription')) {
        if (prescriptionFileGroup) prescriptionFileGroup.style.display = 'block';
        if (prescriptionFile) prescriptionFile.required = true;
      } else {
        if (prescriptionFileGroup) prescriptionFileGroup.style.display = 'none';
        if (prescriptionFile) {
          prescriptionFile.required = false;
          prescriptionFile.value = '';
        }
      }
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      let isValid = true;
      const errors = [];

      const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
      };

      const name = getVal('fullName') || getVal('name');
      const email = getVal('email');
      const phone = getVal('phone');
      const category = getVal('category');
      const address = getVal('address');
      const message = getVal('message');
      
      const prescriptionFileEl = document.getElementById('prescriptionFile');
      const prescriptionFileInput = prescriptionFileEl && prescriptionFileEl.files ? prescriptionFileEl.files[0] : null;

      if (!name) { errors.push('Please enter your full name'); isValid = false; }
      if (!email || !isValidEmail(email)) { errors.push('Please enter a valid email address'); isValid = false; }
      if (!phone || !isValidPhone(phone)) { errors.push('Please enter a valid 10-digit phone number'); isValid = false; }
      if (!category) { errors.push('Please select a category'); isValid = false; }
      if (!address) { errors.push('Please enter your delivery/contact address'); isValid = false; }
      if (!message || message.length < 3) { errors.push('Please enter a message or tablet name'); isValid = false; }

      if (category.toLowerCase().includes('prescription') && !prescriptionFileInput) {
        errors.push('Please upload a prescription image or PDF');
        isValid = false;
      }

      if (!isValid) {
        showFormErrors(errors);
        return;
      }

      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('category', category);
      formData.append('subject', category.replace(/_/g, ' ').toUpperCase());
      formData.append('message', message);
      formData.append('address', address);

      if (prescriptionFileInput) {
        formData.append('prescription', prescriptionFileInput);
      }

      const submitBtn = document.querySelector('#contactForm button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : 'Submit Request';
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Submitting...';
        submitBtn.disabled = true;
      }

      try {
        // 1. Submit to Backend / Supabase API
        const response = await fetch('/api/contact', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        const prescriptionUrl = result.prescriptionUrl || (result.prescriptionPath ? (window.location.origin + result.prescriptionPath) : null);

        // 2. Dispatch Automated Emails via EmailJS
        if (typeof emailjs !== 'undefined' && EMAILJS_CONFIG.serviceId && EMAILJS_CONFIG.templateId) {
          // A. Customer Confirmation Email
          try {
            await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
              email: email,
              to_email: email,
              user_email: email,
              reply_to: email,
              recipient: email,
              to_name: name,
              name: name,
              user_name: name,
              user_phone: phone,
              phone: phone,
              category: category.replace(/_/g, ' ').toUpperCase(),
              message: message,
              address: address,
              prescription_url: prescriptionUrl || 'None',
              store_name: 'Siva Medicals',
              store_phone: SITE_SETTINGS.company_phone || '9952930484',
              store_email: SITE_SETTINGS.company_email || 'sapravin46@gmail.com',
              store_address: '1/47, Perumal Kovil Street, Madampakkam, Guduvancheri'
            });
            console.log('✉️ EmailJS customer confirmation sent successfully to', email);
          } catch (ejsErr) {
            console.warn('EmailJS customer dispatch note:', ejsErr.text || ejsErr.message);
          }

          // B. Admin Lead Alert Email (Directly to sapravin46@gmail.com)
          const adminEmail = SITE_SETTINGS.company_email || 'sapravin46@gmail.com';
          try {
            await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
              email: adminEmail,
              to_email: adminEmail,
              user_email: adminEmail,
              reply_to: email,
              recipient: adminEmail,
              to_name: 'Siva Medicals Admin',
              name: `[NEW ORDER] ${name} (${phone})`,
              user_name: name,
              user_phone: phone,
              phone: phone,
              category: category.replace(/_/g, ' ').toUpperCase(),
              message: `NEW CUSTOMER ORDER:\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nAddress: ${address}\nMessage/Tablets: ${message}\nPrescription: ${prescriptionUrl || 'None'}`,
              address: address,
              prescription_url: prescriptionUrl || 'None',
              store_name: 'Siva Medicals',
              store_phone: SITE_SETTINGS.company_phone || '9952930484',
              store_email: adminEmail,
              store_address: '1/47, Perumal Kovil Street, Madampakkam, Guduvancheri'
            });
            console.log('✉️ EmailJS Admin Lead alert sent successfully to', adminEmail);
          } catch (adminEjsErr) {
            console.warn('EmailJS admin alert note:', adminEjsErr.text || adminEjsErr.message);
          }
        }

        if (response.ok && result.success) {
          const rawWa = SITE_SETTINGS.company_whatsapp || '9952930484';
          const cleanWaPhone = rawWa.replace(/[^0-9]/g, '');
          const phoneTarget = cleanWaPhone.length === 10 ? ('91' + cleanWaPhone) : cleanWaPhone;

          let waText = `*🏥 SIVA MEDICALS - ORDER & PRESCRIPTION REQUEST*\n\n` +
            `*Customer Name:* ${name}\n` +
            `*Contact Phone:* ${phone}\n` +
            `*Email:* ${email}\n` +
            `*Category:* ${category.replace(/_/g, ' ').toUpperCase()}\n` +
            `*Delivery Address:* ${address}\n` +
            `*Order / Medicines:* ${message}\n`;

          if (prescriptionUrl) {
            waText += `\n*📷 Prescription File:* ${prescriptionUrl}`;
          }

          const waUrl = `https://wa.me/${phoneTarget}?text=${encodeURIComponent(waText)}`;

          let successHtml = `
            <div class="p-4 bg-success bg-opacity-10 border border-success rounded shadow-sm">
              <h5 class="text-success fw-bold mb-3"><i class="fas fa-check-circle me-2"></i> Request & Prescription Submitted Successfully!</h5>
              <p class="mb-1 text-dark">✅ An automated confirmation email has been dispatched to <strong>${email}</strong>.</p>
              <p class="mb-3 text-dark">✅ Our pharmacy team has received your order and will contact you promptly at <strong>${phone}</strong>.</p>
              
              <div class="p-3 bg-white border rounded mb-3">
                <p class="small text-muted mb-2"><i class="fab fa-whatsapp text-success me-1"></i> Send your prescription and order details directly to the pharmacy pharmacist:</p>
                <a href="${waUrl}" target="_blank" class="btn btn-success fw-bold w-100 py-2">
                  <i class="fab fa-whatsapp fa-lg me-2"></i> Open & Chat on WhatsApp (with Prescription)
                </a>
              </div>
            </div>
          `;

          showFormStatus(successHtml, 'success');
          contactForm.reset();
          if (prescriptionFileGroup) prescriptionFileGroup.style.display = 'none';
        } else {
          showFormStatus(`<strong>Error:</strong> ${result.error || 'Unable to submit request. Please call us directly.'}`, 'danger');
        }
      } catch (err) {
        console.error('Submission error:', err);
        showFormStatus('<strong>Network Error:</strong> Server unreachable. Please call or WhatsApp us directly at 9952930484.', 'danger');
      } finally {
        if (submitBtn) {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        }
      }
    });
  }
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 10;
}

function showFormStatus(message, type = 'success') {
  const statusBox = document.getElementById('formMessage');
  if (!statusBox) return;
  statusBox.innerHTML = message;
  statusBox.className = `alert alert-${type}`;
  statusBox.classList.remove('d-none');
}

function showFormErrors(errors) {
  const statusBox = document.getElementById('formMessage');
  if (!statusBox) return;
  const list = errors.map(e => `<li>${e}</li>`).join('');
  statusBox.innerHTML = `<strong>Please fix the following issues:</strong><ul class="mb-0 mt-2">${list}</ul>`;
  statusBox.className = 'alert alert-danger';
  statusBox.classList.remove('d-none');
}