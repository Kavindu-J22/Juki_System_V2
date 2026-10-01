import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  FileText,
  DollarSign,
  TrendingUp,
  Cpu,
  Layers,
  Printer,
  X,
  Phone,
  MapPin,
  Mail,
  Shield,
} from 'lucide-react';

export const CustomerCRMView = ({ onPrint }) => {
  const { t, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    nic: '',
    phone: '',
    email: '',
    region: '',
    address: '',
    previousBalance: 0,
    notes: '',
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers(search);
      if (res.success) {
        setCustomers(res.customers);
      }
    } catch (err) {
      addToast('error', 'Error loading customer records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      nic: '',
      phone: '',
      email: '',
      region: '',
      address: '',
      previousBalance: 0,
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      nic: c.nic || '',
      phone: c.phone,
      email: c.email || '',
      region: c.region,
      address: c.address,
      previousBalance: c.previousBalance || 0,
      notes: c.notes || '',
    });
    setShowAddModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        const res = await api.updateCustomer(editingCustomer._id, formData);
        if (res.success) {
          addToast('success', 'Customer profile updated!');
          setShowAddModal(false);
          fetchCustomers();
        }
      } else {
        const res = await api.createCustomer(formData);
        if (res.success) {
          addToast('success', `Customer ${res.customer.cid} created!`);
          setShowAddModal(false);
          fetchCustomers();
        }
      }
    } catch (err) {
      addToast('error', err.message);
    }
  };

  const handleViewProfile = async (id) => {
    try {
      const res = await api.getCustomerById(id);
      if (res.success) {
        setProfileData(res);
        setShowProfileModal(true);
      }
    } catch (err) {
      addToast('error', 'Failed to load customer profile history');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove customer ${name}?`)) {
      try {
        const res = await api.deleteCustomer(id);
        if (res.success) {
          addToast('success', 'Customer deleted');
          fetchCustomers();
        } else {
          addToast('error', res.message || 'Cannot delete customer');
        }
      } catch (err) {
        addToast('error', err.message);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight">{t('customers')}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
              {customers.length} Accounts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Apparel Factory Accounts, Running Balance Audits & Serial Number Search
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addCustomer')}</span>
        </button>
      </div>

      {/* Search Input (Supports Customer Name, Phone, CID, OR Machine Serial Number!) */}
      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Name, CID, Phone, or Machine Serial Number..."
          className="w-full glass-input pl-10 pr-3.5 py-2 rounded-xl text-xs"
        />
      </div>

      {/* Customer Accounts Table */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                <th className="p-3.5">CID</th>
                <th className="p-3.5">Apparel Client / Company</th>
                <th className="p-3.5">Contact Phone</th>
                <th className="p-3.5">Region / City</th>
                <th className="p-3.5">NIC / Reg #</th>
                <th className="p-3.5 text-right">Previous Balance</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-900/50 transition">
                    <td className="p-3.5 font-mono font-bold text-cyan-400">{c.cid}</td>
                    <td className="p-3.5 font-bold text-white">
                      {c.name}
                      {c.notes && (
                        <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{c.notes}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-300">{c.phone}</td>
                    <td className="p-3.5 text-slate-300">{c.region}</td>
                    <td className="p-3.5 font-mono text-slate-400">{c.nic || '-'}</td>
                    <td className="p-3.5 text-right font-mono font-semibold text-rose-300">
                      LKR {Number(c.previousBalance || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewProfile(c._id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-[11px] transition"
                          title="Open Customer Historical Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profile History</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(c._id, c.name)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER PROFILE VIEW MODAL (HISTORICAL AUDIT & RUNNING BALANCE) */}
      {showProfileModal && profileData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl glass-dropdown rounded-2xl border border-slate-700 p-6 md:p-8 space-y-6 my-8 text-slate-100">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    {profileData.customer.cid}
                  </span>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {profileData.customer.name}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    {profileData.customer.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    {profileData.customer.region} • {profileData.customer.address}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPrint({
                    transactionType: 'STATEMENT',
                    customerSnapshot: profileData.customer,
                    // pass all statement data through
                    statementData: {
                      stats: profileData.stats,
                      purchasedMachines: profileData.purchasedMachines,
                      rentedMachines: profileData.rentedMachines,
                      allSerialNumbers: profileData.allSerialNumbers,
                    },
                  }, 'CUSTOMER_STATEMENT')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement</span>
                </button>

                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Financial Running Balance Calculation Widget */}
            {/* Total Balance = Previous Balance + New Charges - Payments */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Previous Balance:</span>
                <div className="text-base font-bold text-slate-200 mt-1">
                  LKR {Number(profileData.stats.previousBalance || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">New Charges (Total Invoiced):</span>
                <div className="text-base font-bold text-cyan-300 mt-1">
                  LKR {Number(profileData.stats.totalCharges || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Total Payments Received:</span>
                <div className="text-base font-bold text-emerald-400 mt-1">
                  LKR {Number(profileData.stats.totalPaymentsReceived || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/60">
                <span className="text-rose-300 font-semibold">Running Account Balance:</span>
                <div className="text-lg font-black text-rose-300 mt-1">
                  LKR {Number(profileData.stats.runningBalance || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Prev + Charges - Payments</div>
              </div>
            </div>

            {/* Total Profit Contributed */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">Total Consortium Profit Contributed by this Client:</span>
              </div>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                LKR {Number(profileData.stats.totalProfitContributed || 0).toLocaleString()}
              </span>
            </div>

            {/* Tracked Machine Serial Numbers */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>All Serial Numbers Tracked for this Client:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profileData.allSerialNumbers.length === 0 ? (
                  <span className="text-xs text-slate-500">No specific serials registered.</span>
                ) : (
                  profileData.allSerialNumbers.map((sn, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800"
                    >
                      {sn}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Purchased Machines History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Purchased Machinery ({profileData.purchasedMachines.length} Orders)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="p-2.5">Invoice #</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Model</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Total</th>
                      <th className="p-2.5 text-right">Paid</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {profileData.purchasedMachines.map((m, idx) => (
                      <tr key={idx} className="text-slate-300">
                        <td className="p-2.5 font-mono text-cyan-400">{m.invoiceNumber}</td>
                        <td className="p-2.5">{new Date(m.date).toLocaleDateString()}</td>
                        <td className="p-2.5 font-semibold text-white">{m.brand} {m.machinery}</td>
                        <td className="p-2.5 text-center">{m.quantity}</td>
                        <td className="p-2.5 text-right">LKR {Number(m.totalAmount).toLocaleString()}</td>
                        <td className="p-2.5 text-right text-emerald-400">LKR {Number(m.paidAmount).toLocaleString()}</td>
                        <td className="p-2.5 text-center">{m.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rented Machines History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Rented Machinery ({profileData.rentedMachines.length} Agreements)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="p-2.5">Agreement #</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Model</th>
                      <th className="p-2.5 text-center">Term</th>
                      <th className="p-2.5 text-right">Rent/Mo</th>
                      <th className="p-2.5 text-right">Total Payable</th>
                      <th className="p-2.5 text-right">Paid</th>
                      <th className="p-2.5 text-center">Return Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {profileData.rentedMachines.map((m, idx) => (
                      <tr key={idx} className="text-slate-300">
                        <td className="p-2.5 font-mono text-amber-400">{m.agreementNumber}</td>
                        <td className="p-2.5">{new Date(m.date).toLocaleDateString()}</td>
                        <td className="p-2.5 font-semibold text-white">{m.brand} {m.machinery}</td>
                        <td className="p-2.5 text-center">{m.durationMonths} Mo</td>
                        <td className="p-2.5 text-right">LKR {Number(m.monthlyRent).toLocaleString()}</td>
                        <td className="p-2.5 text-right">LKR {Number(m.totalRentalPayable).toLocaleString()}</td>
                        <td className="p-2.5 text-right text-emerald-400">LKR {Number(m.totalRentalPaid).toLocaleString()}</td>
                        <td className="p-2.5 text-center">{m.returnStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-dropdown rounded-2xl border border-slate-700 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">
                {editingCustomer ? `Edit Customer: ${editingCustomer.cid}` : 'Add New Apparel Factory / Customer'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Company / Factory Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. MAS Linea Clothing (Pvt) Ltd"
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Phone *</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+94 11 234 5678"
                    className="w-full glass-input px-3.5 py-2 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">NIC / Reg Number</label>
                  <input
                    type="text"
                    value={formData.nic}
                    onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                    placeholder="PV-102948"
                    className="w-full glass-input px-3.5 py-2 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="accounts@factory.com"
                    className="w-full glass-input px-3.5 py-2 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Region / Zone *</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="Biyagama EPZ, Katunayake, Colombo"
                    className="w-full glass-input px-3.5 py-2 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Full Delivery Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Plot 42, Export Processing Zone"
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Previous Account Balance (LKR)</label>
                <input
                  type="number"
                  value={formData.previousBalance}
                  onChange={(e) => setFormData({ ...formData, previousBalance: Number(e.target.value) })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Internal Notes</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Apparel partner history, credit facilities..."
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-lg shadow-cyan-600/30"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
