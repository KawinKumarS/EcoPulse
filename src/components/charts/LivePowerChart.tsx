import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useEcoPulse } from '../../context/EcoPulseContext';
import { formatTime, formatWatts } from '../../utils/formatters';

export const LivePowerChart: React.FC = () => {
  const { history } = useEcoPulse();

  const chartData = history.map((item) => ({
    time: formatTime(item.timestamp),
    solar_w: item.solar_power_w,
    load_w: item.load_power_w,
    net_w: item.net_power_w,
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-mono">
        Waiting for initial telemetry stream...
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="solarGradLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="loadGradLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
            </linearGradient>
          </defs>

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
            tickFormatter={(val) => `${val}W`}
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
            formatter={(value: any) => [formatWatts(Number(value) || 0)]}
          />

          <Legend
            verticalAlign="top"
            height={36}
            wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }}
          />

          <Area
            type="monotone"
            dataKey="solar_w"
            name="Solar Generation"
            stroke="#059669"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#solarGradLight)"
          />

          <Area
            type="monotone"
            dataKey="load_w"
            name="Building Load"
            stroke="#d97706"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#loadGradLight)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
