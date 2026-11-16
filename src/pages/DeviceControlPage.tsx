import React from 'react';
import {
  Sliders,
  Lightbulb,
  Fan,
  Power,
  CheckCircle,
  Cpu,
  Info
} from 'lucide-react';
import { useEcoPulse } from '../context/EcoPulseContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const DeviceControlPage: React.FC = () => {
  const {
    telemetry,
    sendCommand,
    sendMode,
    lastAck,
    systemStatus
  } = useEcoPulse();

  const isDualLedHardware =
    telemetry.hardware_profile === 'pir_dual_led' ||
    telemetry.hardware_profile === 'pir_dual_led_legacy';
  const isLegacyReadOnly = telemetry.hardware_profile === 'pir_dual_led_legacy';
  const led1On = telemetry.led1 ?? telemetry.light;
  const led2On = telemetry.led2 ?? false;

  return (
    <div className="space-y-6">
      {isLegacyReadOnly && systemStatus.is_connected && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <strong>Legacy Read-Only Sketch Detected:</strong> Your Arduino Nano is currently running your original print-only sketch (<code>"MOTION DETECTED - LIGHTS ON"</code>). Sensor updates are live! Upload the integrated <code>firmware/ecopulse_nano/ecopulse_nano.ino</code> sketch to also enable remote MANUAL dashboard switches for LED1 &amp; LED2.
          </div>
        </div>
      )}

      {/* Operating Mode Header Switcher */}
      <Card
        title="System Control Authority Mode"
        subtitle="Toggle between autonomous edge automation and manual operator override"
        icon={<Sliders className="w-4 h-4 text-emerald-600" />}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Authority Mode:</span>
              <Badge variant={telemetry.mode === 'AUTO' ? 'green' : 'amber'}>
                {telemetry.mode === 'AUTO' ? 'Autonomous Edge (AUTO)' : 'Manual Override (MANUAL)'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              {telemetry.mode === 'AUTO'
                ? 'Sensors drive actuators autonomously (PIR D2 keeps LED1 & LED2 on for OFF_DELAY).'
                : 'Sensors report readings, but devices only change state upon explicit operator command.'}
            </p>
          </div>

          <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <button
              onClick={() => sendMode('AUTO')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                telemetry.mode === 'AUTO'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ENABLE AUTO
            </button>
            <button
              onClick={() => sendMode('MANUAL')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                telemetry.mode === 'MANUAL'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ENABLE MANUAL
            </button>
          </div>
        </div>
      </Card>

      {/* Hardware Actuator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device 1: LED 1 (Pin D5) */}
        <Card
          title={isDualLedHardware ? 'Zone 1 Lighting (LED1)' : 'Miniature Room LED Lighting'}
          subtitle="Physical pin D5 on Arduino Nano (ATmega328P)"
          icon={<Lightbulb className="w-4 h-4 text-amber-600" />}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-slate-500 font-medium">Current Output State</span>
                <div className="text-xl font-bold font-mono text-slate-900">
                  {led1On ? 'ACTIVE (HIGH)' : 'IDLE (LOW)'}
                </div>
              </div>
              <div className={`p-4 rounded-2xl border transition-all ${
                led1On
                  ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}>
                <Lightbulb className={`w-8 h-8 ${led1On ? 'fill-current' : ''}`} />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Electrical Load:</span>
                <span className="font-mono font-bold text-slate-900">0.15 W (~30 mA @ 5V)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Arduino Pin:</span>
                <span className="font-mono font-bold text-slate-800">D5 (LED1)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Auto Trigger Rule:</span>
                <span className="font-medium text-slate-800">PIR Motion (D2)</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => sendCommand(isDualLedHardware ? 'led1' : 'light', !led1On)}
                className={`w-full py-3 rounded-xl text-xs font-bold tracking-wider uppercase border transition-all flex items-center justify-center gap-2 ${
                  led1On
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{led1On ? 'Switch Off LED 1' : 'Switch On LED 1'}</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Device 2: LED 2 (Pin D6) in Dual-LED mode, or Fan (Pin D6) */}
        {isDualLedHardware ? (
          <Card
            title="Zone 2 Lighting (LED2)"
            subtitle="Physical pin D6 on Arduino Nano (ATmega328P)"
            icon={<Lightbulb className="w-4 h-4 text-amber-600" />}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-500 font-medium">Current Output State</span>
                  <div className="text-xl font-bold font-mono text-slate-900">
                    {led2On ? 'ACTIVE (HIGH)' : 'IDLE (LOW)'}
                  </div>
                </div>
                <div className={`p-4 rounded-2xl border transition-all ${
                  led2On
                    ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}>
                  <Lightbulb className={`w-8 h-8 ${led2On ? 'fill-current' : ''}`} />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Electrical Load:</span>
                  <span className="font-mono font-bold text-slate-900">0.15 W (~30 mA @ 5V)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Arduino Pin:</span>
                  <span className="font-mono font-bold text-slate-800">D6 (LED2)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Auto Trigger Rule:</span>
                  <span className="font-medium text-slate-800">PIR Motion (D2)</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => sendCommand('led2', !led2On)}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-wider uppercase border transition-all flex items-center justify-center gap-2 ${
                    led2On
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{led2On ? 'Switch Off LED 2' : 'Switch On LED 2'}</span>
                </button>
                <button
                  onClick={() => sendCommand('light', !(led1On && led2On))}
                  className="px-4 py-3 rounded-xl text-xs font-bold uppercase border bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm"
                >
                  {led1On && led2On ? 'All Off' : 'All On'}
                </button>
              </div>
            </div>
          </Card>
        ) : (
          <Card
            title="DC Ventilation Cooling Fan"
            subtitle="Physical pin D6 on Arduino Nano (MOSFET Driven)"
            icon={<Fan className="w-4 h-4 text-sky-600" />}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-500 font-medium">Current Output State</span>
                  <div className="text-xl font-bold font-mono text-slate-900">
                    {telemetry.fan ? 'SPINNING (HIGH)' : 'STOPPED (LOW)'}
                  </div>
                </div>
                <div className={`p-4 rounded-2xl border transition-all ${
                  telemetry.fan
                    ? 'bg-sky-100 text-sky-700 border-sky-300 shadow-sm'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}>
                  <Fan className={`w-8 h-8 ${telemetry.fan ? 'animate-spin' : ''}`} />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Electrical Load:</span>
                  <span className="font-mono font-bold text-slate-900">0.90 W (~180 mA @ 5V)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Driver Circuit:</span>
                  <span className="font-medium text-slate-800">N-Channel Logic MOSFET</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Auto Trigger Rule:</span>
                  <span className="font-medium text-slate-800">DHT11 Temp &ge; 28.0°C (D3)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => sendCommand('fan', !telemetry.fan)}
                  className={`w-full py-3 rounded-xl text-xs font-bold tracking-wider uppercase border transition-all flex items-center justify-center gap-2 ${
                    telemetry.fan
                      ? 'bg-sky-500 text-white border-sky-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{telemetry.fan ? 'Stop Ventilation Fan' : 'Start Ventilation Fan'}</span>
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Serial Protocol & Acknowledgement Log Card */}
      <Card
        title="Hardware Command & Acknowledgement Diagnostics"
        subtitle="Bidirectional newline-delimited JSON messages between Host Laptop & Arduino"
        icon={<Cpu className="w-4 h-4 text-emerald-600" />}
      >
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="text-slate-500 font-sans">Hardware Connection:</span>
            <span className="text-slate-800 font-bold">
              {systemStatus.is_connected ? `USB Serial Active (${systemStatus.port})` : 'Software Simulator'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="text-slate-500 font-sans">Command Dispatch Schema:</span>
            <span className="text-emerald-700 font-bold">{`{"type":"command","device":"led1","state":true}`}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-sans">Last Hardware Ack:</span>
            {lastAck ? (
              <span className="text-amber-700 flex items-center gap-1 font-bold">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                {`{"type":"ack","device":"${lastAck.device || lastAck.mode}","status":"${lastAck.status}"}`}
              </span>
            ) : (
              <span className="text-slate-400">None yet</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
