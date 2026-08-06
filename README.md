# Islam Enterprise — Rod & Cement ShopERP

> **A High-Performance, Zero-Dependency POS, Inventory & Financial Management System**  
> Custom-built for building material shops, rod & cement traders, and hardware suppliers.

---

## 🚀 System Overview

**Islam Enterprise ShopERP** is an enterprise-grade ERP, POS, and financial management application designed specifically for rod and cement suppliers. Built with a **zero-dependency philosophy**, the entire backend runs using native Node.js (`node:http`, `node:sqlite`), delivering ultra-fast startup times, low memory consumption, and zero external dependency risk.

---

## ✨ Key Features

### 👤 Role-Based Access Control (RBAC)
- **Admin**: Full authority to create, edit, view, delete, and restore any records (products, sales, purchases, expenses, accounts, and system backups).
- **Sales Manager**: Restricted to operational duties (creating sales invoices, stock-in entries, receiving payments, logging expenses). **Strictly blocked** from editing or deleting past transactions or master data (HTTP 403 Forbidden).

### 🏦 Multi-Account Cash & Capital Management
- Live balance tracking across custom capital accounts ("Cash at Shop", "Bank Account", "Cash at Home").
- Track capital deposits, owner drawings/withdrawals, and internal fund transfers.
- Automatic credit/debit linkage for POS sales, supplier purchases, expense payments, and customer due receipts.

### 📦 Inventory & Low Stock Alerting
- Track stock quantities by unit (`kg`, `ton`, `bag`, `pcs`).
- Retail vs. Wholesale tier pricing support.
- Real-time stock valuation based on purchase cost.
- Low-stock alert threshold indicators.

### 🧾 POS & Instant Receipt Generation
- Fast item lookup with real-time stock availability check.
- Walk-in cash sales or credit sales with customer assignment.
- Automatic tax invoice generation formatted for standard printers.

### 👥 Customer & Supplier Ledger Statements
- Complete chronological ledger statements tracking Sales/Purchases, Payments, and Running Outstanding Balances.
- Receivable dues collection and Payable dues settlement modals.

### 💸 Expenses Log & Profit / Loss Analytics
- Log daily operational expenses (rent, freight, salary, utility).
- Real-time financial reports calculating **COGS**, **Gross Profit**, and **Net Profit**.

### 📄 Transaction-Safe Bulk CSV Import / Export
- Bidirectional CSV Export (`/api/export/:entity`) and Import (`/api/import/:entity`) for Products, Customers, Suppliers, Sales, Purchases, and Expenses.
- **Atomic Rollback**: Imports run inside SQLite transactions (`BEGIN ... COMMIT/ROLLBACK`). Any row validation error aborts the entire import cleanly.

### 💾 1-Click System Backup & Restore
- Download live SQLite database backups (`shop.db`) with active WAL checkpoints.
- Drag-and-drop database restoration with schema validation and atomic table replacement.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend Engine** | Node.js (Native `node:http`, `node:fs`, `node:crypto`) |
| **Database Engine** | Native Node SQLite (`node:sqlite`) with WAL Journal Mode |
| **Frontend Framework** | Vanilla JavaScript (ES6+ SPA) |
| **Styling & Theme** | Native Vanilla CSS with CSS Custom Properties |
| **External Dependencies** | **0 (Zero External NPM Packages)** |

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js**: v22.5.0 or higher (required for native `node:sqlite` support).

### Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/oapi/ShopERP.git
   cd ShopERP
   ```

2. **Start the Application**:
   ```bash
   npm start
   # Or directly:
   node server.js
   ```

3. **Access the System**:
   Open your web browser and navigate to:
   ```text
   http://localhost:3000
   ```

---

## 🔑 Default Credentials

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | `admin123` | Full Access (Create, Read, Update, Delete, Backup) |
| **Sales Manager** | `sales` | `sales123` | Operations Only (Create Sales, Purchases, Expenses) |

---

## 📄 Documentation

Comprehensive technical documentation is available in the [`docs/`](./docs) directory:
- [Architecture & System Design](./docs/TECHNICAL_DOCUMENTATION.md#2-system-architecture-document)
- [Database Schema & Data Dictionary](./docs/TECHNICAL_DOCUMENTATION.md#3-database-schema--data-dictionary)
- [Core Algorithms & Business Logic](./docs/TECHNICAL_DOCUMENTATION.md#4-core-algorithms--business-logic)
- [Mermaid Flowcharts](./docs/TECHNICAL_DOCUMENTATION.md#5-flowcharts--state-diagrams)
- [REST API Reference](./docs/TECHNICAL_DOCUMENTATION.md#6-api-documentation)
- [Deployment & Security Guidelines](./docs/TECHNICAL_DOCUMENTATION.md#7-deployment--security-guidelines)
