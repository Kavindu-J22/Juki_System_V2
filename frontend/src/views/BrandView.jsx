import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Bookmark, Plus, Edit2, Trash2, Globe, X } from 'lucide-react';

export const BrandView = () => {
  const { t, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    country: 'Japan',
    description: '',
  });

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await api.getBrands();
      if (res.success) setBrands(res.brands);
    } catch {
      addToast('error', 'Error loading machine brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleOpenAdd = () => {
    setEditingBrand(null);
    setFormData({ name: '', country: 'Japan', description: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (b) => {
    setEditingBrand(b);
    setFormData({
      name: b.name,
      country: b.country || 'Japan',
      description: b.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBrand) {
        const data = await api.updateBrand(editingBrand._id, formData);
        if (data.success) {
          addToast('success', 'Brand updated');
          setShowModal(false);
          fetchBrands();
        }
      } else {
        const res = await api.createBrand(formData);
        if (res.success) {
          addToast('success', `Brand ${res.brand.name} created!`);
          setShowModal(false);
          fetchBrands();
        } else {
          addToast('error', res.message);
        }
      }
    } catch (err) {
      addToast('error', err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete brand ${name}?`)) {
      try {
        const data = await api.deleteBrand(id);
        if (data.success) {
          addToast('success', 'Brand removed');
          fetchBrands();
        }
      } catch (err) {
        addToast('error', err.message);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight">{t('brands')}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
              {brands.length} Brands
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Industrial Apparel Sewing Machine Manufacturers (Juki, Brother, Pegasus, Siruba, Jack)
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addBrand')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((b) => (
          <div key={b._id} className="p-5 rounded-2xl glass-card border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white tracking-tight">{b.name}</span>
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  <Globe className="w-3 h-3 text-cyan-400" />
                  <span>{b.country}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {b.description || 'Apparel machinery brand registered in consortium database.'}
              </p>
            </div>

            {isAdmin && (
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => handleOpenEdit(b)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(b._id, b.name)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 transition"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-dropdown rounded-2xl border border-slate-700 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">
                {editingBrand ? `Edit Brand: ${editingBrand.name}` : 'Add New Machine Brand'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Brand Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Juki, Brother, Pegasus"
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Origin Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Japan, Taiwan, Germany, USA"
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow"
                >
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
