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

const AssetCard = ({ asset, isAdmin }) => {
  const sizeFormatted = asset.sizeBytes ? formatBytes(Number(asset.sizeBytes)) : 'Unknown';
  const timeFormatted = formatTimeAgo(asset.createdAt);
  const categoryName = asset.category?.name || 'UNKNOWN';
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

  return (
    <Link 
      to={detailPath} 
      className="group relative flex items-center justify-between p-4 bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-primary/50 transition-all duration-200 cursor-pointer rounded-sm hover:scale-[1.01] active:scale-[0.99] text-left"
    >
      {/* Left: Thumbnail & Details */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Premium Thumbnail Container */}
        {asset.thumbnailUrl ? (
          <div className="w-12 h-12 shrink-0 rounded overflow-hidden border border-border-subtle group-hover:border-primary/40 transition-colors duration-200">
            <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-surface-variant to-surface-dim flex flex-col items-center justify-center border border-border-subtle shrink-0 rounded relative group-hover:border-primary/40 transition-colors duration-200">
            <span className="font-label-mono text-xs font-bold text-text-high-contrast/70 tracking-wider select-none">
              {initials}
            </span>
          </div>
        )}

        {/* Asset Details */}
        <div className="min-w-0">
          <h4 className="font-body-md font-semibold text-text-high-contrast group-hover:text-primary transition-colors truncate text-sm sm:text-base pr-4" title={asset.name}>
            {asset.name}
          </h4>
          <div className="flex flex-wrap gap-x-2 gap-y-1 items-center mt-1 text-[10px] sm:text-xs font-label-mono text-text-muted select-none">
            <span className="text-primary font-bold uppercase">{categoryName}</span>
            <span>•</span>
            <span>{sizeFormatted}</span>
            <span>•</span>
            <span className="text-text-muted/80">{getUploadTypeBadge()}</span>
          </div>
        </div>
      </div>

      {/* Right: Date */}
      <div className="flex items-center shrink-0 pl-2 select-none">
        <span className="font-label-mono text-[10px] text-text-muted">
          {timeFormatted}
        </span>
      </div>
    </Link>
  );
};

export default AssetCard;
