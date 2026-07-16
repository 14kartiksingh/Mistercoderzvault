import React from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import DirectoriesGrid from './components/DirectoriesGrid';
import NewUploads from './components/NewUploads';
import Footer from './components/Footer';

function App() {
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

export default App;
