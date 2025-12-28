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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="FABLAB API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

razorpay_client = razorpay.Client(auth=(
    os.getenv('RAZORPAY_KEY_ID', 'rzp_test_dummy'),
    os.getenv('RAZORPAY_KEY_SECRET', 'dummy_secret')
))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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


@api_router.post("/products/upload-stl")
async def upload_stl(
    name: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    material: str = Form(...),
    stl_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload STL file and create product"""
    if current_user["role"] != "seller":
        raise HTTPException(status_code=403, detail="Only sellers can upload products")
    
    if material not in ["PLA", "ABS", "Resin"]:
        raise HTTPException(status_code=400, detail="Invalid material")
    
    stl_content = await stl_file.read()
    
    try:
        volume_cm3 = calculate_stl_volume(stl_content)
        pricing = calculate_price(volume_cm3, material)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    file_key = f"stl/{uuid.uuid4()}.stl"
    success = s3_service.upload_file(stl_content, file_key, 'application/vnd.ms-pki.stl')
    
    if not success:
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
    
    success = s3_service.upload_file(image_content, file_key, image.content_type)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to upload image")
    
    download_url = s3_service.generate_download_url(file_key)
    
    await db.products.update_one(
        {"id": product_id},
        {"$push": {"images": download_url}}
    )
    
    return {"message": "Image uploaded", "image_url": download_url}

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
    
    return {"products": products}

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    """Get product details"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    stl_url = s3_service.generate_download_url(product["stl_file_key"])
    product["stl_download_url"] = stl_url
    
    return product

@api_router.get("/seller/products")
async def get_seller_products(current_user: dict = Depends(get_current_user)):
    """Get seller's products"""
    if current_user["role"] != "seller":
        raise HTTPException(status_code=403, detail="Only sellers can access this")
    
    products = await db.products.find({"seller_id": current_user["id"]}, {"_id": 0}).to_list(100)
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
    \"\"\"Verify Razorpay payment\"\"\"
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
        
        await db.orders.update_many(
            {"razorpay_order_id": razorpay_order_id},
            {"$set": {"razorpay_payment_id": razorpay_payment_id, "status": "Printing"}}
        )
        
        await db.transactions.update_one(
            {"razorpay_order_id": razorpay_order_id},
            {"$set": {"razorpay_payment_id": razorpay_payment_id, "status": "completed"}}
        )
        
        return {"message": "Payment verified successfully"}
    except Exception as e:
        logger.error(f"Payment verification failed: {e}")
        raise HTTPException(status_code=400, detail="Payment verification failed")

@api_router.get("/orders/my-orders")
async def get_my_orders(current_user: dict = Depends(get_current_user)):
    \"\"\"Get buyer's orders\"\"\"
    orders = await db.orders.find({"buyer_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return {"orders": orders}

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    \"\"\"Get order details\"\"\"
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["buyer_id"] != current_user["id"] and order["seller_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order


@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    \"\"\"Get all users (admin only)\"\"\"
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return {"users": users}

@api_router.get("/admin/sellers")
async def get_all_sellers(current_user: dict = Depends(get_current_user)):
    \"\"\"Get all sellers (admin only)\"\"\"
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    sellers = await db.users.find({"role": "seller"}, {"_id": 0, "password": 0}).to_list(1000)
    return {"sellers": sellers}

@api_router.get("/admin/orders")
async def get_all_orders(current_user: dict = Depends(get_current_user)):
    \"\"\"Get all orders (admin only)\"\"\"
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
    \"\"\"Update order status (admin only)\"\"\"
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
    \"\"\"Get products pending approval (admin only)\"\"\"
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    products = await db.products.find({"is_approved": False}, {"_id": 0}).to_list(1000)
    return {"products": products}

@api_router.put("/admin/products/{product_id}/approve")
async def approve_product(
    product_id: str,
    approved: bool = Form(...),
    current_user: dict = Depends(get_current_user)
):
    \"\"\"Approve or reject product (admin only)\"\"\"
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": {"is_approved": approved}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": f"Product {'approved' if approved else 'rejected'}", "is_approved": approved}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "FABLAB API"}


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
