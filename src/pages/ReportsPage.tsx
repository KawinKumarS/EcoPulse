import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  Database
} from 'lucide-react';
import { useEcoPulse } from '../context/EcoPulseContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import type { SensorReading } from '../types';
import { formatDateTime, formatVoltage, formatWatts } from '../utils/formatters';

export const ReportsPage: React.FC = () => {
  const { history } = useEcoPulse();
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    // Fetch historical readings from backend API
    fetch('http://localhost:8000/api/readings?limit=100')
      .then(res => res.json())
      .then((data: any[]) => {
        if (data && data.length > 0) {
          const normalized = data.map((row) => ({
            ...row,
            light: row.light !== undefined ? Boolean(row.light) : Boolean(row.light_state),
            fan: row.fan !== undefined ? Boolean(row.fan) : Boolean(row.fan_state),
            occupancy: Boolean(row.occupancy),
            is_simulated: Boolean(row.is_simulated),
          }));
          setReadings(normalized.reverse());
        } else {
          setReadings([...history].reverse());
        }
      })
      .catch(() => {
        setReadings([...history].reverse());
      });
  }, [history]);

  const handleDownloadCsv = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ecopulse_export_${Math.floor(Date.now() / 1000)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // Fallback to client-side CSV generation when backend is offline
    }

    const headers = [
      'Timestamp_ISO', 'Occupancy', 'LightLevel_ADC', 'Temperature_C',
      'SolarVoltage_V', 'BatteryVoltage_V', 'SolarPower_W', 'LoadPower_W',
      'NetPower_W', 'EstBattery_Pct', 'LightState', 'FanState', 'Mode', 'Source'
    ];
    const rows = filteredReadings.map(r => [
      new Date(r.timestamp * 1000).toISOString(),
      Boolean(r.occupancy),
      r.light_level,
      r.temperature,
      r.solar_voltage,
      r.battery_voltage,
      r.solar_power_w,
      r.load_power_w,
      r.net_power_w,
      r.estimated_battery_pct,
      r.light ? 'ON' : 'OFF',
      r.fan ? 'ON' : 'OFF',
      r.mode,
      r.is_simulated ? 'SIMULATED' : 'ARDUINO'
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecopulse_export_${Math.floor(Date.now() / 1000)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredReadings = readings.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.mode && r.mode.toLowerCase().includes(q)) ||
      (r.occupancy ? 'occupied' : 'vacant').includes(q) ||
      (r.is_simulated ? 'simulated' : 'hardware').includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Export Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-card">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Historical Telemetry Log & CSV Export</h3>
          </div>
          <p className="text-xs text-slate-500">
            Export structured sensor datasets for engineering analysis, academic verification, or reporting.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Download CSV Report</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by mode, occupancy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-emerald-600 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <Database className="w-4 h-4 text-slate-400" />
          <span>Showing {filteredReadings.length} Log Points</span>
        </div>
      </div>

      {/* Historical Data Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider bg-slate-50/60 font-sans font-bold">
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Solar (A1)</th>
                <th className="py-3 px-3">Battery (A2)</th>
                <th className="py-3 px-3">Solar Power</th>
                <th className="py-3 px-3">Load Power</th>
                <th className="py-3 px-3">Temp (D3)</th>
                <th className="py-3 px-3">Light (A0)</th>
                <th className="py-3 px-3">PIR (D2)</th>
                <th className="py-3 px-3">LED / Fan</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReadings.slice(0, 30).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-slate-700 font-sans whitespace-nowrap font-medium">
                    {formatDateTime(row.timestamp)}
                  </td>
                  <td className="py-3 px-3 text-amber-700 font-bold">
                    {formatVoltage(row.solar_voltage)}
                  </td>
                  <td className="py-3 px-3 text-emerald-700 font-bold">
                    {formatVoltage(row.battery_voltage)}
                  </td>
                  <td className="py-3 px-3 text-emerald-700">
                    {formatWatts(row.solar_power_w)}
                  </td>
                  <td className="py-3 px-3 text-amber-700">
                    {formatWatts(row.load_power_w)}
                  </td>
                  <td className="py-3 px-3 text-slate-800">
                    {row.temperature.toFixed(1)}°C
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {row.light_level}
                  </td>
                  <td className="py-3 px-3">
                    <span className={row.occupancy ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                      {row.occupancy ? 'YES' : 'NO'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700">
                    {row.light ? 'LED:ON' : 'LED:OFF'} | {row.fan ? 'FAN:ON' : 'FAN:OFF'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {row.mode}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={row.is_simulated ? 'amber' : 'green'} size="sm">
                      {row.is_simulated ? 'SIM' : 'ARDUINO'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
