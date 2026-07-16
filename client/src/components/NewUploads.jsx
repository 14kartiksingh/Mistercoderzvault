import React, { useState, useEffect } from 'react';
import AssetCard from './AssetCard';
import EditAssetModal from './EditAssetModal';

const NewUploads = ({ isAdmin }) => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetToDelete, setAssetToDelete] = useState(null);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assets');
      if (!res.ok) throw new Error('Failed to fetch assets');
      const data = await res.json();
      // data.data should be the array of assets
      setUploads(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const handleEdit = (asset) => {
    setEditingAsset(asset);
  };

  const handleEditSuccess = () => {
    setEditingAsset(null);
    fetchUploads();
  };

  const handleDelete = (asset) => {
    setAssetToDelete(asset);
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
        fetchUploads();
      } else {
        alert('Failed to delete asset');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section className="px-margin-mobile">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline-sm text-headline-sm text-text-high-contrast uppercase tracking-tighter">Recent Uploads</h2>
      </div>

      {loading ? (
        <div className="p-8 text-center text-text-muted">Loading uploads...</div>
      ) : error ? (
        <div className="p-8 text-center text-error">{error}</div>
      ) : uploads.length === 0 ? (
        <div className="p-8 text-center text-text-muted bg-surface-elevated border border-border-subtle rounded-xl">
          No uploads yet.
        </div>
      ) : (
        <div className="flex flex-col gap-px bg-border-subtle border border-border-subtle">
          {uploads.map((upload) => (
            <AssetCard 
              key={upload.id} 
              asset={upload} 
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingAsset && (
        <EditAssetModal 
          isOpen={true} 
          asset={editingAsset} 
          onClose={() => setEditingAsset(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface-base border border-border-subtle rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col">
            <h2 className="text-xl font-bold text-text-high-contrast mb-2">Delete Asset</h2>
            <p className="text-text-base mb-6">Are you sure you want to permanently delete "{assetToDelete.name}"? The file will remain in Telegram, but the metadata will be destroyed.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setAssetToDelete(null)}
                className="flex-1 py-3 rounded-xl font-medium transition-colors bg-surface-elevated text-text-base hover:text-text-high-contrast border border-border-subtle"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl font-bold transition-all bg-error text-white hover:bg-error/90 shadow-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default NewUploads;
