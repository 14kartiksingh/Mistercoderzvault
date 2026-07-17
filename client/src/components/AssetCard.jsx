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
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'JUST_NOW';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}M_AGO`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}H_AGO`;
  return `${Math.floor(diffInSeconds / 86400)}D_AGO`;
};

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

const AssetCard = ({ asset, isAdmin, onEdit, onDelete }) => {
  const sizeFormatted = asset.sizeBytes ? formatBytes(Number(asset.sizeBytes)) : 'Unknown';
  const timeFormatted = formatTimeAgo(asset.createdAt);
  const icon = getIconForCategory(asset.category?.name || '');

  return (
    <div className="bg-surface-elevated flex items-center justify-between p-4 hover:bg-surface transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        {asset.thumbnailUrl ? (
          <div className="w-10 h-10 shrink-0 rounded overflow-hidden border border-border-subtle">
            <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-10 h-10 bg-surface flex items-center justify-center border border-border-subtle shrink-0">
            <span className="material-symbols-outlined text-primary" data-icon={icon}>{icon}</span>
          </div>
        )}
        <div className="min-w-0">
          <Link to={`/download/${asset.id}`} className="hover:underline">
            <h4 className="font-body-md font-semibold text-text-high-contrast truncate">{asset.name}</h4>
          </Link>
          <div className="flex gap-2 items-center mt-1">
            <span className="font-label-mono text-[10px] text-primary bg-primary/10 px-1 uppercase">{asset.category?.name || 'UNKNOWN'}</span>
            {asset.uploadType && asset.uploadType !== 'SINGLE' && (
              <span className="font-label-mono text-[10px] text-accent bg-accent/15 px-1 uppercase flex items-center gap-0.5" style={{ color: 'var(--color-primary)' }}>
                <span className="material-symbols-outlined text-[10px]" data-icon={asset.uploadType === 'FOLDER' ? 'folder' : 'layers'}>{asset.uploadType === 'FOLDER' ? 'folder' : 'layers'}</span>
                {asset.uploadType === 'FOLDER' ? 'Folder' : `${asset.files?.length || 0} Parts`}
              </span>
            )}
            <span className="font-label-mono text-[10px] text-text-muted">{sizeFormatted}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 pl-2">
        <span className="font-label-mono text-[10px] text-text-muted mb-2">{timeFormatted}</span>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <button 
                onClick={() => onEdit(asset)}
                className="text-text-muted hover:text-primary transition-colors flex items-center justify-center"
                title="Edit"
              >
                <span className="material-symbols-outlined text-[18px]" data-icon="edit">edit</span>
              </button>
              <button 
                onClick={() => onDelete(asset)}
                className="text-text-muted hover:text-error transition-colors flex items-center justify-center"
                title="Delete"
              >
                <span className="material-symbols-outlined text-[18px]" data-icon="delete">delete</span>
              </button>
            </>
          )}
          <Link 
            to={`/download/${asset.id}`}
            className="text-primary hover:text-primary-hover transition-colors flex items-center justify-center" 
            title="Download"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="download">download</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AssetCard;
