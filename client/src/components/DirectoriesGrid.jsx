import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const getIconForCategory = (categoryName) => {
  const name = categoryName.toUpperCase();
  if (name.includes('GAME')) return 'sports_esports';
  if (name.includes('MOVIE')) return 'movie';
  if (name.includes('APP')) return 'developer_mode_tv';
  if (name.includes('SOFT')) return 'terminal';
  if (name.includes('BOOK')) return 'book';
  if (name.includes('MUSIC')) return 'album';
  return 'draft';
};

const DirectoriesGrid = ({ isAdmin }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.status === 'success') {
          setCategories(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch categories', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <section className="px-margin-mobile mb-section-gap select-none">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-surface-container animate-pulse rounded-sm"></div>
          <div className="h-4 w-24 bg-surface-container animate-pulse rounded-sm"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface-elevated border border-border-subtle p-4 flex flex-col gap-3 rounded-sm">
              <div className="flex justify-between items-start">
                <div className="w-5 h-5 bg-surface-container animate-pulse rounded-sm"></div>
                <div className="w-8 h-3.5 bg-surface-container animate-pulse rounded-sm"></div>
              </div>
              <div className="mt-1">
                <div className="h-4 bg-surface-container animate-pulse rounded-sm w-3/4"></div>
                <div className="h-3 bg-surface-container animate-pulse rounded-sm w-1/2 mt-1"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="px-margin-mobile mb-section-gap">
      <div className="flex items-center justify-between mb-4 select-none">
        <h2 className="font-headline-sm text-headline-sm text-text-high-contrast uppercase tracking-tighter">Directories</h2>
        <span className="font-label-mono text-label-mono text-text-muted">ROOT/VOL_01</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {categories.map((category) => {
          const icon = getIconForCategory(category.name);
          const count = category._count?.assets || 0;
          return (
            <div 
              key={category.id} 
              onClick={() => navigate(isAdmin ? `/admin/category/${category.slug}` : `/category/${category.slug}`)}
              className="bg-surface-elevated border border-border-subtle p-4 flex flex-col gap-3 hover:border-primary/50 transition-all duration-200 cursor-pointer group hover:scale-[1.02] rounded-sm active:scale-95"
            >
              <div className="flex justify-between items-start select-none">
                <span className="material-symbols-outlined text-primary text-xl select-none" data-icon={icon}>{icon}</span>
                <span className="font-label-mono text-[9px] text-text-muted bg-surface-container px-1.5 py-0.5 rounded-sm">
                  DIR
                </span>
              </div>
              <div className="mt-1">
                <div className="font-body-md font-bold text-text-high-contrast truncate text-sm">{category.name}</div>
                <div className="font-label-mono text-[10px] text-text-muted group-hover:text-primary transition-colors uppercase mt-0.5 select-none">
                  {count} FILE{count !== 1 ? 'S' : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default DirectoriesGrid;
