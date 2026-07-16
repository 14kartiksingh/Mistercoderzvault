import React, { useState, useEffect } from 'react';

const SearchBar = () => {
  const [placeholder, setPlaceholder] = useState("Search your vault (e.g., 'Ubuntu ISO', 'Cyberpunk')...");
  
  useEffect(() => {
    const placeholders = [
      "Search your vault...",
      "Looking for 'Ubuntu ISO'?",
      "Query: 'Cyberpunk 2077'",
      "Searching directories...",
      "Type 'help' for command list"
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % placeholders.length;
      setPlaceholder(placeholders[index]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <span className="material-symbols-outlined text-text-muted group-focus-within:text-primary" data-icon="search">search</span>
      </div>
      <input 
        className="w-full bg-surface-elevated border border-border-subtle pl-12 pr-4 py-4 rounded-sm text-body-md font-body-md placeholder:text-text-muted focus:border-primary transition-all duration-200" 
        placeholder={placeholder} 
        type="text"
      />
    </div>
  );
};

export default SearchBar;
