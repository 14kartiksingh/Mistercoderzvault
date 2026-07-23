import React, { useState } from 'react';

function VaultLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/vault/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        onLoginSuccess();
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-high-contrast flex items-center justify-center gap-2">
            <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            VAULT ACCESS
          </h1>
          <p className="text-xs font-label-mono text-text-muted mt-2 uppercase tracking-widest">
            Secure Entry Required
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-base border border-border-subtle p-6 rounded-sm shadow-2xl relative overflow-hidden group">
          {/* Subtle gradient effect on form hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col gap-5">
            {error && (
              <div className="bg-error/10 border border-error/20 p-3 rounded-sm text-xs font-label-mono text-error uppercase text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-label-mono text-text-muted uppercase tracking-wider mb-1.5">Username</label>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface-elevated border border-border-subtle rounded-sm px-3 py-2.5 text-sm font-body text-text-high-contrast focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all"
                placeholder="vault"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-label-mono text-text-muted uppercase tracking-wider mb-1.5">Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-elevated border border-border-subtle rounded-sm px-3 py-2.5 text-sm font-body text-text-high-contrast focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className={`mt-2 w-full py-3 rounded-sm font-label-mono text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                loading 
                  ? 'bg-surface-elevated text-text-muted cursor-not-allowed border border-border-subtle' 
                  : 'bg-brand-primary text-black hover:bg-brand-light hover:-translate-y-0.5'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  VERIFYING...
                </>
              ) : 'ENTER VAULT'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] font-label-mono text-text-muted/50 uppercase tracking-widest">
            MISTER CODERZ VAULT © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default VaultLogin;
