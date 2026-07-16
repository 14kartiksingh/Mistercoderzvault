import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full py-base px-margin-mobile md:px-gutter flex flex-wrap justify-between items-center gap-4 bg-surface-base border-t border-border-subtle fixed bottom-0 z-50">
      <div className="font-label-mono text-label-mono text-text-high-contrast">
        MCV_SYSTEM_ONLINE
      </div>
      <div className="flex gap-4">
        <a className="font-label-mono text-label-mono text-text-muted hover:text-primary transition-colors" href="#">GITHUB</a>
        <a className="font-label-mono text-label-mono text-text-muted hover:text-primary transition-colors" href="#">V1.0.0-PROD</a>
      </div>
      <div className="w-full text-center md:w-auto font-label-mono text-[10px] text-text-muted uppercase">
        © 2026 MISTER CODERZ
      </div>
    </footer>
  );
};

export default Footer;
