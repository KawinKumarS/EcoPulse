import { useState } from 'react';
import { EcoPulseProvider } from './context/EcoPulseContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewPage } from './pages/OverviewPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BuildingPage } from './pages/BuildingPage';
import { DeviceControlPage } from './pages/DeviceControlPage';
import { AutomationPage } from './pages/AutomationPage';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { DemoModePage } from './pages/DemoModePage';

export function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const pageTitles: Record<string, string> = {
    overview: 'Operational Dashboard',
    analytics: 'Energy Analytics & Solar Yield',
    building: '2D Architectural Twin',
    devices: 'Actuators & Manual Override',
    automation: 'Autonomous Edge Rules',
    alerts: 'System Diagnostics & Alerts',
    reports: 'Historical Records & CSV Export',
    settings: 'Hardware Settings & Serial Port',
    simulator: 'Demo Simulation Sandbox',
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'building':
        return <BuildingPage />;
      case 'devices':
        return <DeviceControlPage />;
      case 'automation':
        return <AutomationPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'simulator':
        return <DemoModePage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header pageTitle={pageTitles[activeTab] || 'Dashboard'} />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <EcoPulseProvider>
      <AppContent />
    </EcoPulseProvider>
  );
}
