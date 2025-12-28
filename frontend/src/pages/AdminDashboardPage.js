import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Users, Package, ShoppingBag, CheckCircle, XCircle } from 'lucide-react';

const AdminDashboardPage = () => {
  const [users, setUsers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, sellersRes, ordersRes, productsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/sellers'),
        api.get('/admin/orders'),
        api.get('/admin/products/pending')
      ]);
      
      setUsers(usersRes.data.users);
      setSellers(sellersRes.data.sellers);
      setOrders(ordersRes.data.orders);
      setPendingProducts(productsRes.data.products);
    } catch (error) {
      toast.error('Failed to load admin data');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const formData = new FormData();
      formData.append('status', status);
      await api.put(`/admin/orders/${orderId}/status`, formData);
      toast.success('Order status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const approveProduct = async (productId, approved) => {
    try {
      const formData = new FormData();
      formData.append('approved', approved);
      await api.put(`/admin/products/${productId}/approve`, formData);
      toast.success(approved ? 'Product approved' : 'Product rejected');
      fetchData();
    } catch (error) {
      toast.error('Failed to update product');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold tracking-tight" data-testid="logo-link">FABLAB</Link>
          <Link to="/marketplace" data-testid="marketplace-link">
            <Button variant="ghost" data-testid="marketplace-btn">Marketplace</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-4xl font-bold tracking-tight mb-8" data-testid="page-title">Admin Dashboard</h1>

        <div className="dashboard-grid mb-8">
          <Card className="border-neutral-200" data-testid="total-users-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold" data-testid="total-users-count">{users.length}</div>
                <Users className="w-8 h-8 text-neutral-300" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-neutral-200" data-testid="total-sellers-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-600">Sellers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold" data-testid="total-sellers-count">{sellers.length}</div>
                <Package className="w-8 h-8 text-neutral-300" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-neutral-200" data-testid="total-orders-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold" data-testid="total-orders-count">{orders.length}</div>
                <ShoppingBag className="w-8 h-8 text-neutral-300" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-neutral-200" data-testid="pending-approvals-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-600">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold" data-testid="pending-count">{pendingProducts.length}</div>
                <CheckCircle className="w-8 h-8 text-neutral-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders" data-testid="orders-tab">Orders</TabsTrigger>
            <TabsTrigger value="products" data-testid="products-tab">Product Approvals</TabsTrigger>
            <TabsTrigger value="users" data-testid="users-tab">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" data-testid="orders-section">
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle>Manage Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-center py-8 text-neutral-500" data-testid="no-orders-message">No orders yet</p>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border border-neutral-200 rounded-md p-4" data-testid={`order-${order.id}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold" data-testid="order-product-name">{order.product_name}</h4>
                            <p className="text-sm text-neutral-600" data-testid="order-id">Order ID: {order.id}</p>
                            <p className="text-sm text-neutral-600" data-testid="order-quantity">Quantity: {order.quantity}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold" data-testid="order-amount">₹{order.total_amount}</div>
                            <p className="text-xs text-neutral-500" data-testid="order-date">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Select
                            value={order.status}
                            onValueChange={(value) => updateOrderStatus(order.id, value)}
                          >
                            <SelectTrigger className="w-48" data-testid={`order-status-select-${order.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Order placed">Order placed</SelectItem>
                              <SelectItem value="Printing">Printing</SelectItem>
                              <SelectItem value="Post-processing">Post-processing</SelectItem>
                              <SelectItem value="Shipped">Shipped</SelectItem>
                              <SelectItem value="Delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-neutral-600" data-testid={`current-status-${order.id}`}>
                            Current: <span className="font-medium">{order.status}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" data-testid="products-section">
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle>Product Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingProducts.length === 0 ? (
                  <p className="text-center py-8 text-neutral-500" data-testid="no-pending-products">No pending products</p>
                ) : (
                  <div className="space-y-4">
                    {pendingProducts.map((product) => (
                      <div key={product.id} className="border border-neutral-200 rounded-md p-4" data-testid={`product-${product.id}`}>
                        <div className="flex gap-4">
                          <div className="w-20 h-20 bg-neutral-100 rounded-md flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400">No Image</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold" data-testid="product-name">{product.name}</h4>
                            <p className="text-sm text-neutral-600" data-testid="product-details">
                              {product.category} • {product.material} • {product.volume_cm3} cm³
                            </p>
                            <p className="text-sm text-neutral-600 mt-2" data-testid="product-description">{product.description}</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="font-mono font-bold text-[#FF4D00]" data-testid="product-price">₹{product.final_price}</div>
                            <Button
                              size="sm"
                              className="btn-primary"
                              onClick={() => approveProduct(product.id, true)}
                              data-testid={`approve-btn-${product.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveProduct(product.id, false)}
                              data-testid={`reject-btn-${product.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" data-testid="users-section">
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-center py-8 text-neutral-500" data-testid="no-users-message">No users yet</p>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="border border-neutral-200 rounded-md p-4 flex justify-between items-center" data-testid={`user-${user.id}`}>
                        <div>
                          <h4 className="font-bold" data-testid="user-name">{user.name}</h4>
                          <p className="text-sm text-neutral-600" data-testid="user-email">{user.email}</p>
                        </div>
                        <span className="px-3 py-1 bg-neutral-100 text-sm rounded" data-testid="user-role">
                          {user.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboardPage;