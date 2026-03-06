# Images Directory - Siva Medicals Website

## Overview
This directory contains image assets for the Siva Medicals website. The website currently uses a combination of local SVG placeholders and external image services for production.

## Current Image Setup

### External Placeholder Images
All product and hero images are currently sourced from **via.placeholder.com**, a free service that returns custom‑text placeholder images in your brand colours.

**Why External?**
- ✅ High-quality images
- ✅ No storage space needed
- ✅ Always available and fast
- ✅ Professional appearance
- ✅ Easy to replace with real images

### Local SVG Placeholders
- `pharmacy.svg` - Generic pharmacy placeholder
- `medicines-placeholder.svg` - Medicines/pills category
- `health-placeholder.svg` - Health/wellness category

## Using Local Images Instead of External

If you want to use local images instead of an external placeholder service:

### Method 1: Replace placeholder URLs
Find all `via.placeholder.com` URLs in the HTML files and replace with local paths:

**From:**
```html
<img src="https://picsum.photos/300/200?random=2" alt="Vitamins">
```

**To:**
```html
<img src="images/vitamins.jpg" alt="Vitamins">
```

### Method 2: Add Your Images
1. Place image files (JPG, PNG, WebP) in this `/images` directory
2. Update HTML `src` attributes to point to local files
3. Use consistent naming conventions

## Recommended File Organization

```
images/
├── hero/
│   ├── hero-main.jpg
│   ├── hero-about.jpg
│   └── hero-services.jpg
├── products/
│   ├── vitamins.jpg
│   ├── pain-relief.jpg
│   ├── personal-care.jpg
│   └── first-aid.jpg
├── services/
│   ├── prescription-medicines.jpg
│   ├── supplements.jpg
│   └── consultation.jpg
├── placeholders/
│   ├── pharmacy.svg
│   ├── medicines-placeholder.svg
│   └── health-placeholder.svg
└── README.md (this file)
```

## Recommended Image Sizes

| Usage | Dimensions | Format |
|-------|-----------|--------|
| Hero Sections | 1920×1200 px | JPG/WebP |
| Product Cards | 300×300 px | JPG/PNG |
| Service Images | 400×300 px | JPG/WebP |
| Page Hero | 1920×900 px | JPG/WebP |

## How to Replace Images (Step-by-Step)

### Step 1: Add Your Images
Copy your image files to the `/images` directory

### Step 2: Update HTML Files
Search & replace all image URLs. Use these patterns:

**For Product Images (products.html):**
```html
<!-- Original -->
<img src="https://picsum.photos/300/200?random=2" alt="Product Name">

<!-- Updated -->
<img src="images/products/product-name.jpg" alt="Product Name">
```

**For Hero Images:**
```html
<!-- Original -->
background: url('https://picsum.photos/1920/900?random=1');

<!-- Updated -->
background: url('images/hero/hero-main.jpg');
```

## Image Optimization Tips

1. **Compress Images**
   - Use TinyPNG, ImageOptim, or similar tools
   - Target: 50-200 KB per image

2. **Use Modern Formats**
   - JPG for photographs
   - PNG for graphics with transparency
   - WebP for smaller file sizes

3. **Responsive Images**
   ```html
   <img src="images/product.jpg" 
        srcset="images/product-small.jpg 480w,
                images/product-medium.jpg 768w,
                images/product.jpg 1200w"
        sizes="(max-width: 480px) 100vw,
               (max-width: 768px) 50vw,
               33vw"
        alt="Product Description">
   ```

## CDN Alternatives

If you want high-quality images without hosting locally:

1. **Unsplash** - Free high-quality images
   ```html
   <img src="https://images.unsplash.com/photo-..." alt="Description">
   ```

2. **Pexels** - Free stock photos
   ```html
   <img src="https://images.pexels.com/..." alt="Description">
   ```

3. **Pixabay** - Free images and vectors
   ```html
   <img src="https://pixabay.com/..." alt="Description">
   ```

## File Naming Conventions

Use descriptive, lowercase names with hyphens:
- ✅ `vitamins-supplement.jpg`
- ✅ `pharmacy-store.jpg`
- ✅ `customer-testimonial.jpg`
- ❌ `image1.jpg`
- ❌ `photo.jpg`

## Updating Images Lists

### Hero Images (All Pages)
- `index.html` - Line with `hero` section background
- `about.html` - Line with `hero` section background
- `services.html` - Line with `hero` section background
- `products.html` - Line with `hero` section background
- `contact.html` - Line with `hero` section background

### Product/Service Images
- `index.html` - Featured products section
- `about.html` - Company story image
- `services.html` - Service category images
- `products.html` - 15 product images
- `contact.html` - Logo/brand images

## Performance Notes

**Current Setup (External):**
- Average load time: 2-3 seconds
- Image sizes: Automatic optimization
- CDN delivery: Global
- Cost: Free

**Local Setup:**
- Average load time: 1-2 seconds
- Image sizes: Your control
- Delivery: Your server
- Cost: Storage space

## Contact Information
For questions about images or to add commercial photos, contact: 9952930484

---
**Last Updated:** March 2026
**Website:** Siva Medicals
