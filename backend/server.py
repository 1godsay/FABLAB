from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import razorpay

from utils.auth import hash_password, verify_password, create_access_token, decode_token
from utils.s3_service import s3_service
from utils.stl_parser import calculate_stl_volume, calculate_price
from utils.email_service import email_service
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

def fix_image_urls(product: dict) -> dict:
    """Fix image URLs - handle both old mock URLs and new S3 URLs"""
    if "images" in product and product["images"]:
        backend_url = os.getenv('BACKEND_URL', '')
        fixed_images = []
        for img_url in product["images"]:
            # If it's an old mock URL, try to fix it
            if "/api/files/mock/" in img_url:
                # Extract path after /api/files/mock/
                match = re.search(r'/api/files/mock/(.+)$', img_url)
                if match:
                    file_path = match.group(1)
                    fixed_images.append(f"{backend_url}/api/files/mock/{file_path}")
                else:
                    fixed_images.append(img_url)
            else:
                # S3 URLs or other URLs - keep as-is
                fixed_images.append(img_url)
        product["images"] = fixed_images
    return product

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="FABLAB API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import razorpay
import uuid

class MockRazorpayClient:
    """Mock Razorpay client for testing"""
    def __init__(self):
        self.order = MockRazorpayOrder()
        self.utility = MockRazorpayUtility()
        logger.info("Using Mock Razorpay Client for testing")

class MockRazorpayOrder:
    def create(self, data):
        """Mock order creation"""
        return {
            "id": f"order_{uuid.uuid4().hex[:10]}",
            "amount": data["amount"],
            "currency": data["currency"],
            "status": "created"
        }

class MockRazorpayUtility:
    def verify_payment_signature(self, data):
        """Mock payment signature verification - always passes"""
        return True

# Check if we have valid Razorpay credentials
razorpay_key = os.getenv('RAZORPAY_KEY_ID', 'rzp_test_dummy')
razorpay_secret = os.getenv('RAZORPAY_KEY_SECRET', 'dummy_secret')

if razorpay_key == 'rzp_test_dummy_key' or razorpay_secret == 'dummy_secret_for_testing':
    logger.warning("Using dummy Razorpay credentials, switching to Mock Razorpay Client")
    razorpay_client = MockRazorpayClient()
else:
    logger.info("Using real Razorpay Client")
    razorpay_client = razorpay.Client(auth=(razorpay_key, razorpay_secret))


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = Field(default="buyer", pattern="^(buyer|seller|admin)$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seller_id: str
    name: str
    description: str
    category: str
    material: str
    stl_file_key: str
    images: List[str] = []
    volume_cm3: float
    base_cost: float
    platform_margin: float
    creator_royalty_percent: float = 10.0
    creator_royalty: float
    final_price: float
    is_published: bool = False
    is_approved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    category: str
    material: str = Field(pattern="^(PLA|ABS|Resin)$")

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    buyer_id: str
    seller_id: str
    product_id: str
    product_name: str
    quantity: int
    total_amount: float
    status: str = "Order placed"
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CartItem(BaseModel):
    product_id: str
    quantity: int

class OrderCreate(BaseModel):
    items: List[CartItem]

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    amount: float
    currency: str = "INR"
    status: str = "created"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    buyer_id: str
    buyer_name: str
    rating: int = Field(ge=1, le=5)
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    product_id: str
    rating: int = Field(ge=1, le=5)
    comment: str


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and return user data"""
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_email = payload.get("sub")
    user = await db.users.find_one({"email": user_email}, {"_id": 0, "password": 0})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    """Register new user"""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token(data={"sub": user_data.email, "role": user_data.role})
    
    return {
        "token": token,
        "user": {
            "id": user_dict["id"],
            "email": user_dict["email"],
            "name": user_dict["name"],
            "role": user_dict["role"]
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """User login"""
    user = await db.users.find_one({"email": credentials.email})
    
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(data={"sub": user["email"], "role": user["role"]})
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return current_user

@api_router.post("/auth/upgrade-to-seller")
async def upgrade_to_seller(current_user: dict = Depends(get_current_user)):
    """Upgrade user account to seller role"""
    if current_user["role"] == "seller":
        raise HTTPException(status_code=400, detail="Already a seller")
    
    if current_user["role"] == "admin":
        raise HTTPException(status_code=400, detail="Admin cannot be downgraded to seller")
    
    # Update user role to seller
    result = await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"role": "seller"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create new token with updated role
    token = create_access_token(data={"sub": current_user["email"], "role": "seller"})
    
    logger.info(f"User {current_user['email']} upgraded to seller")
    
    return {
        "message": "Successfully upgraded to seller account",
        "token": token,
        "user": {
            "id": current_user["id"],
            "email": current_user["email"],
            "name": current_user["name"],
            "role": "seller"
        }
    }


@api_router.post("/products/upload-stl")
async def upload_stl(
    name: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    material: str = Form(...),
    creator_royalty_percent: float = Form(10.0),
    stl_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload STL file and create product"""
    if current_user["role"] != "seller":
        raise HTTPException(status_code=403, detail="Only sellers can upload products")
    
    if material not in ["PLA", "ABS", "Resin"]:
        raise HTTPException(status_code=400, detail="Invalid material")
    
    if creator_royalty_percent < 0 or creator_royalty_percent > 50:
        raise HTTPException(status_code=400, detail="Creator royalty must be between 0% and 50%")
    
    stl_content = await stl_file.read()
    
    try:
        volume_cm3 = calculate_stl_volume(stl_content)
        pricing = calculate_price(volume_cm3, material, creator_royalty_percent)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    file_key = f"stl/{uuid.uuid4()}.stl"
    stl_url = s3_service.upload_file(stl_content, file_key, 'application/vnd.ms-pki.stl')
    
    if not stl_url:
        raise HTTPException(status_code=500, detail="Failed to upload STL file")
    
    product_dict = {
        "id": str(uuid.uuid4()),
        "seller_id": current_user["id"],
        "name": name,
        "description": description,
        "category": category,
        "material": material,
        "stl_file_key": file_key,
        "images": [],
        "volume_cm3": pricing["volume_cm3"],
        "base_cost": pricing["base_cost"],
        "platform_margin": pricing["platform_margin"],
        "creator_royalty_percent": pricing["creator_royalty_percent"],
        "creator_royalty": pricing["creator_royalty"],
        "final_price": pricing["final_price"],
        "is_published": False,
        "is_approved": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.products.insert_one(product_dict)
    
    return {"message": "Product created successfully", "product_id": product_dict["id"], "pricing": pricing}

@api_router.post("/products/{product_id}/upload-image")
async def upload_product_image(
    product_id: str,
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload product image"""
    product = await db.products.find_one({"id": product_id, "seller_id": current_user["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    image_content = await image.read()
    file_key = f"images/{uuid.uuid4()}.{image.filename.split('.')[-1]}"
    
    # upload_file now returns the public URL for images
    image_url = s3_service.upload_file(image_content, file_key, image.content_type)
    if not image_url:
        raise HTTPException(status_code=500, detail="Failed to upload image")
    
    await db.products.update_one(
        {"id": product_id},
        {"$push": {"images": image_url}}
    )
    
    return {"message": "Image uploaded", "image_url": image_url}

@api_router.put("/products/{product_id}/set-primary-image")
async def set_primary_image(
    product_id: str,
    image_index: int = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Set a specific image as the primary (first) image"""
    product = await db.products.find_one({"id": product_id, "seller_id": current_user["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    images = product.get("images", [])
    if image_index < 0 or image_index >= len(images):
        raise HTTPException(status_code=400, detail="Invalid image index")
    
    # Move the selected image to the front
    selected_image = images.pop(image_index)
    images.insert(0, selected_image)
    
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"images": images}}
    )
    
    return {"message": "Primary image updated", "images": images}

@api_router.delete("/products/{product_id}/delete-image/{image_index}")
async def delete_product_image(
    product_id: str,
    image_index: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a specific image from a product"""
    product = await db.products.find_one({"id": product_id, "seller_id": current_user["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    images = product.get("images", [])
    if image_index < 0 or image_index >= len(images):
        raise HTTPException(status_code=400, detail="Invalid image index")
    
    # Get the image URL to delete from S3
    image_url = images[image_index]
    
    # Try to delete from S3 if it's an S3 URL
    if "s3." in image_url and "amazonaws.com" in image_url:
        # Extract the file key from the S3 URL
        try:
            file_key = image_url.split(".amazonaws.com/")[1]
            s3_service.delete_file(file_key)
        except Exception as e:
            logger.warning(f"Failed to delete image from S3: {e}")
    
    # Remove from the images array
    images.pop(image_index)
    
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"images": images}}
    )
    
    return {"message": "Image deleted", "images": images}

@api_router.put("/products/{product_id}/update-volume")
async def update_product_volume(
    product_id: str,
    volume_cm3: float = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Manually update product volume and recalculate price (seller or admin)"""
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check permissions
    if current_user["role"] not in ["admin", "seller"]:
        raise HTTPException(status_code=403, detail="Only sellers and admins can update volume")
    
    if current_user["role"] == "seller" and product["seller_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only update your own products")
    
    if volume_cm3 <= 0:
        raise HTTPException(status_code=400, detail="Volume must be greater than 0")
    
    # Recalculate pricing
    pricing = calculate_price(volume_cm3, product["material"])
    
    await db.products.update_one(
        {"id": product_id},
        {"$set": {
            "volume_cm3": pricing["volume_cm3"],
            "base_cost": pricing["base_cost"],
            "platform_margin": pricing["platform_margin"],
            "final_price": pricing["final_price"]
        }}
    )
    
    logger.info(f"Product {product_id} volume manually updated to {volume_cm3} cm³")
    
    return {
        "message": "Volume updated successfully",
        "pricing": pricing
    }

@api_router.put("/products/{product_id}/publish")
async def toggle_publish(product_id: str, current_user: dict = Depends(get_current_user)):
    """Publish/unpublish product"""
    product = await db.products.find_one({"id": product_id, "seller_id": current_user["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    new_status = not product.get("is_published", False)
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"is_published": new_status}}
    )
    
    return {"message": f"Product {'published' if new_status else 'unpublished'}", "is_published": new_status}

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    """Delete product (seller only)"""
    product = await db.products.find_one({"id": product_id, "seller_id": current_user["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or you don't have permission")
    
    # Delete associated files from S3/mock storage
    try:
        # Delete STL file
        if product.get("stl_file_key"):
            s3_service.delete_file(product["stl_file_key"])
        
        # Delete images
        for image_url in product.get("images", []):
            # Extract file key from URL
            if "/api/files/mock/" in image_url:
                file_key = image_url.split("/api/files/mock/")[1]
                s3_service.delete_file(file_key)
    except Exception as e:
        logger.warning(f"Error deleting files for product {product_id}: {e}")
    
    # Delete product from database
    await db.products.delete_one({"id": product_id})
    
    logger.info(f"Product {product_id} deleted by seller {current_user['id']}")
    
    return {"message": "Product deleted successfully"}

@api_router.post("/custom-print/calculate")
async def calculate_custom_print(
    stl_file: UploadFile = File(...),
    material: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Calculate price for custom STL print without creating product listing"""
    if material not in ["PLA", "ABS", "Resin"]:
        raise HTTPException(status_code=400, detail="Invalid material")
    
    stl_content = await stl_file.read()
    
    try:
        volume_cm3 = calculate_stl_volume(stl_content)
        pricing = calculate_price(volume_cm3, material)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Store STL temporarily for this session
    file_key = f"custom/{uuid.uuid4()}.stl"
    stl_url = s3_service.upload_file(stl_content, file_key, 'application/vnd.ms-pki.stl')
    
    if not stl_url:
        raise HTTPException(status_code=500, detail="Failed to upload STL file")
    
    return {
        "file_key": file_key,
        "filename": stl_file.filename,
        "material": material,
        "pricing": pricing
    }

@api_router.post("/custom-print/order")
async def create_custom_print_order(
    file_key: str = Form(...),
    filename: str = Form(...),
    material: str = Form(...),
    volume_cm3: float = Form(...),
    quantity: int = Form(1),
    current_user: dict = Depends(get_current_user)
):
    """Create order for custom print"""
    pricing = calculate_price(volume_cm3, material)
    order_amount = pricing["final_price"] * quantity
    
    order_dict = {
        "id": str(uuid.uuid4()),
        "buyer_id": current_user["id"],
        "seller_id": "custom_print",  # Special marker for custom prints
        "product_id": "custom",
        "product_name": f"Custom Print: {filename}",
        "quantity": quantity,
        "total_amount": order_amount,
        "status": "Order placed",
        "custom_print": True,
        "stl_file_key": file_key,
        "material": material,
        "volume_cm3": volume_cm3,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    razorpay_order = razorpay_client.order.create({
        "amount": int(order_amount * 100),
        "currency": "INR",
        "payment_capture": 1
    })
    
    order_dict["razorpay_order_id"] = razorpay_order["id"]
    await db.orders.insert_one(order_dict)
    
    transaction_dict = {
        "id": str(uuid.uuid4()),
        "order_id": order_dict["id"],
        "razorpay_order_id": razorpay_order["id"],
        "amount": order_amount,
        "currency": "INR",
        "status": "created",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(transaction_dict)
    
    return {
        "razorpay_order_id": razorpay_order["id"],
        "amount": order_amount,
        "currency": "INR",
        "razorpay_key": os.getenv('RAZORPAY_KEY_ID')
    }

@api_router.get("/products")
async def list_products(
    category: Optional[str] = None,
    material: Optional[str] = None,
    seller_id: Optional[str] = None
):
    """List all published and approved products"""
    query = {"is_published": True, "is_approved": True}
    
    if category:
        query["category"] = category
    if material:
        query["material"] = material
    if seller_id:
        query["seller_id"] = seller_id
    
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    
    for product in products:
        product["created_at"] = product["created_at"]
        fix_image_urls(product)
    
    return {"products": products}

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    """Get product details"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    stl_url = s3_service.generate_download_url(product["stl_file_key"])
    product["stl_download_url"] = stl_url
    fix_image_urls(product)
    
    return product

@api_router.get("/seller/products")
async def get_seller_products(current_user: dict = Depends(get_current_user)):
    """Get seller's products"""
    if current_user["role"] != "seller":
        raise HTTPException(status_code=403, detail="Only sellers can access this")
    
    products = await db.products.find({"seller_id": current_user["id"]}, {"_id": 0}).to_list(100)
    for product in products:
        fix_image_urls(product)
    return {"products": products}

@api_router.get("/seller/orders")
async def get_seller_orders(current_user: dict = Depends(get_current_user)):
    """Get seller's orders"""
    if current_user["role"] != "seller":
        raise HTTPException(status_code=403, detail="Only sellers can access this")
    
    orders = await db.orders.find({"seller_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return {"orders": orders}


@api_router.post("/orders/create")
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    """Create order and Razorpay payment"""
    if not order_data.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    orders = []
    total_amount = 0
    
    for item in order_data.items:
        product = await db.products.find_one({"id": item.product_id})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        if not product.get("is_published") or not product.get("is_approved"):
            raise HTTPException(status_code=400, detail=f"Product {product['name']} is not available")
        
        order_amount = product["final_price"] * item.quantity
        total_amount += order_amount
        
        order_dict = {
            "id": str(uuid.uuid4()),
            "buyer_id": current_user["id"],
            "seller_id": product["seller_id"],
            "product_id": product["id"],
            "product_name": product["name"],
            "quantity": item.quantity,
            "total_amount": order_amount,
            "status": "Order placed",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        orders.append(order_dict)
    
    razorpay_order = razorpay_client.order.create({
        "amount": int(total_amount * 100),
        "currency": "INR",
        "payment_capture": 1
    })
    
    for order in orders:
        order["razorpay_order_id"] = razorpay_order["id"]
        await db.orders.insert_one(order)
    
    transaction_dict = {
        "id": str(uuid.uuid4()),
        "order_id": orders[0]["id"],
        "razorpay_order_id": razorpay_order["id"],
        "amount": total_amount,
        "currency": "INR",
        "status": "created",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(transaction_dict)
    
    return {
        "razorpay_order_id": razorpay_order["id"],
        "amount": total_amount,
        "currency": "INR",
        "razorpay_key": os.getenv('RAZORPAY_KEY_ID')
    }

@api_router.post("/orders/verify-payment")
async def verify_payment(
    razorpay_order_id: str = Form(...),
    razorpay_payment_id: str = Form(...),
    razorpay_signature: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Verify Razorpay payment"""
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
        
        await db.orders.update_many(
            {"razorpay_order_id": razorpay_order_id},
            {"$set": {"razorpay_payment_id": razorpay_payment_id, "status": "Order placed"}}
        )
        
        await db.transactions.update_one(
            {"razorpay_order_id": razorpay_order_id},
            {"$set": {"razorpay_payment_id": razorpay_payment_id, "status": "completed"}}
        )
        
        # Send order confirmation emails
        orders = await db.orders.find({"razorpay_order_id": razorpay_order_id}, {"_id": 0}).to_list(100)
        for order in orders:
            # Send confirmation to buyer
            try:
                email_service.send_order_confirmation(
                    buyer_email=current_user["email"],
                    buyer_name=current_user["name"],
                    order_details={
                        "order_id": order["id"],
                        "product_name": order["product_name"],
                        "quantity": order["quantity"],
                        "total_amount": order["total_amount"],
                        "status": "Order placed"
                    }
                )
            except Exception as e:
                logger.warning(f"Failed to send order confirmation email: {e}")
            
            # Send notification to seller
            try:
                seller = await db.users.find_one({"id": order["seller_id"]}, {"_id": 0})
                if seller:
                    email_service.send_new_order_notification_to_seller(
                        seller_email=seller["email"],
                        seller_name=seller["name"],
                        order_details={
                            "order_id": order["id"],
                            "product_name": order["product_name"],
                            "quantity": order["quantity"],
                            "total_amount": order["total_amount"]
                        }
                    )
            except Exception as e:
                logger.warning(f"Failed to send seller notification email: {e}")
        
        return {"message": "Payment verified successfully"}
    except Exception as e:
        logger.error(f"Payment verification failed: {e}")
        raise HTTPException(status_code=400, detail="Payment verification failed")

@api_router.get("/orders/my-orders")
async def get_my_orders(current_user: dict = Depends(get_current_user)):
    """Get buyer's orders"""
    orders = await db.orders.find({"buyer_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return {"orders": orders}

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Get order details"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["buyer_id"] != current_user["id"] and order["seller_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order


@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return {"users": users}

@api_router.get("/admin/sellers")
async def get_all_sellers(current_user: dict = Depends(get_current_user)):
    """Get all sellers (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    sellers = await db.users.find({"role": "seller"}, {"_id": 0, "password": 0}).to_list(1000)
    return {"sellers": sellers}

@api_router.get("/admin/orders")
async def get_all_orders(current_user: dict = Depends(get_current_user)):
    """Get all orders (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    return {"orders": orders}

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Update order status (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    valid_statuses = ["Order placed", "Printing", "Post-processing", "Shipped", "Delivered"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order status updated", "status": status}

@api_router.get("/admin/products/pending")
async def get_pending_products(current_user: dict = Depends(get_current_user)):
    """Get products pending approval (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    products = await db.products.find({"is_approved": False}, {"_id": 0}).to_list(1000)
    for product in products:
        fix_image_urls(product)
    return {"products": products}

@api_router.get("/admin/products/all")
async def get_all_products_admin(current_user: dict = Depends(get_current_user)):
    """Get all products (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    for product in products:
        fix_image_urls(product)
    return {"products": products}

@api_router.put("/admin/products/{product_id}/approve")
async def approve_product(
    product_id: str,
    approved: bool = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Approve or reject product (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": {"is_approved": approved}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": f"Product {'approved' if approved else 'rejected'}", "is_approved": approved}

@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    """Delete any product (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Delete associated files from S3/mock storage
    try:
        # Delete STL file
        if product.get("stl_file_key"):
            s3_service.delete_file(product["stl_file_key"])
        
        # Delete images
        for image_url in product.get("images", []):
            # Extract file key from URL
            if "/api/files/mock/" in image_url:
                file_key = image_url.split("/api/files/mock/")[1]
                s3_service.delete_file(file_key)
    except Exception as e:
        logger.warning(f"Error deleting files for product {product_id}: {e}")
    
    # Delete product from database
    await db.products.delete_one({"id": product_id})
    
    logger.info(f"Product {product_id} deleted by admin {current_user['id']}")
    
    return {"message": "Product deleted successfully"}


# ============== REVIEWS API ==============

@api_router.post("/reviews")
async def create_review(review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    """Create a review for a product (buyers only, must have purchased)"""
    if current_user["role"] not in ["buyer", "seller"]:
        raise HTTPException(status_code=403, detail="Only buyers can leave reviews")
    
    # Check if product exists
    product = await db.products.find_one({"id": review_data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user has already reviewed this product
    existing_review = await db.reviews.find_one({
        "product_id": review_data.product_id,
        "buyer_id": current_user["id"]
    })
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")
    
    # Create review
    review_dict = {
        "id": str(uuid.uuid4()),
        "product_id": review_data.product_id,
        "buyer_id": current_user["id"],
        "buyer_name": current_user["name"],
        "rating": review_data.rating,
        "comment": review_data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_dict)
    
    # Update product's average rating
    all_reviews = await db.reviews.find({"product_id": review_data.product_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    review_count = len(all_reviews)
    
    await db.products.update_one(
        {"id": review_data.product_id},
        {"$set": {"avg_rating": round(avg_rating, 1), "review_count": review_count}}
    )
    
    return {"message": "Review submitted successfully", "review_id": review_dict["id"]}

@api_router.get("/products/{product_id}/reviews")
async def get_product_reviews(product_id: str):
    """Get all reviews for a product"""
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get product's average rating
    product = await db.products.find_one({"id": product_id}, {"_id": 0, "avg_rating": 1, "review_count": 1})
    
    return {
        "reviews": reviews,
        "avg_rating": product.get("avg_rating", 0) if product else 0,
        "review_count": product.get("review_count", 0) if product else 0
    }

@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a review (owner or admin only)"""
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review["buyer_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this review")
    
    product_id = review["product_id"]
    await db.reviews.delete_one({"id": review_id})
    
    # Recalculate average rating
    all_reviews = await db.reviews.find({"product_id": product_id}).to_list(1000)
    if all_reviews:
        avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
        review_count = len(all_reviews)
    else:
        avg_rating = 0
        review_count = 0
    
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"avg_rating": round(avg_rating, 1), "review_count": review_count}}
    )
    
    return {"message": "Review deleted successfully"}


# ============== ADMIN ANALYTICS API ==============

@api_router.get("/admin/analytics")
async def get_admin_analytics(current_user: dict = Depends(get_current_user)):
    """Get analytics data for admin dashboard"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Total revenue from completed orders
    orders = await db.orders.find({}).to_list(10000)
    total_revenue = sum(o.get("total_amount", 0) for o in orders if o.get("status") in ["Delivered", "Shipped", "Order placed", "Printing"])
    completed_orders = len([o for o in orders if o.get("status") == "Delivered"])
    pending_orders = len([o for o in orders if o.get("status") in ["Order placed", "Printing", "Shipped"]])
    
    # User stats
    total_users = await db.users.count_documents({})
    total_buyers = await db.users.count_documents({"role": "buyer"})
    total_sellers = await db.users.count_documents({"role": "seller"})
    
    # Product stats
    total_products = await db.products.count_documents({})
    published_products = await db.products.count_documents({"is_published": True, "is_approved": True})
    pending_approval = await db.products.count_documents({"is_approved": False})
    
    # Top selling products (by order count)
    pipeline = [
        {"$group": {"_id": "$product_id", "order_count": {"$sum": 1}, "total_revenue": {"$sum": "$total_amount"}, "product_name": {"$first": "$product_name"}}},
        {"$sort": {"order_count": -1}},
        {"$limit": 5}
    ]
    top_products = await db.orders.aggregate(pipeline).to_list(5)
    
    # Top rated products
    top_rated = await db.products.find(
        {"avg_rating": {"$gt": 0}, "is_published": True, "is_approved": True},
        {"_id": 0, "id": 1, "name": 1, "avg_rating": 1, "review_count": 1}
    ).sort("avg_rating", -1).limit(5).to_list(5)
    
    # Revenue by material
    material_pipeline = [
        {"$lookup": {"from": "products", "localField": "product_id", "foreignField": "id", "as": "product"}},
        {"$unwind": "$product"},
        {"$group": {"_id": "$product.material", "revenue": {"$sum": "$total_amount"}, "count": {"$sum": 1}}},
        {"$sort": {"revenue": -1}}
    ]
    revenue_by_material = await db.orders.aggregate(material_pipeline).to_list(10)
    
    # Recent orders (last 10)
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    # Order status breakdown
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    order_status_breakdown = await db.orders.aggregate(status_pipeline).to_list(10)
    
    return {
        "revenue": {
            "total": round(total_revenue, 2),
            "by_material": [{"material": r["_id"], "revenue": round(r["revenue"], 2), "orders": r["count"]} for r in revenue_by_material]
        },
        "orders": {
            "total": len(orders),
            "completed": completed_orders,
            "pending": pending_orders,
            "status_breakdown": [{"status": s["_id"], "count": s["count"]} for s in order_status_breakdown],
            "recent": recent_orders
        },
        "users": {
            "total": total_users,
            "buyers": total_buyers,
            "sellers": total_sellers
        },
        "products": {
            "total": total_products,
            "published": published_products,
            "pending_approval": pending_approval,
            "top_selling": [{"product_id": p["_id"], "name": p["product_name"], "orders": p["order_count"], "revenue": round(p["total_revenue"], 2)} for p in top_products],
            "top_rated": top_rated
        }
    }


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "FABLAB API"}


@api_router.get("/files/mock/{file_path:path}")
async def serve_mock_file(file_path: str):
    """Serve mock S3 files for testing"""
    from fastapi.responses import Response, RedirectResponse
    
    if hasattr(s3_service, 'use_mock') and s3_service.use_mock:
        file_content = s3_service.mock_service.get_file(file_path)
        if file_content:
            # Determine content type based on file extension
            content_type = 'application/octet-stream'
            if file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
                content_type = 'image/jpeg'
            elif file_path.endswith('.png'):
                content_type = 'image/png'
            elif file_path.endswith('.gif'):
                content_type = 'image/gif'
            elif file_path.endswith('.stl'):
                content_type = 'application/vnd.ms-pki.stl'
            
            return Response(content=file_content, media_type=content_type)
    
    # For missing image files, redirect to a placeholder
    if file_path.startswith('images/'):
        return RedirectResponse(url="https://placehold.co/400x400/f5f5f5/666666?text=Image+Not+Available", status_code=302)
    
    raise HTTPException(status_code=404, detail="File not found")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
