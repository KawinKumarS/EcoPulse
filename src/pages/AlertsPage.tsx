import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  ShieldAlert,
  Clock,
  Filter
} from 'lucide-react';
import { useEcoPulse } from '../context/EcoPulseContext';
import { Card } from '../components/common/Card';
import { formatDateTime } from '../utils/formatters';

export const AlertsPage: React.FC = () => {
  const { alerts, acknowledgeAlert, telemetry, systemStatus } = useEcoPulse();
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const liveAlerts = [...alerts];

  if (telemetry.has_battery !== false && telemetry.battery_voltage < 3.40 && telemetry.battery_voltage > 0.5) {
    if (!liveAlerts.some(a => a.alert_type === 'battery_low' && !a.resolved)) {
      liveAlerts.unshift({
        id: -1,
        timestamp: Date.now() / 1000,
        alert_type: 'battery_low',
        severity: 'warning',
        message: `Low Battery Warning: Terminal voltage is ${telemetry.battery_voltage.toFixed(2)}V. Recharge via solar array.`,
        acknowledged: false,
        resolved: false
      });
    }
  }

  if (telemetry.has_dht11 !== false && telemetry.temperature >= 32.0) {
    if (!liveAlerts.some(a => a.alert_type === 'temp_high' && !a.resolved)) {
      liveAlerts.unshift({
        id: -2,
        timestamp: Date.now() / 1000,
        alert_type: 'temp_high',
        severity: 'critical',
        message: `High Temperature Alert: Indoor temperature is ${telemetry.temperature.toFixed(1)}°C. Active cooling engaged.`,
        acknowledged: false,
        resolved: false
      });
    }
  }

  if (!systemStatus.is_connected) {
    if (!liveAlerts.some(a => a.alert_type === 'hardware_disconnect' && !a.resolved)) {
      liveAlerts.unshift({
        id: -3,
        timestamp: Date.now() / 1000,
        alert_type: 'hardware_disconnect',
        severity: 'info',
        message: 'No physical Arduino Nano connected on USB. Operating in high-fidelity Software Simulator mode.',
        acknowledged: false,
        resolved: false
      });
    }
  }

  const filtered = liveAlerts.filter(a => {
    if (filterSeverity === 'all') return true;
    return a.severity === filterSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-card">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-900 text-sm">System Diagnostics & Active Alerts</h3>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex items-center bg-slate-100 border border-slate-200/80 rounded-xl p-1 shadow-inner">
            {['all', 'critical', 'warning', 'info'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1 text-xs font-bold rounded-lg uppercase transition-all ${
                  filterSeverity === sev
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <Card
        title="Event Notification Stream"
        subtitle="Automatic diagnostics for battery depletion, thermal events, and sensor loss"
      >
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-sm space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto opacity-70" />
            <p>All system parameters within normal operational limits.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                  alert.severity === 'critical'
                    ? 'bg-rose-50/70 border-rose-200'
                    : alert.severity === 'warning'
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {alert.severity === 'critical' && <ShieldAlert className="w-5 h-5 text-rose-600" />}
                    {alert.severity === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                    {alert.severity === 'info' && <Info className="w-5 h-5 text-sky-600" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {alert.message}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                      <span>Severity: <strong className="uppercase font-sans font-bold text-slate-700">{alert.severity}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDateTime(alert.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => alert.id > 0 && acknowledgeAlert(alert.id)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-sm whitespace-nowrap"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
