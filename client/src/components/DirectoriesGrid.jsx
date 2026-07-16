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
    return <div className="px-margin-mobile mb-section-gap text-text-muted">Loading categories...</div>;
  }

  if (categories.length === 0) {
    return null; // Don't show anything if no categories exist
  }

  return (
    <section className="px-margin-mobile mb-section-gap">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline-sm text-headline-sm text-text-high-contrast uppercase tracking-tighter">Directories</h2>
        <span className="font-label-mono text-label-mono text-text-muted">ROOT/VOL_01</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((category) => {
          const icon = getIconForCategory(category.name);
          const count = category._count?.assets || 0;
          return (
            <div 
              key={category.id} 
              onClick={() => navigate(isAdmin ? `/admin/category/${category.slug}` : `/category/${category.slug}`)}
              className="bg-surface-elevated border border-border-subtle p-4 flex flex-col gap-2 hover:border-primary transition-colors cursor-pointer group"
            >
              <span className="material-symbols-outlined text-primary" data-icon={icon}>{icon}</span>
              <div>
                <div className="font-body-md font-bold text-text-high-contrast truncate">{category.name}</div>
                <div className="font-label-mono text-[10px] text-text-muted group-hover:text-primary transition-colors uppercase">
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
