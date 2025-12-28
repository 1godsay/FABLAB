import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import api from '../utils/api';
import { Upload, Printer, Calculator, ShoppingCart, Info } from 'lucide-react';

const CustomPrintPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stlFile, setStlFile] = useState(null);
  const [material, setMaterial] = useState('PLA');
  const [quantity, setQuantity] = useState(1);
  const [calculating, setCalculating] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [fileKey, setFileKey] = useState(null);
  const [filename, setFilename] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.stl')) {
        toast.error('Please select an STL file');
        return;
      }
      setStlFile(file);
      setFilename(file.name);
      setPricing(null);
      setFileKey(null);
    }
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please login to use custom print service');
      navigate('/auth');
      return;
    }

    if (!stlFile) {
      toast.error('Please select an STL file');
      return;
    }

    setCalculating(true);
    try {
      const formData = new FormData();
      formData.append('stl_file', stlFile);
      formData.append('material', material);

      const response = await api.post('/custom-print/calculate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setPricing(response.data.pricing);
      setFileKey(response.data.file_key);
      toast.success('Price calculated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to calculate price');
    } finally {
      setCalculating(false);
    }
  };

  const handleOrder = async () => {
    if (!pricing || !fileKey) {
      toast.error('Please calculate price first');
      return;
    }

    setOrdering(true);
    try {
      const formData = new FormData();
      formData.append('file_key', fileKey);
      formData.append('filename', filename);
      formData.append('material', material);
      formData.append('volume_cm3', pricing.volume_cm3);
      formData.append('quantity', quantity);

      const response = await api.post('/custom-print/order', formData);
      
      const options = {
        key: response.data.razorpay_key,
        amount: response.data.amount * 100,
        currency: response.data.currency,
        name: 'FABLAB',
        description: `Custom Print: ${filename}`,
        order_id: response.data.razorpay_order_id,
        handler: async function (razorpayResponse) {
          try {
            const paymentFormData = new FormData();
            paymentFormData.append('razorpay_order_id', razorpayResponse.razorpay_order_id);
            paymentFormData.append('razorpay_payment_id', razorpayResponse.razorpay_payment_id);
            paymentFormData.append('razorpay_signature', razorpayResponse.razorpay_signature);

            await api.post('/orders/verify-payment', paymentFormData);
            
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
      setOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold tracking-tight" data-testid="logo-link">FABLAB</Link>
          <div className="flex items-center gap-4">
            <Link to="/marketplace" data-testid="marketplace-link">
              <Button variant="ghost">Marketplace</Button>
            </Link>
            {user && (
              <Link to="/orders" data-testid="orders-link">
                <Button variant="ghost">My Orders</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2" data-testid="page-title">Custom Print Service</h1>
          <p className="text-neutral-600">Upload your STL file and get it printed without listing on marketplace</p>
        </div>

        <Card className="border-neutral-200 mb-6" data-testid="info-card">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-[#FF4D00] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-600">
                <p className="font-medium text-neutral-900 mb-1">Perfect for:</p>
                <ul className="space-y-1">
                  <li>• Testing prototypes before listing</li>
                  <li>• Personal prints (not for resale)</li>
                  <li>• One-time custom projects</li>
                  <li>• Private designs you don't want to share</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-neutral-200" data-testid="upload-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload & Calculate
              </CardTitle>
              <CardDescription>Upload your STL file and select material</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCalculate} className="space-y-4">
                <div>
                  <Label htmlFor="stl-file">STL File</Label>
                  <Input
                    id="stl-file"
                    data-testid="stl-file-input"
                    type="file"
                    accept=".stl"
                    onChange={handleFileChange}
                    required
                    className="mt-1"
                  />
                  {filename && (
                    <p className="text-xs text-neutral-500 mt-1">Selected: {filename}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="material">Material</Label>
                  <Select value={material} onValueChange={setMaterial}>
                    <SelectTrigger className="mt-1" data-testid="material-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLA">PLA (₹5/cm³)</SelectItem>
                      <SelectItem value="ABS">ABS (₹6/cm³)</SelectItem>
                      <SelectItem value="Resin">Resin (₹8/cm³)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    data-testid="quantity-input"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>

                <Button
                  type="submit"
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  disabled={calculating}
                  data-testid="calculate-btn"
                >
                  <Calculator className="w-4 h-4" />
                  {calculating ? 'Calculating...' : 'Calculate Price'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-neutral-200" data-testid="pricing-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                Pricing Details
              </CardTitle>
              <CardDescription>Your custom print cost breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {pricing ? (
                <div className="space-y-4">
                  <div className="bg-neutral-50 p-4 rounded-md space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Volume</span>
                      <span className="font-mono" data-testid="volume-display">{pricing.volume_cm3} cm³</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Material</span>
                      <span className="font-medium" data-testid="material-display">{pricing.material}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Rate</span>
                      <span className="font-mono" data-testid="rate-display">₹{pricing.rate_per_cm3}/cm³</span>
                    </div>
                    <div className="border-t border-neutral-200 pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Base Cost</span>
                        <span className="font-mono" data-testid="base-cost-display">₹{pricing.base_cost}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-neutral-600">Platform Fee (20%)</span>
                        <span className="font-mono" data-testid="margin-display">₹{pricing.platform_margin}</span>
                      </div>
                    </div>
                    <div className="border-t border-neutral-200 pt-3">
                      <div className="flex justify-between items-end">
                        <span className="font-semibold">Price per Unit</span>
                        <span className="text-2xl font-mono font-bold text-[#FF4D00]" data-testid="unit-price">
                          ₹{pricing.final_price}
                        </span>
                      </div>
                    </div>
                    {quantity > 1 && (
                      <div className="border-t border-neutral-200 pt-3">
                        <div className="flex justify-between items-end">
                          <span className="font-semibold">Total ({quantity} units)</span>
                          <span className="text-2xl font-mono font-bold text-[#FF4D00]" data-testid="total-price">
                            ₹{(pricing.final_price * quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    className="btn-primary w-full flex items-center justify-center gap-2"
                    onClick={handleOrder}
                    disabled={ordering}
                    data-testid="order-now-btn"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {ordering ? 'Processing...' : 'Order Now'}
                  </Button>

                  <p className="text-xs text-neutral-500 text-center">
                    Secure payment via Razorpay
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 text-neutral-500" data-testid="no-pricing-message">
                  <Calculator className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                  <p>Upload an STL file and calculate to see pricing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomPrintPage;
