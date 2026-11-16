import React, { useState, useEffect } from 'react';
import {
  Sun,
  BatteryCharging,
  Radio,
  Clock,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import { useEcoPulse } from '../../context/EcoPulseContext';
import { formatWatts } from '../../utils/formatters';

interface HeaderProps {
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle }) => {
  const {
    telemetry,
    systemStatus,
    sendMode,
    wsConnected,
    tempUnit,
    setTempUnit
  } = useEcoPulse();

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isNetPositive = telemetry.net_power_w >= 0;

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Page Title & Status */}
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-lg text-slate-900 tracking-tight">{pageTitle}</h2>

        {/* Live Hardware vs Demo Mode Indicator */}
        {systemStatus.is_connected ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>ARDUINO NANO CONNECTED</span>
            <span className="text-[10px] text-emerald-600/80 font-mono">({systemStatus.port})</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>DEMO SIMULATOR ACTIVE</span>
          </div>
        )}
      </div>

      {/* Real-time Telemetry Pills & Quick Controls */}
      <div className="flex items-center gap-3">
        {/* Net Power Flow Pill */}
        <div className={clsx(
          'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
          isNetPositive
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        )}>
          {isNetPositive ? (
            <Sun className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <BatteryCharging className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span className="font-sans text-slate-500 font-medium">Net Flow:</span>
          <span className="font-bold">
            {isNetPositive ? '+' : ''}{formatWatts(telemetry.net_power_w)}
          </span>
        </div>

        {/* Segmented Authority Mode Selector: AUTO vs MANUAL */}
        <div className="flex items-center bg-slate-100 border border-slate-200/90 rounded-xl p-1 shadow-inner">
          <button
            onClick={() => sendMode('AUTO')}
            className={clsx(
              'px-3 py-1 text-xs font-bold rounded-lg transition-all',
              telemetry.mode === 'AUTO'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            AUTO
          </button>
          <button
            onClick={() => sendMode('MANUAL')}
            className={clsx(
              'px-3 py-1 text-xs font-bold rounded-lg transition-all',
              telemetry.mode === 'MANUAL'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            MANUAL
          </button>
        </div>

        {/* Temperature Unit Toggle */}
        <button
          onClick={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')}
          title="Toggle temperature unit"
          className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-mono font-semibold transition-colors shadow-sm"
        >
          °{tempUnit}
        </button>

        {/* Live Clock & Link State */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 text-xs font-mono text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-700">{currentTime}</span>
          <span
            title={wsConnected ? 'WebSocket Live' : 'Reconnecting...'}
            className={clsx(
              'w-2 h-2 rounded-full',
              wsConnected ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-amber-500 animate-ping'
            )}
          />
        </div>
      </div>
    </header>
  );
};
