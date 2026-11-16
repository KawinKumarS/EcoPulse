import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useEcoPulse } from '../../context/EcoPulseContext';
import { formatWattHours } from '../../utils/formatters';

interface EnergyBucket {
  time: string;
  solar_wh: number;
  load_wh: number;
}

interface EnergyComparisonChartProps {
  timeframe?: 'hourly' | 'daily' | 'weekly';
}

export const EnergyComparisonChart: React.FC<EnergyComparisonChartProps> = () => {
  const { systemStatus } = useEcoPulse();
  const [timeframe, setTimeframe] = useState<'hourly' | 'daily'>('hourly');
  const [buckets, setBuckets] = useState<EnergyBucket[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadBuckets = () => {
      fetch(`http://localhost:8000/api/energy/buckets?timeframe=${timeframe}&is_simulated=${systemStatus.is_simulated}`)
        .then(res => (res.ok ? res.json() : []))
        .then((data: EnergyBucket[]) => {
          if (!cancelled && Array.isArray(data)) {
            setBuckets(data);
          }
        })
        .catch(() => {});
    };

    loadBuckets();
    const timer = setInterval(loadBuckets, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [timeframe, systemStatus.is_simulated]);

  return (
    <div className="space-y-4">
      {/* Timeframe switch */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-slate-500">
          Source: {systemStatus.is_simulated ? 'Simulator SQLite History' : 'Live Arduino SQLite History'}
        </span>
        <div className="flex items-center bg-slate-100 border border-slate-200/80 rounded-xl p-1 shadow-inner">
          <button
            onClick={() => setTimeframe('hourly')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              timeframe === 'hourly'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Hourly Wh
          </button>
          <button
            onClick={() => setTimeframe('daily')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              timeframe === 'daily'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Daily Wh
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        {buckets.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs font-mono border border-dashed border-slate-200 rounded-xl">
            No {timeframe} energy history recorded for current source yet — collecting live data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                tickFormatter={(val) => `${val} Wh`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#0f172a',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)'
                }}
                formatter={(value: any) => [formatWattHours(Number(value) || 0)]}
              />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }}
              />
              <Bar
                dataKey="solar_wh"
                name="Solar Generation (Wh)"
                fill="#059669"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="load_wh"
                name="Building Consumption (Wh)"
                fill="#d97706"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
