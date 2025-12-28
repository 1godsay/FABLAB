import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Trash2, ShoppingCart } from 'lucide-react';
import api from '../utils/api';

const CartPage = () => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    const savedCart = localStorage.getItem('fablab_cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const updateQuantity = (productId, delta) => {
    const newCart = cart.map(item =>
      item.product_id === productId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    );
    setCart(newCart);
    localStorage.setItem('fablab_cart', JSON.stringify(newCart));
  };

  const removeItem = (productId) => {
    const newCart = cart.filter(item => item.product_id !== productId);
    setCart(newCart);
    localStorage.setItem('fablab_cart', JSON.stringify(newCart));
    toast.success('Item removed from cart');
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.product.final_price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setLoading(true);
    try {
      const items = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));

      const response = await api.post('/orders/create', { items });
      
      const options = {
        key: response.data.razorpay_key,
        amount: response.data.amount * 100,
        currency: response.data.currency,
        name: 'FABLAB',
        description: '3D Printing Order',
        order_id: response.data.razorpay_order_id,
        handler: async function (razorpayResponse) {
          try {
            const formData = new FormData();
            formData.append('razorpay_order_id', razorpayResponse.razorpay_order_id);
            formData.append('razorpay_payment_id', razorpayResponse.razorpay_payment_id);
            formData.append('razorpay_signature', razorpayResponse.razorpay_signature);

            await api.post('/orders/verify-payment', formData);
            
            localStorage.removeItem('fablab_cart');
            toast.success('Order placed successfully!');
            navigate('/orders');
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        theme: {
          color: '#FF4D00'
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold tracking-tight" data-testid="logo-link">FABLAB</Link>
          <Link to="/marketplace" data-testid="continue-shopping-link">
            <Button variant="ghost" data-testid="continue-shopping-btn">Continue Shopping</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <h1 className="text-4xl font-bold tracking-tight mb-8" data-testid="cart-title">Shopping Cart</h1>

        {cart.length === 0 ? (
          <Card className="border-neutral-200" data-testid="empty-cart-message">
            <CardContent className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p className="text-neutral-600 mb-4">Your cart is empty</p>
              <Link to="/marketplace" data-testid="shop-now-link">
                <Button className="btn-primary" data-testid="shop-now-btn">Shop Now</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {cart.map((item) => (
              <Card key={item.product_id} className="border-neutral-200" data-testid={`cart-item-${item.product_id}`}>
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    <div className="w-24 h-24 bg-neutral-100 rounded-md overflow-hidden flex-shrink-0">
                      {item.product.images && item.product.images.length > 0 ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          data-testid="cart-item-image"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg" data-testid="cart-item-name">{item.product.name}</h3>
                      <p className="text-sm text-neutral-600 mb-2" data-testid="cart-item-material">{item.product.material} - {item.product.volume_cm3} cm³</p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 border border-neutral-200 rounded-md">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.product_id, -1)}
                            disabled={item.quantity === 1}
                            data-testid={`decrease-quantity-${item.product_id}`}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center" data-testid={`quantity-${item.product_id}`}>{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.product_id, 1)}
                            data-testid={`increase-quantity-${item.product_id}`}
                          >
                            +
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.product_id)}
                          data-testid={`remove-item-${item.product_id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono font-bold text-[#FF4D00]" data-testid={`item-total-${item.product_id}`}>
                        ₹{(item.product.final_price * item.quantity).toFixed(2)}
                      </div>
                      <div className="text-xs text-neutral-500" data-testid={`unit-price-${item.product_id}`}>
                        ₹{item.product.final_price} each
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="border-neutral-200 bg-neutral-50" data-testid="cart-summary">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-3xl font-mono font-bold text-[#FF4D00]" data-testid="cart-total">
                    ₹{calculateTotal().toFixed(2)}
                  </span>
                </div>
                <Button
                  className="btn-primary w-full"
                  onClick={handleCheckout}
                  disabled={loading}
                  data-testid="checkout-btn"
                >
                  {loading ? 'Processing...' : 'Proceed to Checkout'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;