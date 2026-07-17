import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

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

const buildTree = (files) => {
  const root = { name: 'Root', isFolder: true, children: {} };
  files.forEach(file => {
    const cleanPath = file.relativePath.replace(/\\/g, '/');
    const parts = cleanPath.split('/').filter(Boolean);
    let current = root;
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      if (!current.children[part]) {
        if (isLast) {
          current.children[part] = {
            name: part,
            isFolder: false,
            file: file
          };
        } else {
          current.children[part] = {
            name: part,
            isFolder: true,
            children: {}
          };
        }
      }
      current = current.children[part];
    });
  });
  return root;
};

const TreeNode = ({ node }) => {
  const [isOpen, setIsOpen] = useState(true);
  if (node.isFolder) {
    return (
      <div className="pl-2">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 py-1.5 cursor-pointer text-text-high-contrast hover:text-primary transition-colors font-medium text-sm select-none"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">
            {isOpen ? 'folder_open' : 'folder'}
          </span>
          <span>{node.name}</span>
        </div>
        {isOpen && (
          <div className="border-l border-border-subtle ml-2 pl-2">
            {Object.values(node.children).map((child, idx) => (
              <TreeNode key={idx} node={child} />
            ))}
          </div>
        )}
      </div>
    );
  } else {
    const sizeFormatted = formatBytes(Number(node.file.fileSize));
    return (
      <div className="pl-2 flex items-center justify-between py-1.5 text-xs text-text-muted hover:bg-surface-elevated rounded pr-2 group">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[18px] text-text-muted">description</span>
          <span className="truncate" title={node.name}>{node.name}</span>
          <span className="text-[10px] font-label-mono text-text-muted/60 bg-surface-container px-1.5 py-0.5 rounded shrink-0">{sizeFormatted}</span>
        </div>
        <a 
          href={`/api/assets/file/${node.file.id}/download`} 
          target="_blank" 
          rel="noreferrer"
          className="text-primary hover:text-primary-hover flex items-center p-1"
          title="Download File"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
        </a>
      </div>
    );
  }
};

function DownloadAsset({ isAdmin }) {
  const { id } = useParams();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const res = await fetch(`/api/assets/${id}`);
        const data = await res.json();
        if (data.status === 'success') {
          setAsset(data.data);
        } else {
          setError(data.message || 'Asset not found');
        }
      } catch (err) {
        console.error('Error fetching asset:', err);
        setError('Failed to load asset details');
      } finally {
        setLoading(false);
      }
    };
    fetchAsset();
  }, [id]);

  const downloadAllParts = () => {
    if (!asset || !asset.files) return;
    const sortedFiles = [...asset.files].sort((a, b) => (a.partNumber || 0) - (b.partNumber || 0));
    sortedFiles.forEach((file, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = `/api/assets/file/${file.id}/download`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 800); // 800ms gap to avoid browser download blocking
    });
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="mt-16 pb-24 px-margin-mobile max-w-4xl mx-auto pt-8">
          <div className="text-text-muted font-label-mono">LOADING ASSET DETAILS...</div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !asset) {
    return (
      <>
        <Header />
        <main className="mt-16 pb-24 px-margin-mobile max-w-4xl mx-auto pt-8">
          <div className="bg-error/10 border border-error/20 text-error p-6 rounded-xl text-sm font-medium flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px]" data-icon="error">error</span>
              <span>{error || 'Asset not found'}</span>
            </div>
            <Link to={isAdmin ? "/admin" : "/"} className="text-primary hover:underline font-bold">Back to Homepage</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const categoryName = asset.category?.name || 'UNKNOWN';
  const sizeFormatted = asset.sizeBytes ? formatBytes(Number(asset.sizeBytes)) : 'Unknown';
  const timeFormatted = formatTimeAgo(asset.createdAt);
  const icon = getIconForCategory(categoryName);
  const filesList = asset.files || [];
  
  // Sort files for multipart display
  const sortedFiles = [...filesList].sort((a, b) => (a.partNumber || 0) - (b.partNumber || 0));

  // Build folder tree for folder upload
  const folderTree = asset.uploadType === 'FOLDER' ? buildTree(filesList) : null;

  return (
    <>
      <Header />
      <main className="mt-16 pb-24 max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-label-mono text-text-muted uppercase tracking-wider mb-6">
          <Link to={isAdmin ? "/admin" : "/"} className="hover:text-primary transition-colors">HOME</Link>
          <span>/</span>
          <span className="text-text-high-contrast truncate">{asset.name}</span>
        </div>

        {/* Asset Details Header Block */}
        <div className="bg-surface-elevated border border-border-subtle p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start justify-between mb-8">
          <div className="flex gap-4 sm:gap-6 items-start min-w-0">
            {asset.thumbnailUrl ? (
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded overflow-hidden border border-border-subtle">
                <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-surface flex items-center justify-center border border-border-subtle shrink-0">
                <span className="material-symbols-outlined text-primary text-[32px] sm:text-[40px]" data-icon={icon}>{icon}</span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-headline-sm text-xl sm:text-2xl text-text-high-contrast uppercase tracking-tighter truncate mb-2">{asset.name}</h1>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-label-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 uppercase">{categoryName}</span>
                {asset.uploadType && (
                  <span className="font-label-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 uppercase flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">{asset.uploadType === 'FOLDER' ? 'folder' : (asset.uploadType === 'MULTIPART' ? 'layers' : 'description')}</span>
                    {asset.uploadType === 'FOLDER' ? 'Folder' : (asset.uploadType === 'MULTIPART' ? 'Multipart' : 'Single File')}
                  </span>
                )}
                <span className="font-label-mono text-[10px] text-text-muted">{sizeFormatted}</span>
                <span className="font-label-mono text-[10px] text-text-muted">{timeFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description Section */}
        {asset.description && (
          <div className="mb-8">
            <h3 className="font-label-mono text-[10px] text-text-muted uppercase tracking-wider mb-2">Description</h3>
            <div className="bg-surface-elevated border border-border-subtle p-5 text-sm text-text-high-contrast leading-relaxed whitespace-pre-line">
              {asset.description}
            </div>
          </div>
        )}

        {/* Download Action Section */}
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-2">
            <h3 className="font-label-mono text-[10px] text-text-muted uppercase tracking-wider">
              {asset.uploadType === 'SINGLE' ? 'Download' : (asset.uploadType === 'MULTIPART' ? `Files (${filesList.length} Parts)` : 'Directory Tree')}
            </h3>
            {asset.uploadType === 'MULTIPART' && (
              <button 
                onClick={downloadAllParts}
                className="text-[10px] font-label-mono font-bold text-primary hover:text-primary-hover transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                DOWNLOAD ALL PARTS
              </button>
            )}
          </div>

          {/* Render based on uploadType */}
          {asset.uploadType === 'SINGLE' && (
            <div className="bg-surface-elevated border border-border-subtle p-6 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-primary text-[48px] mb-4" data-icon="cloud_download">cloud_download</span>
              <h4 className="text-text-high-contrast font-bold mb-2">Ready to download</h4>
              <p className="text-text-muted text-xs mb-6 max-w-sm">This file is hosted securely on Telegram. Clicking below will open the message containing the file link.</p>
              
              <a 
                href={`/api/assets/${asset.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="bg-primary text-background px-6 py-3 font-label-mono font-bold hover:bg-primary-hover active:bg-primary-active transition-colors flex items-center gap-2 rounded shadow-lg"
              >
                <span className="material-symbols-outlined">download</span>
                DOWNLOAD FILE
              </a>
            </div>
          )}

          {asset.uploadType === 'MULTIPART' && (
            <div className="bg-surface-elevated border border-border-subtle overflow-hidden">
              <div className="divide-y divide-border-subtle">
                {sortedFiles.map((file, index) => {
                  const partSizeFormatted = formatBytes(Number(file.fileSize));
                  return (
                    <div key={file.id} className="flex justify-between items-center p-4 hover:bg-surface-container transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-label-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">PART {file.partNumber || index + 1}</span>
                        <span className="text-sm font-semibold text-text-high-contrast truncate" title={file.fileName}>{file.fileName}</span>
                        <span className="font-label-mono text-[10px] text-text-muted shrink-0">{partSizeFormatted}</span>
                      </div>
                      <a 
                        href={`/api/assets/file/${file.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:text-primary-hover flex items-center justify-center p-1.5"
                        title={`Download Part ${file.partNumber || index + 1}`}
                      >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {asset.uploadType === 'FOLDER' && folderTree && (
            <div className="bg-surface-elevated border border-border-subtle p-4 sm:p-6 overflow-x-auto">
              {Object.keys(folderTree.children).length > 0 ? (
                Object.values(folderTree.children).map((child, idx) => (
                  <TreeNode key={idx} node={child} />
                ))
              ) : (
                <div className="text-text-muted text-sm font-label-mono text-center py-4">NO FILES IN THIS DIRECTORY</div>
              )}
            </div>
          )}
        </div>

      </main>
      <Footer />
    </>
  );
}

export default DownloadAsset;
