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

## AWS S3 Configuration
- **Bucket**: fablab-files-storage
- **Region**: ap-south-1 (Mumbai)
- **Public Access**: Enabled for `/images/*` folder only
- **STL Files**: Private (accessed via presigned URLs)

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
- [x] **Star ratings on product cards**
- [x] Cart functionality
- [x] Custom print page for private orders

### Reviews & Ratings System ✅ (NEW)
- [x] Submit reviews with 1-5 star rating
- [x] Review comments and display
- [x] Average rating calculation
- [x] Reviews shown on product detail page
- [x] Ratings displayed on marketplace cards

### Admin Features
- [x] Admin dashboard
- [x] Product approval/rejection
- [x] Delete any product
- [x] **Analytics Dashboard** ✅ (NEW)
  - Total revenue tracking
  - Top selling products
  - Top rated products
  - Revenue by material
  - Order status breakdown
  - User statistics

### Payments
- [x] Razorpay integration (LIVE)

### File Storage
- [x] AWS S3 integration (PRODUCTION)
- [x] Public URLs for images
- [x] Presigned URLs for STL downloads
- [x] Fallback placeholders for missing images

## Key Files
- `/app/backend/server.py` - Main API with reviews & analytics
- `/app/backend/utils/s3_service.py` - AWS S3 service
- `/app/backend/.env` - Environment variables (AWS, Razorpay, JWT)
- `/app/frontend/src/pages/AdminDashboardPage.js` - Admin with analytics
- `/app/frontend/src/pages/ProductDetailPage.js` - Product page with reviews
- `/app/frontend/src/pages/MarketplacePage.js` - Shows ratings on cards

## API Endpoints (New)
- `POST /api/reviews` - Submit a review
- `GET /api/products/{id}/reviews` - Get product reviews
- `DELETE /api/reviews/{id}` - Delete a review
- `GET /api/admin/analytics` - Get admin analytics data

## Test Accounts
- **Admin**: admin@fablab.com / admin123
- **Seller**: testseller@fablab.com / test123

## Future Tasks (P2)
- [ ] Image zoom/fullscreen viewer
- [ ] Wishlist feature
- [ ] Product comparison
- [ ] Email notifications
- [ ] Order tracking page for buyers

---
Last Updated: December 29, 2025
