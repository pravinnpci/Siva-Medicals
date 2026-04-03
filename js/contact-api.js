// ========================================
// CONTACT FORM API SUBMISSION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault(); // Prevent default form submission

      let isValid = true;
      const errors = [];

      // Get form values
      const name = document.getElementById("fullName").value.trim();
      const email = document.getElementById("email").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const message = document.getElementById("message").value.trim();
      const prescriptionFile = document.getElementById("prescriptionFile").files[0];

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

      if (message === "") {
        errors.push("Please enter your message");
        isValid = false;
      } else if (message.length < 10) {
        errors.push("Message must be at least 10 characters long");
        isValid = false;
      }

      if (!prescriptionFile) {
        errors.push("Please upload a prescription photo");
        isValid = false;
      } else {
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(prescriptionFile.type)) {
          errors.push("Please upload a valid image file (JPEG, PNG, GIF)");
          isValid = false;
        }
        // Check file size (5MB max)
        if (prescriptionFile.size > 5 * 1024 * 1024) {
          errors.push("File size must be less than 5MB");
          isValid = false;
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
  const message = document.getElementById("message").value.trim();
  const prescriptionFile = document.getElementById("prescriptionFile").files[0];

  // Add data to FormData
  formData.append('name', name);
  formData.append('email', email);
  formData.append('phone', phone);
  formData.append('subject', 'Prescription Request');
  formData.append('message', message);
  formData.append('address', '1/47, Perumal Kovil Street, Madampakkam - Guduvancheri, Kanchipuram Dist - 603 202');
  formData.append('gpay', '9097732213');
  formData.append('whatsapp', '9952930484');
  formData.append('prescription', prescriptionFile);

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

// Email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validation
function isValidPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 12;
}

// Show validation errors
function showFormErrors(errors) {
  const errorMessage = errors.join("\\n");
  alert("Please fix the following errors:\\n\\n" + errorMessage);
}