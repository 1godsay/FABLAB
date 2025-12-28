import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Upload, Package, Eye, EyeOff, Image as ImageIcon, Trash2 } from 'lucide-react';

const SellerDashboardPage = () => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showVolumeDialog, setShowVolumeDialog] = useState(false);
  const [updatingVolume, setUpdatingVolume] = useState(false);
  const [manualVolume, setManualVolume] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Mechanical',
    material: 'PLA',
    creator_royalty_percent: 10,
  });
  const [stlFile, setStlFile] = useState(null);
  const [images, setImages] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/seller/products');
      setProducts(response.data.products);
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/seller/orders');
      setOrders(response.data.orders);
    } catch (error) {
      toast.error('Failed to load orders');
    }
  };

  const handleUploadProduct = async (e) => {
    e.preventDefault();
    if (!stlFile) {
      toast.error('Please select an STL file');
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('name', formData.name);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('category', formData.category);
      uploadFormData.append('material', formData.material);
      uploadFormData.append('creator_royalty_percent', formData.creator_royalty_percent);
      uploadFormData.append('stl_file', stlFile);

      const response = await api.post('/products/upload-stl', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(`Product created! Price: ₹${response.data.pricing.final_price}`);
      
      setShowUploadDialog(false);
      setFormData({ name: '', description: '', category: 'Mechanical', material: 'PLA', creator_royalty_percent: 10 });
      setStlFile(null);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload product');
    } finally {
      setUploading(false);
    }
  };

  const togglePublish = async (productId) => {
    try {
      const response = await api.put(`/products/${productId}/publish`);
      toast.success(response.data.message);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update product');
    }
  };

  const openImageUpload = (product) => {
    setSelectedProduct(product);
    setShowImageDialog(true);
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    const fileInput = e.target.querySelector('input[type="file"]');
    const file = fileInput?.files[0];

    if (!file) {
      toast.error('Please select an image');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      await api.post(`/products/${selectedProduct.id}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Image uploaded successfully!');
      setShowImageDialog(false);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
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
      await api.delete(`/products/${productToDelete.id}`);
      toast.success('Product deleted successfully!');
      setShowDeleteDialog(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const openVolumeDialog = (product) => {
    setSelectedProduct(product);
    setManualVolume(product.volume_cm3 || '');
    setShowVolumeDialog(true);
  };

  const handleUpdateVolume = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const volume = parseFloat(manualVolume);
    if (isNaN(volume) || volume <= 0) {
      toast.error('Please enter a valid volume greater than 0');
      return;
    }

    setUpdatingVolume(true);
    try {
      const formData = new FormData();
      formData.append('volume_cm3', volume);

      const response = await api.put(`/products/${selectedProduct.id}/update-volume`, formData);
      
      toast.success(`Volume updated! New price: ₹${response.data.pricing.final_price}`);
      setShowVolumeDialog(false);
      setManualVolume('');
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update volume');
    } finally {
      setUpdatingVolume(false);
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Seller Dashboard</h1>
            <p className="text-neutral-600 mt-1">Manage your products and orders</p>
          </div>
          <Button className="btn-primary" onClick={() => setShowUploadDialog(true)} data-testid="upload-product-btn">
            <Upload className="w-4 h-4 mr-2" /> Upload Product
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-neutral-200" data-testid="total-products-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-600">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="total-products-count">{products.length}</div>
            </CardContent>
          </Card>
          <Card className="border-neutral-200" data-testid="published-products-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-600">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="published-count">
                {products.filter(p => p.is_published).length}
              </div>
            </CardContent>
          </Card>
          <Card className="border-neutral-200" data-testid="total-orders-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="total-orders-count">{orders.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-neutral-200 mb-8" data-testid="products-section">
          <CardHeader>
            <CardTitle>Your Products</CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-8 text-neutral-500" data-testid="no-products-message">No products yet. Upload your first product!</div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="border border-neutral-200 rounded-md p-4 flex gap-4" data-testid={`product-${product.id}`}>
                    <div className="w-20 h-20 bg-neutral-100 rounded-md flex-shrink-0">
                      {product.images && product.images.length > 0 ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">No Image</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold" data-testid="product-name">{product.name}</h3>
                      <p className="text-sm text-neutral-600" data-testid="product-details">
                        {product.category} • {product.material} • {product.volume_cm3} cm³
                      </p>
                      {product.volume_cm3 === 0 && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          ⚠️ Volume is 0 - Click "Update Volume" to set manually
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-1 text-xs rounded ${product.is_published ? 'bg-green-100 text-green-800' : 'bg-neutral-100'}`} data-testid="publish-status">
                          {product.is_published ? 'Published' : 'Draft'}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${product.is_approved ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`} data-testid="approval-status">
                          {product.is_approved ? 'Approved' : 'Pending Approval'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-between gap-2">
                      <div className="text-xl font-mono font-bold text-[#FF4D00]" data-testid="product-price">
                        ₹{product.final_price}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openVolumeDialog(product)}
                        className={product.volume_cm3 === 0 ? 'border-amber-500 text-amber-700' : ''}
                        data-testid={`update-volume-${product.id}`}
                      >
                        Update Volume
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openImageUpload(product)}
                        data-testid={`add-image-${product.id}`}
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Add Images ({product.images?.length || 0})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePublish(product.id)}
                        data-testid={`toggle-publish-${product.id}`}
                      >
                        {product.is_published ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                        {product.is_published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => openDeleteDialog(product)}
                        data-testid={`delete-product-${product.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-neutral-200" data-testid="orders-section">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-neutral-500" data-testid="no-orders-message">No orders yet</div>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="border border-neutral-200 rounded-md p-4" data-testid={`order-${order.id}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold" data-testid="order-product-name">{order.product_name}</h4>
                        <p className="text-sm text-neutral-600" data-testid="order-quantity">Quantity: {order.quantity}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold" data-testid="order-amount">₹{order.total_amount}</div>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded" data-testid="order-status">
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showVolumeDialog} onOpenChange={setShowVolumeDialog}>
        <DialogContent className="max-w-md" data-testid="volume-update-dialog">
          <DialogHeader>
            <DialogTitle>Update Product Volume</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-600 mb-2">
                  Product: <span className="font-medium">{selectedProduct.name}</span>
                </p>
                <p className="text-sm text-neutral-600">
                  Current Volume: <span className="font-medium">{selectedProduct.volume_cm3} cm³</span>
                </p>
                <p className="text-sm text-neutral-600">
                  Material: <span className="font-medium">{selectedProduct.material}</span>
                </p>
              </div>
              <form onSubmit={handleUpdateVolume} className="space-y-4">
                <div>
                  <Label htmlFor="manual-volume">New Volume (cm³)</Label>
                  <Input
                    id="manual-volume"
                    data-testid="manual-volume-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={manualVolume}
                    onChange={(e) => setManualVolume(e.target.value)}
                    required
                    className="mt-1"
                    placeholder="Enter volume in cm³"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Price will be automatically calculated based on volume and material
                  </p>
                </div>
                <div className="bg-neutral-50 p-3 rounded-md">
                  <p className="text-xs font-medium text-neutral-700 mb-1">Pricing Formula:</p>
                  <p className="text-xs text-neutral-600">
                    {selectedProduct.material} rate: ₹
                    {selectedProduct.material === 'PLA' ? '5' : selectedProduct.material === 'ABS' ? '6' : '8'}/cm³
                  </p>
                  <p className="text-xs text-neutral-600">Platform margin: 20%</p>
                </div>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowVolumeDialog(false)}
                    className="flex-1"
                    data-testid="cancel-volume-btn"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={updatingVolume}
                    data-testid="update-volume-btn"
                  >
                    {updatingVolume ? 'Updating...' : 'Update Volume'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showVolumeDialog} onOpenChange={setShowVolumeDialog}>
        <DialogContent className="max-w-md" data-testid="volume-update-dialog">
          <DialogHeader>
            <DialogTitle>Update Product Volume</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-600 mb-2">
                  Product: <span className="font-medium">{selectedProduct.name}</span>
                </p>
                <p className="text-sm text-neutral-600">
                  Current Volume: <span className="font-medium">{selectedProduct.volume_cm3} cm³</span>
                </p>
                <p className="text-sm text-neutral-600">
                  Material: <span className="font-medium">{selectedProduct.material}</span>
                </p>
              </div>
              <form onSubmit={handleUpdateVolume} className="space-y-4">
                <div>
                  <Label htmlFor="manual-volume">New Volume (cm³)</Label>
                  <Input
                    id="manual-volume"
                    data-testid="manual-volume-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={manualVolume}
                    onChange={(e) => setManualVolume(e.target.value)}
                    required
                    className="mt-1"
                    placeholder="Enter volume in cm³"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Price will be automatically calculated based on volume and material
                  </p>
                </div>
                <div className="bg-neutral-50 p-3 rounded-md">
                  <p className="text-xs font-medium text-neutral-700 mb-1">Pricing Formula:</p>
                  <p className="text-xs text-neutral-600">
                    {selectedProduct.material} rate: ₹
                    {selectedProduct.material === 'PLA' ? '5' : selectedProduct.material === 'ABS' ? '6' : '8'}/cm³
                  </p>
                  <p className="text-xs text-neutral-600">Platform margin: 20%</p>
                </div>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowVolumeDialog(false)}
                    className="flex-1"
                    data-testid="cancel-volume-btn"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={updatingVolume}
                    data-testid="update-volume-btn"
                  >
                    {updatingVolume ? 'Updating...' : 'Update Volume'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md" data-testid="delete-confirmation-dialog">
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
                  data-testid="cancel-delete-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  onClick={handleDeleteProduct}
                  disabled={deleting}
                  data-testid="confirm-delete-btn"
                >
                  {deleting ? 'Deleting...' : 'Delete Product'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-md" data-testid="image-upload-dialog">
          <DialogHeader>
            <DialogTitle>Add Product Images</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-600 mb-2">Product: <span className="font-medium">{selectedProduct.name}</span></p>
                {selectedProduct.images && selectedProduct.images.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Current Images ({selectedProduct.images.length}):</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedProduct.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Product ${idx + 1}`}
                          className="w-full h-24 object-cover rounded border border-neutral-200"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <form onSubmit={handleImageUpload} className="space-y-4">
                <div>
                  <Label htmlFor="product-image">Upload New Image</Label>
                  <Input
                    id="product-image"
                    data-testid="image-upload-input"
                    type="file"
                    accept="image/*"
                    required
                    className="mt-1"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Supported: JPG, PNG, GIF (Max 5MB)
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowImageDialog(false)}
                    className="flex-1"
                    data-testid="cancel-image-btn"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={uploadingImage}
                    data-testid="upload-image-btn"
                  >
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl" data-testid="upload-dialog">
          <DialogHeader>
            <DialogTitle>Upload New Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadProduct} className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                data-testid="product-name-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                data-testid="product-description-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger data-testid="category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mechanical">Mechanical</SelectItem>
                    <SelectItem value="Art">Art</SelectItem>
                    <SelectItem value="Prototype">Prototype</SelectItem>
                    <SelectItem value="Functional">Functional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="material">Material</Label>
                <Select value={formData.material} onValueChange={(value) => setFormData({ ...formData, material: value })}>
                  <SelectTrigger data-testid="material-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLA">PLA (₹5/cm³)</SelectItem>
                    <SelectItem value="ABS">ABS (₹6/cm³)</SelectItem>
                    <SelectItem value="Resin">Resin (₹8/cm³)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="stl-file">STL File</Label>
              <Input
                id="stl-file"
                data-testid="stl-file-input"
                type="file"
                accept=".stl"
                onChange={(e) => setStlFile(e.target.files[0])}
                required
              />
              <p className="text-xs text-neutral-500 mt-1">Upload your 3D model file for automatic volume calculation</p>
            </div>
            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)} className="flex-1" data-testid="cancel-btn">
                Cancel
              </Button>
              <Button type="submit" className="btn-primary flex-1" disabled={uploading} data-testid="upload-btn">
                {uploading ? 'Uploading...' : 'Upload Product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerDashboardPage;