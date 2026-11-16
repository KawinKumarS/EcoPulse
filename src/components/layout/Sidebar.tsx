import React from 'react';
import {
  LayoutDashboard,
  LineChart,
  Building2,
  Sliders,
  Zap,
  Bell,
  FileSpreadsheet,
  Settings,
  Cpu,
  Activity,
  Radio
} from 'lucide-react';
import clsx from 'clsx';
import { useEcoPulse } from '../../context/EcoPulseContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { systemStatus, alerts } = useEcoPulse();
  const unreadAlerts = alerts.filter(a => !a.acknowledged && !a.resolved).length;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Energy Analytics', icon: LineChart },
    { id: 'building', label: 'Building Floor Plan', icon: Building2 },
    { id: 'devices', label: 'Device Management', icon: Sliders },
    { id: 'automation', label: 'Automation Rules', icon: Zap },
    { id: 'alerts', label: 'System Alerts', icon: Bell, badge: unreadAlerts > 0 ? unreadAlerts : undefined },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
    { id: 'settings', label: 'Hardware Settings', icon: Settings },
    { id: 'simulator', label: 'Demo Simulator', icon: Cpu, isSimTag: true },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 select-none z-30 shadow-[1px_0_4px_rgba(0,0,0,0.02)]">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 flex items-center justify-center shadow-sm">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 text-lg tracking-tight">EcoPulse</h1>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500">Intelligent Energy System</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={clsx(
                  'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-emerald-50/80 text-emerald-800 font-semibold border border-emerald-200/80 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={clsx(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    {item.badge}
                  </span>
                )}

                {item.isSimTag && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200">
                    DEMO
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Hardware Connection Quick Status Widget */}
      <div className="p-4 border border-slate-200/80 bg-slate-50 m-3 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Hardware Node</span>
          <span
            className={clsx(
              'inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full border',
              systemStatus.is_connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}
          >
            <Radio className="w-3 h-3 animate-pulse" />
            {systemStatus.is_connected ? 'Arduino Live' : 'Simulator'}
          </span>
        </div>

        <div className="text-[11px] text-slate-600 space-y-1 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Interface:</span>
            <span className="font-semibold text-slate-800">{systemStatus.port || 'Virtual UART'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Baud:</span>
            <span className="font-semibold text-slate-800">{systemStatus.baud_rate} bps</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
