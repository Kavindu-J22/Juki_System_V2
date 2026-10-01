const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('juki_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Auth
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Dashboard & Reports
  getDashboardStats: async () => {
    const res = await fetch(`${API_BASE}/reports/dashboard-stats`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getDetailedReport: async (reportType, params = {}) => {
    const query = new URLSearchParams({ reportType, ...params }).toString();
    const res = await fetch(`${API_BASE}/reports/detailed?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  triggerAlertCheck: async (sendEmails = false) => {
    const res = await fetch(`${API_BASE}/reports/trigger-alerts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sendEmails }),
    });
    return res.json();
  },

  // Machinery
  getMachinery: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/machinery?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  createMachinery: async (data) => {
    const res = await fetch(`${API_BASE}/machinery`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateMachinery: async (id, data) => {
    const res = await fetch(`${API_BASE}/machinery/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteMachinery: async (id) => {
    const res = await fetch(`${API_BASE}/machinery/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Brands
  getBrands: async () => {
    const res = await fetch(`${API_BASE}/brands`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  createBrand: async (data) => {
    const res = await fetch(`${API_BASE}/brands`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateBrand: async (id, data) => {
    const res = await fetch(`${API_BASE}/brands/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteBrand: async (id) => {
    const res = await fetch(`${API_BASE}/brands/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Customers CRM
  getCustomers: async (search = '') => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/customers${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getCustomerById: async (id) => {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  createCustomer: async (data) => {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateCustomer: async (id, data) => {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteCustomer: async (id) => {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Transactions (Dispatch BUY & RENT)
  getTransactions: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/transactions?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getTransactionById: async (id) => {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  createTransaction: async (data) => {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateDeliveryStatus: async (id, deliveryStatus) => {
    const res = await fetch(`${API_BASE}/transactions/${id}/delivery-status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ deliveryStatus }),
    });
    return res.json();
  },
  processReturn: async (id, data) => {
    const res = await fetch(`${API_BASE}/transactions/${id}/return`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  recordPayment: async (id, data) => {
    const res = await fetch(`${API_BASE}/transactions/${id}/payments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateTransaction: async (id, data) => {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  markTransactionAsPaid: async (id, paymentMethod = 'Bank Wire/SLIPS', reference = '') => {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ markAsPaid: true, buyDetails: { paymentMethod, reference } }),
    });
    return res.json();
  },
  payMonthRent: async (id, data) => {
    const res = await fetch(`${API_BASE}/transactions/${id}/pay-month`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },


  // Expenses & Liabilities
  getExpenses: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/expenses?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  createExpense: async (data) => {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  payExpense: async (id, data) => {
    const res = await fetch(`${API_BASE}/expenses/${id}/pay`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteExpense: async (id) => {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Partner Capital Ledger
  getPartnerLedger: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/partner-ledger?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  createPartnerEntry: async (data) => {
    const res = await fetch(`${API_BASE}/partner-ledger`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  updateSettings: async (data) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
