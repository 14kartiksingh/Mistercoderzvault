import React, { useState, useEffect } from 'react';

const EditAssetModal = ({ isOpen, asset, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    thumbnail: ''
  });
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.status === 'success' && data.data) {
          setCategories(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch categories', err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (asset) {
      setFormData({
        title: asset.name || '',
        description: asset.description || '',
        category: asset.category?.name || 'Games',
        tags: asset.tags ? asset.tags.map(t => t.name).join(', ') : '',
        thumbnail: asset.thumbnailUrl || ''
      });
      setError('');
    }
  }, [asset]);

  if (!isOpen || !asset) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setError('');
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

      // We need categoryId but we only have category name in the form, 
      // however our backend might need us to resolve the category first.
      // Wait, updateAsset currently expects `categoryId`.
      // The prompt says "Allow editing only: Title, Description, Category, Tags, Thumbnail".
      // Let's assume the backend will need to be updated to accept `categoryName` or we can find it.
      // For now, let's just pass `categoryId: asset.categoryId` if they didn't change it, 
      // but if they did, we might need a separate endpoint or logic.
      // Let's pass the new data to the backend.

      const payload = {
        name: formData.title,
        description: formData.description,
        thumbnailUrl: formData.thumbnail,
        tags: tagsArray,
        categoryName: formData.category // We'll update backend to handle this
      };

      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to update asset');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-surface-base border border-border-subtle rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-high-contrast">Edit Metadata</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-high-contrast transition-colors">
            <span className="material-symbols-outlined text-2xl" data-icon="close">close</span>
          </button>
        </div>

        {error && (
          <div className="bg-error/10 text-error p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-high-contrast mb-1">Title</label>
            <input 
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-surface-container border border-border-subtle rounded-xl text-text-high-contrast focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-high-contrast mb-1">Category</label>
            <select 
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-surface-container border border-border-subtle rounded-xl text-text-high-contrast focus:outline-none focus:border-primary"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
              {categories.length === 0 && (
                <>
                  <option>Games</option>
                  <option>Movies</option>
                  <option>Apps</option>
                  <option>Software</option>
                  <option>Books</option>
                  <option>Music</option>
                  <option>Other</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-high-contrast mb-1">Thumbnail URL</label>
            <input 
              name="thumbnail"
              value={formData.thumbnail}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-surface-container border border-border-subtle rounded-xl text-text-high-contrast focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-high-contrast mb-1">Description</label>
            <textarea 
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 bg-surface-container border border-border-subtle rounded-xl text-text-high-contrast focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-high-contrast mb-1">Tags (comma separated)</label>
            <input 
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-surface-container border border-border-subtle rounded-xl text-text-high-contrast focus:outline-none focus:border-primary"
            />
          </div>

        </div>

        <div className="flex gap-3 mt-8">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-medium transition-colors bg-surface-elevated text-text-base hover:text-primary border border-border-subtle"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 rounded-xl font-bold transition-all bg-primary text-background hover:bg-primary/90 shadow-lg"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAssetModal;
