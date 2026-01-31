# Reach AI - Application Documentation

## Overview

Reach AI is a comprehensive route optimization and management platform designed to streamline logistics and field operations. It leverages Artificial Intelligence to optimize routes, analyze market data, and provide actionable insights. The application is built as a Single Page Application (SPA) using React and modern web technologies, with Firebase as the backend service.

## Key Features

### 1. **Smart Authentication & Role Management**

- **Secure Login**: User authentication with session persistence.
- **Role-Based Access Control (RBAC)**: Distinct interfaces and capabilities for Admins and Standard Users.
- **User Management**: Admins can add, update, and toggle status of users.
- **"Login As" Feature**: Admins can impersonate users for troubleshooting.

### 2. **Interactive Dashboards**

The application features multiple specialized dashboard views:

- **Insights Dashboard**: The command center offering high-level metrics and KPIs.
- **Admin Dashboard**: For user and data management, including bulk uploads of route data and users using CSV/Excel.
- **Summary Dashboard**: A detailed breakdown of performance and operational stats.
- **Map Dashboard**: Visual representation of routes, clients, and territories using interactive maps (Leaflet).

### 3. **AI-Powered Optimization**

- **AI Route Optimizer**: Uses intelligent algorithms to suggest the most efficient routes for delivery or sales teams.
- **Market Scanner**: Analyzes territories to find potential new clients or gaps in coverage.
- **AI Themes**: A customized visual theme ("AI Theme") that enhances the futuristic feel of the interface.

### 4. **Data Management & History**

- **Bulk Data Ingestion**: Robust system for uploading large datasets of customers and routes with progress tracking.
- **Version Control**: Tracks upload history and allows restoring previous versions of route data.
- **Data Validation**: Automatically validates uploaded records, identifying skipped records or errors (e.g., missing GPS).

### 5. **User Experience (UX)**

- **Localization**: Full support for English and Arabic (RTL support).
- **Dark/Light Modes**: Toggleable themes for user preference.
- **Responsive Design**: Mobile-friendly interface with collapsible sidebars and mobile menus.

## Technical Architecture

### Frontend

- **Framework**: React 19 (via Vite)
- **Language**: TypeScript
- **Styling**: TailwindCSS (utility-first CSS)
- **Icons**: Lucide React
- **Maps**: Leaflet / React-Leaflet
- **Charts**: Recharts

### Backend / Services

- **Firebase**: Functions as the backend-as-a-service (BaaS) provider.
  - Real-time database listeners (`subscribeToUsers`, `subscribeToRoutes`).
  - Data persistence (`saveRouteData`, `saveUsers`).
  - Metadata and history tracking.

### Core Data Models

- **User**: Stores credentials, roles (Admin/User), branch access, and status.
- **Customer/Route**: Represents a client location with GPS coordinates, region codes, and business data.
- **HistoryLog**: Tracks actions like data uploads for audit trails.

## Setup & Running Locally

1. **Prerequisites**: Node.js installed.
2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Configuration**:
   - Ensure `.env.local` contains the necessary API keys (e.g., `GEMINI_API_KEY`, Firebase config).
4. **Run Development Server**:

   ```bash
   npm run dev
   ```

5. **Build for Production**:

   ```bash
   npm run build
   ```

## Future Roadmap (SaaS Conversion)

- **Subscription Management**: Integration with payment gateways (Stripe/Paddle) for tiered access.
- **Multi-Tenancy**: Organization-level isolation for serving multiple client companies.
- **Enhanced AI**: Deeper integration of Generative AI for predictive analytics.
