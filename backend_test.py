import requests
import sys
import json
import os
from datetime import datetime

class FABLABAPITester:
    def __init__(self):
        # Get the backend URL from frontend .env
        self.base_url = "https://design3d-hub-4.preview.emergentagent.com/api"
        self.tokens = {}
        self.test_users = {}
        self.test_products = {}
        self.test_orders = {}
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_result(self, test_name, success, response_data=None, error_msg=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
        else:
            print(f"❌ {test_name} - FAILED")
            if error_msg:
                print(f"   Error: {error_msg}")
            self.failed_tests.append({"test": test_name, "error": error_msg})

    def make_request(self, method, endpoint, data=None, files=None, headers=None, token=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}"
        
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)
        if token:
            request_headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart/form-data
                    if 'Content-Type' in request_headers:
                        del request_headers['Content-Type']
                    response = requests.post(url, data=data, files=files, headers=request_headers)
                else:
                    response = requests.post(url, json=data, headers=request_headers)
            elif method == 'PUT':
                if files:
                    if 'Content-Type' in request_headers:
                        del request_headers['Content-Type']
                    response = requests.put(url, data=data, files=files, headers=request_headers)
                else:
                    response = requests.put(url, json=data, headers=request_headers)
            
            return response
        except Exception as e:
            return None, str(e)

    def test_health_check(self):
        """Test API health endpoint"""
        response = self.make_request('GET', 'health')
        if response and response.status_code == 200:
            self.log_result("Health Check", True, response.json())
            return True
        else:
            self.log_result("Health Check", False, error_msg=f"Status: {response.status_code if response else 'Connection failed'}")
            return False

    def test_user_registration(self):
        """Test user registration for different roles"""
        import time
        timestamp = int(time.time())
        
        test_users = [
            {"email": f"buyer{timestamp}@test.com", "password": "testpass123", "name": "Test Buyer", "role": "buyer"},
            {"email": f"seller{timestamp}@test.com", "password": "testpass123", "name": "Test Seller", "role": "seller"},
            {"email": f"admin{timestamp}@test.com", "password": "testpass123", "name": "Test Admin", "role": "admin"}
        ]
        
        for user_data in test_users:
            response = self.make_request('POST', 'auth/register', user_data)
            if response and response.status_code == 200:
                result = response.json()
                self.tokens[user_data['role']] = result.get('token')
                self.test_users[user_data['role']] = result.get('user')
                self.log_result(f"Register {user_data['role']}", True, result)
            else:
                error_msg = response.json().get('detail') if response else "Connection failed"
                self.log_result(f"Register {user_data['role']}", False, error_msg=error_msg)

    def test_user_login(self):
        """Test user login"""
        # Use the registered seller email from registration
        if 'seller' in self.test_users:
            login_email = self.test_users['seller']['email']
        else:
            login_email = "seller@test.com"  # fallback
            
        login_data = {"email": login_email, "password": "testpass123"}
        response = self.make_request('POST', 'auth/login', login_data)
        
        if response and response.status_code == 200:
            result = response.json()
            self.tokens['seller_login'] = result.get('token')
            self.log_result("User Login", True, result)
            return True
        else:
            error_msg = response.json().get('detail') if response else "Connection failed"
            self.log_result("User Login", False, error_msg=error_msg)
            return False

    def test_get_current_user(self):
        """Test get current user endpoint"""
        if 'seller' not in self.tokens:
            self.log_result("Get Current User", False, error_msg="No seller token available")
            return False
            
        response = self.make_request('GET', 'auth/me', token=self.tokens['seller'])
        
        if response and response.status_code == 200:
            self.log_result("Get Current User", True, response.json())
            return True
        else:
            error_msg = response.json().get('detail') if response else "Connection failed"
            self.log_result("Get Current User", False, error_msg=error_msg)
            return False

    def test_stl_upload(self):
        """Test STL file upload and product creation"""
        if 'seller' not in self.tokens:
            self.log_result("STL Upload", False, error_msg="No seller token available")
            return False

        # Create a simple STL file content (mock)
        stl_content = b"""solid test
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 1 0
    endloop
  endfacet
endsolid test"""

        form_data = {
            'name': 'Test Product',
            'description': 'A test 3D printed product',
            'category': 'Mechanical',
            'material': 'PLA'
        }
        
        files = {'stl_file': ('test.stl', stl_content, 'application/vnd.ms-pki.stl')}
        
        response = self.make_request('POST', 'products/upload-stl', 
                                   data=form_data, files=files, 
                                   token=self.tokens['seller'])
        
        if response and response.status_code == 200:
            result = response.json()
            self.test_products['test_product'] = result.get('product_id')
            self.log_result("STL Upload", True, result)
            return True
        else:
            error_msg = response.json().get('detail') if response else "Connection failed"
            self.log_result("STL Upload", False, error_msg=error_msg)
            return False

    def test_get_products(self):
        """Test getting marketplace products"""
        response = self.make_request('GET', 'products')
        
        if response and response.status_code == 200:
            result = response.json()
            self.log_result("Get Products", True, {"count": len(result.get('products', []))})
            return True
        else:
            error_msg = response.json().get('detail') if response else "Connection failed"
            self.log_result("Get Products", False, error_msg=error_msg)
            return False

    def test_get_seller_products(self):
        """Test getting seller's products"""
        if 'seller' not in self.tokens:
            self.log_result("Get Seller Products", False, error_msg="No seller token available")
            return False
            
        response = self.make_request('GET', 'seller/products', token=self.tokens['seller'])
        
        if response and response.status_code == 200:
            result = response.json()
            self.log_result("Get Seller Products", True, {"count": len(result.get('products', []))})
            return True
        else:
            error_msg = response.json().get('detail') if response else "Connection failed"
            self.log_result("Get Seller Products", False, error_msg=error_msg)
            return False

    def test_publish_product(self):
        """Test publishing a product"""
        if 'seller' not in self.tokens or 'test_product' not in self.test_products:
            self.log_result("Publish Product", False, error_msg="No seller token or product available")
            return False
            
        product_id = self.test_products['test_product']
        response = self.make_request('PUT', f'products/{product_id}/publish', 
                                   token=self.tokens['seller'])
        
        if response and response.status_code == 200:
            self.log_result("Publish Product", True, response.json())
            return True
        else:
            error_msg = response.json().get('detail') if response else "Connection failed"
            self.log_result("Publish Product", False, error_msg=error_msg)
            return False

    def test_admin_get_pending_products(self):
        """Test admin getting pending products"""
        if 'admin' not in self.tokens:
            self.log_result("Admin Get Pending Products", False, error_msg="No admin token available")
            return False
            
        response = self.make_request('GET', 'admin/products/pending', token=self.tokens['admin'])
        
        if response and response.status_code == 200:
            result = response.json()
            self.log_result("Admin Get Pending Products", True, {"count": len(result.get('products', []))})
            return True
        else:
            error_msg = response.json().get('detail') if response else "Connection failed"
            self.log_result("Admin Get Pending Products", False, error_msg=error_msg)
            return False

    def test_admin_approve_product(self):
        """Test admin approving a product"""
        if 'admin' not in self.tokens or 'test_product' not in self.test_products:
            self.log_result("Admin Approve Product", False, error_msg="No admin token or product available")
            return False
            
        product_id = self.test_products['test_product']
        form_data = {'approved': 'true'}
        
        response = self.make_request('PUT', f'admin/products/{product_id}/approve', 
                                   data=form_data, token=self.tokens['admin'])
        
        if response and response.status_code == 200:
            self.log_result("Admin Approve Product", True, response.json())
            return True
        else:
            error_msg = response.json().get('detail') if response else "Connection failed"
            self.log_result("Admin Approve Product", False, error_msg=error_msg)
            return False

    def test_create_order(self):
        """Test creating an order"""
        if 'buyer' not in self.tokens or 'test_product' not in self.test_products:
            self.log_result("Create Order", False, error_msg="No buyer token or product available")
            return False
            
        order_data = {
            "items": [
                {
                    "product_id": self.test_products['test_product'],
                    "quantity": 2
                }
            ]
        }
        
        response = self.make_request('POST', 'orders/create', order_data, token=self.tokens['buyer'])
        
        if response and response.status_code == 200:
            result = response.json()
            self.test_orders['test_order'] = result.get('razorpay_order_id')
            self.log_result("Create Order", True, result)
            return True
        else:
            error_msg = response.json().get('detail') if response else "Connection failed"
            self.log_result("Create Order", False, error_msg=error_msg)
            return False

    def test_get_my_orders(self):
        """Test getting buyer's orders"""
        if 'buyer' not in self.tokens:
            self.log_result("Get My Orders", False, error_msg="No buyer token available")
            return False
            
        response = self.make_request('GET', 'orders/my-orders', token=self.tokens['buyer'])
        
        if response and response.status_code == 200:
            result = response.json()
            self.log_result("Get My Orders", True, {"count": len(result.get('orders', []))})
            return True
        else:
            error_msg = response.json().get('detail') if response else "Connection failed"
            self.log_result("Get My Orders", False, error_msg=error_msg)
            return False

    def test_admin_get_all_orders(self):
        """Test admin getting all orders"""
        if 'admin' not in self.tokens:
            self.log_result("Admin Get All Orders", False, error_msg="No admin token available")
            return False
            
        response = self.make_request('GET', 'admin/orders', token=self.tokens['admin'])
        
        if response and response.status_code == 200:
            result = response.json()
            self.log_result("Admin Get All Orders", True, {"count": len(result.get('orders', []))})
            return True
        else:
            error_msg = response.json().get('detail') if response else "Connection failed"
            self.log_result("Admin Get All Orders", False, error_msg=error_msg)
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting FABLAB Backend API Tests")
        print(f"📍 Testing endpoint: {self.base_url}")
        print("=" * 60)
        
        # Basic connectivity
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False
            
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        self.test_get_current_user()
        
        # Product management tests
        self.test_stl_upload()
        self.test_get_products()
        self.test_get_seller_products()
        self.test_publish_product()
        
        # Admin tests
        self.test_admin_get_pending_products()
        self.test_admin_approve_product()
        
        # Order tests
        self.test_create_order()
        self.test_get_my_orders()
        self.test_admin_get_all_orders()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"   - {test['test']}: {test['error']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = FABLABAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())