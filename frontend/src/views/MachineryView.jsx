import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Cpu,
  Search,
  Plus,
  Truck,
  Edit2,
  Trash2,
  Eye,
  Filter,
  Layers,
  DollarSign,
  Building,
  CheckCircle2,
  X,
  AlertCircle,
  Warehouse,
} from 'lucide-react';

export const MachineryView = ({ onDispatchMachine }) => {
  const { t, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [machinery, setMachinery] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [viewingMachine, setViewingMachine] = useState(null);

  // Add / Edit Form State
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    description: '',
    initialBatchSets: 10,
    unit: 'SETS',
    unitWeight: '',
    factoryFobUsd: 0,
    exchangeRate: 310,
    customsDutyLkr: 0,
    wholesaleBenchmark: 0,
    retailBenchmark: 0,
    rentPricePerMonth: 0,
    ownershipType: 'OUR_ASSET',
    thirdPartyCompany: '',
    thirdPartyRentalCostOwed: 0,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [machRes, brandRes] = await Promise.all([
        api.getMachinery({
          search,
          brand: brandFilter,
          ownershipType: ownershipFilter,
        }),
        api.getBrands(),
      ]);

      if (machRes.success) setMachinery(machRes.machinery);
      if (brandRes.success) {
        setBrands(brandRes.brands);
        if (!formData.brand && brandRes.brands.length > 0) {
          setFormData((prev) => ({ ...prev, brand: brandRes.brands[0].name }));
        }
      }
    } catch (err) {
      addToast('error', 'Error fetching machinery inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, brandFilter, ownershipFilter]);

  const handleOpenAdd = () => {
    setEditingMachine(null);
    setFormData({
      brand: brands.length > 0 ? brands[0].name : 'Juki',
      model: '',
      description: '',
      initialBatchSets: 10,
      unit: 'SETS',
      unitWeight: '',
      factoryFobUsd: 250,
      exchangeRate: 310,
      customsDutyLkr: 20000,
      wholesaleBenchmark: 130000,
      retailBenchmark: 155000,
      rentPricePerMonth: 13000,
      ownershipType: 'OUR_ASSET',
      thirdPartyCompany: '',
      thirdPartyRentalCostOwed: 0,
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (m) => {
    setEditingMachine(m);
    setFormData({
      brand: m.brand,
      model: m.model,
      description: m.description || '',
      initialBatchSets: m.initialBatchSets,
      unit: m.unit || 'SETS',
      unitWeight: m.unitWeight || '',
      factoryFobUsd: m.factoryFobUsd,
      exchangeRate: m.exchangeRate,
      customsDutyLkr: m.customsDutyLkr,
      wholesaleBenchmark: m.wholesaleBenchmark,
      retailBenchmark: m.retailBenchmark,
      rentPricePerMonth: m.rentPricePerMonth,
      ownershipType: m.ownershipType,
      thirdPartyCompany: m.thirdPartyCompany || '',
      thirdPartyRentalCostOwed: m.thirdPartyRentalCostOwed || 0,
    });
    setShowAddModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMachine) {
        const res = await api.updateMachinery(editingMachine._id, formData);
        if (res.success) {
          addToast('success', `Machinery ${res.machine.sku} updated successfully!`);
          setShowAddModal(false);
          fetchData();
        }
      } else {
        const res = await api.createMachinery(formData);
        if (res.success) {
          addToast('success', `New Machinery SKU ${res.machine.sku} created!`);
          setShowAddModal(false);
          fetchData();
        }
      }
    } catch (err) {
      addToast('error', err.message);
    }
  };

  const handleDelete = async (id, sku) => {
    if (window.confirm(`Are you sure you want to delete machinery ${sku}?`)) {
      try {
        const res = await api.deleteMachinery(id);
        if (res.success) {
          addToast('success', `Machinery ${sku} removed`);
          fetchData();
        } else {
          addToast('error', res.message || 'Cannot delete machinery');
        }
      } catch (err) {
        addToast('error', err.message);
      }
    }
  };

  // Live calculation for modal form
  const calcBaseLkr = (Number(formData.factoryFobUsd) || 0) * (Number(formData.exchangeRate) || 310);
  const calcLanded = calcBaseLkr + (Number(formData.customsDutyLkr) || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight">{t('machinery')}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
              {machinery.length} Models
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Consortium Fleet Inventory • Auto Landed Cost (FOB * Rate + Customs Duty) & Stock Balance
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addMachine')}</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-xl glass-card border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, Model, Brand..."
            className="w-full glass-input pl-10 pr-3.5 py-2 rounded-xl text-xs"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Brand Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">{t('brand')}:</span>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-lg text-xs"
            >
              <option value="ALL" className="bg-slate-900">All Brands</option>
              {brands.map((b) => (
                <option key={b._id} value={b.name} className="bg-slate-900">{b.name}</option>
              ))}
            </select>
          </div>

          {/* Ownership Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Ownership:</span>
            <select
              value={ownershipFilter}
              onChange={(e) => setOwnershipFilter(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-lg text-xs"
            >
              <option value="ALL" className="bg-slate-900">All Assets</option>
              <option value="OUR_ASSET" className="bg-slate-900">Our Asset (Consortium)</option>
              <option value="THIRD_PARTY_ASSET" className="bg-slate-900">Third-Party Outsourced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Machinery Inventory Table */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">Brand & Model</th>
                <th className="p-3.5">Ownership</th>
                <th className="p-3.5 text-center">Batch Sets</th>
                <th className="p-3.5 text-center">Dispatched</th>
                <th className="p-3.5 text-center text-emerald-400">In Warehouse</th>
                <th className="p-3.5 text-right">Landed Cost</th>
                <th className="p-3.5 text-right">Wholesale</th>
                <th className="p-3.5 text-right">Rent / Month</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {machinery.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-500">
                    No machinery found matching your search criteria.
                  </td>
                </tr>
              ) : (
                machinery.map((m) => {
                  const inWh = Math.max(0, (m.initialBatchSets || 0) - (m.dispatched || 0));
                  const isThirdParty = m.ownershipType === 'THIRD_PARTY_ASSET';

                  return (
                    <tr key={m._id} className="hover:bg-slate-900/50 transition">
                      <td className="p-3.5 font-mono font-bold text-cyan-400">{m.sku}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{m.brand} {m.model}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{m.description}</div>
                      </td>
                      <td className="p-3.5">
                        {isThirdParty ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800"
                            title={`Monthly liability: LKR ${Number(m.thirdPartyRentalCostOwed || 0).toLocaleString()} to ${m.thirdPartyCompany}`}
                          >
                            <Building className="w-3 h-3" />
                            <span>Third-Party ({m.thirdPartyCompany || 'Partner'})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                            Our Asset
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-semibold">{m.initialBatchSets} {m.unit}</td>
                      <td className="p-3.5 text-center font-semibold text-amber-400">{m.dispatched}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-400">
                        {inWh} {m.unit}
                      </td>
                      <td className="p-3.5 text-right font-medium text-slate-300">
                        LKR {Number(m.landedUnitCost || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-200">
                        LKR {Number(m.wholesaleBenchmark || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-bold text-cyan-300">
                        LKR {Number(m.rentPricePerMonth || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Dispatch Sales Button */}
                          <button
                            onClick={() => onDispatchMachine(m)}
                            disabled={inWh === 0}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[11px] shadow-sm transition disabled:opacity-30 cursor-pointer"
                            title="Dispatch Sales or Rent"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Dispatch</span>
                          </button>

                          {/* View details */}
                          <button
                            onClick={() => setViewingMachine(m)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            title={t('viewDetails')}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit (Admin only) */}
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(m)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition"
                                title={t('edit')}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(m._id, m.sku)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition"
                                title={t('delete')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MACHINE DETAILS MODAL — Full Machine Profile */}
      {viewingMachine && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-3 overflow-y-auto">
          <div className="w-full max-w-3xl glass-dropdown rounded-2xl border border-slate-700 p-5 space-y-4 my-6 text-slate-100">
            {/* ── Header ── */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    {viewingMachine.sku}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    viewingMachine.ownershipType === 'THIRD_PARTY_ASSET'
                      ? 'bg-amber-950 text-amber-400 border-amber-800'
                      : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  }`}>
                    {viewingMachine.ownershipType === 'THIRD_PARTY_ASSET' ? '3rd-Party Asset' : 'Our Fleet'}
                  </span>
                  {(() => {
                    const inWh = Math.max(0, (viewingMachine.initialBatchSets || 0) - (viewingMachine.dispatched || 0));
                    return (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        inWh > 0 ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}>
                        {inWh > 0 ? `${inWh} Sets Available` : 'Out of Stock'}
                      </span>
                    );
                  })()}
                </div>
                <h3 className="text-lg font-bold text-white">{viewingMachine.brand} {viewingMachine.model}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{viewingMachine.description || 'No description provided'}</p>
              </div>
              <button onClick={() => setViewingMachine(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Fleet Availability ── */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Fleet Availability</div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                {[
                  { label: 'Initial Batch', value: `${viewingMachine.initialBatchSets || 0} ${viewingMachine.unit || 'SETS'}`, color: 'text-slate-200' },
                  { label: 'Dispatched',    value: `${viewingMachine.dispatched || 0} ${viewingMachine.unit || 'SETS'}`,        color: 'text-rose-400' },
                  { label: 'In Warehouse',  value: `${Math.max(0,(viewingMachine.initialBatchSets||0)-(viewingMachine.dispatched||0))} ${viewingMachine.unit||'SETS'}`, color: 'text-emerald-400 font-bold' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <div className="text-slate-400 text-[10px] mb-1">{label}</div>
                    <div className={`text-base font-bold ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
              {viewingMachine.unitWeight && (
                <div className="text-[11px] text-slate-500 mt-1.5 ml-1">
                  Unit Weight: <span className="text-slate-300 font-semibold">{viewingMachine.unitWeight}</span>
                </div>
              )}
            </div>

            {/* ── Financial Breakdown ── */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Financial Cost Breakdown</div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-slate-400">Factory FOB</div>
                    <div className="font-bold text-white">USD ${Number(viewingMachine.factoryFobUsd || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500">Rate: Rs.{viewingMachine.exchangeRate}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Base LKR (FOB×Rate)</div>
                    <div className="font-bold text-slate-200">LKR {((viewingMachine.factoryFobUsd||0)*(viewingMachine.exchangeRate||0)).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Customs & Port</div>
                    <div className="font-bold text-amber-400">LKR {Number(viewingMachine.customsDutyLkr || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Landed Unit Cost</div>
                    <div className="font-bold text-emerald-400 text-sm">LKR {Number(viewingMachine.landedUnitCost || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Pricing Benchmarks ── */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Pricing Benchmarks & Rental Rate</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 mb-0.5">Wholesale Price</div>
                  <div className="text-lg font-bold text-white">LKR {Number(viewingMachine.wholesaleBenchmark || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">
                    Margin: {viewingMachine.wholesaleBenchmark > 0
                      ? (((viewingMachine.wholesaleBenchmark - (viewingMachine.landedUnitCost||0)) / viewingMachine.wholesaleBenchmark) * 100).toFixed(1)
                      : 0}% over landed cost
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 mb-0.5">Retail Price</div>
                  <div className="text-lg font-bold text-white">LKR {Number(viewingMachine.retailBenchmark || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Premium over wholesale: +LKR {Number((viewingMachine.retailBenchmark||0)-(viewingMachine.wholesaleBenchmark||0)).toLocaleString()}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/60">
                  <div className="text-slate-400 mb-0.5">Monthly Rental Rate</div>
                  <div className="text-lg font-bold text-cyan-300">LKR {Number(viewingMachine.rentPricePerMonth || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">per machine / per month</div>
                </div>
              </div>
            </div>

            {/* ── 3rd Party ── */}
            {viewingMachine.ownershipType === 'THIRD_PARTY_ASSET' && (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-xs text-amber-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-400">
                  <Building className="w-4 h-4" />
                  Third-Party Outsourced Asset — Liability Details
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>Partner Company: <strong className="text-amber-100">{viewingMachine.thirdPartyCompany}</strong></div>
                  <div>Monthly Cost Owed: <strong className="text-amber-100">LKR {Number(viewingMachine.thirdPartyRentalCostOwed || 0).toLocaleString()}</strong></div>
                </div>
                <div className="text-[10px] text-amber-600">
                  ⚠ Net rental margin = Monthly Rent Received − LKR {Number(viewingMachine.thirdPartyRentalCostOwed || 0).toLocaleString()} owed to partner.
                </div>
              </div>
            )}

            {/* ── Footer ── */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <div className="text-[10px] text-slate-500">
                Added: {viewingMachine.createdAt ? new Date(viewingMachine.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'N/A'}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setViewingMachine(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition">Close</button>
                <button
                  disabled={Math.max(0,(viewingMachine.initialBatchSets||0)-(viewingMachine.dispatched||0)) === 0}
                  onClick={() => { setViewingMachine(null); onDispatchMachine(viewingMachine); }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-bold text-xs text-white transition disabled:opacity-40">
                  Dispatch →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MACHINERY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl glass-dropdown rounded-2xl border border-slate-700 p-6 md:p-8 space-y-5 my-8 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editingMachine ? `Edit Machinery: ${editingMachine.sku}` : 'Add New Machinery to Fleet'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">{t('brand')} *</label>
                  <select
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl"
                    required
                  >
                    {brands.map((b) => (
                      <option key={b._id} value={b.name} className="bg-slate-900">{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('model')} *</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g. DDL-8700 Single Needle Lockstitch"
                    className="w-full glass-input px-3 py-2 rounded-xl font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description / Specifications</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. 5,500 rpm high speed with servo motor and auto lubrication"
                  className="w-full glass-input px-3 py-2 rounded-xl"
                />
              </div>

              {/* Batch & Units */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">{t('batchSets')} *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.initialBatchSets}
                    onChange={(e) => setFormData({ ...formData, initialBatchSets: Number(e.target.value) })}
                    className="w-full glass-input px-3 py-2 rounded-xl font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Unit Label</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="SETS / UNITS"
                    className="w-full glass-input px-3 py-2 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Unit Weight</label>
                  <input
                    type="text"
                    value={formData.unitWeight}
                    onChange={(e) => setFormData({ ...formData, unitWeight: e.target.value })}
                    placeholder="e.g. 35 KG"
                    className="w-full glass-input px-3 py-2 rounded-xl"
                  />
                </div>
              </div>

              {/* Financial Inputs: FOB, Rate, Duty, Landed Unit Cost */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
                  Financials & Landed Cost Breakdown
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">{t('fobCost')}</label>
                    <input
                      type="number"
                      value={formData.factoryFobUsd}
                      onChange={(e) => setFormData({ ...formData, factoryFobUsd: Number(e.target.value) })}
                      className="w-full glass-input px-3 py-2 rounded-xl font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Exchange Rate (USD to LKR)</label>
                    <input
                      type="number"
                      value={formData.exchangeRate}
                      onChange={(e) => setFormData({ ...formData, exchangeRate: Number(e.target.value) })}
                      className="w-full glass-input px-3 py-2 rounded-xl font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">{t('customsDuty')} (LKR)</label>
                    <input
                      type="number"
                      value={formData.customsDutyLkr}
                      onChange={(e) => setFormData({ ...formData, customsDutyLkr: Number(e.target.value) })}
                      className="w-full glass-input px-3 py-2 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 flex items-center justify-between border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400">Base LKR (FOB * Rate):</span>
                    <span className="font-bold text-slate-200 ml-2">LKR {calcBaseLkr.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Calculated Landed Unit Cost:</span>
                    <span className="font-bold text-emerald-400 ml-2">LKR {calcLanded.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Benchmarks & Rent Price */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">{t('wholesalePrice')} (LKR) *</label>
                  <input
                    type="number"
                    value={formData.wholesaleBenchmark}
                    onChange={(e) => setFormData({ ...formData, wholesaleBenchmark: Number(e.target.value) })}
                    className="w-full glass-input px-3 py-2 rounded-xl font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('retailPrice')} (LKR) *</label>
                  <input
                    type="number"
                    value={formData.retailBenchmark}
                    onChange={(e) => setFormData({ ...formData, retailBenchmark: Number(e.target.value) })}
                    className="w-full glass-input px-3 py-2 rounded-xl font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('rentPrice')} (LKR) *</label>
                  <input
                    type="number"
                    value={formData.rentPricePerMonth}
                    onChange={(e) => setFormData({ ...formData, rentPricePerMonth: Number(e.target.value) })}
                    className="w-full glass-input px-3 py-2 rounded-xl font-bold text-cyan-300"
                    required
                  />
                </div>
              </div>

              {/* Asset Ownership Flag */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  {t('assetOwnership')}
                </span>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-300">
                    <input
                      type="radio"
                      name="ownershipType"
                      value="OUR_ASSET"
                      checked={formData.ownershipType === 'OUR_ASSET'}
                      onChange={() => setFormData({ ...formData, ownershipType: 'OUR_ASSET' })}
                      className="text-cyan-600 focus:ring-cyan-500 bg-slate-900"
                    />
                    <span>{t('ourAsset')} (Consortium Owned)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-amber-300">
                    <input
                      type="radio"
                      name="ownershipType"
                      value="THIRD_PARTY_ASSET"
                      checked={formData.ownershipType === 'THIRD_PARTY_ASSET'}
                      onChange={() => setFormData({ ...formData, ownershipType: 'THIRD_PARTY_ASSET' })}
                      className="text-amber-600 focus:ring-amber-500 bg-slate-900"
                    />
                    <span>{t('thirdPartyAsset')}</span>
                  </label>
                </div>

                {formData.ownershipType === 'THIRD_PARTY_ASSET' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-slate-400 mb-1">{t('thirdPartyCompany')} *</label>
                      <input
                        type="text"
                        value={formData.thirdPartyCompany}
                        onChange={(e) => setFormData({ ...formData, thirdPartyCompany: e.target.value })}
                        placeholder="e.g. Lanka Apparel Outsourcing Ltd"
                        className="w-full glass-input px-3 py-2 rounded-xl"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">{t('thirdPartyRentOwed')} (LKR) *</label>
                      <input
                        type="number"
                        value={formData.thirdPartyRentalCostOwed}
                        onChange={(e) => setFormData({ ...formData, thirdPartyRentalCostOwed: Number(e.target.value) })}
                        placeholder="Amount consortium owes per month"
                        className="w-full glass-input px-3 py-2 rounded-xl text-amber-300 font-bold"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-lg shadow-cyan-600/25"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
