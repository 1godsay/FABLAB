# FABLAB - 3D Printing Marketplace

## Product Overview
FABLAB is a full-stack marketplace for 3D printing services and digital designs, connecting buyers with sellers (designers and FabLabs).

## User Roles
- **Buyer**: Browse marketplace, purchase products, track orders, leave reviews
- **Seller**: Upload products (STL files + images), manage listings, set prices
- **Admin**: Approve/reject products, manage users, update order status, view analytics

## Technical Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **File Storage**: AWS S3 (ap-south-1 region)
- **Payments**: Razorpay (LIVE keys configured)
- **Email**: SendGrid (transactional emails)

## AWS S3 Configuration
- **Bucket**: fablab-files-storage
- **Region**: ap-south-1 (Mumbai)
- **Public Access**: Enabled for `/images/*` folder only
- **STL Files**: Private (accessed via presigned URLs)

## SendGrid Configuration
- **Sender Email**: godsaystudios@gmail.com
- **Sender Name**: FABLAB

## What's Implemented ✅

### Core Features
- [x] User authentication (JWT-based)
- [x] Role-based access control (Buyer, Seller, Admin)
- [x] User registration and login
- [x] Account upgrade (Buyer → Seller)

### Seller Features
- [x] Seller dashboard
- [x] Product upload (STL + images)
- [x] Image management (set primary, delete images)
- [x] Automatic pricing engine (volume × material rate + margin + royalty)
- [x] Manual volume override
- [x] Publish/unpublish products
- [x] Delete products

### Marketplace
- [x] Public marketplace (guest browsing)
- [x] Product filtering (category, material)
- [x] Product detail page with image gallery
- [x] **Image zoom/fullscreen lightbox** ✅
- [x] Star ratings on product cards
- [x] Cart functionality
- [x] Custom print page for private orders

### Order System
- [x] **Order tracking page for buyers** ✅
- [x] Visual progress tracker (5 stages)
- [x] Order history

### Reviews & Ratings System
- [x] Submit reviews with 1-5 star rating
- [x] Review comments and display
- [x] Average rating calculation
- [x] Reviews shown on product detail page
- [x] Ratings displayed on marketplace cards

### Admin Features
- [x] Admin dashboard
- [x] Product approval/rejection
- [x] Delete any product
- [x] Analytics Dashboard
  - Total revenue tracking
  - Top selling products
  - Top rated products
  - Revenue by material
  - Order status breakdown
  - User statistics

### Email Notifications ✅
- [x] Order confirmation to buyer
- [x] Order status updates to buyer
- [x] New order notification to seller

### Payments
- [x] Razorpay integration (LIVE)

### File Storage
- [x] AWS S3 integration (PRODUCTION)
- [x] Public URLs for images
- [x] Presigned URLs for STL downloads

## Key Files
- `/app/backend/server.py` - Main API
- `/app/backend/utils/s3_service.py` - AWS S3 service
- `/app/backend/utils/email_service.py` - SendGrid email service
- `/app/backend/.env` - Environment variables
- `/app/frontend/src/components/ImageLightbox.js` - Zoom/fullscreen viewer
- `/app/frontend/src/pages/OrdersPage.js` - Order tracking

## Test Accounts
- **Admin**: admin@fablab.com / admin123
- **Seller**: testseller@fablab.com / test123

## Future Tasks (P2)
- [ ] Wishlist feature
- [ ] Product comparison
- [ ] Search functionality
- [ ] Seller earnings dashboard

---
Last Updated: December 29, 2025
