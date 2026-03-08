/**
 * SIVA MEDICALS WEBSITE - CONFIGURATION
 * Update values in this file to customize the website
 * These are the most commonly changed values
 */

// ========================================
// BUSINESS INFORMATION
// ========================================

const BUSINESS_CONFIG = {
  // Company Details
  name: "Siva Medicals",
  tagline: "📞 9952930484",
  phone: "9952930484",
  location: "Perumal Kovil St, Madambakkam, Chennai",
  
  // Operating Hours
  hoursOpen: "8 AM",
  hoursClose: "10 PM",
  daysOpen: "Monday - Sunday",
  
  // About Description
  aboutShort: "Your trusted pharmacy for authentic medicines, healthcare essentials, and wellness products.",
  aboutLong: `Siva Medicals is a trusted and reliable pharmacy serving the Madambakkam community and nearby areas 
              with dedication and integrity. With a commitment to healthcare excellence, we have been providing 
              quality medicines, healthcare essentials, and personal care products to our valued customers.`,
  
  // Contact Information
  email: "contact@sivamedicals.com", // Update with actual email
  website: "https://sivamedicals.com", // Update with actual website
  
  // Social Media
  social: {
    facebook: "https://facebook.com/sivamedicals", // Update
    instagram: "https://instagram.com/sivamedicals", // Update
    whatsapp: "https://wa.me/919952930484", // WhatsApp redirect
    twitter: "https://twitter.com/sivamedicals" // Update
  }
};

// ========================================
// FORM CONFIGURATION
// ========================================

const FORM_CONFIG = {
  // Formspree Form ID (Get from formspree.io)
  //https://formspree.io/f/xkoqwdke
  formspreeId: "xkoqwdke", // ⚠️ CHANGE THIS to your actual form ID
  
  // Email where form submissions go
  recipientEmail: "contact@sivamedicals.com", // Update with your email
  
  // Form success message
  successMessage: "Thank you! We'll get back to you within 24 hours.",
  
  // Auto-reply email subject
  replySubject: "Siva Medicals - We received your message"
};

// ========================================
// DESIGN COLORS
// ========================================

const COLORS = {
  primary: "#333333",      // Charcoal (main color)
  accent: "#d4a843",       // Gold (highlight color)
  darkBg: "#121212",       // Dark mode background
  darkText: "#eee",        // Dark mode text
  cardBg: "#f8f8f8",       // Light card background
  lightGray: "#e8e8e8"     // Light gray
};

// ========================================
// BUSINESS HOURS
// ========================================

const BUSINESS_HOURS = {
  monday: { open: "8:00 AM", close: "10:00 PM", open24: false },
  tuesday: { open: "8:00 AM", close: "10:00 PM", open24: false },
  wednesday: { open: "8:00 AM", close: "10:00 PM", open24: false },
  thursday: { open: "8:00 AM", close: "10:00 PM", open24: false },
  friday: { open: "8:00 AM", close: "10:00 PM", open24: false },
  saturday: { open: "8:00 AM", close: "10:00 PM", open24: false },
  sunday: { open: "8:00 AM", close: "10:00 PM", open24: false }
};

// ========================================
// SERVICES OFFERED
// ========================================

const SERVICES = [
  {
    id: "medicines",
    title: "Quality Medicines",
    icon: "fa-pills",
    description: "Authentic prescription and OTC medicines from verified suppliers."
  },
  {
    id: "supplements",
    title: "Health Products",
    icon: "fa-heart-pulse",
    description: "Vitamins, supplements, and wellness products for optimal health."
  },
  {
    id: "guidance",
    title: "Expert Guidance",
    icon: "fa-user-nurse",
    description: "Professional consultation from knowledgeable pharmacists."
  },
  {
    id: "delivery",
    title: "Fast Delivery",
    icon: "fa-shipping-fast",
    description: "Quick delivery service within Madambakkam and nearby areas."
  },
  {
    id: "authenticity",
    title: "Authenticity Guaranteed",
    icon: "fa-check-circle",
    description: "100% genuine medicines from licensed suppliers."
  },
  {
    id: "hours",
    title: "Extended Hours",
    icon: "fa-clock",
    description: "Open daily with convenient operating hours for your needs."
  }
];

// ========================================
// PRODUCT CATEGORIES
// ========================================

const PRODUCT_CATEGORIES = [
  {
    category: "Prescription Medicines",
    icon: "fa-pills",
    description: "Authentic prescription medications",
    products: [
      "Pain Relief Medications",
      "Antibiotics",
      "Cardiovascular Medicines"
    ]
  },
  {
    category: "OTC Medicines",
    icon: "fa-medkit",
    description: "Over-the-counter medicines",
    products: [
      "Cold & Cough Remedies",
      "Digestive Health",
      "Fever & Headache Relief"
    ]
  },
  {
    category: "Supplements & Vitamins",
    icon: "fa-leaf",
    description: "Health supplements",
    products: [
      "Multivitamins",
      "Vitamin D & Calcium",
      "Immunity Boosters"
    ]
  },
  {
    category: "Personal Care",
    icon: "fa-spa",
    description: "Personal care products",
    products: [
      "Skincare Products",
      "Hygiene Essentials",
      "Baby Care Products"
    ]
  },
  {
    category: "Medical Supplies",
    icon: "fa-first-aid",
    description: "Medical equipment and supplies",
    products: [
      "First Aid Kits",
      "Bandages & Dressings",
      "Medical Equipment"
    ]
  }
];

// ========================================
// TESTIMONIALS
// ========================================

const TESTIMONIALS = [
  {
    quote: "I've been a customer at Siva Medicals for over 2 years. They always have the medicines I need, and the staff is incredibly helpful. Highly recommended!",
    author: "Ramesh Kumar",
    location: "Madambakkam"
  },
  {
    quote: "The quick service and genuine products at honest prices make Siva Medicals my go-to pharmacy. Best in the neighborhood!",
    author: "Priya Sharma",
    location: "Local Resident"
  },
  {
    quote: "Very reliable. I appreciate their customer care and the way they follow up. They truly care about their customers' health.",
    author: "Dr. Rajesh",
    location: "Healthcare Professional"
  },
  {
    quote: "Great selection of health products and supplements. The staff is knowledgeable and always willing to answer questions.",
    author: "Anjali Reddy",
    location: "Wellness Enthusiast"
  }
];

// ========================================
// MAP CONFIGURATION
// ========================================

const MAP_CONFIG = {
  // Google Maps Embed Code
  embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.4755099849923!2d80.0457109!3d12.8513783!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a52f6fc7a64f62b:0x2f1fc26dd0000000!2sSiva+Medical+Pharmacy!5e0!3m2!1sen!2sin!4v1709722152987",
  
  // Latitude & Longitude
  latitude: 12.8513783,
  longitude: 80.0457109,
  
  // Branch Name
  branchName: "Siva Medical Pharmacy - Perumal Kovil St"
};

// ========================================
// FAQ ITEMS
// ========================================

const FAQ_ITEMS = [
  {
    question: "What are your operating hours?",
    answer: "We are open 7 days a week from 8 AM to 10 PM. You can visit us anytime during these hours for your pharmacy needs."
  },
  {
    question: "Do you offer home delivery?",
    answer: "Yes! We provide fast and reliable delivery service within Madambakkam and nearby areas. Call us to place your order."
  },
  {
    question: "Do I need a prescription for medicines?",
    answer: "For prescription medications, yes - a valid prescription from a doctor is required. OTC medicines can be purchased without prescriptions."
  },
  {
    question: "Are all your products genuine?",
    answer: "Absolutely! All our medicines and products are 100% authentic, sourced from licensed suppliers and certified distributors."
  },
  {
    question: "Can I get expert consultation?",
    answer: "Yes! Our experienced pharmacists provide free consultation and guidance on product selection and usage. Just ask when you visit or call."
  },
  {
    question: "What if I can't find a specific medicine?",
    answer: "Contact us with the medicine name and details. We'll check availability and arrange special orders if needed."
  }
];

// ========================================
// IMAGE CONFIGURATION
// ========================================

const IMAGE_CONFIG = {
  // Use local images or external service
  useLocal: false, // Set to true if using local images
  
  // Image paths (update if using local images)
  paths: {
    hero: "https://picsum.photos/1920/900?random=1",
    heroAbout: "https://picsum.photos/500/400?random=10",
    products: {
      vitamins: "https://picsum.photos/300/200?random=2",
      painRelief: "https://picsum.photos/300/200?random=3",
      personalCare: "https://picsum.photos/300/200?random=4",
      firstAid: "https://picsum.photos/300/200?random=5"
    },
    services: {
      medicines: "https://picsum.photos/400/300?random=20",
      supplements: "https://picsum.photos/400/300?random=21",
      personal: "https://picsum.photos/400/300?random=22",
      firstaid: "https://picsum.photos/400/300?random=23"
    }
  }
};

// ========================================
// ANALYTICS & TRACKING
// ========================================

const ANALYTICS = {
  // Google Analytics ID (Get from Google Analytics)
  gaId: "UA-XXXXXXXXX-X", // Update with your GA ID
  
  // Google Tag Manager ID (Optional)
  gtmId: "GTM-XXXXXXX", // Update with your GTM ID
  
  // Facebook Pixel ID (Optional)
  fbPixelId: "123456789" // Update with your FB Pixel ID
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Update business information across the site
 * Call this function to apply configuration changes
 */
function updateBusinessInfo() {
  // Update phone number
  const phoneElements = document.querySelectorAll('[data-phone]');
  phoneElements.forEach(el => el.textContent = BUSINESS_CONFIG.phone);
  
  // Update location
  const locationElements = document.querySelectorAll('[data-location]');
  locationElements.forEach(el => el.textContent = BUSINESS_CONFIG.location);
  
  // Update hours
  const hoursElements = document.querySelectorAll('[data-hours]');
  hoursElements.forEach(el => {
    el.textContent = `${BUSINESS_CONFIG.hoursOpen} - ${BUSINESS_CONFIG.hoursClose}`;
  });
}

/**
 * Get business hours for a specific day
 */
function getBusinessHours(day) {
  return BUSINESS_HOURS[day.toLowerCase()];
}

/**
 * Change color theme
 */
function changeTheme(primaryColor, accentColor) {
  document.documentElement.style.setProperty('--primary', primaryColor);
  document.documentElement.style.setProperty('--accent', accentColor);
}

// ========================================
// Export Configuration
// ========================================

// For use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BUSINESS_CONFIG,
    FORM_CONFIG,
    COLORS,
    SERVICES,
    PRODUCT_CATEGORIES,
    TESTIMONIALS,
    MAP_CONFIG,
    FAQ_ITEMS,
    IMAGE_CONFIG,
    ANALYTICS
  };
}

console.log('%c⚙️ Config Loaded', 'font-size: 12px; color: #d4a843;');
