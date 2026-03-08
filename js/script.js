// ========================================
// 1. BACK TO TOP BUTTON
// ========================================

function initBackToTop() {
  // Create back to top button
  let backToTopButton = document.getElementById('backToTop');
  
  // If button doesn't exist, create it
  if (!backToTopButton) {
    backToTopButton = document.createElement('button');
    backToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTopButton.id = 'backToTop';
    backToTopButton.classList.add('hidden');
    document.body.appendChild(backToTopButton);
  }

  // Show/hide button on scroll
  function toggleBackToTop() {
    if (window.scrollY > 300) {
      backToTopButton.classList.remove('hidden');
    } else {
      backToTopButton.classList.add('hidden');
    }
  }

  window.addEventListener('scroll', toggleBackToTop);

  // Scroll to top on click
  backToTopButton.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  // Check initial state
  toggleBackToTop();
}

// ========================================
// 1.5 REAL-TIME FORM VALIDATION
// ========================================

// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validation function - accepts 10 digit numbers with or without formatting
function isValidPhone(phone) {
  // Remove all non-digit characters to get clean number
  const cleaned = phone.replace(/\D/g, '');
  // Accept 10 digits (e.g., 9952930484) or 12 digits with country code (919952930484)
  return cleaned.length === 10 || cleaned.length === 12;
}

// Add real-time validation to email and phone fields
document.addEventListener("DOMContentLoaded", function() {
  const emailField = document.getElementById("email");
  const phoneField = document.getElementById("phone");

  if (emailField) {
    emailField.addEventListener("blur", function() {
      validateEmailField();
    });
    emailField.addEventListener("input", function() {
      validateEmailField();
    });
  }

  if (phoneField) {
    // Filter input to allow only numbers, spaces, dashes, parentheses, and plus sign
    phoneField.addEventListener("input", function(e) {
      const value = e.target.value;
      const filtered = value.replace(/[^0-9\s\-\(\)\+]/g, '');
      if (value !== filtered) {
        e.target.value = filtered;
      }
      validatePhoneField();
    });
    
    phoneField.addEventListener("blur", function() {
      validatePhoneField();
    });
  }
});

function validateEmailField() {
  const emailField = document.getElementById("email");
  const email = emailField.value.trim();
  
  if (email === "") {
    emailField.classList.remove("is-invalid", "is-valid");
  } else if (isValidEmail(email)) {
    emailField.classList.remove("is-invalid");
    emailField.classList.add("is-valid");
  } else {
    emailField.classList.remove("is-valid");
    emailField.classList.add("is-invalid");
  }
}

function validatePhoneField() {
  const phoneField = document.getElementById("phone");
  const phone = phoneField.value.trim();
  const cleaned = phone.replace(/\D/g, '');
  
  if (phone === "") {
    // Empty field - remove validation classes
    phoneField.classList.remove("is-invalid", "is-valid");
  } else if (cleaned.length === 10 || cleaned.length === 12) {
    // Valid: exactly 10 or 12 digits
    phoneField.classList.remove("is-invalid");
    phoneField.classList.add("is-valid");
  } else {
    // Invalid: wrong number of digits
    phoneField.classList.remove("is-valid");
    phoneField.classList.add("is-invalid");
  }
}

// ========================================
// 2. SCROLL ANIMATIONS - FADE IN
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  const faders = document.querySelectorAll(".fade-in, .slide-in-left, .slide-in-right");

  const appearOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -100px 0px"
  };

  const appearOnScroll = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, appearOptions);

  faders.forEach(fader => {
    appearOnScroll.observe(fader);
    const rect = fader.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      fader.classList.add("visible");
      appearOnScroll.unobserve(fader);
    }
  });
});

// ========================================
// 3. SMOOTH SCROLL NAVIGATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#' && document.querySelector(href)) {
        e.preventDefault();
        document.querySelector(href).scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});

// ========================================
// 4. FORM VALIDATION - CONTACT FORM
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById("contactForm");

  if (form) {
    form.addEventListener("submit", function(e) {
      let isValid = true;
      const errors = [];
      
      // Get form values
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const subject = document.getElementById("subject").value;
      const message = document.getElementById("message").value.trim();
      const agree = document.getElementById("agree").checked;

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

      if (subject === "") {
        errors.push("Please select a subject");
        isValid = false;
      }

      if (message === "") {
        errors.push("Please enter your message");
        isValid = false;
      } else if (message.length < 10) {
        errors.push("Message must be at least 10 characters long");
        isValid = false;
      }

      if (!agree) {
        errors.push("Please agree to the privacy policy and terms of service");
        isValid = false;
      }

      if (!isValid) {
        e.preventDefault();
        showFormErrors(errors);
      } else {
        // Form is valid, let Formspree handle the submission
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Sending...';
        submitBtn.disabled = true;
      }
    });
  }
});

// Show validation errors
function showFormErrors(errors) {
  const errorMessage = errors.join("\n");
  alert("Please fix the following errors:\n\n" + errorMessage);
}

// ========================================
// 5. ACTIVE NAVIGATION LINK
// ========================================

function setActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === currentPage || 
        (currentPage === '' && link.getAttribute('href') === 'index.html')) {
      link.classList.add('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', setActiveNav);

// ========================================
// 6. NAVBAR SCROLL EFFECTS & MOBILE MENU
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  let lastScrollTop = 0;
  const navbar = document.querySelector('.navbar');

  window.addEventListener('scroll', () => {
    let scrollTop = window.scrollY;

    // Add shadow to navbar on scroll
    if (scrollTop > 50) {
      navbar?.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.15)';
    } else {
      navbar?.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    }

    lastScrollTop = scrollTop;
  });

  // Mobile menu close on link click
  const navMenu = document.getElementById('navmenu');
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (navMenu && navMenu.classList.contains('show')) {
        const bsCollapse = new bootstrap.Collapse(navMenu, {
          toggle: false
        });
        bsCollapse.hide();
      }
    });
  });
});

// ========================================
// 7. BACK TO TOP BUTTON & BOOTSTRAP COMPONENTS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  // Initialize back to top button
  initBackToTop();

  // Initialize Bootstrap carousels - fix overlapping testimonials
  const carousels = document.querySelectorAll('.carousel');
  carousels.forEach(carousel => {
    // Set first item as active if none is active
    const activeItem = carousel.querySelector('.carousel-item.active');
    if (!activeItem) {
      const firstItem = carousel.querySelector('.carousel-item');
      if (firstItem) {
        firstItem.classList.add('active');
      }
    }
    
    // Initialize with Bootstrap
    new bootstrap.Carousel(carousel, {
      interval: false,
      wrap: true,
      touch: true
    });
  });

  // Initialize Bootstrap accordions - fix FAQ not working
  const accordions = document.querySelectorAll('.accordion');
  accordions.forEach(accordion => {
    // Bootstrap handles this automatically via data-bs-toggle
    // Just ensure all buttons are properly initialized
  });
});

// ========================================
// 8. UTILITY: CONSOLE WELCOME MESSAGE
// ========================================

console.log('%c🔧 Siva Medicals Website', 'font-size: 20px; font-weight: bold; color: #d4a843;');
console.log('%cThanks for visiting!', 'font-size: 14px; color: #333;');
console.log('%cContact: 9952930484', 'font-size: 12px; color: #666;');