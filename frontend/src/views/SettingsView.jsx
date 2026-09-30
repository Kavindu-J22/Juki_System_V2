import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Settings, Save, Building, ShieldCheck, Mail, Phone, FileText } from 'lucide-react';

export const SettingsView = () => {
  const { t, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [settings, setSettings] = useState({
    companyName: 'Anujaya & Global Enterprises Consortium',
    tagline: 'Industrial Apparel Machinery & Heavy Equipment Solutions',
    address: 'No. 45/A, Katunayake Export Processing Zone & 112 Textile Hub, Colombo, Sri Lanka',
    phone: '+94 11 234 5678 / +94 77 123 4567',
    email: 'kavindujayasinghesecondary@gmail.com',
    taxId: 'VAT-102938475-7000 / SVAT-09281',
    anujayaSharePercent: 50,
    globalSharePercent: 50,
    exchangeRateUsdToLkr: 310,
    invoiceFooterNote: 'Consortium certified genuine parts & machinery. Standard industrial warranty applies.',
    authorizedSignatoryName: 'Consortium Executive Board / Managing Director',
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await api.getSettings();
        if (res.success && res.settings) {
          setSettings(res.settings);
        }
      } catch {
        addToast('error', 'Error loading settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateSettings(settings);
      if (res.success) {
        addToast('success', 'Consortium company settings updated!');
      } else {
        addToast('error', res.message);
      }
    } catch (err) {
      addToast('error', err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight">{t('settings')}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
              Admin Master Control
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Consortium Profile, Official Commercial Invoice Details, Tax Registration & Benchmark Exchange Rates
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Building className="w-4 h-4 text-cyan-400" />
            <span>Consortium Entity Identity</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">Company / Consortium Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full glass-input px-3.5 py-2 rounded-xl font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Tagline</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full glass-input px-3.5 py-2 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">Consortium Zone Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full glass-input px-3.5 py-2 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Official Tax Registration / VAT / SVAT</label>
              <input
                type="text"
                value={settings.taxId}
                onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                className="w-full glass-input px-3.5 py-2 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">Official Contact Phones</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full glass-input px-3.5 py-2 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Consortium Alert Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full glass-input px-3.5 py-2 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Financial & Benchmark Parameters */}
        <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Consortium Equity Splits & Benchmark Exchange Rates</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">Benchmark USD to LKR Rate</label>
              <input
                type="number"
                value={settings.exchangeRateUsdToLkr}
                onChange={(e) => setSettings({ ...settings, exchangeRateUsdToLkr: Number(e.target.value) })}
                className="w-full glass-input px-3.5 py-2 rounded-xl font-bold text-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Anujaya Enterprises Profit Share (%)</label>
              <input
                type="number"
                value={settings.anujayaSharePercent}
                onChange={(e) => setSettings({ ...settings, anujayaSharePercent: Number(e.target.value) })}
                className="w-full glass-input px-3.5 py-2 rounded-xl font-bold text-indigo-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Global Enterprises Profit Share (%)</label>
              <input
                type="number"
                value={settings.globalSharePercent}
                onChange={(e) => setSettings({ ...settings, globalSharePercent: Number(e.target.value) })}
                className="w-full glass-input px-3.5 py-2 rounded-xl font-bold text-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Invoice Commercial Footer Note</label>
            <textarea
              rows="2"
              value={settings.invoiceFooterNote}
              onChange={(e) => setSettings({ ...settings, invoiceFooterNote: e.target.value })}
              className="w-full glass-input px-3.5 py-2 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Authorized Signatory Designation</label>
            <input
              type="text"
              value={settings.authorizedSignatoryName}
              onChange={(e) => setSettings({ ...settings, authorizedSignatoryName: e.target.value })}
              className="w-full glass-input px-3.5 py-2 rounded-xl"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white shadow-lg shadow-cyan-600/30"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
