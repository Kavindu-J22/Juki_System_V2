import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { MachineryView } from './views/MachineryView';
import { SalesLedgerView } from './views/SalesLedgerView';
import { CustomerCRMView } from './views/CustomerCRMView';
import { BrandView } from './views/BrandView';
import { ExpensesView } from './views/ExpensesView';
import { PartnerLedgerView } from './views/PartnerLedgerView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { DispatchModal } from './views/DispatchModal';
import { PrintDocumentModal } from './components/PrintDocumentModal';
import { api } from './api';

const MainApp = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [alertCounts, setAlertCounts] = useState({ total: 0, overdue: 0, dueToday: 0, dueIn3Days: 0, dueIn7Days: 0 });

  // Dispatch modal state
  const [dispatchMachine, setDispatchMachine] = useState(null);
  const [customers, setCustomers] = useState([]);

  // Print modal state
  const [printDoc, setPrintDoc] = useState(null); // { type, data }

  // Load common data like alert counts and customer list
  const loadCommonData = async () => {
    if (!user) return;
    try {
      const [dashRes, custRes] = await Promise.all([
        api.getDashboardStats(),
        api.getCustomers(),
      ]);

      if (dashRes.success && dashRes.alertCounts) {
        setAlertCounts(dashRes.alertCounts);
      }
      if (custRes.success && custRes.customers) {
        setCustomers(custRes.customers);
      }
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    if (user) {
      loadCommonData();
    }
  }, [user, currentView]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400">Initializing Jukiapp Consortium ERP...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const handleLaunchDispatch = (machine) => {
    setDispatchMachine(machine);
  };

  const handlePrintDocument = (data, docType) => {
    setPrintDoc({ data, docType });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        alertCounts={alertCounts}
        onOpenAlerts={() => setCurrentView('dashboard')}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          alertCounts={alertCounts}
        />

        {/* Dynamic Main Content View */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentView}
              onPrint={handlePrintDocument}
            />
          )}

          {currentView === 'machinery' && (
            <MachineryView
              onDispatchMachine={handleLaunchDispatch}
            />
          )}

          {currentView === 'salesLedger' && (
            <SalesLedgerView
              onPrint={handlePrintDocument}
            />
          )}

          {currentView === 'customers' && (
            <CustomerCRMView
              onPrint={handlePrintDocument}
            />
          )}

          {currentView === 'brands' && (
            <BrandView />
          )}

          {currentView === 'expenses' && (
            <ExpensesView />
          )}

          {currentView === 'partnerLedger' && (
            <PartnerLedgerView />
          )}

          {currentView === 'reports' && (
            <ReportsView />
          )}

          {currentView === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Global Dispatch Checkout Modal */}
      {dispatchMachine && (
        <DispatchModal
          machine={dispatchMachine}
          customers={customers}
          onClose={() => setDispatchMachine(null)}
          onSuccess={() => {
            setDispatchMachine(null);
            loadCommonData();
          }}
          onPrint={(tx, type) => {
            setDispatchMachine(null);
            handlePrintDocument(tx, type);
          }}
        />
      )}

      {/* Global Print Official Document Modal */}
      {printDoc && (
        <PrintDocumentModal
          docType={printDoc.docType}
          data={printDoc.data}
          onClose={() => setPrintDoc(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}
