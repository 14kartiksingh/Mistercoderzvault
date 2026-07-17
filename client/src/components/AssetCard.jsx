import React from 'react';
import { Link } from 'react-router-dom';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'JUST_NOW';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}M_AGO`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}H_AGO`;
  return `${Math.floor(diffInSeconds / 86400)}D_AGO`;
};

const getIconForCategory = (categoryName) => {
  const name = categoryName ? categoryName.toUpperCase() : '';
  if (name.includes('GAME')) return 'sports_esports';
  if (name.includes('MOVIE')) return 'movie';
  if (name.includes('APP')) return 'developer_mode_tv';
  if (name.includes('SOFT')) return 'terminal';
  if (name.includes('BOOK')) return 'book';
  if (name.includes('MUSIC')) return 'album';
  return 'draft';
};

const getInitials = (name) => {
  if (!name) return 'VA';
  const cleanName = name.replace(/[^a-zA-Z0-9 ]/g, '');
  const parts = cleanName.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const AssetCard = ({ asset, isAdmin, onEdit, onDelete }) => {
  const sizeFormatted = asset.sizeBytes ? formatBytes(Number(asset.sizeBytes)) : 'Unknown';
  const timeFormatted = formatTimeAgo(asset.createdAt);
  const categoryName = asset.category?.name || 'UNKNOWN';
  const icon = getIconForCategory(categoryName);
  const initials = getInitials(asset.name);

  const getUploadTypeBadge = () => {
    if (asset.uploadType === 'FOLDER') {
      return (
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px]">folder</span>
          Folder
        </span>
      );
    }
    if (asset.uploadType === 'MULTIPART') {
      return (
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px]">layers</span>
          {asset.files?.length || 0} Parts
        </span>
      );
    }
    // Single file
    let displayType = 'FILE';
    if (asset.name && asset.name.includes('.')) {
      const parts = asset.name.split('.');
      const ext = parts.pop().toUpperCase();
      if (ext && ext.length <= 6 && /^[A-Z0-9]+$/.test(ext)) {
        displayType = ext;
      }
    }
    return (
      <span className="flex items-center gap-1">
        <span className="material-symbols-outlined text-[12px]">description</span>
        {displayType}
      </span>
    );
  };

  const detailPath = isAdmin ? `/admin/download/${asset.id}` : `/download/${asset.id}`;
  const downloadPath = `/api/assets/${asset.id}/download`;

  return (
    <div className="group relative flex items-center justify-between p-4 bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-primary/30 transition-all duration-200">
      
      {/* Left: Thumbnail & Details */}
      <div className="flex items-center gap-4 min-w-0">
        
        {/* Premium Thumbnail Container */}
        {asset.thumbnailUrl ? (
          <div className="w-12 h-12 shrink-0 rounded overflow-hidden border border-border-subtle group-hover:border-primary/40 transition-colors duration-200">
            <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-surface-variant to-surface-dim flex flex-col items-center justify-center border border-border-subtle shrink-0 rounded relative group-hover:border-primary/40 transition-colors duration-200">
            <span className="font-label-mono text-xs font-bold text-text-high-contrast/70 tracking-wider select-none">{initials}</span>
            <span className="material-symbols-outlined text-primary text-[14px] absolute bottom-1 right-1 opacity-80" data-icon={icon}>{icon}</span>
          </div>
        )}

        {/* Asset Details */}
        <div className="min-w-0">
          <Link to={detailPath} className="inline-block max-w-full">
            <h4 className="font-body-md font-semibold text-text-high-contrast hover:text-primary transition-colors truncate text-sm sm:text-base pr-4" title={asset.name}>
              {asset.name}
            </h4>
          </Link>
          <div className="flex flex-wrap gap-x-2 gap-y-1 items-center mt-1 text-[10px] sm:text-xs font-label-mono text-text-muted select-none">
            <span className="text-primary font-bold uppercase">{categoryName}</span>
            <span>•</span>
            <span>{sizeFormatted}</span>
            <span>•</span>
            <span className="text-text-muted/80">{getUploadTypeBadge()}</span>
          </div>
        </div>
      </div>

      {/* Right: Date or Hover Actions */}
      <div className="relative flex items-center shrink-0 pl-2">
        
        {/* Time Ago Display (Hidden on Hover) */}
        <div className="font-label-mono text-[10px] text-text-muted transition-opacity duration-200 group-hover:opacity-0 select-none">
          {timeFormatted}
        </div>

        {/* Premium Hover Actions Overlay (Visible on Hover) */}
        <div className="absolute right-0 flex items-center gap-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 bg-gradient-to-l from-surface via-surface pl-6 py-1">
          {isAdmin && (
            <>
              <button 
                onClick={() => onEdit(asset)}
                className="p-1 text-text-muted hover:text-primary transition-colors flex items-center justify-center"
                title="Edit"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button 
                onClick={() => onDelete(asset)}
                className="p-1 text-text-muted hover:text-error transition-colors flex items-center justify-center"
                title="Delete"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </>
          )}
          
          <Link 
            to={detailPath}
            className="px-2.5 py-1 text-[10px] font-label-mono font-bold text-text-high-contrast bg-surface-elevated border border-border-subtle hover:border-primary hover:text-primary transition-all duration-200 rounded-sm shrink-0"
            title="View Details"
          >
            DETAILS
          </Link>

          <a 
            href={asset.uploadType === 'SINGLE' ? downloadPath : detailPath}
            target={asset.uploadType === 'SINGLE' ? "_blank" : "_self"}
            rel="noreferrer"
            className="p-1 text-primary hover:text-primary-hover hover:scale-105 active:scale-95 transition-all flex items-center justify-center" 
            title={asset.uploadType === 'SINGLE' ? "Download" : "Browse & Download"}
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
          </a>
        </div>

      </div>

    </div>
  );
};

export default AssetCard;
