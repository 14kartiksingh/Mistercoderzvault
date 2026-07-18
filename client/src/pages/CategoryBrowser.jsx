import React, { useState, useEffect, useMemo } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCategoryAssets = async () => {
    setLoading(true);
    try {
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

  const filteredAssets = useMemo(() => {
    if (!searchTerm) return assets;
    const query = searchTerm.toLowerCase();
    return assets.filter(asset => 
      asset.name.toLowerCase().includes(query) ||
      (asset.description && asset.description.toLowerCase().includes(query))
    );
  }, [assets, searchTerm]);

  return (
    <>
      <Header />
      <main className="mt-16 pb-28 max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Back navigation & search section */}
        <section className="pt-8 pb-6 flex flex-col gap-6 select-none">
          <Link 
            to={isAdmin ? "/admin" : "/"} 
            className="text-primary font-label-mono text-xs uppercase flex items-center gap-1 hover:opacity-80 w-fit transition-opacity"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Home
          </Link>
          <SearchBar value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </section>
        
        {/* Category Details Listing */}
        <section>
          <div className="flex items-center justify-between mb-4 select-none">
            <h2 className="font-headline-sm text-headline-sm text-text-high-contrast uppercase tracking-tighter">
              {slug.replace(/-/g, ' ')}
            </h2>
            {searchTerm && !loading && (
              <span className="font-label-mono text-[9px] text-text-muted bg-surface-container px-2 py-0.5 rounded-sm">
                SHOWING {filteredAssets.length} OF {assets.length} ASSETS
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col gap-px bg-border-subtle border border-border-subtle">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="bg-surface-elevated flex items-center justify-between p-4 border border-border-subtle rounded-sm">
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-12 h-12 bg-surface-container animate-pulse rounded shrink-0"></div>
                    <div className="w-1/2">
                      <div className="h-4 bg-surface-container animate-pulse rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-surface-container animate-pulse rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-error bg-surface-elevated border border-border-subtle rounded-sm select-none">
              {error}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-8 text-center text-text-muted bg-surface-elevated border border-border-subtle rounded-sm flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-[32px] text-text-muted">search_off</span>
              <span className="font-label-mono text-xs uppercase">No matching assets found</span>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="text-xs font-label-mono font-bold text-primary hover:underline uppercase"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-px bg-border-subtle border border-border-subtle">
              {filteredAssets.map((asset) => (
                <AssetCard 
                  key={asset.id} 
                  asset={asset} 
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </section>

        {/* Admin Modals */}
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
      </main>
      <Footer />
    </>
  );
};

export default CategoryBrowser;
