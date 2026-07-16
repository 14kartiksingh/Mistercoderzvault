import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      return setError('New passwords do not match');
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/admin/login');
        }, 3000);
      } else {
        setError(result.message || 'Failed to change password');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-container border border-border-subtle rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-text-high-contrast tracking-tight">Change Password</h1>
          <p className="text-text-muted mt-2 text-sm">Update your vault admin password</p>
        </div>

        {success ? (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg text-center">
            <p className="font-medium">Password changed successfully.</p>
            <p className="text-sm mt-1 text-green-400/80">You have been logged out. Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5" htmlFor="currentPassword">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-container-high border border-border-subtle rounded-lg text-text-high-contrast placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5" htmlFor="newPassword">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-container-high border border-border-subtle rounded-lg text-text-high-contrast placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-container-high border border-border-subtle rounded-lg text-text-high-contrast placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-primary text-background font-semibold py-2.5 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Change Password'}
            </button>
            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => navigate('/admin')}
                className="text-sm text-text-muted hover:text-primary transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ChangePassword;
