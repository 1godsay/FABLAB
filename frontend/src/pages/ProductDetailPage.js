import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Box, Layers, ChevronLeft, ChevronRight } from 'lucide-react';

const ProductDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    // Check if user is logged in
    if (!user) {
      toast.error('Please login to add items to cart');
      navigate('/auth');
      return;
    }

    const cart = JSON.parse(localStorage.getItem('fablab_cart') || '[]');
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ product_id: product.id, quantity: 1, product });
    }
    
    localStorage.setItem('fablab_cart', JSON.stringify(cart));
    toast.success('Added to cart');
  };

  const nextImage = () => {
    if (product.images && product.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (product.images && product.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  const selectImage = (index) => {
    setCurrentImageIndex(index);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" data-testid="loading-indicator">
        Loading product...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" data-testid="error-message">
        Product not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center">
          <Link to="/marketplace" data-testid="back-to-marketplace">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Marketplace
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="aspect-square bg-neutral-100 rounded-md border border-neutral-200 overflow-hidden relative" data-testid="product-image-container">
              {product.images && product.images.length > 0 ? (
                <>
                  <img
                    src={product.images[currentImageIndex]}
                    alt={`${product.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                    data-testid="product-main-image"
                  />
                  {product.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all"
                        data-testid="prev-image-btn"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-6 h-6 text-neutral-800" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all"
                        data-testid="next-image-btn"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-6 h-6 text-neutral-800" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {product.images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => selectImage(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentImageIndex 
                                ? 'bg-[#FF4D00] w-6' 
                                : 'bg-white/70 hover:bg-white'
                            }`}
                            data-testid={`image-indicator-${index}`}
                            aria-label={`View image ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400" data-testid="no-image-placeholder">
                  <Box className="w-16 h-16" />
                </div>
              )}
            </div>
            
            {product.images && product.images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-2" data-testid="image-thumbnails">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => selectImage(index)}
                    className={`aspect-square rounded-md border-2 overflow-hidden transition-all ${
                      index === currentImageIndex 
                        ? 'border-[#FF4D00] ring-2 ring-[#FF4D00]/20' 
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                    data-testid={`thumbnail-${index}`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-neutral-500" data-testid="product-category">{product.category}</span>
              <h1 className="text-4xl font-bold tracking-tight mt-2" data-testid="product-name">{product.name}</h1>
              <p className="text-neutral-600 mt-4 leading-relaxed" data-testid="product-description">{product.description}</p>
            </div>

            <Card className="border-neutral-200" data-testid="pricing-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Material</span>
                    <span className="font-medium" data-testid="product-material">{product.material}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Volume</span>
                    <span className="font-mono" data-testid="product-volume">{product.volume_cm3} cm³</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Base Cost</span>
                    <span className="font-mono" data-testid="base-cost">₹{product.base_cost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Platform Fee (20%)</span>
                    <span className="font-mono" data-testid="platform-margin">₹{product.platform_margin}</span>
                  </div>
                  <div className="border-t border-neutral-200 pt-4 flex justify-between items-end">
                    <span className="text-lg font-semibold">Total Price</span>
                    <span className="text-3xl font-mono font-bold text-[#FF4D00]" data-testid="final-price">
                      ₹{product.final_price}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button className="btn-primary flex-1" onClick={addToCart} data-testid="add-to-cart-btn">
                Add to Cart
              </Button>
              <Link to="/cart" className="flex-1" data-testid="go-to-cart-link">
                <Button variant="outline" className="w-full" data-testid="go-to-cart-btn">
                  Go to Cart
                </Button>
              </Link>
            </div>

            {product.stl_download_url && (
              <a href={product.stl_download_url} target="_blank" rel="noopener noreferrer" data-testid="download-stl-link">
                <Button variant="outline" className="w-full" data-testid="download-stl-btn">
                  <Layers className="w-4 h-4 mr-2" /> Download STL Preview
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;