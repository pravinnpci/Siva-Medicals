﻿﻿﻿// ========================================
// CONTACT FORM API SUBMISSION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  const contactForm = document.getElementById('contactForm');
  const categorySelect = document.getElementById('category');
  const prescriptionFileGroup = document.getElementById('prescriptionFileGroup');
  const prescriptionFile = document.getElementById('prescriptionFile');

  // Show/hide prescription file upload based on category
  if (categorySelect) {
    categorySelect.addEventListener('change', function() {
      if (this.value === 'with_prescription') {
        prescriptionFileGroup.style.display = 'block';
        prescriptionFile.required = true;
      } else {
        prescriptionFileGroup.style.display = 'none';
        prescriptionFile.required = false;
        prescriptionFile.value = ''; // Clear file input
      }
    });
  }

  if (contactForm) {
    contactForm.addEventListener('input', function() {
      const statusBox = document.getElementById('formMessage');
      if (statusBox && !statusBox.classList.contains('d-none')) {
        statusBox.classList.add('d-none');
      }
    });

    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      let isValid = true;
      const errors = [];

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const category = document.getElementById('category').value.trim();
      const address = document.getElementById('address').value.trim();
      const message = document.getElementById('message').value.trim();
      const prescriptionFileInput = document.getElementById('prescriptionFile').files[0];

      if (name === '') {
        errors.push('Please enter your full name');
        isValid = false;
      }

      if (email === '') {
        errors.push('Please enter your email address');
        isValid = false;
      } else if (!isValidEmail(email)) {
        errors.push('Please enter a valid email address');
        isValid = false;
      }

      if (phone === '') {
        errors.push('Please enter your phone number');
        isValid = false;
      } else if (!isValidPhone(phone)) {
        errors.push('Please enter a valid phone number');
        isValid = false;
      }

      if (category === '') {
        errors.push('Please select a category');
        isValid = false;
      }

      if (address === '') {
        errors.push('Please enter your address');
        isValid = false;
      }

      if (message === '') {
        errors.push('Please enter your message');
        isValid = false;
      } else if (message.length < 10) {
        errors.push('Message must be at least 10 characters long');
        isValid = false;
      }

      if (category === 'with_prescription') {
        if (!prescriptionFileInput) {
          errors.push('Please upload a prescription photo');
          isValid = false;
        } else {
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
          if (!allowedTypes.includes(prescriptionFileInput.type)) {
            errors.push('Please upload a valid image file (JPEG, PNG, GIF)');
            isValid = false;
          }
          if (prescriptionFileInput.size > 5 * 1024 * 1024) {
            errors.push('File size must be less than 5MB');
            isValid = false;
          }
        }
      }

      if (!isValid) {
        contactForm.classList.add('was-validated');
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
      formData.append('gpay', '9097732213');
      formData.append('whatsapp', '9952930484');

      if (prescriptionFileInput) {
        formData.append('prescription', prescriptionFileInput);
      }

      const submitBtn = document.querySelector('#contactForm button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Sending...';
      submitBtn.disabled = true;

      // Diagnostic check: Are we on S3?
      if (window.location.hostname.includes('amazonaws.com')) {
        console.warn('⚠️ Warning: Accessing via S3 URL. API calls to /api/contact will likely fail because S3 does not process POST requests. Please use the EC2 Public IP address.');
      }

      try {
        const apiUrl = '/api/contact';
        console.log(`Submitting form to: ${window.location.origin}${apiUrl}`);

        const response = await fetch(apiUrl, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            let successMessage = 'Message sent successfully! We will contact you soon.';
            if (result.whatsapp && result.whatsapp.enabled) {
              if (result.whatsapp.customerStatus === 'sent' && result.whatsapp.ownerStatus === 'sent') {
                successMessage = 'Your request has been sent and both you and our team have been notified on WhatsApp.';
              } else if (result.whatsapp.ownerStatus === 'sent' && result.whatsapp.customerStatus !== 'sent') {
                successMessage = 'Your request has been received and our team has been notified. We tried to send you a WhatsApp confirmation too.';
              } else if (result.whatsapp.customerStatus === 'sent' && result.whatsapp.ownerStatus !== 'sent') {
                successMessage = 'Your request has been received and a WhatsApp confirmation was sent to you.';
              } else if (result.whatsapp.status === 'failed') {
                successMessage = 'Message sent, but WhatsApp notifications could not be delivered. Our team will still contact you soon.';
              }
            }

            showFormStatus(successMessage, 'success');
            document.getElementById('contactForm').reset();
            document.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
              el.classList.remove('is-valid', 'is-invalid');
            });
          } else {
            throw new Error(result.error || 'Server error');
          }
        } else {
          throw new Error(`Server responded with status: ${response.status}`);
        }
      } catch (error) {
        console.error('Form submission error:', error);
        showFormStatus('Unable to send message right now. Please try again or contact us directly at WhatsApp +91 99529 30484.', 'danger');

        const fallback = confirm(
          'Unable to connect to server. Would you like to contact us directly instead?\n\n' +
          '📞 Phone: 9952930484\n' +
          '� GPay: 9097732213\n' +
          '� Address: 1/47, Perumal Kovil Street, Madampakkam\n\n' +
          'Click OK to call now, or Cancel to try again later.'
        );

        if (fallback) {
          window.location.href = 'tel:9952930484';
        }
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }
});

function showFormStatus(message, type = 'success') {
  const statusBox = document.getElementById('formMessage');
  if (!statusBox) return;
  statusBox.innerText = message;
  statusBox.className = `alert alert-${type}`;
  statusBox.classList.remove('d-none');
}

function showFormErrors(errors) {
  const errorMessage = errors.join('\n');
  showFormStatus('Please fix the following errors:\n\n' + errorMessage, 'danger');
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  const parts = email.split('@');
  const localPart = parts[0];
  const domain = parts[1];
  if (!localPart || !domain) {
    return false;
  }
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return false;
  }
  if (localPart.includes('..') || domain.includes('..')) {
    return false;
  }
  if (!domain.includes('.')) {
    return false;
  }
  const domainParts = domain.split('.');
  if (domainParts.some(part => !part || part.length < 1)) {
    return false;
  }
  return true;
}

function isValidPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10 && cleaned.length !== 12 && cleaned.length !== 13) {
    return false;
  }
  if (cleaned.length === 10) {
    const firstDigit = parseInt(cleaned[0], 10);
    if (firstDigit < 6 || firstDigit > 9) {
      return false;
    }
  }
  if (cleaned.length === 12 || cleaned.length === 13) {
    if (!cleaned.startsWith('91')) {
      return false;
    }
    const remainingDigits = cleaned.substring(2);
    const firstDigitAfterCode = parseInt(remainingDigits[0], 10);
    if (firstDigitAfterCode < 6 || firstDigitAfterCode > 9) {
      return false;
    }
  }
  return true;
}
