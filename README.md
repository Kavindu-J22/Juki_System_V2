# Anujaya & Global Enterprises Consortium ERP System
### Industrial Apparel Machinery & Heavy Equipment Consortium Web Application

A full-stack, production-grade ERP web application built for **Anujaya & Global Enterprises Consortium** (Juki, Brother, Pegasus, Siruba, Jack industrial sewing machinery and automated cutters) handling both direct **Machine Sales** and **Machinery Rental Agreements** with strict lifecycle tracking, third-party asset integration, automated email deadline alerts, return rule engine calculations, and printable commercial documents.

---

## 🛠️ Technology Stack
- **Frontend**: React 19, Vite, Tailwind CSS (Custom Dark Glassmorphic Design System), Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express, MongoDB Atlas / Mongoose, JWT & Bcrypt Authentication, Nodemailer, Morgan, XLSX.
- **Database**: MongoDB Atlas (`juki_consortium_erp`).
- **Localization**: Bilingual support for **English** and **Sinhala (සිංහල)** with live toggle in the navbar.

---

## 👥 1. Role-Based Access Control (RBAC) & Logins
The system strictly enforces 3 distinct roles:

| Role | Organization | Permissions & Access Scope | Default Credentials |
|---|---|---|---|
| **Admin** | Anujaya Enterprises | Full system control, master data management, global company settings, financial approvals, expense/liability logging, user creation. | `admin@anujaya.com` / `admin123` |
| **Partner** | Global Enterprises | Dedicated consortium partner view showing shared equity (50/50), profit splits, capital draws, balance sheet, and consolidated financial statements. | `partner@global.com` / `partner123` |
| **Staff** | Consortium Operations | Operational access for customer dispatches, recording monthly rent collections, updating delivery/return statuses. | `staff@anujaya.com` / `staff123` |

*Note: The Login screen and Top Navbar both feature an **Instant 1-Click Role Switcher** for rapid pair-testing.*

---

## 📊 2. Executive Dashboard Widgets
Real-time computed financial and operational metrics:
- **Gross Revenue**: Direct equipment sales + cash realized from rentals.
- **Completed Dispatches**: Total count of sales and rental agreements.
- **Total Cost of Goods (COGS)**: Landed unit cost across sold equipment.
- **Port & Customs Duty**: Total customs duty and port surcharges for inventory in warehouse and port.
- **Consortium Net Profit & Margin %**: Computed as `Gross Revenue - COGS - Total Operational Expenses`.
- **Dispatched / Total Fleet & Turnover %**: Fleet turnover computed dynamically as `(Dispatched / Total Initial Sets) * 100`.
- **Warehouse Stock Valuation**: Current warehouse inventory valued at landed cost (`In Warehouse * Landed Unit Cost`).
- **Total Receivables & Outstanding Credit**: Active balances from 30-day credit buy sales and ongoing rental agreements.

---

## 🗂️ 3. Core Modules & Specifications

### A. Customer Management CRM
- Auto-generated CID (`CUST-001`, `CUST-002`, ...).
- Attributes: Name, NIC, Phone, Email, Region/City, Delivery Address, Previous Balance.
- **Customer Profile View Drawer**:
  - Complete historical view of all purchased and rented machines.
  - Machine Serial Numbers tracking for asset audits.
  - Recorded payment history and transaction ledger.
  - **Running Balance Widget**: Computed as:
    $$\text{Total Balance} = \text{Previous Balance} + \text{New Charges} - \text{Payments Received}$$
  - Total Consortium Profit Contributed by this customer.
  - **Search**: Searchable by Customer Name, CID, Phone, or Machine Serial Number.

### B. Brand Management
- CRUD interface to add and manage machine brands (Juki, Brother, Pegasus, Siruba, Jack, Eastman) dynamically populating dropdowns across the Machinery Master.

### C. Machinery Master (Inventory)
- SKU Code starting with `M-` auto-generated (`M-01`, `M-02`, ...).
- Attributes: Brand, Model/Specifications, Initial Batch Sets, Dispatched count, In Warehouse (`Initial Batch Sets - Dispatched`), Unit (e.g. `SETS`), Unit weight.
- **Financial Parameters**:
  - Factory FOB Cost (USD $).
  - Exchange Rate (USD to LKR benchmark, default `Rs. 310.00`).
  - Base LKR (`USD * Exchange Rate`).
  - Customs Duty & Port Surcharges (LKR).
  - **Calculated Landed Unit Cost**: `Base LKR + Customs Duty`.
  - Wholesale Benchmark & Retail Benchmark.
  - Rent Price (Per Month).
- **Asset Ownership Flag**:
  - `Our Asset` (Consortium Owned).
  - `Another Company Asset` (Third-Party Outsourced): Captures Third-Party Company Name and monthly rental cost owed, automatically syncing to the **Expenses & Liabilities** ledger.

### D. Sales Ledger, Asset Audit & Rental Agreements (Dispatch Modal)
Clicking **Dispatch** opens a dynamic checkout modal with two distinct paths:
1. **Path 1: BUY**:
   - Price benchmark toggle (Wholesale or Retail), unit price, quantity, serial numbers tags.
   - Client selection with auto-filling phone and region.
   - Tax included option with VAT % calculation, delivery charges, other fees.
   - Settlement Status: `Fully Paid`, `Partial Payment`, `Credit / Pending`.
   - Payment Terms: Bank Wire/SLIPS, Corporate Cheque, COD, Letter of Credit (LC), 30-Day Credit.
   - **Profit Share Calculation**: Instant live breakdown between Anujaya Enterprises (50%) and Global Enterprises (50%).
   - Action: Print Commercial Invoice.
2. **Path 2: RENT**:
   - Duration in months, stored monthly rent, total rental value (`Months * Rent Price * Quantity`).
   - Key Money Security Deposit option (Amount, paid amount, status).
   - First 2 Months Payment advance option.
   - Payment terms, reference, dispatch date, delivery charges.
   - Custom Terms & Conditions editor and warranty certificate terms.
   - **Lifecycle & Delivery Tracking**: `Pending` $\rightarrow$ `Ongoing` $\rightarrow$ `Hand Overed` (enables Equipment Delivery Note).
   - **Automated Deadline Alerts**:
     - System monitors `nextPaymentDueDate` and triggers alerts on Dashboard and via Email:
       - 7 days remaining
       - 3 days remaining
       - Due today
       - Overdue
   - **Flexible Return Rule Engine (5th-Day Rule)**:
     - Customers can return machines before or after the agreed month.
     - **Rule Logic**: If return date exceeds a monthly cycle past the 5th day (e.g. past the 5th of the month), that month's rent must be recorded as payable; if returned early on or before the 5th, that respective month's rent is waived.
     - Overdue balances remain recorded as active receivables.
     - **Inventory Sync**: When marked `Returned`, `dispatched` count decreases and `inWarehouse` count increases automatically. Generates printable Return Note.

### E. Financial Expenses, Salaries & Liabilities Tracker
Dedicated tracking to compute true consortium net income:
- **Rents Owed**: Payments due to third-party companies for outsourced machinery.
- **Salaries**: Staff wages and engineering payroll.
- **Liabilities / Loans (නය)**: Bank borrowings and monthly installments.
- **Operating Expenses**: Customs clearing fees, logistics, fuel, utilities.

### F. Company Settings & Partner Capital Ledger
- **Partner Capital Ledger**: Log and track partner capital draws, equity injections, and profit distributions for Anujaya Enterprises and Global Enterprises.
- **Company Profile Settings**: Configure company name, address, tax IDs (VAT/SVAT), exchange rate, default profit splits, and authorized signatories.

### G. Comprehensive Reports & Analytics
- **8 Report Types**:
  1. Daily Income & Collections
  2. Monthly Consolidated Income
  3. Customer Payment History & Settlement Ledger
  4. Machine Rental History & Fleet Utilization
  5. Outstanding Payments & Receivables
  6. Overdue Rental Accounts
  7. Consortium Fleet Inventory Utilization
  8. Consolidated Profit & Loss Report
- **Export Options**: Direct export to **Excel (.xlsx)** and **Print / PDF**.
- **Filters**: Start Date and End Date range filters.

### 📜 Official Printable Documents
Branded official documents with letterhead, VAT numbers, signatures, and stamps:
- **Commercial Sales Invoice**
- **Machinery Rental & Service Agreement**
- **Equipment Delivery & Handover Note**
- **Machinery Return & Reconciliation Note**
- **Customer Account Running Statement**

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas connection string (provided in `.env`)

### Backend Setup
```bash
cd backend
npm install
npm run seed     # Seeds realistic inventory, users, customers, and active rental alerts
node server.js   # Starts backend on http://localhost:5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```
