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

function Home() {
  return (
    <>
      <Header />
      <main className="mt-16 pb-24">
        <section className="px-margin-mobile pt-8 pb-6 flex flex-col gap-6">
          <SearchBar />
        </section>
        <DirectoriesGrid />
        <NewUploads />
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/change-password" element={<ChangePassword />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
