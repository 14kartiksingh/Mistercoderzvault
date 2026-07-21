import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AssetCard from '../components/AssetCard';
import EditAssetModal from '../components/EditAssetModal';

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
            file: file,
            partNumber: file.partNumber || 0
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

  const sortNode = (node) => {
    if (!node.isFolder) return;
    node.childrenArray = Object.values(node.children).sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      if (!a.isFolder && !b.isFolder) return a.partNumber - b.partNumber;
      return a.name.localeCompare(b.name);
    });
    node.childrenArray.forEach(sortNode);
  };
  sortNode(root);

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

const TreeNode = ({ node, downloadStatuses, onIndividualDownload, isAdmin, onIndividualDelete, deletingFileId, onReorder, editingFileId, editingFileName, setEditingFileName, onRenameStart, onRenameSave, onRenameCancel }) => {
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
            {node.childrenArray.map((child, idx) => (
              <TreeNode 
                key={idx} 
                node={child} 
                downloadStatuses={downloadStatuses} 
                onIndividualDownload={onIndividualDownload}
                isAdmin={isAdmin}
                onIndividualDelete={onIndividualDelete}
                deletingFileId={deletingFileId}
                onReorder={onReorder}
                editingFileId={editingFileId}
                editingFileName={editingFileName}
                setEditingFileName={setEditingFileName}
                onRenameStart={onRenameStart}
                onRenameSave={onRenameSave}
                onRenameCancel={onRenameCancel}
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
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-4">
          <span className="material-symbols-outlined text-[16px] text-text-muted/70 group-hover:text-primary transition-colors">{fileIcon}</span>
          {editingFileId === node.file.id ? (
            <input 
              type="text"
              value={editingFileName}
              onChange={(e) => setEditingFileName(e.target.value)}
              className="bg-surface-container border border-border-subtle text-text-high-contrast text-xs px-2 py-1 rounded w-full focus:outline-none focus:border-primary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameSave(node.file.id);
                if (e.key === 'Escape') onRenameCancel();
              }}
            />
          ) : (
            <span className="truncate" title={node.name}>{node.name}</span>
          )}
          <span className="text-[9px] font-label-mono text-text-muted/50 bg-surface-container px-1.5 py-0.5 rounded shrink-0">{sizeFormatted}</span>
          <StatusBadge status={status} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && (
            editingFileId === node.file.id ? (
              <>
                <button 
                  onClick={() => onRenameSave(node.file.id)}
                  className="text-success hover:text-success-hover flex items-center justify-center p-1 transition-all"
                  title="Save"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </button>
                <button 
                  onClick={onRenameCancel}
                  className="text-error hover:text-error-hover flex items-center justify-center p-1 transition-all"
                  title="Cancel"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => onRenameStart(node.file)}
                  className="text-text-muted hover:text-primary flex items-center justify-center p-1 transition-all"
                  title="Rename"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
              <button 
                onClick={() => onReorder(node.file, 'up')}
                className="text-text-muted hover:text-primary flex items-center justify-center p-1 transition-all"
                title="Move up"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
              </button>
              <button 
                onClick={() => onReorder(node.file, 'down')}
                className="text-text-muted hover:text-primary flex items-center justify-center p-1 transition-all"
                title="Move down"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
              </button>
              <button 
                onClick={() => onIndividualDelete(node.file)}
                disabled={deletingFileId === node.file.id}
                className={`text-error hover:text-error-hover flex items-center justify-center p-1 transition-all ${deletingFileId === node.file.id ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                title="Delete file"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {deletingFileId === node.file.id ? 'hourglass_empty' : 'delete'}
                </span>
              </button>
            </>
            )
          )}
          <button 
            onClick={() => onIndividualDownload(node.file)}
            className="text-primary hover:text-primary-hover hover:scale-105 active:scale-95 flex items-center justify-center p-1 transition-all"
            title="Download file part"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
          </button>
        </div>
      </div>
    );
  }
};

function DownloadAsset({ isAdmin }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [relatedAssets, setRelatedAssets] = useState([]);
  const [toast, setToast] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deletingFileId, setDeletingFileId] = useState(null);
  const [isAppending, setIsAppending] = useState(false);
  const [isAppendingComplete, setIsAppendingComplete] = useState(false);
  const [showAppendInput, setShowAppendInput] = useState(false);
  const [expectedPartsToAdd, setExpectedPartsToAdd] = useState('');
  const [initialFileCount, setInitialFileCount] = useState(0);
  const [editingFileId, setEditingFileId] = useState(null);
  const [editingFileName, setEditingFileName] = useState('');
  const fileInputRef = useRef(null);
  const pollingInterval = useRef(null);

  const [downloadStatuses, setDownloadStatuses] = useState({});

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

  useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  const handleReorder = async (file, direction) => {
    if (!asset || (asset.uploadType !== 'MULTIPART' && asset.uploadType !== 'FOLDER')) return;
    const sortedFiles = [...asset.files].sort((a, b) => (a.partNumber || 0) - (b.partNumber || 0));

    const parentPath = file.relativePath ? file.relativePath.substring(0, file.relativePath.lastIndexOf('/')) : null;
    
    const siblings = sortedFiles.filter(f => {
      if (asset.uploadType === 'MULTIPART') return true;
      const fParentPath = f.relativePath ? f.relativePath.substring(0, f.relativePath.lastIndexOf('/')) : null;
      return fParentPath === parentPath;
    });

    const currentIndex = siblings.findIndex(f => f.id === file.id);
    if (currentIndex === -1) return;
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return; 

    const newSiblings = [...siblings];
    [newSiblings[currentIndex], newSiblings[swapIndex]] = [newSiblings[swapIndex], newSiblings[currentIndex]];

    const newOrder = [];
    let siblingIdx = 0;
    
    for (const f of sortedFiles) {
      const fParentPath = f.relativePath ? f.relativePath.substring(0, f.relativePath.lastIndexOf('/')) : null;
      if (asset.uploadType === 'MULTIPART' || fParentPath === parentPath) {
        newOrder.push(newSiblings[siblingIdx].id);
        siblingIdx++;
      } else {
        newOrder.push(f.id);
      }
    }

    try {
      setAsset(prev => {
        const newFiles = [...prev.files];
        newFiles.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
        newFiles.forEach((f, i) => f.partNumber = i + 1);
        return { ...prev, files: newFiles };
      });

      const token = localStorage.getItem('token');
      const res = await fetch(`/api/assets/${asset.id}/reorder-files`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fileIds: newOrder })
      });
      if (!res.ok) throw new Error('Reorder failed');
    } catch (err) {
      console.error('Failed to reorder files', err);
      fetchAsset();
    }
  };

  const handleRenameStart = (file) => {
    setEditingFileId(file.id);
    setEditingFileName(file.fileName);
  };

  const handleRenameCancel = () => {
    setEditingFileId(null);
    setEditingFileName('');
  };

  const handleRenameSave = async (fileId) => {
    if (!editingFileName || editingFileName.trim() === '') {
      alert('Filename cannot be empty');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/assets/file/${fileId}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newName: editingFileName })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to rename file');
      }
      
      setAsset(prev => {
        const newFiles = [...prev.files];
        const fileIndex = newFiles.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
          newFiles[fileIndex].fileName = data.data.fileName;
          if (newFiles[fileIndex].relativePath) {
            const parentPath = newFiles[fileIndex].relativePath.substring(0, newFiles[fileIndex].relativePath.lastIndexOf('/'));
            newFiles[fileIndex].relativePath = parentPath ? `${parentPath}/${data.data.fileName}` : data.data.fileName;
          }
        }
        return { ...prev, files: newFiles };
      });
      
      handleRenameCancel();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddFiles = async (e) => {
    const fileList = Array.from(e.target.files);
    if (fileList.length === 0) return;

    const filesList = asset.files || [];
    const existingNames = new Set(filesList.map(f => (f.relativePath || f.fileName).toLowerCase()));
    
    for (const f of fileList) {
      const pathToCheck = ((asset.uploadType === 'FOLDER' && f.webkitRelativePath) ? f.webkitRelativePath : f.name).toLowerCase();
      if (existingNames.has(pathToCheck)) {
        alert(`Duplicate file detected: ${f.name}\nPlease select files that are not already in this asset.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    const filesData = fileList.map(file => ({
      name: file.name,
      size: file.size,
      path: (asset.uploadType === 'FOLDER' && file.webkitRelativePath) ? file.webkitRelativePath : file.name
    }));

    try {
      setIsAppending(true);
      const newUploadId = 'upload_append_' + Math.random().toString(36).substr(2, 9);
      
      const token = localStorage.getItem('token');
      const res = await fetch('/api/telegram/upload-append', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          uploadId: newUploadId,
          assetId: asset.id,
          files: filesData
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to start append session');
      }

      const botUrl = `https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_USERNAME}?start=${newUploadId}`;
      window.open(botUrl, '_blank', 'noopener,noreferrer');

      pollingInterval.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/telegram/status/${newUploadId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (pollRes.ok) {
            const data = await pollRes.json();
            if (data.status === 'complete') {
              clearInterval(pollingInterval.current);
              setIsAppending(false);
              setIsAppendingComplete(true);
              fetchAsset();
              setTimeout(() => setIsAppendingComplete(false), 5000);
            } else {
              fetchAsset();
            }
          }
        } catch (err) {
          console.error('Polling error', err);
        }
      }, 2000);
      
    } catch (err) {
      alert(err.message);
      setIsAppending(false);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAppendMultipart = async () => {
    const parts = parseInt(expectedPartsToAdd, 10);
    if (isNaN(parts) || parts <= 0) {
      alert('Please enter a valid positive number for Expected Parts to Add.');
      return;
    }

    try {
      setIsAppending(true);
      setShowAppendInput(false);
      setInitialFileCount(asset.files ? asset.files.length : 0);
      
      const newUploadId = 'upload_append_' + Math.random().toString(36).substr(2, 9);
      
      const token = localStorage.getItem('token');
      const res = await fetch('/api/telegram/upload-append', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          uploadId: newUploadId,
          assetId: asset.id,
          expectedPartsToAdd: parts
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to start append session');
      }

      const botUrl = `https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_USERNAME}?start=${newUploadId}`;
      window.open(botUrl, '_blank', 'noopener,noreferrer');

      pollingInterval.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/telegram/status/${newUploadId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (pollRes.ok) {
            const data = await pollRes.json();
            if (data.status === 'complete') {
              clearInterval(pollingInterval.current);
              setIsAppending(false);
              setIsAppendingComplete(true);
              setExpectedPartsToAdd('');
              fetchAsset();
              setTimeout(() => setIsAppendingComplete(false), 5000);
            } else {
              fetchAsset();
            }
          }
        } catch (err) {
          console.error('Polling error', err);
        }
      }, 2000);
      
    } catch (err) {
      alert(err.message);
      setIsAppending(false);
    }
  };

  const handleIndividualDownload = (file) => {
    setDownloadStatuses(prev => ({ ...prev, [file.id]: 'active' }));
    
    // Open in a new tab synchronously
    window.open(`/api/assets/file/${file.id}/download`, '_blank');

    setTimeout(() => {
      setDownloadStatuses(prev => ({ ...prev, [file.id]: 'done' }));
    }, 1000);
  };

  const handlePrimaryCTA = () => {
    if (!asset || asset.uploadType !== 'SINGLE') return;
    window.open(`/api/assets/${asset.id}/download`, '_blank');
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

  const confirmDelete = async () => {
    if (!assetToDelete) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/assets/${assetToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setAssetToDelete(null);
        navigate(isAdmin ? '/admin' : '/');
      } else {
        alert('Failed to delete asset');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setDeletingFileId(fileToDelete.id);
    const id = fileToDelete.id;
    setFileToDelete(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/assets/file/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.data?.isAssetDeleted) {
          navigate(isAdmin ? '/admin' : '/');
        } else {
          fetchAsset();
        }
      } else {
        alert(data.message || 'Failed to delete file');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingFileId(null);
    }
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
  const initials = getInitials(asset.name);
  const filesList = asset.files || [];
  const sortedFiles = [...filesList].sort((a, b) => (a.partNumber || 0) - (b.partNumber || 0));
  const folderTree = asset.uploadType === 'FOLDER' ? buildTree(filesList) : null;

  // Check if any file metadata is missing Telegram fields
  const missingFiles = filesList.filter(f => !f.telegramMessageId);
  const hasMetadataIssues = missingFiles.length > 0;

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
                  <h4 className="text-xs font-bold text-text-high-contrast font-label-mono uppercase tracking-wider font-semibold">Multipart Archive Details</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Download every part individually before extracting the archive. All <strong>{filesList.length}</strong> parts are indexed below.
                  </p>
                </div>
              </div>
            )}

            {/* Folder Notice Banner */}
            {asset.uploadType === 'FOLDER' && !hasMetadataIssues && (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-sm flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] select-none">info</span>
                <div>
                  <h4 className="text-xs font-bold text-text-high-contrast font-label-mono uppercase tracking-wider font-semibold">Folder Category Details</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Please browse the files inside this category and download them individually using the buttons below.
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
                <div className="flex items-center gap-3">
                  <span className="font-label-mono text-[10px] text-text-muted uppercase">
                    {filesList.length} FILE{filesList.length !== 1 ? 'S' : ''}
                  </span>
                  {isAdmin && asset.uploadType !== 'SINGLE' && (
                    <div className="relative flex items-center gap-2">
                      {asset.uploadType === 'FOLDER' ? (
                        <>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleAddFiles} 
                            multiple 
                            webkitdirectory="true"
                            className="hidden" 
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAppending}
                            className={`text-[10px] font-label-mono font-bold uppercase border transition-colors px-2 py-1 rounded-sm flex items-center gap-1 ${isAppendingComplete ? 'text-success border-success' : 'text-primary border-primary hover:bg-primary/10'}`}
                          >
                            {isAppending ? (
                              <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                            ) : isAppendingComplete ? (
                              <span className="material-symbols-outlined text-[14px]">check</span>
                            ) : (
                              <span className="material-symbols-outlined text-[14px]">add</span>
                            )}
                            {isAppending ? 'ADDING...' : isAppendingComplete ? 'ADDED' : 'ADD FILES'}
                          </button>
                        </>
                      ) : (
                        <>
                          {showAppendInput ? (
                            <div className="flex items-center gap-1 animate-fadeIn">
                              <input
                                type="number"
                                min="1"
                                placeholder="Expected Parts..."
                                value={expectedPartsToAdd}
                                onChange={(e) => setExpectedPartsToAdd(e.target.value)}
                                className="bg-surface-container border border-border-subtle text-text-high-contrast text-[10px] font-label-mono px-2 py-1 rounded-sm w-32 focus:outline-none focus:border-primary placeholder:text-text-muted/50"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAppendMultipart();
                                  if (e.key === 'Escape') setShowAppendInput(false);
                                }}
                              />
                              <button 
                                onClick={handleAppendMultipart}
                                className="bg-primary text-background hover:bg-primary/90 flex items-center justify-center p-1 rounded-sm transition-all"
                              >
                                <span className="material-symbols-outlined text-[14px]">check</span>
                              </button>
                              <button 
                                onClick={() => setShowAppendInput(false)}
                                className="bg-surface border border-border-subtle hover:text-error flex items-center justify-center p-1 rounded-sm transition-all"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowAppendInput(true)}
                              disabled={isAppending}
                              className={`text-[10px] font-label-mono font-bold uppercase border transition-colors px-2 py-1 rounded-sm flex items-center gap-1 ${isAppendingComplete ? 'text-success border-success' : 'text-primary border-primary hover:bg-primary/10'}`}
                            >
                              {isAppending ? (
                                <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                              ) : isAppendingComplete ? (
                                <span className="material-symbols-outlined text-[14px]">check</span>
                              ) : (
                                <span className="material-symbols-outlined text-[14px]">add</span>
                              )}
                              {isAppending ? `APPENDING... ${Math.max(0, filesList.length - initialFileCount)} / ${expectedPartsToAdd}` : isAppendingComplete ? 'ADDED' : 'ADD FILES'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

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
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                          <span className="font-label-mono text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded-sm select-none">PART {file.partNumber || idx + 1}</span>
                          <span className="material-symbols-outlined text-[16px] text-text-muted/70">{fileIcon}</span>
                          {editingFileId === file.id ? (
                            <input 
                              type="text"
                              value={editingFileName}
                              onChange={(e) => setEditingFileName(e.target.value)}
                              className="bg-surface-elevated border border-border-subtle text-text-high-contrast text-xs px-2 py-1 rounded w-full focus:outline-none focus:border-primary"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSave(file.id);
                                if (e.key === 'Escape') handleRenameCancel();
                              }}
                            />
                          ) : (
                            <span className="text-xs font-semibold text-text-high-contrast truncate" title={file.fileName}>{file.fileName}</span>
                          )}
                          <span className="font-label-mono text-[10px] text-text-muted/60 shrink-0">{formatBytes(Number(file.fileSize))}</span>
                          <StatusBadge status={status} />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isAdmin && (
                            editingFileId === file.id ? (
                              <>
                                <button 
                                  onClick={() => handleRenameSave(file.id)}
                                  className="text-success hover:text-success-hover flex items-center justify-center p-1 transition-all"
                                  title="Save"
                                >
                                  <span className="material-symbols-outlined text-[16px]">check</span>
                                </button>
                                <button 
                                  onClick={handleRenameCancel}
                                  className="text-error hover:text-error-hover flex items-center justify-center p-1 transition-all"
                                  title="Cancel"
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => handleRenameStart(file)}
                                  className="text-text-muted hover:text-primary flex items-center justify-center p-1 transition-all"
                                  title="Rename"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                                <button 
                                  onClick={() => handleReorder(file, 'up')}
                                  className="text-text-muted hover:text-primary flex items-center justify-center p-1 transition-all"
                                  title="Move up"
                                >
                                  <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                                </button>
                                <button 
                                  onClick={() => handleReorder(file, 'down')}
                                  className="text-text-muted hover:text-primary flex items-center justify-center p-1 transition-all"
                                  title="Move down"
                                >
                                  <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                                </button>
                                <button 
                                  onClick={() => setFileToDelete(file)}
                                  disabled={deletingFileId === file.id}
                                  className={`text-error hover:text-error-hover flex items-center justify-center p-1 rounded transition-all ${deletingFileId === file.id ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                                  title={`Delete Part ${file.partNumber || idx + 1}`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    {deletingFileId === file.id ? 'hourglass_empty' : 'delete'}
                                  </span>
                                </button>
                              </>
                            )
                          )}
                          <button 
                            onClick={() => handleIndividualDownload(file)}
                            className="text-primary hover:text-primary-hover hover:scale-105 active:scale-95 flex items-center justify-center p-1 transition-all"
                            title={`Download Part ${file.partNumber || idx + 1}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Folder Interactive Tree Explorer */}
              {asset.uploadType === 'FOLDER' && folderTree && (
                <div className="p-4 overflow-x-auto max-h-[440px] overflow-y-auto custom-scrollbar">
                  {folderTree.childrenArray && folderTree.childrenArray.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {folderTree.childrenArray.map((child, idx) => (
                        <TreeNode 
                          key={idx} 
                          node={child} 
                          downloadStatuses={downloadStatuses} 
                          onIndividualDownload={handleIndividualDownload}
                          isAdmin={isAdmin}
                          onIndividualDelete={(file) => setFileToDelete(file)}
                          deletingFileId={deletingFileId}
                          onReorder={handleReorder}
                          editingFileId={editingFileId}
                          editingFileName={editingFileName}
                          setEditingFileName={setEditingFileName}
                          onRenameStart={handleRenameStart}
                          onRenameSave={handleRenameSave}
                          onRenameCancel={handleRenameCancel}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-text-muted text-xs font-label-mono text-center py-6">NO CATEGORY METADATA RETRIEVED</div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Premium Sticky Action Panel & Metadata Cards */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-24">
            
            {/* Primary Action Panel */}
            <div className="bg-surface-elevated border border-border-subtle p-6 rounded-sm flex flex-col gap-4">
              
              {asset.uploadType === 'SINGLE' ? (
                <button 
                  onClick={handlePrimaryCTA}
                  className="w-full bg-primary text-background hover:bg-primary-hover active:bg-primary-active py-3.5 rounded-sm font-label-mono text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01]"
                >
                  <span className="material-symbols-outlined text-[18px]">cloud_download</span>
                  DOWNLOAD ASSET
                </button>
              ) : (
                <div className="bg-surface border border-border-subtle p-3 rounded-sm text-center">
                  <span className="material-symbols-outlined text-primary text-[20px] mb-1 select-none">info</span>
                  <p className="text-[10px] text-text-muted leading-relaxed font-label-mono uppercase tracking-tight">
                    {asset.uploadType === 'MULTIPART' 
                      ? 'Download every part individually before extracting.' 
                      : 'Browse & download files individually below.'}
                  </p>
                </div>
              )}

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

              {/* Admin Edit/Delete Options - ONLY visible on Details page when logged in */}
              {isAdmin && (
                <div className="flex gap-2 w-full mt-4 pt-4 border-t border-border-subtle/30">
                  <button 
                    onClick={() => setEditingAsset(asset)}
                    className="flex-1 bg-surface border border-border-subtle hover:border-primary text-text-high-contrast hover:text-primary py-2.5 rounded-sm font-label-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    EDIT
                  </button>
                  <button 
                    onClick={() => setAssetToDelete(asset)}
                    className="flex-1 bg-surface border border-error/50 text-error hover:bg-error/10 py-2.5 rounded-sm font-label-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    DELETE
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar Metadata Cards Block - Redesigned cleanly without icons */}
            <div className="bg-surface-elevated border border-border-subtle p-6 rounded-sm flex flex-col gap-5 select-none animate-fade-in">
              <h3 className="font-label-mono text-[10px] text-primary font-bold uppercase tracking-wider border-b border-border-subtle pb-3">
                Asset Information
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 border-b border-border-subtle/30 pb-3">
                  <span className="font-label-mono text-[9px] text-text-muted uppercase tracking-wider">Category</span>
                  <span className="text-sm font-bold text-text-high-contrast uppercase">{categoryName}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-border-subtle/30 pb-3">
                  <span className="font-label-mono text-[9px] text-text-muted uppercase tracking-wider">Upload Type</span>
                  <span className="text-sm font-semibold text-text-high-contrast uppercase">{asset.uploadType}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-border-subtle/30 pb-3">
                  <span className="font-label-mono text-[9px] text-text-muted uppercase tracking-wider">Size</span>
                  <span className="text-sm font-semibold text-text-high-contrast">{sizeFormatted}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-border-subtle/30 pb-3">
                  <span className="font-label-mono text-[9px] text-text-muted uppercase tracking-wider">File Count</span>
                  <span className="text-sm font-semibold text-text-high-contrast">{filesList.length} File{filesList.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-col gap-1 pb-1">
                  <span className="font-label-mono text-[9px] text-text-muted uppercase tracking-wider">Uploaded At</span>
                  <span className="text-xs font-semibold text-text-high-contrast">{timeFormatted}</span>
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

        {/* Admin Edit Modal */}
        {editingAsset && (
          <EditAssetModal 
            isOpen={true} 
            asset={editingAsset} 
            onClose={() => setEditingAsset(null)}
            onSuccess={() => {
              setEditingAsset(null);
              fetchAsset();
            }}
          />
        )}

        {/* Admin Delete Confirmation Modal */}
        {assetToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="bg-surface-base border border-border-subtle rounded p-6 w-full max-w-sm shadow-2xl flex flex-col">
              <h2 className="text-xl font-bold text-text-high-contrast mb-2">Delete Asset</h2>
              <p className="text-xs text-text-muted mb-6">Are you sure you want to permanently delete "{assetToDelete.name}"? The file will remain in Telegram, but the metadata will be destroyed.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setAssetToDelete(null)}
                  className="flex-1 py-2.5 rounded-sm font-label-mono text-xs font-medium transition-colors bg-surface-elevated text-text-muted hover:text-text-high-contrast border border-border-subtle"
                >
                  CANCEL
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-sm font-label-mono text-xs font-bold transition-all bg-error text-white hover:bg-error/90 shadow-lg"
                >
                  DELETE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Delete File Confirmation Modal */}
        {fileToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="bg-surface-base border border-border-subtle rounded p-6 w-full max-w-sm shadow-2xl flex flex-col animate-fade-in">
              <h2 className="text-xl font-bold text-text-high-contrast mb-2">Delete File</h2>
              <p className="text-xs text-text-muted mb-6">Are you sure you want to permanently delete "{fileToDelete.fileName}"? This will remove the file from Telegram storage and cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setFileToDelete(null)}
                  className="flex-1 py-2.5 rounded-sm font-label-mono text-xs font-medium transition-colors bg-surface-elevated text-text-muted hover:text-text-high-contrast border border-border-subtle"
                >
                  CANCEL
                </button>
                <button 
                  onClick={confirmDeleteFile}
                  className="flex-1 py-2.5 rounded-sm font-label-mono text-xs font-bold transition-all bg-error text-white hover:bg-error/90 shadow-lg"
                >
                  DELETE
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
