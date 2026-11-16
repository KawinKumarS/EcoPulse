import React, { useState } from 'react';
import {
  Activity,
  Sun,
  Thermometer,
  Battery,
  Save,
  CheckCircle2
} from 'lucide-react';
import { useEcoPulse } from '../context/EcoPulseContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const AutomationPage: React.FC = () => {
  const { config, updateConfig, telemetry } = useEcoPulse();

  const [tempThreshold, setTempThreshold] = useState<number>(config.temp_threshold);
  const [lightThreshold, setLightThreshold] = useState<number>(config.light_threshold);
  const [occTimeout, setOccTimeout] = useState<number>(config.occupancy_timeout);
  const [batteryCutoff, setBatteryCutoff] = useState<number>(config.battery_cutoff);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSaveAll = async () => {
    await updateConfig({
      temp_threshold: Number(tempThreshold),
      light_threshold: Number(lightThreshold),
      occupancy_timeout: Number(occTimeout),
      battery_cutoff: Number(batteryCutoff)
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Live condition evaluations
  const isOccActive = telemetry.occupancy;
  const isLightNeeded = telemetry.light_level < lightThreshold;
  const isTempHigh = telemetry.temperature >= tempThreshold;
  const isBatteryLow = telemetry.battery_voltage < batteryCutoff;

  return (
    <div className="space-y-6">
      {/* Top Banner & Save Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-card">
        <div className="space-y-0.5">
          <h3 className="font-bold text-slate-900 text-sm">Edge Automation Rules & Sensor Thresholds</h3>
          <p className="text-xs text-slate-500">
            Rules execute locally inside the Arduino Nano ATmega328P firmware for offline resilience.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-700 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Synced to Hardware & DB
            </span>
          )}

          <button
            onClick={handleSaveAll}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>

      {/* 4 Automation Rule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rule 1: Occupancy Lighting */}
        <Card
          title="Rule 1: Occupancy-Based Lighting"
          subtitle="PIR Motion Sensor (D2)"
          icon={<Activity className="w-4 h-4 text-rose-600" />}
          action={
            <Badge variant={isOccActive ? 'red' : 'slate'}>
              {isOccActive ? 'Motion Detected' : 'No Motion'}
            </Badge>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              When motion is detected in the room, lighting turns on. After motion stops, lighting remains active for a configurable hold-off interval before automatically shutting off.
            </p>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 font-semibold">Hold-off Timeout (seconds):</span>
                <span className="font-mono font-bold text-emerald-700">{occTimeout} s</span>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={occTimeout}
                onChange={(e) => setOccTimeout(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>1s (Fast)</span>
                <span>2s (Nano Default)</span>
                <span>30s</span>
                <span>60s (Max)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Live PIR Output:</span>
              <span className={`font-mono font-bold ${telemetry.occupancy ? 'text-rose-600' : 'text-slate-500'}`}>
                {telemetry.occupancy ? 'HIGH (+5V Active)' : 'LOW (0V Idle)'}
              </span>
            </div>
          </div>
        </Card>

        {/* Rule 2: Daylight Harvesting */}
        <Card
          title="Rule 2: Daylight-Harvesting Threshold"
          subtitle="Ambient Light Sensor LDR (A0)"
          icon={<Sun className="w-4 h-4 text-amber-600" />}
          action={
            <Badge variant={isLightNeeded ? 'amber' : 'green'}>
              {isLightNeeded ? 'Low Light (Allow ON)' : 'Sufficient Daylight'}
            </Badge>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Suppresses artificial LED lighting when sufficient natural daylight is entering the building, eliminating wasteful daytime power consumption.
            </p>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 font-semibold">Daylight Cutoff Threshold:</span>
                <span className="font-mono font-bold text-amber-700">{lightThreshold} ADC</span>
              </div>
              <input
                type="range"
                min="100"
                max="800"
                step="25"
                value={lightThreshold}
                onChange={(e) => setLightThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>100 (Dark only)</span>
                <span>400 (Standard)</span>
                <span>800 (Bright room)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Live LDR Reading:</span>
              <span className="font-mono font-bold text-slate-900">
                {telemetry.light_level} / 1023 ADC
              </span>
            </div>
          </div>
        </Card>

        {/* Rule 3: Temperature-Based Ventilation */}
        <Card
          title="Rule 3: Temperature Ventilation Control"
          subtitle="DHT11 Temperature Sensor (D3)"
          icon={<Thermometer className="w-4 h-4 text-sky-600" />}
          action={
            <Badge variant={isTempHigh ? 'blue' : 'slate'}>
              {isTempHigh ? 'Cooling Needed' : 'Normal Range'}
            </Badge>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Automatically triggers the DC ventilation fan (D6) when indoor temperature exceeds the setpoint, cooling the miniature building until temperature drops below threshold minus 1.0°C hysteresis.
            </p>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 font-semibold">Ventilation Trigger Setpoint:</span>
                <span className="font-mono font-bold text-sky-700">{tempThreshold.toFixed(1)} °C</span>
              </div>
              <input
                type="range"
                min="22"
                max="34"
                step="0.5"
                value={tempThreshold}
                onChange={(e) => setTempThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>22.0°C</span>
                <span>28.0°C (Default)</span>
                <span>34.0°C</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Live Temperature:</span>
              <span className="font-mono font-bold text-slate-900">
                {telemetry.temperature.toFixed(1)} °C
              </span>
            </div>
          </div>
        </Card>

        {/* Rule 4: Battery Load Shedding */}
        <Card
          title="Rule 4: Low-Battery Load Shedding"
          subtitle="Battery Storage Protection (A2)"
          icon={<Battery className="w-4 h-4 text-amber-600" />}
          action={
            <Badge variant={isBatteryLow ? 'red' : 'green'}>
              {isBatteryLow ? 'Load Shedding Active' : 'Battery Healthy'}
            </Badge>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              When rechargeable Li-ion battery voltage falls below the safety cutoff, all non-essential lighting loads are forcibly shed to prevent cell under-voltage damage.
            </p>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 font-semibold">Under-Voltage Cutoff Setpoint:</span>
                <span className="font-mono font-bold text-rose-600">{batteryCutoff.toFixed(2)} V</span>
              </div>
              <input
                type="range"
                min="3.20"
                max="3.60"
                step="0.05"
                value={batteryCutoff}
                onChange={(e) => setBatteryCutoff(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>3.20V (Deep)</span>
                <span>3.35V (Standard Li-ion)</span>
                <span>3.60V (Conservative)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Live Battery Voltage:</span>
              <span className="font-mono font-bold text-slate-900">
                {telemetry.battery_voltage.toFixed(2)} V (~{telemetry.estimated_battery_pct.toFixed(0)}%)
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
