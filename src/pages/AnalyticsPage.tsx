import React from 'react';
import {
  LineChart as LineChartIcon,
  Sun,
  Zap,
  BatteryCharging,
  Leaf,
  CheckCircle2,
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { useEcoPulse } from '../context/EcoPulseContext';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { EnergyComparisonChart } from '../components/charts/EnergyComparisonChart';
import { formatWattHours } from '../utils/formatters';

export const AnalyticsPage: React.FC = () => {
  const { energySummary, telemetry, systemStatus } = useEcoPulse();
  const hasSolar = telemetry.has_solar !== false;
  const offDelaySec = ((telemetry.off_delay_ms || 2000) / 1000).toFixed(0);

  return (
    <div className="space-y-6">
      {/* Top Energy Totals Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Solar Yield"
          value={hasSolar ? formatWattHours(energySummary.total_solar_wh) : 'Not Wired'}
          subtitle={hasSolar ? 'Accumulated clean solar energy' : 'Optional Analog Pin A1'}
          icon={<Sun className="w-5 h-5" />}
          accentColor="solar"
          trend={{
            value: hasSolar ? `${energySummary.data_points} Samples` : 'USB Powered',
            isPositive: hasSolar,
            label: hasSolar ? 'PV Yield' : 'A1 Unwired'
          }}
        />

        <StatCard
          title="Total Consumption"
          value={formatWattHours(energySummary.total_load_wh)}
          subtitle="Calculated from active LEDs & MCU"
          icon={<Zap className="w-5 h-5" />}
          accentColor="electric"
          trend={{ value: `${telemetry.load_power_w} W Live`, label: 'Calculated Load' }}
        />

        <StatCard
          title="Solar Contribution"
          value={hasSolar ? `${energySummary.solar_contribution_pct.toFixed(1)}%` : '0.0%'}
          subtitle={hasSolar ? 'Self-powered by rooftop array' : 'No solar sensor wired'}
          icon={<BatteryCharging className="w-5 h-5" />}
          accentColor="eco"
          trend={{
            value: systemStatus.is_simulated ? 'Simulator' : 'Arduino Real',
            isPositive: !systemStatus.is_simulated,
            label: 'Data Source'
          }}
        />

        <StatCard
          title="Avoided Emissions"
          value={hasSolar ? `${energySummary.co2_saved_grams.toFixed(1)} g` : '0.0 g'}
          subtitle="Carbon offset (0.82 g/Wh solar)"
          icon={<Leaf className="w-5 h-5" />}
          accentColor="eco"
          trend={{
            value: hasSolar ? 'Clean Energy' : 'Grid/USB Powered',
            isPositive: hasSolar,
            label: 'CO2 Metric'
          }}
        />
      </div>

      {/* Generation vs Consumption Comparative Analytics Chart */}
      <Card
        title="Energy Generation vs Consumption Analytics"
        subtitle="Real hourly and daily energy trends computed from recorded SQLite telemetry (Wh)"
        icon={<LineChartIcon className="w-4 h-4 text-emerald-600" />}
      >
        <EnergyComparisonChart />
      </Card>

      {/* Energy Optimization & Actionable Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Live System Optimization Insights"
          subtitle="Derived dynamically from your current hardware state and recorded telemetry"
          icon={<Lightbulb className="w-4 h-4 text-amber-600" />}
        >
          <div className="space-y-3">
            {/* Insight 1: PIR Occupancy Automation */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-slate-900 text-sm">Occupancy-Based Lighting Active</h5>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                    Timeout: {offDelaySec}s
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {telemetry.mode === 'AUTO'
                    ? `AUTO mode is active: LED1 (D5) & LED2 (D6) shut off ${offDelaySec}s after PIR motion (D2) clears, saving up to 0.30 W during vacant intervals.`
                    : 'MANUAL override is active: remember to return to AUTO mode so lights turn off automatically when the room becomes vacant.'}
                </p>
              </div>
            </div>

            {/* Insight 2: Dynamic Solar or Hardware Status */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-slate-900 text-sm">
                    {hasSolar ? 'Solar Irradiance Window' : 'Hardware Sensor Expansion'}
                  </h5>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                    {hasSolar ? `${telemetry.solar_voltage.toFixed(2)} V Live` : 'PIR + 2 LEDs'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {hasSolar
                    ? (telemetry.solar_voltage >= 5.0
                        ? `Solar voltage is ${telemetry.solar_voltage.toFixed(2)}V. Net power is ${telemetry.net_power_w >= 0 ? 'surplus' : 'deficit'}.`
                        : `Solar voltage is low (${telemetry.solar_voltage.toFixed(2)}V). Minimize non-essential loads to preserve battery.`)
                    : 'Currently measuring PIR Motion (D2) and driving LED1 (D5) & LED2 (D6). Wire LDR (A0), Solar (A1), or Battery (A2) and set ENABLE_EXTRA_SENSORS 1 in ecopulse_nano.ino to measure live PV yield.'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Electrical Model & Measurement Integrity Card */}
        <Card
          title="Measurement & Calculation Transparency"
          subtitle="Clear distinction between measured, calculated, and modeled values"
          icon={<Zap className="w-4 h-4 text-sky-600" />}
        >
          <div className="space-y-3 text-xs text-slate-700">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <strong className="text-slate-900 block font-bold">Real Hardware Measured (Arduino Nano):</strong>
              <p className="text-slate-600 font-mono text-[11px] leading-relaxed">
                • PIR Occupancy State (Digital Pin D2)<br/>
                • LED 1 Output State (Digital Pin D5) &amp; LED 2 Output State (Digital Pin D6)<br/>
                • Optional when wired: DHT11 (D3), LDR (A0), Solar V (A1), Battery V (A2)
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <strong className="text-slate-900 block font-bold">Calculated Estimate (No Current Sensor Wired):</strong>
              <p className="text-slate-600 leading-relaxed">
                Load Power (W) and Watt-hours (Wh) are calculated from known device states using typical 5V circuit draw: Nano MCU (~0.125W) + 0.15W per active LED.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
