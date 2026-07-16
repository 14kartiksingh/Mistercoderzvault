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
    <div className="min-h-screen bg-background text-text-high-contrast flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-surface-base border border-border-subtle rounded-2xl p-10 shadow-2xl flex flex-col gap-8 items-center backdrop-blur-md">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
            <span className="material-symbols-outlined text-3xl" data-icon="shield_person">shield_person</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Welcome, Admin</h1>
          <p className="text-text-muted text-sm font-medium">MISTER CODERZ Vault</p>
        </div>
        
        <div className="flex flex-col w-full gap-3 mt-2">
          <Link 
            to="/admin/upload"
            className="w-full py-3.5 rounded-xl font-bold transition-all bg-primary text-background hover:bg-primary/90 shadow-lg hover:shadow-primary/25 flex justify-center items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="cloud_upload">cloud_upload</span>
            Upload New File
          </Link>
          
          <button 
            disabled
            className="w-full py-3 rounded-xl font-medium transition-all bg-surface-container text-text-muted border border-border-subtle cursor-not-allowed flex justify-center items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="history">history</span>
            Recent Uploads (Coming Soon)
          </button>
          
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Link 
              to="/admin/change-password" 
              className="w-full py-2.5 rounded-xl font-medium transition-colors bg-surface-elevated text-text-base hover:text-primary border border-border-subtle flex justify-center items-center text-sm"
            >
              Change Password
            </Link>
            <button 
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl font-medium transition-colors bg-surface-elevated text-error hover:bg-error/10 border border-border-subtle flex justify-center items-center text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
