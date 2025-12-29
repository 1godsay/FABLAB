import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Users, Package, ShoppingBag, CheckCircle, XCircle, TrendingUp, IndianRupee, Star, BarChart3 } from 'lucide-react';

const AdminDashboardPage = () => {
  const [users, setUsers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, sellersRes, ordersRes, productsRes, allProductsRes, analyticsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/sellers'),
        api.get('/admin/orders'),
        api.get('/admin/products/pending'),
        api.get('/admin/products/all'),
        api.get('/admin/analytics')
      ]);
      
      setUsers(usersRes.data.users);
      setSellers(sellersRes.data.sellers);
      setOrders(ordersRes.data.orders);
      setPendingProducts(productsRes.data.products);
      setAllProducts(allProductsRes.data.products);
      setAnalytics(analyticsRes.data);
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

  const openDeleteDialog = (product) => {
    setProductToDelete(product);
    setShowDeleteDialog(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setDeleting(true);
    try {
      await api.delete(`/admin/products/${productToDelete.id}`);
      toast.success('Product deleted successfully!');
      setShowDeleteDialog(false);
      setProductToDelete(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete product');
    } finally {
      setDeleting(false);
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

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-neutral-200 bg-gradient-to-br from-green-50 to-white" data-testid="revenue-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl md:text-3xl font-bold text-green-600" data-testid="total-revenue">
                  ₹{analytics?.revenue?.total?.toLocaleString() || 0}
                </div>
                <IndianRupee className="w-8 h-8 text-green-300" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-neutral-200" data-testid="total-orders-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl md:text-3xl font-bold" data-testid="total-orders-count">
                  {analytics?.orders?.total || orders.length}
                </div>
                <ShoppingBag className="w-8 h-8 text-neutral-300" />
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {analytics?.orders?.pending || 0} pending
              </p>
            </CardContent>
          </Card>

          <Card className="border-neutral-200" data-testid="total-users-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl md:text-3xl font-bold" data-testid="total-users-count">
                  {analytics?.users?.total || users.length}
                </div>
                <Users className="w-8 h-8 text-neutral-300" />
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {analytics?.users?.sellers || sellers.length} sellers
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-neutral-200 bg-gradient-to-br from-orange-50 to-white" data-testid="pending-approvals-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-600">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl md:text-3xl font-bold text-orange-600" data-testid="pending-count">
                  {analytics?.products?.pending_approval || pendingProducts.length}
                </div>
                <CheckCircle className="w-8 h-8 text-orange-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="analytics" data-testid="analytics-tab">
              <BarChart3 className="w-4 h-4 mr-2" />Analytics
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab">Orders</TabsTrigger>
            <TabsTrigger value="products" data-testid="products-tab">Approvals</TabsTrigger>
            <TabsTrigger value="all-products" data-testid="all-products-tab">All Products</TabsTrigger>
            <TabsTrigger value="users" data-testid="users-tab">Users</TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" data-testid="analytics-section">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Selling Products */}
              <Card className="border-neutral-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Top Selling Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.products?.top_selling?.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.products.top_selling.map((product, idx) => (
                        <div key={product.product_id || idx} className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-[#FF4D00] text-white text-sm rounded-full flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-medium text-sm">{product.name || 'Unknown Product'}</p>
                              <p className="text-xs text-neutral-500">{product.orders} orders</p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-green-600">₹{product.revenue?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-neutral-500">No sales data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Top Rated Products */}
              <Card className="border-neutral-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Top Rated Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.products?.top_rated?.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.products.top_rated.map((product, idx) => (
                        <div key={product.id || idx} className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-neutral-500">{product.review_count} reviews</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-bold">{product.avg_rating}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-neutral-500">No reviews yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Revenue by Material */}
              <Card className="border-neutral-200">
                <CardHeader>
                  <CardTitle>Revenue by Material</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.revenue?.by_material?.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.revenue.by_material.map((item, idx) => (
                        <div key={item.material || idx} className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full ${
                              item.material === 'PLA' ? 'bg-blue-500' : 
                              item.material === 'ABS' ? 'bg-purple-500' : 'bg-amber-500'
                            }`}></span>
                            <span className="font-medium">{item.material || 'Unknown'}</span>
                            <span className="text-xs text-neutral-500">({item.orders} orders)</span>
                          </div>
                          <span className="font-mono font-bold">₹{item.revenue?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-neutral-500">No data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Order Status Breakdown */}
              <Card className="border-neutral-200">
                <CardHeader>
                  <CardTitle>Order Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.orders?.status_breakdown?.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.orders.status_breakdown.map((item, idx) => (
                        <div key={item.status || idx} className="flex justify-between items-center">
                          <span className={`px-2 py-1 text-xs rounded ${
                            item.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                            item.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                            item.status === 'Printing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-neutral-100 text-neutral-800'
                          }`}>
                            {item.status}
                          </span>
                          <span className="font-bold">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-neutral-500">No orders yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover rounded-md" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">No Image</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold" data-testid="product-name">{product.name}</h4>
                            <p className="text-sm text-neutral-600" data-testid="product-details">
                              {product.category} • {product.material} • {product.volume_cm3} cm³
                            </p>
                            <p className="text-sm text-neutral-600 mt-2 line-clamp-2" data-testid="product-description">{product.description}</p>
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => openDeleteDialog(product)}
                              data-testid={`delete-btn-${product.id}`}
                            >
                              Delete
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

          <TabsContent value="all-products" data-testid="all-products-section">
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle>All Products ({allProducts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {allProducts.length === 0 ? (
                  <p className="text-center py-8 text-neutral-500" data-testid="no-products">No products yet</p>
                ) : (
                  <div className="space-y-4">
                    {allProducts.map((product) => (
                      <div key={product.id} className="border border-neutral-200 rounded-md p-4" data-testid={`all-product-${product.id}`}>
                        <div className="flex gap-4">
                          <div className="w-20 h-20 bg-neutral-100 rounded-md flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover rounded-md" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">No Image</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold" data-testid="product-name">{product.name}</h4>
                            <p className="text-sm text-neutral-600" data-testid="product-details">
                              {product.category} • {product.material} • {product.volume_cm3} cm³
                            </p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <span className={`px-2 py-1 text-xs rounded ${product.is_published ? 'bg-green-100 text-green-800' : 'bg-neutral-100'}`}>
                                {product.is_published ? 'Published' : 'Draft'}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded ${product.is_approved ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {product.is_approved ? 'Approved' : 'Pending'}
                              </span>
                              {product.avg_rating > 0 && (
                                <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-current" /> {product.avg_rating}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <div className="font-mono font-bold text-[#FF4D00]" data-testid="product-price">₹{product.final_price}</div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => openDeleteDialog(product)}
                              data-testid={`delete-all-product-${product.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Delete
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
                <CardTitle>All Users ({users.length})</CardTitle>
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
                        <span className={`px-3 py-1 text-sm rounded ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'seller' ? 'bg-blue-100 text-blue-800' :
                          'bg-neutral-100'
                        }`} data-testid="user-role">
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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md" data-testid="admin-delete-dialog">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          {productToDelete && (
            <div className="space-y-4">
              <p className="text-neutral-600">
                Are you sure you want to delete <span className="font-bold">{productToDelete.name}</span>?
              </p>
              <p className="text-sm text-red-600">
                This action cannot be undone. All product data, images, and STL files will be permanently deleted.
              </p>
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1"
                  data-testid="cancel-admin-delete-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  onClick={handleDeleteProduct}
                  disabled={deleting}
                  data-testid="confirm-admin-delete-btn"
                >
                  {deleting ? 'Deleting...' : 'Delete Product'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboardPage;
