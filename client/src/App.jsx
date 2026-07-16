import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import DirectoriesGrid from './components/DirectoriesGrid';
import NewUploads from './components/NewUploads';
import Footer from './components/Footer';
import AdminLogin from './pages/AdminLogin';
import ChangePassword from './pages/ChangePassword';
import AdminDashboard from './pages/AdminDashboard';
import UploadMetadata from './pages/UploadMetadata';
import CategoryBrowser from './pages/CategoryBrowser';
import { useNavigate } from 'react-router-dom';

function Home({ isAdmin }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  return (
    <>
      <Header />
      <main className="mt-16 pb-24">
        <section className="px-margin-mobile pt-8 pb-6 flex flex-col gap-6">
          <SearchBar />
        </section>

        {isAdmin && (
          <section className="px-margin-mobile mb-8">
            <h2 className="font-headline-sm text-headline-sm text-text-high-contrast uppercase tracking-tighter mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button 
                onClick={() => navigate('/admin/upload')}
                className="bg-primary text-background px-4 py-3 font-label-mono font-bold hover:bg-primary-hover active:bg-primary-active transition-colors flex-1 flex justify-center items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
                Upload New File
              </button>
              <button 
                onClick={() => navigate('/admin/change-password')}
                className="bg-surface-elevated text-text-high-contrast px-4 py-3 font-label-mono border border-border-subtle hover:border-text-muted transition-colors flex-1 flex justify-center items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">key</span>
                Change Password
              </button>
              <button 
                onClick={handleLogout}
                className="bg-surface-elevated text-error px-4 py-3 font-label-mono border border-error/30 hover:bg-error/10 transition-colors flex-1 flex justify-center items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Logout
              </button>
            </div>
          </section>
        )}

        <DirectoriesGrid isAdmin={isAdmin} />
        <NewUploads isAdmin={isAdmin} />
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
        
        {/* Admin Routes */}
        <Route path="/admin" element={<Home isAdmin={true} />} />
        <Route path="/admin/category/:slug" element={<CategoryBrowser isAdmin={true} />} />
        <Route path="/admin/upload" element={<UploadMetadata />} />
        <Route path="/admin/change-password" element={<ChangePassword />} />
        
        <Route path="/admin/login" element={<AdminLogin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
