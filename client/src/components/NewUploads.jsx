import React from 'react';

const uploads = [
  { title: 'Architectural_Brief_v3', category: 'DOCS', size: '14.2 MB', time: '2H_AGO', icon: 'description' },
  { title: 'Project_Nebula_Source', category: 'APPS', size: '450.8 MB', time: '5H_AGO', icon: 'inventory_2' },
  { title: 'Studio_Session_FLAC', category: 'MUSIC', size: '84.2 MB', time: '12H_AGO', icon: 'audio_file' }
];

const NewUploads = () => {
  return (
    <section className="px-margin-mobile">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline-sm text-headline-sm text-text-high-contrast uppercase tracking-tighter">New_Uploads</h2>
        <span className="font-label-mono text-label-mono text-text-muted">LAST_24H</span>
      </div>
      <div className="flex flex-col gap-px bg-border-subtle border border-border-subtle">
        {uploads.map((upload, idx) => (
          <div key={idx} className="bg-surface-elevated flex items-center justify-between p-4 hover:bg-surface transition-colors cursor-pointer">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 bg-surface flex items-center justify-center border border-border-subtle shrink-0">
                <span className="material-symbols-outlined text-primary" data-icon={upload.icon}>{upload.icon}</span>
              </div>
              <div className="min-w-0">
                <h4 className="font-body-md font-semibold text-text-high-contrast truncate">{upload.title}</h4>
                <div className="flex gap-2 items-center">
                  <span className="font-label-mono text-[10px] text-primary bg-primary/10 px-1">{upload.category}</span>
                  <span className="font-label-mono text-label-mono text-text-muted">{upload.size}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 pl-2">
              <span className="font-label-mono text-label-mono text-text-muted">{upload.time}</span>
              <button className="text-primary mt-1">
                <span className="material-symbols-outlined" data-icon="download">download</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default NewUploads;
