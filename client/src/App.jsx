import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import CategoriesGrid from './components/CategoriesGrid';
import Footer from './components/Footer';
import AdminLogin from './pages/AdminLogin';
import ChangePassword from './pages/ChangePassword';
import UploadMetadata from './pages/UploadMetadata';
import CategoryBrowser from './pages/CategoryBrowser';
import DownloadAsset from './pages/DownloadAsset';
import AssetCard from './components/AssetCard';
import EditAssetModal from './components/EditAssetModal';
import ManageCategories from './pages/ManageCategories';

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 KB';
  const k = 1024;
  const sizes = ['KB', 'MB', 'GB', 'TB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) {
    return (bytes / k).toFixed(2) + ' KB';
  }
  const sizesIndex = i - 1;
  if (sizesIndex >= sizes.length) {
    return (bytes / Math.pow(k, sizes.length)).toFixed(2) + ' TB';
  }
  const val = bytes / Math.pow(k, i);
  return parseFloat(val.toFixed(2)) + ' ' + sizes[sizesIndex];
};

function Home({ isAdmin }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetToDelete, setAssetToDelete] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/assets/stats');
      const data = await res.json();
      if (data.status === 'success') {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets');
      if (!res.ok) throw new Error('Failed to fetch assets');
      const data = await res.json();
      setAssets(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAssets();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const handleEditSuccess = () => {
    setEditingAsset(null);
    fetchAssets();
    fetchStats();
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
        fetchAssets();
        fetchStats();
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
      (asset.category?.name && asset.category.name.toLowerCase().includes(query)) ||
      (asset.description && asset.description.toLowerCase().includes(query))
    );
  }, [assets, searchTerm]);

  const totalStorageFormatted = useMemo(() => {
    if (!stats || stats.totalStorage === undefined || stats.totalStorage === null) return '0 KB';
    return formatBytes(Number(stats.totalStorage));
  }, [stats]);

  return (
    <>
      <Header />
      <main className="mt-16 pb-28">
        
        {/* Premium Hero Section */}
        <section className="px-margin-mobile pt-10 pb-8 flex flex-col items-center text-center select-none max-w-4xl mx-auto">
          <h1 className="font-headline-lg text-4xl sm:text-5xl md:text-6xl text-text-high-contrast uppercase tracking-tighter mb-6">
            VAULT
          </h1>
          <div className="w-full max-w-2xl mb-6">
            <SearchBar value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {!searchTerm && (
              <p className="text-[11px] sm:text-xs text-text-muted/70 mt-3 font-label-mono uppercase tracking-wide">
                Search your Vault to instantly find files, folders, and archives.
              </p>
            )}
          </div>
          
          {/* Statistics Strip */}
          <div className={`w-full max-w-2xl bg-surface-elevated border border-border-subtle grid ${
            !loadingStats && (!stats || stats.totalStorage === undefined || stats.totalStorage === null)
              ? 'grid-cols-2'
              : 'grid-cols-3'
          } divide-x divide-border-subtle p-3 rounded-sm`}>
            <div className="flex flex-col items-center justify-center p-1">
              {loadingStats ? (
                <div className="h-5 w-12 bg-surface-container animate-pulse rounded mb-1"></div>
              ) : (
                <span className="font-label-mono text-sm sm:text-base font-bold text-text-high-contrast">
                  {stats?.totalAssets || 0}
                </span>
              )}
              <span className="text-[9px] font-label-mono text-text-muted uppercase tracking-wider">Assets</span>
            </div>
            
            {(loadingStats || (stats && stats.totalStorage !== undefined && stats.totalStorage !== null)) && (
              <div className="flex flex-col items-center justify-center p-1">
                {loadingStats ? (
                  <div className="h-5 w-16 bg-surface-container animate-pulse rounded mb-1"></div>
                ) : (
                  <span className="font-label-mono text-sm sm:text-base font-bold text-text-high-contrast">
                    {totalStorageFormatted}
                  </span>
                )}
                <span className="text-[9px] font-label-mono text-text-muted uppercase tracking-wider">Storage</span>
              </div>
            )}
            
            <div className="flex flex-col items-center justify-center p-1">
              {loadingStats ? (
                <div className="h-5 w-10 bg-surface-container animate-pulse rounded mb-1"></div>
              ) : (
                <span className="font-label-mono text-sm sm:text-base font-bold text-text-high-contrast">
                  {stats?.totalCategories || 0}
                </span>
              )}
              <span className="text-[9px] font-label-mono text-text-muted uppercase tracking-wider">Categories</span>
            </div>
          </div>
        </section>

        {/* Admin Quick Actions */}
        {isAdmin && (
          <section className="px-margin-mobile mb-8 max-w-4xl mx-auto">
            <h2 className="font-label-mono text-[10px] text-text-muted uppercase tracking-wider mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button 
                onClick={() => navigate('/admin/upload')}
                className="bg-primary text-background px-4 py-3 font-label-mono font-bold hover:bg-primary-hover active:bg-primary-active transition-colors flex-1 flex justify-center items-center gap-2 rounded-sm"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
                Upload New File
              </button>
              <button 
                onClick={() => navigate('/admin/categories')}
                className="bg-surface-elevated text-text-high-contrast px-4 py-3 font-label-mono border border-border-subtle hover:border-text-muted transition-colors flex-1 flex justify-center items-center gap-2 rounded-sm"
              >
                <span className="material-symbols-outlined text-[18px]">category</span>
                Manage Categories
              </button>
              <button 
                onClick={() => navigate('/admin/change-password')}
                className="bg-surface-elevated text-text-high-contrast px-4 py-3 font-label-mono border border-border-subtle hover:border-text-muted transition-colors flex-1 flex justify-center items-center gap-2 rounded-sm"
              >
                <span className="material-symbols-outlined text-[18px]">key</span>
                Change Password
              </button>
              <button 
                onClick={handleLogout}
                className="bg-surface-elevated text-error px-4 py-3 font-label-mono border border-error/30 hover:bg-error/10 transition-colors flex-1 flex justify-center items-center gap-2 rounded-sm"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Logout
              </button>
            </div>
          </section>
        )}

        <div className="max-w-4xl mx-auto">
          {/* Categories Section */}
          <CategoriesGrid isAdmin={isAdmin} />
          
          {/* Search Results Section */}
          {searchTerm && (
            <section className="px-margin-mobile mb-section-gap animate-fade-in">
              <div className="flex items-center justify-between mb-4 select-none">
                <h2 className="font-headline-sm text-headline-sm text-text-high-contrast uppercase tracking-tighter flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">search</span>
                  Search Results
                </h2>
                <span className="font-label-mono text-[9px] text-text-muted bg-surface-container px-2 py-0.5 rounded-sm select-none">
                  SHOWING {filteredAssets.length} OF {assets.length} ASSETS
                </span>
              </div>
              
              {loadingAssets ? (
                <div className="flex flex-col gap-px bg-border-subtle border border-border-subtle">
                  {[...Array(3)].map((_, idx) => (
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
                <div className="p-12 text-center bg-surface-elevated border border-border-subtle rounded-sm flex flex-col items-center justify-center gap-4 select-none animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center border border-border-subtle shadow-inner">
                    <span className="material-symbols-outlined text-[28px] text-text-muted">search_off</span>
                  </div>
                  <div className="flex flex-col gap-1.5 max-w-sm">
                    <h3 className="font-label-mono text-xs text-text-high-contrast uppercase tracking-wider font-semibold">
                      No matching assets found
                    </h3>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Try another keyword or browse a category.
                    </p>
                  </div>
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="text-[10px] font-label-mono font-bold text-primary hover:underline uppercase tracking-wider border border-primary/20 px-3 py-1.5 rounded-sm bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-px bg-border-subtle border border-border-subtle animate-fade-in">
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
          )}
        </div>

        {/* Reusable Modals */}
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
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home isAdmin={false} />} />
        <Route path="/category/:slug" element={<CategoryBrowser isAdmin={false} />} />
        <Route path="/download/:id" element={<DownloadAsset isAdmin={false} />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<Home isAdmin={true} />} />
        <Route path="/admin/category/:slug" element={<CategoryBrowser isAdmin={true} />} />
        <Route path="/admin/download/:id" element={<DownloadAsset isAdmin={true} />} />
        <Route path="/admin/upload" element={<UploadMetadata />} />
        <Route path="/admin/categories" element={<ManageCategories />} />
        <Route path="/admin/change-password" element={<ChangePassword />} />
        
        <Route path="/admin/login" element={<AdminLogin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
