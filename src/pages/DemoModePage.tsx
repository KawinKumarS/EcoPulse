import React, { useState } from 'react';
import {
  Sun,
  Cloud,
  CloudSun,
  Moon,
  Activity,
  Flame,
  BatteryWarning,
  Sparkles
} from 'lucide-react';
import { useEcoPulse } from '../context/EcoPulseContext';
import { Card } from '../components/common/Card';

export const DemoModePage: React.FC = () => {
  const {
    telemetry,
    triggerScenario
  } = useEcoPulse();

  const [simHour, setSimHour] = useState<number>(telemetry.simulated_hour || 12.0);
  const [activeWeather, setActiveWeather] = useState<string>(telemetry.weather || 'sunny');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleHourChange = (newHour: number) => {
    setSimHour(newHour);
    triggerScenario('time_of_day', { hour: newHour });
    showNotification(`Simulated time set to ${newHour.toFixed(1)}:00`);
  };

  const handleWeatherChange = (weather: string) => {
    setActiveWeather(weather);
    triggerScenario('weather', { weather });
    showNotification(`Simulated weather preset set to ${weather.toUpperCase()}`);
  };

  const showNotification = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-sm">Demo Simulation Control Room</h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              SYNTHETIC TELEMETRY
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Allows complete end-to-end evaluation of the EcoPulse platform even when physical Arduino Nano hardware is disconnected.
          </p>
        </div>

        {statusMsg && (
          <span className="text-xs text-emerald-800 font-mono font-bold bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-sm">
            {statusMsg}
          </span>
        )}
      </div>

      {/* Environmental & Astronomical Physics Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diurnal Solar Curve Slider */}
        <Card
          title="Diurnal Sun Elevation & Solar Irradiance"
          subtitle="Simulates solar panel output across the 24-hour astronomical cycle"
          icon={<Sun className="w-4 h-4 text-amber-600" />}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Simulated Time of Day:</span>
              <span className="text-base font-bold font-mono text-amber-700">
                {Math.floor(simHour)}:{(Math.round((simHour % 1) * 60)).toString().padStart(2, '0')}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="24"
              step="0.5"
              value={simHour}
              onChange={(e) => handleHourChange(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>00:00 (Night)</span>
              <span>06:00 (Sunrise)</span>
              <span>12:00 (Noon Peak)</span>
              <span>18:00 (Sunset)</span>
              <span>24:00 (Night)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex justify-between text-xs font-mono">
              <span className="text-slate-600 font-sans font-medium">Current PV Voltage:</span>
              <span className="text-amber-700 font-bold">{telemetry.solar_voltage.toFixed(2)} V</span>
            </div>
          </div>
        </Card>

        {/* Meteorological Presets */}
        <Card
          title="Meteorological Weather Conditions"
          subtitle="Simulates cloud cover, atmospheric attenuation, and irradiance drops"
          icon={<CloudSun className="w-4 h-4 text-sky-600" />}
        >
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'sunny', label: 'Clear Sky', desc: '100% Direct Irradiance', icon: Sun, color: 'text-amber-600' },
              { id: 'cloudy', label: 'Passing Clouds', desc: 'Fluctuating Irradiance', icon: CloudSun, color: 'text-emerald-600' },
              { id: 'overcast', label: 'Heavy Overcast', desc: '25% Diffuse Irradiance', icon: Cloud, color: 'text-slate-500' },
              { id: 'night', label: 'Dark Night', desc: '0% Irradiance', icon: Moon, color: 'text-sky-600' },
            ].map((w) => {
              const Icon = w.icon;
              const isActive = activeWeather === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => handleWeatherChange(w.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'bg-emerald-50/80 border-emerald-400 shadow-sm ring-1 ring-emerald-500'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${w.color}`} />
                  <div className="font-bold text-slate-900 text-xs">{w.label}</div>
                  <div className="text-[10px] text-slate-500">{w.desc}</div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Interactive Scenario Injections */}
      <Card
        title="Interactive Fault & Event Injections"
        subtitle="Trigger specific physical scenarios to demonstrate edge automation rules in action"
        icon={<Activity className="w-4 h-4 text-rose-600" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Scenario 1: Motion Trigger */}
          <button
            onClick={() => {
              triggerScenario('motion', { duration: 15.0 });
              showNotification('Occupant entered room (PIR triggered for 15s)');
            }}
            className="p-4 rounded-xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 hover:shadow-card-hover text-left transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform" />
              <h5 className="font-bold text-slate-900 text-xs">Trigger Occupant Motion</h5>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Simulates a person entering Zone 1. Activates PIR sensor on D2, causing room LED to illuminate if dark.
            </p>
          </button>

          {/* Scenario 2: Heat Spike */}
          <button
            onClick={() => {
              triggerScenario('heat_spike');
              showNotification('Injected +6.0°C thermal spike into tech enclosure');
            }}
            className="p-4 rounded-xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 hover:shadow-card-hover text-left transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
              <h5 className="font-bold text-slate-900 text-xs">Inject Thermal Heat Spike</h5>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Raises temperature past 28°C threshold. Demonstrates temperature-based ventilation fan auto-trigger on D6.
            </p>
          </button>

          {/* Scenario 3: Battery Depletion */}
          <button
            onClick={() => {
              triggerScenario('low_battery');
              showNotification('Simulated battery drop to 3.32V (Under-voltage)');
            }}
            className="p-4 rounded-xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 hover:shadow-card-hover text-left transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <BatteryWarning className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform" />
              <h5 className="font-bold text-slate-900 text-xs">Simulate Low Battery</h5>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Drops battery to 3.32V to trigger safety load shedding rule, automatically switching off non-critical loads.
            </p>
          </button>
        </div>
      </Card>
    </div>
  );
};
