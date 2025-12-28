import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Package } from 'lucide-react';

const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/my-orders');
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Order placed': 'bg-blue-100 text-blue-800',
      'Printing': 'bg-purple-100 text-purple-800',
      'Post-processing': 'bg-yellow-100 text-yellow-800',
      'Shipped': 'bg-orange-100 text-orange-800',
      'Delivered': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-neutral-100 text-neutral-800';
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

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <h1 className="text-4xl font-bold tracking-tight mb-8" data-testid="page-title">My Orders</h1>

        {loading ? (
          <div className="text-center py-12" data-testid="loading-indicator">Loading orders...</div>
        ) : orders.length === 0 ? (
          <Card className="border-neutral-200" data-testid="no-orders-message">
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p className="text-neutral-600 mb-4">No orders yet</p>
              <Link to="/marketplace" data-testid="start-shopping-link">
                <Button className="btn-primary" data-testid="start-shopping-btn">Start Shopping</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="border-neutral-200" data-testid={`order-${order.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg" data-testid="order-product-name">{order.product_name}</CardTitle>
                      <p className="text-sm text-neutral-500 mt-1" data-testid="order-id">Order ID: {order.id}</p>
                    </div>
                    <span className={`order-status-badge ${getStatusColor(order.status)}`} data-testid="order-status">
                      {order.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-neutral-600">Quantity</p>
                      <p className="font-medium" data-testid="order-quantity">{order.quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">Total Amount</p>
                      <p className="font-mono font-bold text-[#FF4D00]" data-testid="order-amount">₹{order.total_amount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600">Order Date</p>
                      <p className="font-medium" data-testid="order-date">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Order Progress</span>
                    </div>
                    <div className="relative">
                      <div className="flex justify-between">
                        {['Order placed', 'Printing', 'Post-processing', 'Shipped', 'Delivered'].map((step, index) => {
                          const statuses = ['Order placed', 'Printing', 'Post-processing', 'Shipped', 'Delivered'];
                          const currentIndex = statuses.indexOf(order.status);
                          const isCompleted = index <= currentIndex;
                          
                          return (
                            <div key={step} className="flex-1 text-center" data-testid={`status-step-${index}`}>
                              <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${isCompleted ? 'bg-[#FF4D00] text-white' : 'bg-neutral-200 text-neutral-500'}`}>
                                {index + 1}
                              </div>
                              <p className="text-xs text-neutral-600">{step}</p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="absolute top-4 left-0 right-0 h-0.5 bg-neutral-200 -z-10" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;