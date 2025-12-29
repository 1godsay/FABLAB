import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Filter, ShoppingCart, Star } from 'lucide-react';

const MarketplacePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [material, setMaterial] = useState('');
  const [cart, setCart] = useState([]);

  useEffect(() => {
    fetchProducts();
    loadCart();
  }, [category, material]);

  const loadCart = () => {
    const savedCart = localStorage.getItem('fablab_cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const fetchProducts = async () => {
    try {
      const params = {};
      if (category) params.category = category;
      if (material) params.material = material;
      
      const response = await api.get('/products', { params });
      setProducts(response.data.products);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    // Check if user is logged in
    if (!user) {
      toast.error('Please login to add items to cart');
      navigate('/auth');
      return;
    }

    const existingItem = cart.find(item => item.product_id === product.id);
    let newCart;
    
    if (existingItem) {
      newCart = cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newCart = [...cart, { product_id: product.id, quantity: 1, product }];
    }
    
    setCart(newCart);
    localStorage.setItem('fablab_cart', JSON.stringify(newCart));
    toast.success('Added to cart');
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold tracking-tight" data-testid="logo-link">FABLAB</Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/cart" data-testid="cart-link">
                <Button variant="ghost" className="relative" data-testid="cart-btn">
                  <ShoppingCart className="w-5 h-5" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#FF4D00] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" data-testid="cart-count">
                      {cart.length}
                    </span>
                  )}
                </Button>
              </Link>
            ) : (
              <Link to="/auth" data-testid="login-link">
                <Button className="btn-primary" data-testid="login-btn">Login / Sign Up</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Marketplace</h1>
          <p className="text-neutral-600">Browse 3D printable designs and models</p>
        </div>

        <div className="flex gap-4 mb-8" data-testid="filters-section">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48" data-testid="category-filter">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Mechanical">Mechanical</SelectItem>
              <SelectItem value="Art">Art</SelectItem>
              <SelectItem value="Prototype">Prototype</SelectItem>
              <SelectItem value="Functional">Functional</SelectItem>
            </SelectContent>
          </Select>

          <Select value={material} onValueChange={setMaterial}>
            <SelectTrigger className="w-48" data-testid="material-filter">
              <SelectValue placeholder="Material" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Materials</SelectItem>
              <SelectItem value="PLA">PLA</SelectItem>
              <SelectItem value="ABS">ABS</SelectItem>
              <SelectItem value="Resin">Resin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12" data-testid="loading-indicator">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-neutral-500" data-testid="no-products-message">No products found</div>
        ) : (
          <div className="marketplace-grid" data-testid="products-grid">
            {products.map((product) => (
              <div key={product.id} className="md:col-span-4 product-card overflow-hidden" data-testid={`product-${product.id}`}>
                <div className="aspect-square bg-neutral-100 relative">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      data-testid="product-image"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400" data-testid="product-placeholder">
                      No Image
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs uppercase tracking-widest text-neutral-500" data-testid="product-category">{product.category}</span>
                      <h3 className="text-lg font-bold mt-1" data-testid="product-name">{product.name}</h3>
                    </div>
                    <span className="px-2 py-1 text-xs bg-neutral-100 rounded" data-testid="product-material">{product.material}</span>
                  </div>
                  <p className="text-sm text-neutral-600 mb-4 line-clamp-2" data-testid="product-description">{product.description}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs text-neutral-500" data-testid="product-volume">{product.volume_cm3} cm³</div>
                      <div className="text-2xl font-mono font-bold text-[#FF4D00]" data-testid="product-price">
                        ₹{product.final_price}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/product/${product.id}`} data-testid={`view-product-${product.id}`}>
                        <Button variant="outline" size="sm" data-testid="view-details-btn">View</Button>
                      </Link>
                      <Button
                        size="sm"
                        className="btn-primary"
                        onClick={() => addToCart(product)}
                        data-testid={`add-to-cart-${product.id}`}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplacePage;