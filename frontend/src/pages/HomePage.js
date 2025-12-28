import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Box, ArrowRight, CheckCircle2, Users, Shield } from 'lucide-react';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold tracking-tight" data-testid="logo-link">FABLAB</Link>
          <div className="flex items-center gap-4">
            <Link to="/marketplace" data-testid="marketplace-link">
              <Button variant="ghost" data-testid="marketplace-nav-btn">Marketplace</Button>
            </Link>
            <Link to="/custom-print" data-testid="custom-print-link">
              <Button variant="ghost" data-testid="custom-print-nav-btn">Custom Print</Button>
            </Link>
            {user ? (
              <>
                {user.role === 'seller' && (
                  <Link to="/seller/dashboard" data-testid="seller-dashboard-link">
                    <Button variant="ghost" data-testid="seller-dashboard-nav-btn">Dashboard</Button>
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin/dashboard" data-testid="admin-dashboard-link">
                    <Button variant="ghost" data-testid="admin-dashboard-nav-btn">Admin</Button>
                  </Link>
                )}
                <Link to="/orders" data-testid="orders-link">
                  <Button variant="ghost" data-testid="orders-nav-btn">My Orders</Button>
                </Link>
                <Link to="/profile" data-testid="profile-link">
                  <Button className="btn-primary" data-testid="profile-nav-btn">Profile</Button>
                </Link>
              </>
            ) : (
              <Link to="/auth" data-testid="auth-link">
                <Button className="btn-primary" data-testid="get-started-btn">Login / Sign Up</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-block">
              <span className="text-xs uppercase tracking-widest text-neutral-500 font-medium">PRECISION ENGINEERING</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              Premium 3D Designs <br />
              <span className="text-[#FF4D00]">Marketplace</span>
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Browse and buy exclusive 3D printable designs from top creators worldwide. Every design ready for instant download or professional printing services.
            </p>
            <div className="flex gap-4 pt-4">
              {user ? (
                <Link to="/marketplace" data-testid="browse-products-link">
                  <Button className="btn-primary flex items-center gap-2" data-testid="browse-products-btn">
                    Browse Products <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth" data-testid="get-started-hero-link">
                  <Button className="btn-primary flex items-center gap-2" data-testid="get-started-hero-btn">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1707286972301-a0b06f3f4870?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHwzZCUyMHByaW50ZXIlMjBoaWdoJTIwdGVjaCUyMGNsb3NlJTIwdXB8ZW58MHx8fHwxNzY2ODk5ODQ5fDA&ixlib=rb-4.1.0&q=85"
              alt="3D Printer"
              className="rounded-md border border-neutral-200"
              data-testid="hero-image"
            />
          </div>
        </div>
      </section>

      <section className="bg-neutral-50 py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-widest text-neutral-500 font-medium">HOW IT WORKS</span>
            <h2 className="text-4xl font-bold tracking-tight mt-4">Shop & Get Printed</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-neutral-200 rounded-md p-8" data-testid="feature-upload">
              <div className="w-12 h-12 bg-[#FF4D00] rounded-md flex items-center justify-center mb-4">
                <Box className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Browse Designs</h3>
              <p className="text-neutral-600">Discover thousands of premium 3D designs from verified creators. Filter by category, material, and price.</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-md p-8" data-testid="feature-order">
              <div className="w-12 h-12 bg-[#FF4D00] rounded-md flex items-center justify-center mb-4">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Purchase & Download</h3>
              <p className="text-neutral-600">Buy designs instantly and download STL files, or order professional printing with automatic volume-based pricing.</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-md p-8" data-testid="feature-track">
              <div className="w-12 h-12 bg-[#FF4D00] rounded-md flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Get Delivered</h3>
              <p className="text-neutral-600">Track your print orders from manufacturing to delivery. Professional quality guaranteed with every print.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-neutral-900 rounded-md p-12 text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Join the Creator Economy</h2>
            <p className="text-neutral-300 mb-8 text-lg">Start selling your 3D designs or discover exclusive prints from top creators.</p>
            <Link to="/auth" data-testid="cta-link">
              <Button className="btn-primary" data-testid="cta-btn">Create Account</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center text-sm text-neutral-500">
          <p>© 2025 FABLAB. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;