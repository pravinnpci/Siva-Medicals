// ========================================
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
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault(); // Prevent default form submission

      let isValid = true;
      const errors = [];

      // Get form values
      const name = document.getElementById("fullName").value.trim();
      const email = document.getElementById("email").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const category = document.getElementById("category").value.trim();
      const address = document.getElementById("address").value.trim();
      const message = document.getElementById("message").value.trim();
      const prescriptionFileInput = document.getElementById("prescriptionFile").files[0];

      // Validation checks
      if (name === "") {
        errors.push("Please enter your full name");
        isValid = false;
      }

      if (email === "") {
        errors.push("Please enter your email address");
        isValid = false;
      } else if (!isValidEmail(email)) {
        errors.push("Please enter a valid email address");
        isValid = false;
      }

      if (phone === "") {
        errors.push("Please enter your phone number");
        isValid = false;
      } else if (!isValidPhone(phone)) {
        errors.push("Please enter a valid phone number");
        isValid = false;
      }

      if (category === "") {
        errors.push("Please select a category");
        isValid = false;
      }

      if (address === "") {
        errors.push("Please enter your address");
        isValid = false;
      }

      if (message === "") {
        errors.push("Please enter your message");
        isValid = false;
      } else if (message.length < 10) {
        errors.push("Message must be at least 10 characters long");
        isValid = false;
      }

      // Only require prescription for "with_prescription" category
      if (category === 'with_prescription') {
        if (!prescriptionFileInput) {
          errors.push("Please upload a prescription photo");
          isValid = false;
        } else {
          // Check file type
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
          if (!allowedTypes.includes(prescriptionFileInput.type)) {
            errors.push("Please upload a valid image file (JPEG, PNG, GIF)");
            isValid = false;
          }
          // Check file size (5MB max)
          if (prescriptionFileInput.size > 5 * 1024 * 1024) {
            errors.push("File size must be less than 5MB");
            isValid = false;
          }
        }
      }

      if (!isValid) {
        showFormErrors(errors);
        return;
      }

      // Form is valid, submit to our backend
      await submitContactForm();
    });
  }
});

// Submit form to backend
async function submitContactForm() {
  const formData = new FormData();

  // Get form values
  const name = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const category = document.getElementById("category").value.trim();
  const address = document.getElementById("address").value.trim();
  const message = document.getElementById("message").value.trim();
  const prescriptionFileInput = document.getElementById("prescriptionFile").files[0];

  // Add data to FormData
  formData.append('name', name);
  formData.append('email', email);
  formData.append('phone', phone);
  formData.append('category', category);
  formData.append('subject', category.replace(/_/g, ' ').toUpperCase());
  formData.append('message', message);
  formData.append('address', address);
  formData.append('gpay', '9097732213');
  formData.append('whatsapp', '9952930484');
  
  // Only append prescription file if it exists
  if (prescriptionFileInput) {
    formData.append('prescription', prescriptionFileInput);
  }

  // Show loading state
  const submitBtn = document.querySelector('#contactForm button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Sending...';
  submitBtn.disabled = true;

  try {
    const response = await fetch('http://localhost:3001/api/contact', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        alert('Message sent successfully! We will contact you soon.');
        document.getElementById('contactForm').reset();
        // Clear validation classes
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

    // Fallback: Show contact information
    const fallback = confirm(
      'Unable to connect to server. Would you like to contact us directly instead?\n\n' +
      '📞 Phone: 9952930484\n' +
      '💳 GPay: 9097732213\n' +
      '📍 Address: 1/47, Perumal Kovil Street, Madampakkam\n\n' +
      'Click OK to call now, or Cancel to try again later.'
    );

    if (fallback) {
      window.location.href = 'tel:9952930484';
    }
  } finally {
    // Reset button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// Email validation - comprehensive check
function isValidEmail(email) {
  // RFC 5322 simplified regex for email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return false;
  }
  
  // Additional checks
  // Must have valid domain
  // No consecutive dots
  // Must not start or end with dot in local part
  const localPart = email.split('@')[0];
  const domain = email.split('@')[1];
  
  if (!localPart || !domain) {
    return false;
  }
  
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return false;
  }
  
  if (localPart.includes('..')) {
    return false;
  }
  
  if (domain.includes('..')) {
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

// Phone validation - comprehensive check  
function isValidPhone(phone) {
  // Remove all non-digit characters to get cleaned phone
  const cleaned = phone.replace(/\D/g, '');
  
  // Indian phone numbers are typically 10 digits
  // International format with country code can be 12-13 digits
  if (cleaned.length !== 10 && cleaned.length !== 12 && cleaned.length !== 13) {
    return false;
  }
  
  // For 10-digit Indian numbers, should start with 6, 7, 8, or 9
  if (cleaned.length === 10) {
    const firstDigit = parseInt(cleaned[0]);
    if (firstDigit < 6 || firstDigit > 9) {
      return false;
    }
  }
  
  // For 12-13 digit numbers (with country code), should start with +91 or 91
  if (cleaned.length === 12 || cleaned.length === 13) {
    if (!cleaned.startsWith('91')) {
      return false;
    }
    // Check remaining digits
    const remainingDigits = cleaned.substring(2);
    const firstDigitAfterCode = parseInt(remainingDigits[0]);
    if (firstDigitAfterCode < 6 || firstDigitAfterCode > 9) {
      return false;
    }
  }
  
  return true;
}

// Show validation errors
function showFormErrors(errors) {
  const errorMessage = errors.join("\\n");
  alert("Please fix the following errors:\\n\\n" + errorMessage);
}