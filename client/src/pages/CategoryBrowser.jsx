import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import AssetCard from '../components/AssetCard';
import EditAssetModal from '../components/EditAssetModal';
import Footer from '../components/Footer';

const CategoryBrowser = ({ isAdmin }) => {
  const { slug } = useParams();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetToDelete, setAssetToDelete] = useState(null);

  const fetchCategoryAssets = async () => {
    setLoading(true);
    try {
      // In a real app we'd have a specific endpoint or query parameter, 
      // e.g. /api/assets?category=slug
      // For now, let's fetch all and filter, or assume backend can filter.
      // Let's check backend if it supports category filtering.
      // Since it doesn't currently, we'll fetch all and filter client-side for simplicity,
      // or we can update the backend to support ?categorySlug=slug.
      // I will update the backend assetController to support it.
      
      const res = await fetch(`/api/assets?categorySlug=${slug}`);
      if (!res.ok) throw new Error('Failed to fetch category assets');
      const data = await res.json();
      setAssets(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryAssets();
  }, [slug]);

  const handleEdit = (asset) => setEditingAsset(asset);
  
  const handleEditSuccess = () => {
    setEditingAsset(null);
    fetchCategoryAssets();
  };

  const handleDelete = (asset) => setAssetToDelete(asset);

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
        fetchCategoryAssets();
      } else {
        alert('Failed to delete asset');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <Header />
      <main className="mt-16 pb-24">
        <section className="px-margin-mobile pt-8 pb-6 flex flex-col gap-6">
          <Link to={isAdmin ? "/admin" : "/"} className="text-primary font-label-mono text-sm uppercase flex items-center gap-1 hover:opacity-80 w-fit">
            <span className="material-symbols-outlined text-[16px]" data-icon="arrow_back">arrow_back</span>
            Back to Home
          </Link>
          <SearchBar />
        </section>
        
        <section className="px-margin-mobile">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline-sm text-headline-sm text-text-high-contrast uppercase tracking-tighter">
              {slug.replace(/-/g, ' ')}
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-text-muted">Loading assets...</div>
          ) : error ? (
            <div className="p-8 text-center text-error">{error}</div>
          ) : assets.length === 0 ? (
            <div className="p-8 text-center text-text-muted bg-surface-elevated border border-border-subtle rounded-xl">
              No assets found in this category.
            </div>
          ) : (
            <div className="flex flex-col gap-px bg-border-subtle border border-border-subtle">
              {assets.map((asset) => (
                <AssetCard 
                  key={asset.id} 
                  asset={asset} 
                  isAdmin={isAdmin}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>

        {editingAsset && (
          <EditAssetModal 
            isOpen={true} 
            asset={editingAsset} 
            onClose={() => setEditingAsset(null)}
            onSuccess={handleEditSuccess}
          />
        )}

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
      </main>
      <Footer />
    </>
  );
};

export default CategoryBrowser;
