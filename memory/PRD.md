# FABLAB - 3D Printing Marketplace

## Product Overview
FABLAB is a full-stack marketplace for 3D printing services and digital designs, connecting buyers with sellers (designers and FabLabs).

## User Roles
- **Buyer**: Browse marketplace, purchase products, track orders
- **Seller**: Upload products (STL files + images), manage listings, set prices
- **Admin**: Approve/reject products, manage users, update order status

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
- [x] Automatic pricing engine (volume × material rate + margin + royalty)
- [x] Manual volume override
- [x] Publish/unpublish products
- [x] Delete products

### Marketplace
- [x] Public marketplace (guest browsing)
- [x] Product filtering (category, material)
- [x] Product detail page with image gallery
- [x] Cart functionality
- [x] Custom print page for private orders

### Admin Features
- [x] Admin dashboard
- [x] Product approval/rejection
- [x] Delete any product

### Payments
- [x] Razorpay integration (LIVE)

### File Storage
- [x] AWS S3 integration (PRODUCTION)
- [x] Public URLs for images
- [x] Presigned URLs for STL downloads
- [x] Fallback placeholders for missing images

## Key Files
- `/app/backend/server.py` - Main API
- `/app/backend/utils/s3_service.py` - AWS S3 service
- `/app/backend/.env` - Environment variables (AWS, Razorpay, JWT)
- `/app/frontend/src/pages/` - React pages

## Test Accounts
- **Admin**: admin@fablab.com / admin123
- **Seller**: testseller@fablab.com / test123

## Upcoming Tasks (P1)
- [ ] Admin analytics (revenue, popular products)
- [ ] Reviews & ratings system
- [ ] Order tracking system

## Future Tasks (P2)
- [ ] Image zoom/fullscreen viewer
- [ ] Wishlist feature
- [ ] Product comparison
- [ ] Email notifications

---
Last Updated: December 29, 2025
