import React from 'react';

const categories = [
  { icon: 'sports_esports', title: 'Games', count: '142 FILES' },
  { icon: 'movie', title: 'Movies', count: '856 FILES' },
  { icon: 'developer_mode_tv', title: 'Apps', count: '211 FILES' },
  { icon: 'terminal', title: 'Software', count: '64 FILES' },
  { icon: 'book', title: 'Books', count: '1,204 FILES' },
  { icon: 'album', title: 'Music', count: '4,310 FILES' }
];

const DirectoriesGrid = () => {
  return (
    <section className="px-margin-mobile mb-section-gap">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline-sm text-headline-sm text-text-high-contrast uppercase tracking-tighter">Directories</h2>
        <span className="font-label-mono text-label-mono text-text-muted">ROOT/VOL_01</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((category, idx) => (
          <div key={idx} className="bg-surface-elevated border border-border-subtle p-4 flex flex-col gap-2 hover:border-primary transition-colors cursor-pointer group">
            <span className="material-symbols-outlined text-primary" data-icon={category.icon}>{category.icon}</span>
            <div>
              <div className="font-body-md font-bold text-text-high-contrast">{category.title}</div>
              <div className="font-label-mono text-label-mono text-text-muted group-hover:text-primary transition-colors">{category.count}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DirectoriesGrid;
