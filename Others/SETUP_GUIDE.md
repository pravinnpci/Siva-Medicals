# Siva Medicals Website - Setup & Configuration Guide

## 🎯 Quick Start

Your website is now production-ready! Follow these steps to get everything working.

---

## 📧 Configure Contact Form (IMPORTANT)

The contact form currently uses a placeholder endpoint. Follow these steps to make it fully functional:

### Option 1: Use Formspree (Recommended - Free & Easy)

1. **Go to** https://formspree.io/
2. **Sign up** with your email
3. **Create a new form** and get your form endpoint (looks like: https://formspree.io/f/YOUR_FORM_ID)
4. **Open** `contact.html`
5. **Find** the line: `<form id="contactForm" action="https://formspree.io/f/xyzabnop" method="POST">`
6. **Replace** `xyzabnop` with your actual form ID
7. **Done!** Your form will now send emails

### Option 2: Use Basin.io

1. **Go to** https://usebasin.com/
2. **Create account** and get your endpoint
3. Update the form `action` attribute in `contact.html`

### Option 3: Use Email.js (Client-side)

1. Create account at https://www.emailjs.com/
2. Add the EmailJS script to `contact.html`
3. Update the service ID and template ID in `js/script.js`

---

## 🖼️ Image Setup

### Current Status
✅ All images are sourced from an external placeholder service (via.placeholder.com) – working out of the box

### To Use Local Images:

1. **Create image folders** in `/images/`:
   ```
   images/
   ├── hero/
   ├── products/
   ├── services/
   └── placeholders/
   ```

2. **Add your images** to these folders

3. **Update HTML files** - Replace image URLs:
   ```html
   <!-- Find all these and replace -->
   <img src="https://via.placeholder.com/300x200/d4a843/333333?text=Example" alt="...">
   
   <!-- With your local paths -->
   <img src="images/products/vitamins.jpg" alt="...">
   ```

4. **Use the provided guide** - See `/images/README.md` for detailed instructions

---

## 📁 Project Structure

```
Siva_medicals/
├── index.html              ✅ Home page
├── about.html              ✅ About page
├── services.html           ✅ Services page
├── products.html           ✅ Products page
├── contact.html            ✅ Contact page (needs form config)
├── css/
│   ├── style.css          ✅ Main styles (550+ lines)
│   └── style.cs           ⚠️  Rename or delete (not used)
├── js/
│   └── script.js          ✅ JavaScript (300+ lines)
├── images/
│   ├── README.md          📋 Image setup guide
│   ├── pharmacy.svg       📷 Placeholder image
│   ├── medicines-placeholder.svg
│   └── health-placeholder.svg
└── SETUP_GUIDE.md         📘 This file
```

---

## 🚀 Deployment Guide

### Option 1: Deploy to Netlify (FREE & RECOMMENDED)

1. **Create GitHub account** (if you don't have one)
2. **Push your files** to GitHub
3. **Go to** https://app.netlify.com/
4. **Click** "New site from Git"
5. **Select** your repository
6. **Done!** Your site is live

**Netlify Benefits:**
- ✅ Free SSL/HTTPS
- ✅ Custom domain support
- ✅ Form submissions support
- ✅ CDN included

### Option 2: Deploy to Vercel

1. **Go to** https://vercel.com/
2. **Import** your GitHub repository
3. **Deploy** automatically
4. **Done!**

### Option 3: Deploy to GitHub Pages

1. **Push files** to `gh-pages` branch
2. **Enable GitHub Pages** in repository settings
3. **Your site**: `yourusername.github.io/Siva_medicals`

### Option 4: Traditional Hosting

1. **Upload files** via FTP to your hosting
2. **Configure** DNS settings
3. **Done!**

---

## 🔧 Customization

### Change Business Information

**Find & Replace These Values:**
- `9952930484` → Your phone number
- `Madambakkam` → Your location
- `8 AM - 10 PM` → Your business hours

**Files to Update:**
- `index.html` - Lines 45, 281, 428, 467
- `about.html` - Lines 43
- `services.html` - Lines 43
- `products.html` - Lines 43
- `contact.html` - Lines 43, 173

### Change Colors

**Edit** `css/style.css` - Change these variables:
```css
:root {
  --primary: #333333;    /* Charcoal */
  --accent: #d4a843;     /* Gold */
}
```

### Change Company Name

**Search & Replace:**
- `Siva Medicals` → Your company name
- Update the `<title>` tags in each HTML file

### Add Social Media Links

**Edit footer** in each HTML file:
```html
<a href="https://facebook.com/yourpage"><i class="fab fa-facebook"></i></a>
<a href="https://instagram.com/yourprofile"><i class="fab fa-instagram"></i></a>
<a href="https://whatsapp.com"><i class="fab fa-whatsapp"></i></a>
```

---

## 📱 Testing

### Test on Different Devices

✅ **Desktop** - 1920px width
✅ **Tablet** - 768px width  
✅ **Mobile** - 375px width

### Test Features

1. **Dark Mode** - Click "Mode" button (top right)
2. **Navigation** - Mobile menu hamburger
3. **Scroll Animations** - Scroll to see fade-in effects
4. **Form Validation** - Try submitting empty form
5. **Responsive Images** - Resize browser window
6. **Carousels** - Click prev/next on testimonials

### Browser Testing

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers

---

## 📊 SEO & Best Practices

### Metadata
All pages have:
- ✅ Unique titles
- ✅ Meta descriptions
- ✅ Proper heading structure (H1, H2, H3)
- ✅ Alt text on images

### Performance
- ✅ Minimal CSS/JS
- ✅ External images (optimized)
- ✅ Responsive design
- ✅ Mobile-first approach

### Improvements You Can Make

1. **Add Google Analytics**
   ```html
   <!-- Add to <head> -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
   ```

2. **Add Meta Tags** (for social sharing)
   ```html
   <meta property="og:title" content="Siva Medicals">
   <meta property="og:image" content="path/to/image.jpg">
   ```

3. **Add Sitemap** (for SEO)
   Create `sitemap.xml`:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url><loc>https://yoursite.com/</loc></url>
     <url><loc>https://yoursite.com/about.html</loc></url>
     <!-- ... -->
   </urlset>
   ```

---

## 🐛 Troubleshooting

### Contact Form Not Working
1. ✅ Did you update the Formspree ID?
2. ✅ Check browser console (F12) for errors
3. ✅ Try a different form service

### Images Not Loading
1. ✅ Check image paths (are they correct?)
2. ✅ Verify image files exist
3. ✅ Check file permissions (must be readable)

### Dark Mode Not Working
1. ✅ Clear browser cache
2. ✅ Check localStorage is enabled
3. ✅ Check console for JavaScript errors

### Mobile Menu Not Closing
1. ✅ Clear cache and reload
2. ✅ Check Bootstrap JS is loaded
3. ✅ Verify `js/script.js` is included

### Animations Not Showing
1. ✅ Check elements have `fade-in` class
2. ✅ Verify `css/style.css` is loaded
3. ✅ Scroll to trigger animations

---

## 📞 Support Resources

### Official Documentation
- **Bootstrap:** https://getbootstrap.com/docs/5.3/
- **Font Awesome:** https://fontawesome.com/docs/
- **MDN Web Docs:** https://developer.mozilla.org/

### Form Services
- **Formspree:** https://formspree.io/
- **Basin:** https://usebasin.com/
- **EmailJS:** https://www.emailjs.com/

### Hosting Platforms
- **Netlify:** https://netlify.com/
- **Vercel:** https://vercel.com/
- **GitHub Pages:** https://pages.github.com/

### Image Services
- **via.placeholder.com:** https://via.placeholder.com/ (current)
- **Unsplash:** https://unsplash.com/
- **Pexels:** https://www.pexels.com/

---

## ✅ Pre-Launch Checklist

- [ ] Contact form is configured and tested
- [ ] Replace placeholder images OR keep external service
- [ ] Update business info (phone, address, hours)
- [ ] Test on mobile devices
- [ ] Test dark mode toggle
- [ ] Test all navigation links
- [ ] Verify form submissions work
- [ ] Check Google Search Console
- [ ] Set up Google Analytics
- [ ] Update social media links
- [ ] Test on different browsers
- [ ] Check page load speed
- [ ] Set up SSL certificate (HTTPS)

---

## 🎉 Launch!

Once everything is configured:

1. Deploy your site
2. Test the live version
3. Submit sitemap to Google Search Console
4. Share on social media
5. Promote your business!

---

## Questions?

For technical help:
- Check the troubleshooting section
- See `/images/README.md` for image help
- Review the code comments in HTML files

---

**Website Version:** 1.0  
**Last Updated:** March 2026  
**Best viewed on:** Chrome, Firefox, Safari, Edge  
**Maintained by:** Siva Medicals Team
