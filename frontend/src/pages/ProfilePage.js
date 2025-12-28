import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import api from '../utils/api';
import { User, ShoppingBag, LogOut, ArrowRight } from 'lucide-react';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgradeToSeller = async () => {
    setUpgrading(true);
    try {
      const response = await api.post('/auth/upgrade-to-seller');
      
      // Update token in localStorage
      localStorage.setItem('fablab_token', response.data.token);
      
      toast.success('Successfully upgraded to seller account!');
      
      // Reload page to update user context
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upgrade account');
    } finally {
      setUpgrading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p>Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold tracking-tight" data-testid="logo-link">FABLAB</Link>
          <Link to="/" data-testid="home-link">
            <Button variant="ghost" data-testid="home-btn">Home</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <h1 className="text-4xl font-bold tracking-tight mb-8" data-testid="page-title">My Profile</h1>

        <div className="space-y-6">
          <Card className="border-neutral-200" data-testid="profile-info-card">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-neutral-500" />
                <div>
                  <p className="text-sm text-neutral-600">Name</p>
                  <p className="font-medium" data-testid="user-name">{user.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-neutral-500" />
                <div>
                  <p className="text-sm text-neutral-600">Email</p>
                  <p className="font-medium" data-testid="user-email">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-neutral-500" />
                <div>
                  <p className="text-sm text-neutral-600">Account Type</p>
                  <span 
                    className="inline-block px-3 py-1 bg-[#FF4D00] text-white text-sm rounded-md font-medium capitalize mt-1"
                    data-testid="user-role"
                  >
                    {user.role}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {user.role === 'buyer' && (
            <Card className="border-neutral-200 bg-gradient-to-br from-orange-50 to-white" data-testid="upgrade-card">
              <CardHeader>
                <CardTitle>Become a Seller</CardTitle>
                <CardDescription>
                  Start selling your 3D designs and reach customers worldwide
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Benefits of selling on FABLAB:</h4>
                    <ul className="space-y-2 text-sm text-neutral-600">
                      <li className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-[#FF4D00] mt-0.5 flex-shrink-0" />
                        <span>Upload unlimited 3D models (STL files)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-[#FF4D00] mt-0.5 flex-shrink-0" />
                        <span>Automatic volume-based pricing with our smart engine</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-[#FF4D00] mt-0.5 flex-shrink-0" />
                        <span>Access to seller dashboard with order management</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-[#FF4D00] mt-0.5 flex-shrink-0" />
                        <span>Reach buyers looking for custom 3D printed products</span>
                      </li>
                    </ul>
                  </div>
                  <Button 
                    className="btn-primary w-full sm:w-auto"
                    onClick={handleUpgradeToSeller}
                    disabled={upgrading}
                    data-testid="upgrade-to-seller-btn"
                  >
                    {upgrading ? 'Upgrading...' : 'Upgrade to Seller Account'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-neutral-200" data-testid="quick-links-card">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/marketplace" data-testid="marketplace-link">
                <Button variant="outline" className="w-full justify-start" data-testid="marketplace-btn">
                  Browse Marketplace
                </Button>
              </Link>
              <Link to="/orders" data-testid="orders-link">
                <Button variant="outline" className="w-full justify-start" data-testid="orders-btn">
                  My Orders
                </Button>
              </Link>
              {user.role === 'seller' && (
                <Link to="/seller/dashboard" data-testid="seller-dashboard-link">
                  <Button variant="outline" className="w-full justify-start" data-testid="seller-dashboard-btn">
                    Seller Dashboard
                  </Button>
                </Link>
              )}
              {user.role === 'admin' && (
                <Link to="/admin/dashboard" data-testid="admin-dashboard-link">
                  <Button variant="outline" className="w-full justify-start" data-testid="admin-dashboard-btn">
                    Admin Dashboard
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="border-neutral-200" data-testid="danger-zone-card">
            <CardHeader>
              <CardTitle className="text-red-600">Account Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50"
                onClick={handleLogout}
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
