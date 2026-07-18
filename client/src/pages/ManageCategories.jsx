import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ManageCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Verify auth
  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
    }
  }, [token, navigate]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/categories?all=true');
      const data = await res.json();
      if (data.status === 'success') {
        setCategories(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch categories');
      }
    } catch (err) {
      console.error(err);
      setError('Network error fetching categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCategories();
    }
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setSubmitting(true);
      setError('');
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName.trim() })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setNewName('');
        fetchCategories();
      } else {
        setError(data.message || 'Failed to add category');
      }
    } catch (err) {
      setError('Network error adding category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (category) => {
    try {
      setError('');
      const res = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !category.isActive })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        fetchCategories();
      } else {
        setError(data.message || 'Failed to toggle status');
      }
    } catch (err) {
      setError('Network error updating category');
    }
  };

  const handleStartEdit = (category) => {
    setEditingCategory(category);
    setEditName(category.name);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editingCategory) return;
    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName.trim() })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setEditingCategory(null);
        fetchCategories();
      } else {
        setError(data.message || 'Failed to update category name');
      }
    } catch (err) {
      setError('Network error updating category name');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? Only categories containing zero assets can be deleted.')) return;
    try {
      setError('');
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        fetchCategories();
      } else {
        setError(data.message || 'Failed to delete category');
      }
    } catch (err) {
      setError('Network error deleting category');
    }
  };

  const handleMove = async (index, direction) => {
    const newCategories = [...categories];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newCategories.length) return;

    // Swap
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;

    // Update local state immediately for visual responsiveness
    setCategories(newCategories);

    // Save to database
    try {
      const orders = newCategories.map((cat, i) => ({ id: cat.id, order: i }));
      const res = await fetch('/api/categories/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orders })
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        setError(data.message || 'Failed to save new order');
        fetchCategories(); // Revert
      }
    } catch (err) {
      setError('Network error saving category order');
      fetchCategories(); // Revert
    }
  };

  return (
    <>
      <Header />
      <main className="mt-16 pb-28 max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] font-label-mono text-text-muted uppercase tracking-wider mb-6 select-none">
          <Link to="/admin" className="hover:text-primary transition-colors">ADMIN</Link>
          <span>/</span>
          <span className="text-text-high-contrast">Manage Categories</span>
        </div>

        <div className="flex flex-col gap-6">
          {/* Create Category form */}
          <div className="bg-surface-elevated border border-border-subtle p-6 rounded-sm">
            <h2 className="font-headline-sm text-lg text-text-high-contrast uppercase tracking-tighter mb-4">Create Category</h2>
            <form onSubmit={handleAdd} className="flex gap-2">
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name (e.g., Games, Software)"
                className="flex-1 bg-surface-base border border-border-subtle px-4 py-2.5 rounded-sm text-xs font-label-mono placeholder:text-text-muted focus:border-primary transition-colors outline-none"
                disabled={submitting}
              />
              <button 
                type="submit"
                className="bg-primary text-background hover:bg-primary-hover px-5 py-2.5 font-label-mono text-xs font-bold transition-all rounded-sm disabled:opacity-50"
                disabled={submitting || !newName.trim()}
              >
                ADD CATEGORY
              </button>
            </form>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="bg-error/10 border border-error/20 p-4 rounded-sm text-xs font-label-mono text-error uppercase">
              {error}
            </div>
          )}

          {/* Categories List */}
          <div className="bg-surface-elevated border border-border-subtle rounded-sm overflow-hidden">
            <div className="p-4 border-b border-border-subtle flex justify-between items-center select-none">
              <span className="font-headline-sm text-xs text-text-high-contrast uppercase tracking-tighter">Category Index</span>
              <span className="font-label-mono text-[10px] text-text-muted">{categories.length} total</span>
            </div>

            {loading && categories.length === 0 ? (
              <div className="p-8 text-center text-xs font-label-mono text-text-muted animate-pulse">LOADING CATEGORIES...</div>
            ) : categories.length === 0 ? (
              <div className="p-8 text-center text-xs font-label-mono text-text-muted">NO CATEGORIES CREATED YET.</div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {categories.map((category, index) => {
                  const assetCount = category._count?.assets || 0;
                  const isEditing = editingCategory && editingCategory.id === category.id;

                  return (
                    <div key={category.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-surface transition-colors">
                      {/* Name / Form */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <form onSubmit={handleSaveEdit} className="flex gap-2">
                            <input 
                              type="text" 
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-surface-base border border-primary px-3 py-1.5 rounded-sm text-xs font-label-mono outline-none w-full max-w-sm"
                              disabled={submitting}
                              autoFocus
                            />
                            <button 
                              type="submit"
                              className="bg-primary text-background px-3 py-1.5 font-label-mono text-[10px] font-bold rounded-sm hover:bg-primary-hover transition-colors"
                              disabled={submitting}
                            >
                              SAVE
                            </button>
                            <button 
                              type="button"
                              onClick={() => setEditingCategory(null)}
                              className="bg-surface border border-border-subtle px-3 py-1.5 font-label-mono text-[10px] text-text-muted hover:text-text-high-contrast rounded-sm transition-colors"
                            >
                              CANCEL
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-text-high-contrast text-sm sm:text-base">{category.name}</span>
                            <span className="font-label-mono text-[9px] text-text-muted bg-surface-container px-1.5 py-0.5 rounded-sm">
                              {assetCount} FILE{assetCount !== 1 ? 'S' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Reordering */}
                        <div className="flex gap-1 border border-border-subtle/50 rounded-sm overflow-hidden select-none">
                          <button 
                            onClick={() => handleMove(index, -1)}
                            disabled={index === 0}
                            className="p-1.5 bg-surface-base hover:bg-surface-container text-text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            title="Move Up"
                          >
                            <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                          </button>
                          <button 
                            onClick={() => handleMove(index, 1)}
                            disabled={index === categories.length - 1}
                            className="p-1.5 bg-surface-base hover:bg-surface-container text-text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            title="Move Down"
                          >
                            <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                          </button>
                        </div>

                        {/* Visibility (Enable/Disable) */}
                        <button 
                          onClick={() => handleToggleActive(category)}
                          className={`px-3 py-1.5 font-label-mono text-[10px] font-bold border transition-all rounded-sm ${
                            category.isActive 
                              ? 'bg-success/10 border-success/30 text-success hover:bg-success/20' 
                              : 'bg-surface-base border-border-subtle text-text-muted hover:bg-surface-container'
                          }`}
                        >
                          {category.isActive ? 'ACTIVE' : 'DISABLED'}
                        </button>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {!isEditing && (
                            <button 
                              onClick={() => handleStartEdit(category)}
                              className="p-2 bg-surface-base border border-border-subtle hover:border-primary text-text-muted hover:text-primary transition-colors rounded-sm flex items-center justify-center"
                              title="Edit Name"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(category.id)}
                            disabled={assetCount > 0}
                            className={`p-2 bg-surface-base border transition-colors rounded-sm flex items-center justify-center ${
                              assetCount > 0 
                                ? 'border-border-subtle/30 text-text-muted/30 cursor-not-allowed opacity-40' 
                                : 'border-error/30 hover:border-error text-error hover:bg-error/10'
                            }`}
                            title={assetCount > 0 ? "Cannot delete category containing assets" : "Delete Category"}
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </main>
      <Footer />
    </>
  );
};

export default ManageCategories;
