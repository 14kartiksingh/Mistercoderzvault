import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function UploadMetadata() {
  const navigate = useNavigate();
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | complete
  const [uploadId, setUploadId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [assetDetails, setAssetDetails] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Games',
    uploadType: 'SINGLE'
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState('');
  const pollingInterval = useRef(null);

  useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFilesChange = (e) => {
    const fileList = Array.from(e.target.files);
    const filesData = fileList.map(file => ({
      name: file.name,
      size: file.size,
      path: file.webkitRelativePath || file.name
    }));
    setSelectedFiles(filesData);
  };

  const handleContinue = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required to continue.');
      return;
    }

    if (formData.uploadType !== 'SINGLE' && selectedFiles.length === 0) {
      setError(`Please select files to upload for a ${formData.uploadType === 'MULTIPART' ? 'Multipart Archive' : 'Folder'}.`);
      return;
    }

    try {
      const newUploadId = 'upload_' + Math.random().toString(36).substr(2, 9);
      setUploadId(newUploadId);

      const res = await fetch('/api/telegram/upload-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uploadId: newUploadId,
          metadata: {
            ...formData,
            tags: [],
            thumbnail: '',
            files: selectedFiles
          }
        })
      });
      
      if (!res.ok) throw new Error('Failed to start upload session');
      const startRes = await res.json();
      
      let createdAssetId = '';
      if (startRes.status === 'success' && startRes.data) {
        createdAssetId = startRes.data.assetId;
        setAssetId(createdAssetId);
      }

      setUploadState('uploading');

      // Open Telegram
      const botUrl = `https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_USERNAME}?start=${newUploadId}`;
      window.open(botUrl, '_blank', 'noopener,noreferrer');

      // Start Polling
      pollingInterval.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/telegram/status/${newUploadId}`);
          if (pollRes.ok) {
            const data = await pollRes.json();
            if (data.status === 'complete') {
              clearInterval(pollingInterval.current);
              setUploadState('complete');
            }
          }

          if (createdAssetId) {
            const assetRes = await fetch(`/api/assets/${createdAssetId}`);
            if (assetRes.ok) {
              const assetData = await assetRes.json();
              if (assetData.status === 'success') {
                setAssetDetails(assetData.data);
              }
            }
          }
        } catch (err) {
          console.error('Polling error', err);
        }
      }, 2000);
      
    } catch (err) {
      setError('An error occurred starting the upload.');
    }
  };

  const handleFinishManually = async () => {
    if (!uploadId) return;
    try {
      const res = await fetch(`/api/telegram/upload-finish/${uploadId}`, {
        method: 'POST'
      });
      if (res.ok) {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        setUploadState('complete');
      } else {
        setError('Failed to finish upload manually.');
      }
    } catch (err) {
      setError('Error finishing upload.');
    }
  };

  const handleCancel = async () => {
    if (uploadId) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`/api/telegram/upload-cancel/${uploadId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Error cancelling upload:', err);
      }
    }
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    handleReset();
    navigate('/admin');
  };

  const handleReset = () => {
    setUploadState('idle');
    setUploadId('');
    setAssetId('');
    setAssetDetails(null);
    setFormData({ title: '', description: '', category: 'Games', uploadType: 'SINGLE' });
    setSelectedFiles([]);
    setError('');
  };

  if (uploadState === 'complete') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-surface-base border border-border-subtle rounded-2xl p-10 shadow-2xl flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 text-green-500">
            <span className="material-symbols-outlined text-4xl" data-icon="check_circle">check_circle</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3 text-text-high-contrast">Upload Complete</h1>
          <p className="text-text-base mb-2">Your asset has been successfully uploaded to Telegram.</p>
          <div className="w-full bg-surface-container border border-border-subtle rounded-lg p-4 mb-8">
            <p className="text-sm text-text-muted font-medium mb-1">Asset Title:</p>
            <p className="font-semibold text-text-high-contrast truncate">{formData.title}</p>
          </div>
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={handleReset}
              className="w-full py-3.5 rounded-xl font-bold transition-all bg-primary text-background hover:bg-primary/90 shadow-lg hover:shadow-primary/25"
            >
              Upload Another
            </button>
            <Link
              to="/admin"
              className="w-full py-3.5 rounded-xl font-medium transition-colors bg-surface-elevated text-text-base hover:text-primary border border-border-subtle"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (uploadState === 'uploading') {
    const files = assetDetails?.files || [];
    const uploadedCount = files.filter(f => f.telegramFileId).length;
    const totalCount = files.length;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-xl w-full bg-surface-base border border-border-subtle rounded-2xl p-8 sm:p-10 shadow-2xl flex flex-col items-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary animate-pulse">
            <span className="material-symbols-outlined text-4xl animate-bounce" data-icon="send">send</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-3 text-text-high-contrast">Uploading via Telegram</h1>
          <p className="text-text-base mb-6 text-center leading-relaxed max-w-md">
            Please forward your files to the Telegram Bot.<br/>
            This page will automatically update once all files are received.
          </p>

          {formData.uploadType !== 'SINGLE' && totalCount > 0 && (
            <div className="w-full bg-surface-container border border-border-subtle rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-text-high-contrast">Progress</span>
                <span className="text-xs font-label-mono text-primary bg-primary/15 px-2 py-0.5 rounded">{uploadedCount} / {totalCount} Files</span>
              </div>
              <div className="w-full h-2 bg-surface rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-primary transition-all duration-500 rounded-full" 
                  style={{ width: `${(uploadedCount / totalCount) * 100}%` }}
                ></div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {files.map((file, idx) => (
                  <div key={file.id || idx} className="flex justify-between items-center text-xs p-2 bg-surface rounded border border-border-subtle">
                    <span className="text-text-high-contrast truncate max-w-[70%]" title={file.fileName}>{file.fileName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted font-label-mono">{formatBytes(Number(file.fileSize))}</span>
                      {file.telegramFileId ? (
                        <span className="material-symbols-outlined text-green-500 text-[16px]" data-icon="check_circle">check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-text-muted text-[16px] animate-spin" data-icon="progress_activity">progress_activity</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formData.uploadType === 'SINGLE' && (
            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden mb-6">
              <div className="h-full bg-primary animate-[indeterminate_1.5s_infinite_linear] origin-left rounded-full w-full"></div>
            </div>
          )}

          <div className="flex flex-col w-full gap-3">
            {formData.uploadType !== 'SINGLE' && (
              <button
                onClick={handleFinishManually}
                className="w-full py-3.5 rounded-xl font-bold transition-all bg-primary text-background hover:bg-primary/90 shadow-lg"
              >
                Finish Upload (All Sent)
              </button>
            )}
            <button
              onClick={handleCancel}
              className="w-full py-3.5 text-center rounded-xl font-medium transition-colors bg-surface-elevated text-text-base hover:text-primary border border-border-subtle"
            >
              Cancel Upload
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-10 px-4 font-sans">
      <div className="w-full max-w-2xl bg-surface-base border border-border-subtle rounded-2xl shadow-xl p-8 sm:p-10">
        
        <div className="flex items-center justify-between mb-10 pb-4 border-b border-border-subtle">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-high-contrast mb-1">Upload Asset</h1>
            <p className="text-text-muted text-sm font-medium">Prepare metadata and files before sending</p>
          </div>
          <Link to="/admin" className="p-2 rounded-full hover:bg-surface-elevated text-text-muted hover:text-primary transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl" data-icon="close">close</span>
          </Link>
        </div>

        <form onSubmit={handleContinue} className="space-y-7">
          {error && (
            <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]" data-icon="error">error</span>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-text-high-contrast" htmlFor="title">
              Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-surface-container border border-border-subtle rounded-xl text-text-high-contrast focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-text-muted/50"
              placeholder="e.g., Grand Theft Auto V"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-text-high-contrast" htmlFor="uploadType">
                Upload Type
              </label>
              <div className="relative">
                <select
                  id="uploadType"
                  name="uploadType"
                  value={formData.uploadType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-container border border-border-subtle rounded-xl text-text-high-contrast appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  <option value="SINGLE">Single File</option>
                  <option value="MULTIPART">Multipart Archive</option>
                  <option value="FOLDER">Folder Upload</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" data-icon="expand_more">expand_more</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-text-high-contrast" htmlFor="category">
                Category
              </label>
              <div className="relative">
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-container border border-border-subtle rounded-xl text-text-high-contrast appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  <option>Games</option>
                  <option>Movies</option>
                  <option>Apps</option>
                  <option>Software</option>
                  <option>Books</option>
                  <option>Music</option>
                  <option>Other</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" data-icon="expand_more">expand_more</span>
              </div>
            </div>
          </div>

          {formData.uploadType !== 'SINGLE' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="block text-sm font-semibold text-text-high-contrast">
                {formData.uploadType === 'MULTIPART' ? 'Select Archive Parts *' : 'Select Folder *'}
              </label>
              <div className="relative w-full h-12 bg-surface-container border border-border-subtle rounded-xl hover:border-primary/50 transition-colors flex items-center px-4 cursor-pointer overflow-hidden group">
                <input
                  type="file"
                  multiple={formData.uploadType === 'MULTIPART'}
                  webkitdirectory={formData.uploadType === 'FOLDER' ? '' : undefined}
                  directory={formData.uploadType === 'FOLDER' ? '' : undefined}
                  onChange={handleFilesChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                />
                <div className="flex items-center gap-2 text-text-muted group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]" data-icon="folder_open">folder_open</span>
                  <span className="text-sm font-medium">
                    {selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : `Select files...`}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-text-high-contrast" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-surface-container border border-border-subtle rounded-xl text-text-high-contrast focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none placeholder:text-text-muted/50"
              placeholder="Enter a description..."
            />
          </div>

          <div className="pt-8">
            <button
              type="submit"
              className="w-full bg-primary text-background font-bold py-4 rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-lg shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2"
            >
              <span>Continue Upload</span>
              <span className="material-symbols-outlined text-[20px]" data-icon="arrow_forward">arrow_forward</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default UploadMetadata;
