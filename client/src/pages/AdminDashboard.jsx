import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      navigate('/admin/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-high-contrast flex flex-col">
      <header className="border-b border-border-subtle bg-surface-base px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" data-icon="lock">lock</span>
          <h1 className="font-bold tracking-tight text-lg">Admin Dashboard</h1>
        </div>
        <nav className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-center sm:justify-end">
          <Link to="/admin/change-password" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            Change Password
          </Link>
          <button 
            onClick={handleLogout}
            className="text-sm text-text-muted hover:text-primary transition-colors"
          >
            Logout
          </button>
        </nav>
      </header>
      <main className="p-4 sm:p-8 flex-1 w-full max-w-7xl mx-auto">
        <div className="bg-surface-container border border-border-subtle rounded-xl p-6 sm:p-8 text-center">
          <h2 className="text-lg sm:text-xl font-bold mb-2">Welcome to the Vault Admin</h2>
          <p className="text-sm sm:text-base text-text-muted">More administrative features will be added here soon.</p>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
