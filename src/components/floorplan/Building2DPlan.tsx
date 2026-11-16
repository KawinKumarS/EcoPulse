import React, { useState } from 'react';
import {
  Lightbulb,
  Fan,
  Activity,
  Thermometer,
  Droplets,
  Sun,
  Battery,
  Eye,
  Info
} from 'lucide-react';
import clsx from 'clsx';
import { useEcoPulse } from '../../context/EcoPulseContext';
import { formatTemperature, formatVoltage, formatWatts } from '../../utils/formatters';

export const Building2DPlan: React.FC = () => {
  const { telemetry, sendCommand, tempUnit } = useEcoPulse();
  const [selectedRoom, setSelectedRoom] = useState<string | null>('office');

  const isDualLedHardware = telemetry.hardware_profile === 'pir_dual_led' || telemetry.hardware_profile === 'pir_dual_led_legacy';
  const led1On = telemetry.led1 ?? telemetry.light;
  const led2On = telemetry.led2 ?? false;

  return (
    <div className="space-y-4">
      {/* 2D Architectural Canvas Container */}
      <div className="relative w-full aspect-[16/10] max-h-[520px] bg-slate-100/80 border border-slate-200/90 rounded-2xl p-4 lg:p-6 overflow-hidden shadow-inner">
        {/* Architectural CAD grid background */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Building Exterior Border Label */}
        <div className="absolute top-2.5 left-4 text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Sustainable Building Model • Architectural Spatial Twin (1:25 Scale)
        </div>

        {/* Floor Plan Grid Layout */}
        <div className="w-full h-full pt-5 grid grid-cols-12 grid-rows-6 gap-3">
          {/* ============================================================== */}
          {/* ZONE 1: Solar Rooftop Array (Top span, rows 1-2, cols 1-12)     */}
          {/* ============================================================== */}
          <div
            onClick={() => setSelectedRoom('solar_roof')}
            className={clsx(
              'col-span-12 row-span-2 rounded-xl p-3 border transition-all cursor-pointer relative overflow-hidden flex items-center justify-between shadow-sm',
              selectedRoom === 'solar_roof' ? 'ring-2 ring-amber-500/80' : '',
              telemetry.has_solar !== false && telemetry.solar_voltage > 1.0
                ? 'bg-gradient-to-r from-amber-50/90 via-amber-100/50 to-amber-50/90 border-amber-300'
                : 'bg-white border-slate-200'
            )}
          >
            {/* Solar Cell Grid Lines */}
            <div className="absolute inset-0 opacity-15 pointer-events-none flex">
              {[...Array(16)].map((_, i) => (
                <div key={i} className="flex-1 border-r border-amber-600" />
              ))}
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-300/80 shadow-sm">
                <Sun className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-800 font-bold tracking-wider">
                  Rooftop Photovoltaic Array
                </span>
                <h4 className="text-sm font-bold text-slate-900">6V Monocrystalline PV Module</h4>
                <p className="text-xs text-slate-500">
                  {telemetry.has_solar === false ? 'Optional Expansion (A1 Not Wired)' : 'Hardware Pin: A1 (2:1 Divider)'}
                </p>
              </div>
            </div>

            {telemetry.has_solar === false ? (
              <div className="relative z-10 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">
                PV Sensor Optional (Unwired)
              </div>
            ) : (
              <div className="flex items-center gap-6 relative z-10 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans">Panel Output</span>
                  <span className="text-base font-bold text-amber-700">
                    {formatVoltage(telemetry.solar_voltage)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans">Generation</span>
                  <span className="text-base font-bold text-emerald-700">
                    {formatWatts(telemetry.solar_power_w)}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-[10px] text-slate-500 block font-sans">Irradiance (LDR A0)</span>
                  <span className="text-sm font-semibold text-slate-700">
                    {telemetry.light_level} / 1023 ADC
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* ZONE 2: Research Office & Study Room (Rows 3-6, cols 1-7)      */}
          {/* Features: PIR motion sensor (D2) + LED 1 (D5)                  */}
          {/* ============================================================== */}
          <div
            onClick={() => setSelectedRoom('office')}
            className={clsx(
              'col-span-7 row-span-4 rounded-xl p-4 border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-sm',
              selectedRoom === 'office' ? 'ring-2 ring-emerald-600/80' : '',
              led1On
                ? 'bg-amber-50/80 border-amber-300 shadow-[inset_0_0_35px_rgba(251,191,36,0.20)]'
                : 'bg-white border-slate-200'
            )}
          >
            {/* Header: Room Name & Occupancy Badge */}
            <div className="flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">ZONE 01</span>
                  {telemetry.occupancy && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                      <Activity className="w-3 h-3" />
                      MOTION DETECTED (D2)
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">Zone 1 • Main Hall</h4>
                <p className="text-xs text-slate-500">PIR Sensor (D2) & LED 1 (D5)</p>
              </div>

              {/* LED 1 Switch */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sendCommand(isDualLedHardware ? 'led1' : 'light', !led1On);
                }}
                className={clsx(
                  'px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm',
                  led1On
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70'
                )}
              >
                <Lightbulb className={clsx('w-4 h-4', led1On ? 'fill-current' : '')} />
                <span>{led1On ? 'LED 1 ON' : 'LED 1 OFF'}</span>
              </button>
            </div>

            {/* Room Visual Center: Motion radar */}
            <div className="flex items-center justify-center py-2 relative">
              {telemetry.occupancy ? (
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-20 h-20 rounded-full border-2 border-rose-300 animate-ping opacity-60" />
                  <div className="absolute w-12 h-12 rounded-full border border-rose-400" />
                  <div className="w-7 h-7 rounded-full bg-rose-100 border-2 border-rose-500 flex items-center justify-center shadow-sm">
                    <Activity className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs font-mono flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-slate-400" />
                  <span>
                    {(led1On || led2On)
                      ? (telemetry.mode === 'AUTO'
                          ? 'PIR Idle • Hold-Off Timer (LEDs On)'
                          : 'Zone Vacant • Manual Lighting On')
                      : 'Zone Vacant • PIR Monitoring (D2)'}
                  </span>
                </div>
              )}
            </div>

            {/* Footer Telemetry Bar */}
            <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-100 relative z-10">
              <span className="text-slate-500 font-sans">Actuator: <strong className="text-slate-800">LED1 (Pin D5)</strong></span>
              <span className="text-slate-500 font-sans">Load: <strong className="text-emerald-700">{led1On ? '0.15 W' : '0.00 W'}</strong></span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* ZONE 3: Zone 2 (LED 2 on D6 in Nano hardware, or Tech Room)    */}
          {/* ============================================================== */}
          <div
            onClick={() => setSelectedRoom('utility')}
            className={clsx(
              'col-span-5 row-span-4 rounded-xl p-4 border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-sm',
              selectedRoom === 'utility' ? 'ring-2 ring-sky-600/80' : '',
              isDualLedHardware
                ? (led2On
                    ? 'bg-amber-50/80 border-amber-300 shadow-[inset_0_0_35px_rgba(251,191,36,0.20)]'
                    : 'bg-white border-slate-200')
                : (telemetry.fan
                    ? 'bg-sky-50/70 border-sky-300 shadow-[inset_0_0_35px_rgba(14,165,233,0.18)]'
                    : 'bg-white border-slate-200')
            )}
          >
            {isDualLedHardware ? (
              <>
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">ZONE 02</span>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">Zone 2 • Study Wing</h4>
                    <p className="text-xs text-slate-500">Secondary Lighting (LED2 • D6)</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      sendCommand('led2', !led2On);
                    }}
                    className={clsx(
                      'px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm',
                      led2On
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70'
                    )}
                  >
                    <Lightbulb className={clsx('w-4 h-4', led2On ? 'fill-current' : '')} />
                    <span>{led2On ? 'LED 2 ON' : 'LED 2 OFF'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-center py-2 relative">
                  <div className={clsx(
                    'w-12 h-12 rounded-2xl border flex items-center justify-center transition-all',
                    led2On
                      ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  )}>
                    <Lightbulb className={clsx('w-6 h-6', led2On ? 'fill-current' : '')} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-100 relative z-10">
                  <span className="text-slate-500 font-sans">Actuator: <strong className="text-slate-800">LED2 (Pin D6)</strong></span>
                  <span className="text-slate-500 font-sans">Load: <strong className="text-emerald-700">{led2On ? '0.15 W' : '0.00 W'}</strong></span>
                </div>
              </>
            ) : (
              <>
                {/* Header: Room Name & Fan Switch */}
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">ZONE 02</span>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">Tech & Battery Room</h4>
                    <p className="text-xs text-slate-500">Thermal Regulation & Energy Storage</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      sendCommand('fan', !telemetry.fan);
                    }}
                    className={clsx(
                      'px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm',
                      telemetry.fan
                        ? 'bg-sky-500 text-white border-sky-600 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70'
                    )}
                  >
                    <Fan className={clsx('w-4 h-4', telemetry.fan ? 'animate-spin' : '')} />
                    <span>{telemetry.fan ? 'FAN ON' : 'FAN OFF'}</span>
                  </button>
                </div>

                {/* Environmental Sensors Readout */}
                <div className="grid grid-cols-2 gap-2 my-2 relative z-10">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <Thermometer className={clsx(
                      'w-4 h-4',
                      telemetry.temperature >= 28.0 ? 'text-amber-600' : 'text-emerald-600'
                    )} />
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">Temp (D3)</span>
                      <span className="text-sm font-bold font-mono text-slate-900">
                        {formatTemperature(telemetry.temperature, tempUnit)}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-sky-600" />
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">Humidity (D3)</span>
                      <span className="text-sm font-bold font-mono text-slate-900">
                        {telemetry.humidity.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Battery Bank Sub-panel */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-mono relative z-10">
                  <div className="flex items-center gap-2">
                    <Battery className={clsx(
                      'w-4 h-4',
                      telemetry.battery_voltage < 3.4 ? 'text-rose-600' : 'text-emerald-600'
                    )} />
                    <span className="text-slate-600 font-sans font-medium">Battery Cell (A2):</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{formatVoltage(telemetry.battery_voltage)}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-800">
                      ~{telemetry.estimated_battery_pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Selected Zone Detail Panel */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-xl flex items-center justify-between text-xs shadow-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200">
            <Info className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h5 className="font-bold text-slate-900">
              {selectedRoom === 'office' && 'Zone 01: Main Hall (PIR Motion on D2 • LED 1 on D5)'}
              {selectedRoom === 'utility' && (isDualLedHardware ? 'Zone 02: Study Wing (LED 2 on D6)' : 'Zone 02: Tech Enclosure (DC Fan MOSFET on D6 • DHT11 on D3)')}
              {selectedRoom === 'solar_roof' && 'Rooftop Array: Photovoltaic Generation (Optional A1 • Irradiance LDR on A0)'}
            </h5>
            <p className="text-slate-500 mt-0.5">
              Click any room button above to dispatch a serial command directly to the Arduino Nano.
            </p>
          </div>
        </div>

        <div className="text-slate-500 font-mono text-[11px] hidden sm:block">
          Interactive SVG Plane Active
        </div>
      </div>
    </div>
  );
};
