import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-gutter h-16 bg-surface-base border-b border-border-subtle glass-nav">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary" data-icon="lock">lock</span>
        <h1 className="font-headline-sm text-headline-sm font-bold text-text-high-contrast tracking-tight">MISTER CODERZ Vault</h1>
      </div>
      <div className="flex items-center gap-4">
        <Link to="/admin/login" className="font-label-mono text-label-mono text-primary font-bold border border-primary px-3 py-1 rounded-sm uppercase tracking-wider hover:bg-primary/10 transition-colors">
          Admin
        </Link>
      </div>
    </header>
  );
};

export default Header;
