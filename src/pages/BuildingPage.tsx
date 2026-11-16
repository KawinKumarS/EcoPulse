import React from 'react';
import {
  Building2,
  Lightbulb,
  Fan,
  Zap
} from 'lucide-react';
import { useEcoPulse } from '../context/EcoPulseContext';
import { Card } from '../components/common/Card';
import { Building2DPlan } from '../components/floorplan/Building2DPlan';
import { formatTemperature, formatVoltage, formatWatts } from '../utils/formatters';

export const BuildingPage: React.FC = () => {
  const { telemetry, sendCommand, tempUnit, systemStatus } = useEcoPulse();

  const isDualLedHardware =
    telemetry.hardware_profile === 'pir_dual_led' ||
    telemetry.hardware_profile === 'pir_dual_led_legacy';
  const led1On = telemetry.led1 ?? telemetry.light;
  const led2On = telemetry.led2 ?? false;

  return (
    <div className="space-y-6">
      {/* Interactive 2D Canvas */}
      <Card
        title="Miniature Sustainable Building — 2D Interactive Digital Twin"
        subtitle="Live state synchronization with Arduino Nano hardware sensors and actuators"
        icon={<Building2 className="w-4 h-4 text-emerald-600" />}
        action={
          <div className="text-xs text-slate-500 font-mono font-medium">
            {systemStatus.is_connected ? `Sync: Arduino Nano (${systemStatus.port})` : 'Sync: Demo Simulator'}
          </div>
        }
      >
        <Building2DPlan />
      </Card>

      {/* Room Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Zone 1: Main Hall / LED 1 */}
        <Card
          title="Zone 1: Main Hall"
          subtitle="PIR Sensor (D2) & LED 1 (D5)"
          icon={<Lightbulb className="w-4 h-4 text-amber-600" />}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
              <span className="text-slate-500 font-medium">PIR Motion Status (D2)</span>
              <span className={`font-bold ${telemetry.occupancy ? 'text-rose-600' : 'text-slate-500'}`}>
                {telemetry.occupancy ? 'Occupied (Active)' : 'Vacant'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
              <span className="text-slate-500 font-medium">LED 1 State (D5)</span>
              <span className={`font-bold ${led1On ? 'text-amber-600' : 'text-slate-500'}`}>
                {led1On ? 'Illuminated (0.15W)' : 'Off (0.00W)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Active Mode</span>
              <span className="font-mono font-bold text-slate-800">{telemetry.mode}</span>
            </div>

            <button
              onClick={() => sendCommand(isDualLedHardware ? 'led1' : 'light', !led1On)}
              className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all ${
                led1On
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70 shadow-sm'
              }`}
            >
              {led1On ? 'Turn Off LED 1' : 'Turn On LED 1'}
            </button>
          </div>
        </Card>

        {/* Zone 2: LED 2 or Ventilation Enclosure */}
        {isDualLedHardware ? (
          <Card
            title="Zone 2: Study Wing"
            subtitle="Secondary Lighting (LED 2 • D6)"
            icon={<Lightbulb className="w-4 h-4 text-amber-600" />}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">LED 2 State (D6)</span>
                <span className={`font-bold ${led2On ? 'text-amber-600' : 'text-slate-500'}`}>
                  {led2On ? 'Illuminated (0.15W)' : 'Off (0.00W)'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Auto Off Delay</span>
                <span className="font-mono font-bold text-slate-900">
                  {((telemetry.off_delay_ms || 2000) / 1000).toFixed(1)} s
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Active Mode</span>
                <span className="font-mono font-bold text-slate-800">{telemetry.mode}</span>
              </div>

              <button
                onClick={() => sendCommand('led2', !led2On)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  led2On
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70 shadow-sm'
                }`}
              >
                {led2On ? 'Turn Off LED 2' : 'Turn On LED 2'}
              </button>
            </div>
          </Card>
        ) : (
          <Card
            title="Zone 2: Tech Enclosure"
            subtitle="Ventilation & Climate Node"
            icon={<Fan className="w-4 h-4 text-sky-600" />}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Temperature (D3)</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatTemperature(telemetry.temperature, tempUnit)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">DC Fan State (D6)</span>
                <span className={`font-bold ${telemetry.fan ? 'text-sky-600' : 'text-slate-500'}`}>
                  {telemetry.fan ? 'Ventilating (0.90W)' : 'Idle (0.00W)'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Battery Level (A2)</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatVoltage(telemetry.battery_voltage)} (~{telemetry.estimated_battery_pct.toFixed(0)}%)
                </span>
              </div>

              <button
                onClick={() => sendCommand('fan', !telemetry.fan)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  telemetry.fan
                    ? 'bg-sky-500 text-white border-sky-600 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70 shadow-sm'
                }`}
              >
                {telemetry.fan ? 'Stop Fan' : 'Start Fan'}
              </button>
            </div>
          </Card>
        )}

        {/* Rooftop / Power Node */}
        <Card
          title="Power & Energy Node"
          subtitle="Calculated Building Consumption"
          icon={<Zap className="w-4 h-4 text-amber-600" />}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Solar Voltage (A1)</span>
              <span className="font-mono font-bold text-amber-600">
                {telemetry.has_solar === false ? 'Not Wired' : formatVoltage(telemetry.solar_voltage)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Active Load Power</span>
              <span className="font-mono font-bold text-emerald-600">
                {formatWatts(telemetry.load_power_w)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Ambient Light (A0)</span>
              <span className="font-mono font-bold text-slate-800">
                {telemetry.has_ldr === false ? 'Not Wired' : `${telemetry.light_level} / 1023 ADC`}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500 font-mono font-medium">
              {telemetry.has_solar === false
                ? 'Source: USB 5V Regulated Supply'
                : `PV Status: ${telemetry.solar_voltage > 1.0 ? 'Harvesting Power' : 'Standby / Darkness'}`}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
