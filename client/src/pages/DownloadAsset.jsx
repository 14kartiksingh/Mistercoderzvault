import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AssetCard from '../components/AssetCard';

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

const getFileIcon = (fileName) => {
  if (!fileName) return 'insert_drive_file';
  const ext = fileName.split('.').pop().toLowerCase();
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return 'archive';
  if (['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) return 'audio_file';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return 'video_file';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'picture_as_pdf';
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return 'description';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'table_chart';
  if (['ppt', 'pptx'].includes(ext)) return 'slideshow';
  if (['exe', 'msi', 'bat', 'sh', 'apk'].includes(ext)) return 'settings_applications';
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'go', 'cpp', 'c', 'json'].includes(ext)) return 'code';
  return 'insert_drive_file';
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

// Helper component for status badges
const StatusBadge = ({ status }) => {
  if (!status || status === 'idle') return null;
  if (status === 'queued') {
    return (
      <span className="text-[9px] font-label-mono text-text-muted bg-surface px-1.5 py-0.5 rounded-sm select-none border border-border-subtle/50">
        QUEUED
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="text-[9px] font-label-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm select-none border border-primary/20 animate-pulse">
        DOWNLOADING...
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className="text-[9px] font-label-mono text-success bg-success/10 px-1.5 py-0.5 rounded-sm select-none border border-success/20 flex items-center gap-0.5">
        <span className="material-symbols-outlined text-[10px]">check</span>
        DONE
      </span>
    );
  }
  return null;
};

const TreeNode = ({ node, downloadStatuses, onIndividualDownload }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  if (node.isFolder) {
    return (
      <div className="flex flex-col select-none">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-surface-elevated/50 transition-colors text-text-high-contrast hover:text-primary text-sm font-medium border-b border-border-subtle/20"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">
            {isOpen ? 'folder_open' : 'folder'}
          </span>
          <span className="truncate">{node.name}</span>
        </div>
        {isOpen && (
          <div className="border-l border-border-subtle ml-4 pl-2 flex flex-col gap-0.5">
            {Object.values(node.children).map((child, idx) => (
              <TreeNode 
                key={idx} 
                node={child} 
                downloadStatuses={downloadStatuses} 
                onIndividualDownload={onIndividualDownload}
              />
            ))}
          </div>
        )}
      </div>
    );
  } else {
    const sizeFormatted = formatBytes(Number(node.file.fileSize));
    const fileIcon = getFileIcon(node.name);
    const status = downloadStatuses[node.file.id] || 'idle';
    return (
      <div className="flex items-center justify-between py-2 px-3 text-xs text-text-muted hover:bg-surface-elevated hover:text-text-high-contrast border-b border-border-subtle/10 group transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[16px] text-text-muted/70 group-hover:text-primary transition-colors">{fileIcon}</span>
          <span className="truncate" title={node.name}>{node.name}</span>
          <span className="text-[9px] font-label-mono text-text-muted/50 bg-surface-container px-1.5 py-0.5 rounded shrink-0">{sizeFormatted}</span>
          <StatusBadge status={status} />
        </div>
        <button 
          onClick={() => onIndividualDownload(node.file)}
          className="text-primary hover:text-primary-hover hover:scale-105 active:scale-95 flex items-center justify-center p-1 transition-all"
          title="Download file part"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
        </button>
      </div>
    );
  }
};

function DownloadAsset({ isAdmin }) {
  const { id } = useParams();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [relatedAssets, setRelatedAssets] = useState([]);
  const [toast, setToast] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  // Sequential queue state
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState(-1);
  const [downloadStatuses, setDownloadStatuses] = useState({});
  const downloadWindowRef = useRef(null);

  const fetchAsset = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/assets/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Asset not found or has been deleted');
          return;
        }
        setError(`Failed to fetch details (HTTP ${res.status})`);
        return;
      }
      const data = await res.json();
      if (data.status === 'success') {
        setAsset(data.data);
      } else {
        setError(data.message || 'Asset not found');
      }
    } catch (err) {
      console.error('Error fetching asset:', err);
      setError('Failed to load asset details due to a network connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsset();
    // Reset download queue on ID changes
    setDownloadQueue([]);
    setActiveQueueIndex(-1);
    setDownloadStatuses({});
  }, [id]);

  useEffect(() => {
    if (!asset || !asset.category?.slug) return;
    const fetchRelated = async () => {
      try {
        const res = await fetch(`/api/assets?categorySlug=${asset.category.slug}`);
        const data = await res.json();
        if (data.status === 'success') {
          const filtered = (data.data || [])
            .filter(a => a.id !== asset.id)
            .slice(0, 4);
          setRelatedAssets(filtered);
        }
      } catch (err) {
        console.error('Failed to fetch related assets', err);
      }
    };
    fetchRelated();
  }, [asset]);

  // Sequential Queue Processor
  useEffect(() => {
    if (activeQueueIndex === -1 || activeQueueIndex >= downloadQueue.length) {
      if (activeQueueIndex >= downloadQueue.length && downloadQueue.length > 0) {
        setToast('ALL_DOWNLOADS_TRIGGERED');
        setTimeout(() => setToast(''), 3000);
        setActiveQueueIndex(-1);
        setDownloadQueue([]);
        downloadWindowRef.current = null;
      }
      return;
    }

    const file = downloadQueue[activeQueueIndex];
    
    // Mark as actively downloading
    setDownloadStatuses(prev => ({ ...prev, [file.id]: 'active' }));

    const targetUrl = `/api/assets/file/${file.id}/download`;

    // For files beyond the first one, update the location of the opened tab
    if (activeQueueIndex > 0) {
      if (downloadWindowRef.current && !downloadWindowRef.current.closed) {
        downloadWindowRef.current.location.href = targetUrl;
      } else {
        downloadWindowRef.current = window.open(targetUrl, '_blank');
      }
    }

    // Wait 1500ms before triggering the next file in order to prevent browser restrictions
    const timer = setTimeout(() => {
      setDownloadStatuses(prev => ({ ...prev, [file.id]: 'done' }));
      setActiveQueueIndex(prev => prev + 1);
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeQueueIndex, downloadQueue]);

  // Start sequential queue download
  const triggerQueueDownload = (filesToDownload) => {
    if (activeQueueIndex !== -1) return; // Queue already running
    if (filesToDownload.length === 0) return;

    // Open first file synchronously in user-event call to bypass popup blocker
    const firstFile = filesToDownload[0];
    const firstUrl = `/api/assets/file/${firstFile.id}/download`;
    
    downloadWindowRef.current = window.open(firstUrl, '_blank');

    const statuses = { ...downloadStatuses };
    filesToDownload.forEach(f => {
      statuses[f.id] = 'queued';
    });
    setDownloadStatuses(statuses);
    setDownloadQueue(filesToDownload);
    setActiveQueueIndex(0);
  };

  const handleIndividualDownload = (file) => {
    // Prevent starting individual triggers while full queue is running
    if (activeQueueIndex !== -1) {
      setToast('QUEUE_IN_PROGRESS');
      setTimeout(() => setToast(''), 2000);
      return;
    }

    setDownloadStatuses(prev => ({ ...prev, [file.id]: 'active' }));
    
    // Open in a new tab synchronously
    window.open(`/api/assets/file/${file.id}/download`, '_blank');

    setTimeout(() => {
      setDownloadStatuses(prev => ({ ...prev, [file.id]: 'done' }));
    }, 1000);
  };

  const handlePrimaryCTA = () => {
    if (!asset) return;
    if (asset.uploadType === 'SINGLE') {
      window.open(`/api/assets/${asset.id}/download`, '_blank');
    } else if (asset.uploadType === 'MULTIPART') {
      triggerQueueDownload(sortedFiles);
    } else if (asset.uploadType === 'FOLDER') {
      // For folder, trigger sequential download of all files
      triggerQueueDownload(filesList);
      // Smooth scroll to view explorer progress
      const explorer = document.getElementById('file-explorer-section');
      if (explorer) {
        explorer.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setToast('LINK_COPIED');
    setTimeout(() => setToast(''), 2000);
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: asset?.name || 'MISTER CODERZ Vault',
        url: window.location.href
      }).catch(console.error);
    } else {
      copyLink();
    }
  };

  const submitReport = () => {
    setShowReportModal(false);
    setToast('REPORT_SUBMITTED');
    setTimeout(() => setToast(''), 3000);
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="mt-16 pb-28 max-w-6xl mx-auto px-4 sm:px-6 pt-8 select-none">
          <div className="h-6 w-32 bg-surface-container animate-pulse rounded mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="h-44 bg-surface-elevated border border-border-subtle animate-pulse rounded-sm"></div>
              <div className="h-32 bg-surface-elevated border border-border-subtle animate-pulse rounded-sm"></div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="h-64 bg-surface-elevated border border-border-subtle animate-pulse rounded-sm"></div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !asset) {
    return (
      <>
        <Header />
        <main className="mt-16 pb-28 max-w-4xl mx-auto px-4 pt-12">
          <div className="bg-surface-elevated border border-border-subtle p-8 flex flex-col items-center justify-center text-center rounded-sm">
            <span className="material-symbols-outlined text-error text-[48px] mb-4">warning</span>
            <h2 className="text-xl font-bold text-text-high-contrast mb-2">Asset Details Unavailable</h2>
            <p className="text-text-muted text-xs mb-6 max-w-md">
              {error || 'The requested asset metadata does not exist or has been permanently archived.'}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={fetchAsset}
                className="bg-surface border border-border-subtle text-text-high-contrast hover:border-primary px-5 py-2.5 font-label-mono text-xs font-bold transition-all rounded-sm"
              >
                RETRY CONNECTION
              </button>
              <Link to={isAdmin ? "/admin" : "/"} className="bg-primary text-background px-6 py-2.5 font-label-mono text-xs font-bold hover:bg-primary-hover transition-colors rounded-sm shadow-lg">
                BACK TO HOMEPAGE
              </Link>
            </div>
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
  const initials = getInitials(asset.name);
  const filesList = asset.files || [];
  const sortedFiles = [...filesList].sort((a, b) => (a.partNumber || 0) - (b.partNumber || 0));
  const folderTree = asset.uploadType === 'FOLDER' ? buildTree(filesList) : null;

  // Check if any file metadata is missing Telegram fields
  const missingFiles = filesList.filter(f => !f.telegramMessageId);
  const hasMetadataIssues = missingFiles.length > 0;

  // Progress calculations
  const totalInQueue = downloadQueue.length;
  const completedInQueue = Object.values(downloadStatuses).filter(s => s === 'done').length;
  const progressPercent = totalInQueue > 0 ? Math.round((completedInQueue / totalInQueue) * 100) : 0;

  return (
    <>
      <Header />
      <main className="mt-16 pb-28 max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] font-label-mono text-text-muted uppercase tracking-wider mb-6 select-none">
          <Link to={isAdmin ? "/admin" : "/"} className="hover:text-primary transition-colors">HOME</Link>
          <span>/</span>
          <span className="hover:text-primary transition-colors uppercase">{categoryName}</span>
          <span>/</span>
          <span className="text-text-high-contrast truncate max-w-[200px] sm:max-w-none">{asset.name}</span>
        </div>

        {/* Dynamic Interactive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: Asset Profile Details & Files */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Premium Profile Hero */}
            <div className="bg-surface-elevated border border-border-subtle p-6 flex flex-col sm:flex-row gap-6 rounded-sm">
              {asset.thumbnailUrl ? (
                <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded overflow-hidden border border-border-subtle self-center sm:self-start">
                  <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover animate-fade-in" />
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-surface-variant to-surface-dim flex flex-col items-center justify-center border border-border-subtle shrink-0 rounded-sm relative self-center sm:self-start select-none">
                  <span className="font-label-mono text-sm font-bold text-text-high-contrast/70 tracking-wider">{initials}</span>
                  <span className="material-symbols-outlined text-primary text-[24px] absolute bottom-2 right-2 opacity-80" data-icon={icon}>{icon}</span>
                </div>
              )}
              
              <div className="min-w-0 flex-1 flex flex-col justify-between">
                <div>
                  <h1 className="font-headline-sm text-xl sm:text-2xl text-text-high-contrast uppercase tracking-tighter truncate" title={asset.name}>
                    {asset.name}
                  </h1>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 items-center mt-2 text-[10px] sm:text-xs font-label-mono text-text-muted select-none">
                    <span className="text-primary font-bold uppercase">{categoryName}</span>
                    <span>•</span>
                    <span>{sizeFormatted}</span>
                    <span>•</span>
                    <span className="uppercase text-text-muted/80">{asset.uploadType}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-border-subtle/30 pt-4">
                  <span className="font-label-mono text-[9px] text-text-muted uppercase tracking-wider block mb-1.5 select-none">DESCRIPTION</span>
                  <p className="text-xs sm:text-sm text-text-high-contrast/90 leading-relaxed whitespace-pre-wrap">
                    {asset.description || 'No detailed description available for this asset.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Incomplete / Inaccessible Asset Warnings */}
            {hasMetadataIssues && (
              <div className="bg-error/10 border border-error/20 p-4 rounded-sm flex items-start gap-3">
                <span className="material-symbols-outlined text-error text-[20px] select-none">error</span>
                <div>
                  <h4 className="text-xs font-bold text-error font-label-mono uppercase tracking-wider">Metadata Verification Alert</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Some segments of this asset (<strong>{missingFiles.length} file parts</strong>) do not have active Telegram message IDs. These parts are currently unavailable for download.
                  </p>
                </div>
              </div>
            )}

            {/* Multipart Notice Banner */}
            {asset.uploadType === 'MULTIPART' && !hasMetadataIssues && (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-sm flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] select-none">info</span>
                <div>
                  <h4 className="text-xs font-bold text-text-high-contrast font-label-mono uppercase tracking-wider font-semibold">Multipart Archive Complete</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    This archive contains multiple parts. Visual stats confirm all <strong>{filesList.length} / {filesList.length} parts</strong> are successfully indexed. Please download every part completely before extracting.
                  </p>
                </div>
              </div>
            )}

            {/* Files & Structures Area */}
            <div className="bg-surface-elevated border border-border-subtle rounded-sm overflow-hidden" id="file-explorer-section">
              
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border-subtle select-none">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">folder_zip</span>
                  <span className="font-headline-sm text-xs sm:text-sm text-text-high-contrast uppercase tracking-tighter">
                    {asset.uploadType === 'SINGLE' ? 'Single File' : (asset.uploadType === 'MULTIPART' ? 'Multipart Files List' : 'Interactive Explorer')}
                  </span>
                </div>
                <span className="font-label-mono text-[10px] text-text-muted uppercase">
                  {filesList.length} FILE{filesList.length !== 1 ? 'S' : ''}
                </span>
              </div>

              {/* Sequential Queue Download Progress Strip */}
              {activeQueueIndex !== -1 && (
                <div className="bg-surface p-4 border-b border-border-subtle flex flex-col gap-2 select-none">
                  <div className="flex justify-between items-center text-xs font-label-mono">
                    <span className="text-primary font-bold animate-pulse">DOWNLOADING ARCHIVE PARTS...</span>
                    <span className="text-text-high-contrast">{progressPercent}% ({completedInQueue}/{totalInQueue})</span>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 rounded overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>
              )}

              {/* Single File Structure Layout */}
              {asset.uploadType === 'SINGLE' && (
                <div className="p-6 flex flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-primary text-[44px] mb-3 select-none">insert_drive_file</span>
                  <h4 className="text-xs font-bold text-text-high-contrast font-label-mono uppercase tracking-wider mb-1">
                    {filesList[0]?.fileName || asset.name}
                  </h4>
                  <p className="text-[10px] font-label-mono text-text-muted mb-4">{sizeFormatted}</p>
                  
                  <button 
                    onClick={handlePrimaryCTA}
                    className="bg-surface border border-border-subtle hover:border-primary text-text-high-contrast hover:text-primary px-5 py-2 font-label-mono text-xs font-bold transition-all rounded-sm flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    DOWNLOAD SINGLE FILE
                  </button>
                </div>
              )}

              {/* Multipart Files List Layout */}
              {asset.uploadType === 'MULTIPART' && (
                <div className="divide-y divide-border-subtle max-h-[360px] overflow-y-auto custom-scrollbar">
                  {sortedFiles.map((file, idx) => {
                    const fileIcon = getFileIcon(file.fileName);
                    const status = downloadStatuses[file.id] || 'idle';
                    return (
                      <div key={file.id} className="flex justify-between items-center p-3.5 hover:bg-surface transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-label-mono text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded-sm select-none">PART {file.partNumber || idx + 1}</span>
                          <span className="material-symbols-outlined text-[16px] text-text-muted/70">{fileIcon}</span>
                          <span className="text-xs font-semibold text-text-high-contrast truncate" title={file.fileName}>{file.fileName}</span>
                          <span className="font-label-mono text-[10px] text-text-muted/60 shrink-0">{formatBytes(Number(file.fileSize))}</span>
                          <StatusBadge status={status} />
                        </div>
                        <button 
                          onClick={() => handleIndividualDownload(file)}
                          className="text-primary hover:text-primary-hover flex items-center justify-center p-1"
                          title={`Download Part ${file.partNumber || idx + 1}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Folder Interactive Tree Explorer */}
              {asset.uploadType === 'FOLDER' && folderTree && (
                <div className="p-4 overflow-x-auto max-h-[440px] overflow-y-auto custom-scrollbar">
                  {Object.keys(folderTree.children).length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {Object.values(folderTree.children).map((child, idx) => (
                        <TreeNode 
                          key={idx} 
                          node={child} 
                          downloadStatuses={downloadStatuses} 
                          onIndividualDownload={handleIndividualDownload}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-text-muted text-xs font-label-mono text-center py-6">NO DIRECTORY METADATA RETRIEVED</div>
                  )}
                </div>
              )}
            </div>

            {/* Future Expansions Area */}
            <div className="bg-surface-elevated border border-border-subtle p-5 rounded-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2 select-none">
                <span className="font-label-mono text-[9px] text-text-muted uppercase tracking-wider">Extended Information</span>
                <span className="font-label-mono text-[9px] text-text-muted bg-surface px-2 py-0.5 rounded-sm">V1.0</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-label-mono">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-text-muted">VERSION</span>
                  <span className="text-text-high-contrast">1.0.0 (STABLE)</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-text-muted">MD5_HASH</span>
                  <span className="text-text-high-contrast truncate font-sans">N/A</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-text-muted">LICENSE</span>
                  <span className="text-text-high-contrast">FREEWARE</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Premium Sticky Action Panel & Metadata Cards */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-24">
            
            {/* Primary Action Panel */}
            <div className="bg-surface-elevated border border-border-subtle p-6 rounded-sm flex flex-col gap-4">
              
              <button 
                onClick={handlePrimaryCTA}
                disabled={activeQueueIndex !== -1}
                className="w-full bg-primary text-background hover:bg-primary-hover disabled:bg-primary/40 disabled:text-background/80 active:bg-primary-active py-3.5 rounded-sm font-label-mono text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                <span className="material-symbols-outlined text-[18px]">cloud_download</span>
                {activeQueueIndex !== -1 && 'DOWNLOADING...'}
                {activeQueueIndex === -1 && asset.uploadType === 'SINGLE' && 'DOWNLOAD ASSET'}
                {activeQueueIndex === -1 && asset.uploadType === 'MULTIPART' && 'DOWNLOAD ALL PARTS'}
                {activeQueueIndex === -1 && asset.uploadType === 'FOLDER' && 'DOWNLOAD FULL FOLDER'}
              </button>

              <div className="grid grid-cols-3 gap-2 mt-2">
                <button 
                  onClick={copyLink}
                  className="flex flex-col items-center justify-center p-2.5 bg-surface hover:bg-surface-container border border-border-subtle hover:border-text-muted transition-all rounded-sm gap-1 group"
                  title="Copy direct profile url"
                >
                  <span className="material-symbols-outlined text-[18px] text-text-muted group-hover:text-primary transition-colors">link</span>
                  <span className="text-[9px] font-label-mono text-text-muted select-none">Copy URL</span>
                </button>
                <button 
                  onClick={shareLink}
                  className="flex flex-col items-center justify-center p-2.5 bg-surface hover:bg-surface-container border border-border-subtle hover:border-text-muted transition-all rounded-sm gap-1 group"
                  title="Share profile link"
                >
                  <span className="material-symbols-outlined text-[18px] text-text-muted group-hover:text-primary transition-colors">share</span>
                  <span className="text-[9px] font-label-mono text-text-muted select-none">Share</span>
                </button>
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="flex flex-col items-center justify-center p-2.5 bg-surface hover:bg-surface-container border border-border-subtle hover:border-error transition-all rounded-sm gap-1 group"
                  title="Report corrupt file"
                >
                  <span className="material-symbols-outlined text-[18px] text-text-muted group-hover:text-error transition-colors">flag</span>
                  <span className="text-[9px] font-label-mono text-text-muted select-none">Report</span>
                </button>
              </div>
            </div>

            {/* Sidebar Metadata Cards Block */}
            <div className="bg-surface-elevated border border-border-subtle p-5 rounded-sm flex flex-col gap-4 select-none">
              <h3 className="font-label-mono text-[10px] text-text-muted uppercase tracking-wider border-b border-border-subtle/50 pb-2">
                Metadata Details
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs font-label-mono">
                  <span className="text-text-muted">CATEGORY</span>
                  <span className="text-primary font-bold uppercase">{categoryName}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-label-mono">
                  <span className="text-text-muted">UPLOAD TYPE</span>
                  <span className="text-text-high-contrast font-bold uppercase">{asset.uploadType}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-label-mono">
                  <span className="text-text-muted">STORAGE</span>
                  <span className="text-text-high-contrast uppercase font-bold text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">TELEGRAM VAULT</span>
                </div>
                <div className="flex justify-between items-center text-xs font-label-mono">
                  <span className="text-text-muted">FILES</span>
                  <span className="text-text-high-contrast font-bold">{filesList.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-label-mono">
                  <span className="text-text-muted">TOTAL SIZE</span>
                  <span className="text-text-high-contrast font-bold">{sizeFormatted}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-label-mono">
                  <span className="text-text-muted">UPLOADED</span>
                  <span className="text-text-high-contrast font-bold">{timeFormatted}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Category Recommended shelf */}
        {relatedAssets.length > 0 && (
          <section className="mt-12 border-t border-border-subtle/50 pt-8">
            <div className="flex items-center justify-between mb-6 select-none">
              <h2 className="font-headline-sm text-headline-sm text-text-high-contrast uppercase tracking-tighter">
                You May Also Like
              </h2>
              <span className="font-label-mono text-[9px] text-text-muted uppercase">MORE FROM {categoryName}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedAssets.map((relAsset) => (
                <AssetCard 
                  key={relAsset.id} 
                  asset={relAsset} 
                  isAdmin={isAdmin}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ))}
            </div>
          </section>
        )}

        {/* Global Toast Indicator */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-surface-elevated border border-primary/50 px-4 py-3 shadow-2xl rounded-sm animate-fade-in flex items-center gap-2 max-w-sm select-none">
            <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
            <span className="text-xs font-label-mono font-bold text-text-high-contrast">
              {toast === 'LINK_COPIED' && 'URL_COPIED_TO_CLIPBOARD'}
              {toast === 'REPORT_SUBMITTED' && 'ASSET_REPORTED_TO_MODERATOR'}
              {toast === 'ALL_DOWNLOADS_TRIGGERED' && 'DOWNLOAD_QUEUE_COMPLETED'}
              {toast === 'QUEUE_IN_PROGRESS' && 'DOWNLOAD_QUEUE_ACTIVE'}
            </span>
          </div>
        )}

        {/* Modal: Report Asset */}
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm select-none">
            <div className="bg-surface-base border border-border-subtle rounded p-6 w-full max-w-sm shadow-2xl flex flex-col">
              <h2 className="text-xl font-bold text-text-high-contrast mb-2 uppercase tracking-tighter">Report Asset</h2>
              <p className="text-xs text-text-muted mb-6 leading-relaxed">Are you sure you want to flag this asset? Our administrators will be notified to review the hosted Telegram message and description metadata details.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-2.5 rounded-sm font-label-mono text-xs font-medium transition-colors bg-surface-elevated text-text-muted hover:text-text-high-contrast border border-border-subtle"
                >
                  CANCEL
                </button>
                <button 
                  onClick={submitReport}
                  className="flex-1 py-2.5 rounded-sm font-label-mono text-xs font-bold transition-all bg-primary text-background hover:bg-primary-hover shadow-lg"
                >
                  CONFIRM
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </>
  );
}

export default DownloadAsset;
