import React from 'react';
import {
  Sun,
  Battery,
  Zap,
  Activity,
  Thermometer,
  Droplets,
  Lightbulb,
  Fan,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { useEcoPulse } from '../context/EcoPulseContext';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { LivePowerChart } from '../components/charts/LivePowerChart';
import { Building2DPlan } from '../components/floorplan/Building2DPlan';
import {
  formatWatts,
  formatVoltage,
  formatTemperature,
} from '../utils/formatters';

export const OverviewPage: React.FC = () => {
  const {
    telemetry,
    sendCommand,
    tempUnit,
    energySummary,
    lastAck
  } = useEcoPulse();

  const isCharging = telemetry.net_power_w > 0;
  const isDualLedHardware =
    telemetry.hardware_profile === 'pir_dual_led' ||
    telemetry.hardware_profile === 'pir_dual_led_legacy';
  const led1On = telemetry.led1 ?? telemetry.light;
  const led2On = telemetry.led2 ?? false;

  const activeLoadCount = isDualLedHardware
    ? Number(led1On) + Number(led2On)
    : Number(telemetry.light) + Number(telemetry.fan);

  return (
    <div className="space-y-6">
      {/* Top Notification if Command Acknowledged */}
      {lastAck && Date.now() - (lastAck.timestamp || 0) < 4000 && (
        <div className="bg-emerald-50 border border-emerald-200/90 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-800 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>
              <strong>Hardware Ack Received:</strong> {lastAck.device || lastAck.mode} command confirmed by Arduino Nano.
            </span>
          </div>
          <span className="font-mono text-[11px] text-emerald-700/80">Status: {lastAck.status}</span>
        </div>
      )}

      {/* 4 Primary Top-line Electrical & Energy Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Solar Generation */}
        <StatCard
          title="Solar Generation"
          value={telemetry.has_solar === false ? 'Not Wired' : formatWatts(telemetry.solar_power_w)}
          subtitle={
            telemetry.has_solar === false
              ? 'Optional Analog Pin A1'
              : telemetry.solar_source === 'dummy_varying'
              ? `Demo PV: ${formatVoltage(telemetry.solar_voltage)} (Varying)`
              : `Solar Voltage: ${formatVoltage(telemetry.solar_voltage)} (A1)`
          }
          icon={<Sun className="w-5 h-5" />}
          accentColor="solar"
          badge={
            telemetry.has_solar === false ? (
              <Badge variant="slate" size="sm">Optional</Badge>
            ) : telemetry.solar_source === 'dummy_varying' ? (
              <Badge variant="amber" size="sm">{isCharging ? 'Demo Charging' : 'Demo PV'}</Badge>
            ) : (
              <Badge variant={telemetry.solar_voltage > 1.0 ? 'amber' : 'slate'} size="sm">
                {telemetry.solar_voltage > 1.0 ? 'Active PV' : 'Night / Standby'}
              </Badge>
            )
          }
          trend={{
            value: `${energySummary.total_solar_wh.toFixed(3)} Wh Today`,
            isPositive: telemetry.has_solar !== false,
            label: telemetry.solar_source === 'dummy_varying' ? 'Demo Yield' : 'Accumulated'
          }}
        />

        {/* Metric 2: Battery Storage */}
        <StatCard
          title="Battery Storage"
          value={
            telemetry.has_battery === false
              ? 'Not Wired'
              : telemetry.battery_source === 'modeled_from_led_load'
              ? `~${telemetry.estimated_battery_pct.toFixed(1)}%`
              : formatVoltage(telemetry.battery_voltage)
          }
          subtitle={
            telemetry.has_battery === false
              ? 'Optional Analog Pin A2'
              : telemetry.battery_source === 'modeled_from_led_load'
              ? `Est. Voltage: ${formatVoltage(telemetry.battery_voltage)} (LED Usage)`
              : `Estimated Capacity: ~${telemetry.estimated_battery_pct.toFixed(1)}% (A2)`
          }
          icon={<Battery className="w-5 h-5" />}
          accentColor="eco"
          badge={
            telemetry.has_battery === false ? (
              <Badge variant="slate" size="sm">Optional</Badge>
            ) : (
              <Badge variant={isCharging ? 'green' : (telemetry.battery_voltage < 3.4 ? 'red' : 'amber')} size="sm">
                {isCharging ? 'Charging ▲' : 'Reducing ▼'}
              </Badge>
            )
          }
          trend={{
            value:
              telemetry.has_battery === false
                ? 'USB Powered'
                : isCharging
                ? '+Power Increasing (Solar > Load)'
                : '-Power Reducing (LED Active)',
            isPositive: telemetry.has_battery !== false && isCharging,
            label: telemetry.battery_source === 'modeled_from_led_load' ? 'Est. Battery' : 'Li-ion Cell'
          }}
        />

        {/* Metric 3: Building Load */}
        <StatCard
          title="Building Demand"
          value={formatWatts(telemetry.load_power_w)}
          subtitle={
            isDualLedHardware
              ? `LED1: ${led1On ? '0.15W' : '0W'} | LED2: ${led2On ? '0.15W' : '0W'}`
              : `LED: ${telemetry.light ? '0.15W' : '0W'} | Fan: ${telemetry.fan ? '0.90W' : '0W'}`
          }
          icon={<Zap className="w-5 h-5" />}
          accentColor="electric"
          badge={
            <Badge variant="blue" size="sm">
              {activeLoadCount} Active {activeLoadCount === 1 ? 'Load' : 'Loads'}
            </Badge>
          }
          trend={{
            value: `${energySummary.total_load_wh.toFixed(2)} Wh Today`,
            label: 'Consumed'
          }}
        />

        {/* Metric 4: Net Power Balance */}
        <StatCard
          title="Net Power Flow"
          value={`${telemetry.net_power_w >= 0 ? '+' : ''}${formatWatts(telemetry.net_power_w)}`}
          subtitle={
            telemetry.has_solar === false
              ? 'Powered by USB / Host supply'
              : (telemetry.net_power_w >= 0 ? 'Surplus power stored to battery' : 'Deficit drawn from battery storage')
          }
          icon={telemetry.net_power_w >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
          accentColor={telemetry.net_power_w >= 0 ? 'eco' : 'slate'}
          badge={
            <Badge variant={telemetry.net_power_w >= 0 ? 'green' : 'amber'} size="sm">
              {telemetry.net_power_w >= 0 ? 'Net Surplus' : 'Load Active'}
            </Badge>
          }
          trend={{
            value: `${energySummary.solar_contribution_pct.toFixed(0)}% Solar Contrib`,
            isPositive: telemetry.solar_power_w > 0,
            label: 'Clean Index'
          }}
        />
      </div>

      {/* Secondary Sensor Strip: Temperature, Humidity, Light level, Motion */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl flex items-center gap-3 shadow-card hover:shadow-card-hover transition-all">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Thermometer className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">Temp (D3)</span>
            <span className="text-lg font-bold font-mono text-slate-900">
              {telemetry.has_dht11 === false ? (
                <span className="text-sm text-slate-400 font-sans">Not Wired</span>
              ) : (
                formatTemperature(telemetry.temperature, tempUnit)
              )}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl flex items-center gap-3 shadow-card hover:shadow-card-hover transition-all">
          <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">Humidity (D3)</span>
            <span className="text-lg font-bold font-mono text-slate-900">
              {telemetry.has_dht11 === false ? (
                <span className="text-sm text-slate-400 font-sans">Not Wired</span>
              ) : (
                `${telemetry.humidity.toFixed(1)}%`
              )}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl flex items-center gap-3 shadow-card hover:shadow-card-hover transition-all">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">Light Level (A0)</span>
            <span className="text-lg font-bold font-mono text-slate-900 flex items-center gap-2">
              {telemetry.has_ldr === false ? (
                <span className="text-sm text-slate-400 font-sans">Not Wired</span>
              ) : (
                <>
                  <span>
                    {telemetry.light_level} <span className="text-xs text-slate-400 font-sans">/ 1023</span>
                  </span>
                  <span className={`text-[10px] font-sans font-bold px-1.5 py-0.5 rounded ${
                    telemetry.light_level >= 500
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {telemetry.light_level >= 500 ? 'HIGH' : 'LOW'}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl flex items-center gap-3 shadow-card hover:shadow-card-hover transition-all">
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">Occupancy (D2)</span>
            <span className="text-sm font-bold font-mono">
              {telemetry.occupancy ? (
                <span className="text-rose-600 flex items-center gap-1 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Motion Active
                </span>
              ) : (led1On || led2On) ? (
                <span className="text-amber-600 font-bold">
                  {telemetry.mode === 'AUTO' ? 'Hold-Off Timer (LED On)' : 'Vacant (Manual On)'}
                </span>
              ) : (
                <span className="text-slate-500">Vacant</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive 2D Building Visualization & Real-time Live Power Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive 2D Floor Plan (7 cols) */}
        <div className="lg:col-span-7">
          <Card
            title="Building Architectural Plane"
            subtitle="Real-time interactive 2D spatial twin of miniature sustainable rooms"
            icon={<Cpu className="w-4 h-4 text-emerald-600" />}
          >
            <Building2DPlan />
          </Card>
        </div>

        {/* Right Column: Live Real-time Power Chart & Fast Device Switchers (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card
            title="Live Power Stream"
            subtitle="Solar generation power vs total miniature building consumption (W)"
            icon={<TrendingUp className="w-4 h-4 text-amber-600" />}
          >
            <LivePowerChart />
          </Card>

          {/* Quick Hardware Actuator Toggle Cards */}
          <Card
            title="Direct Hardware Actuators"
            subtitle="Dispatches newline-delimited JSON commands to Arduino Nano serial"
          >
            <div className="space-y-3">
              {isDualLedHardware ? (
                <>
                  {/* Actuator 1: LED 1 (D5) */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        led1On
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}>
                        <Lightbulb className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-sm">Zone 1 Lighting (LED1)</h5>
                        <p className="text-xs text-slate-500">Digital Pin D5 • 0.15 W Rating</p>
                      </div>
                    </div>

                    <button
                      onClick={() => sendCommand('led1', !led1On)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        led1On
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-sm'
                      }`}
                    >
                      {led1On ? 'TURN OFF' : 'TURN ON'}
                    </button>
                  </div>

                  {/* Actuator 2: LED 2 (D6) */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        led2On
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}>
                        <Lightbulb className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-sm">Zone 2 Lighting (LED2)</h5>
                        <p className="text-xs text-slate-500">Digital Pin D6 • 0.15 W Rating</p>
                      </div>
                    </div>

                    <button
                      onClick={() => sendCommand('led2', !led2On)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        led2On
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-sm'
                      }`}
                    >
                      {led2On ? 'TURN OFF' : 'TURN ON'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Actuator 1: LED Lighting */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        telemetry.light
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}>
                        <Lightbulb className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-sm">Room Lighting LED</h5>
                        <p className="text-xs text-slate-500">Digital Pin D5 • 0.15 W Rating</p>
                      </div>
                    </div>

                    <button
                      onClick={() => sendCommand('light', !telemetry.light)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        telemetry.light
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-sm'
                      }`}
                    >
                      {telemetry.light ? 'TURN OFF' : 'TURN ON'}
                    </button>
                  </div>

                  {/* Actuator 2: Ventilation Fan */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        telemetry.fan
                          ? 'bg-sky-500 text-white border-sky-600 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}>
                        <Fan className={`w-4 h-4 ${telemetry.fan ? 'animate-spin' : ''}`} />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-sm">DC Ventilation Fan</h5>
                        <p className="text-xs text-slate-500">Digital Pin D6 (MOSFET) • 0.90 W</p>
                      </div>
                    </div>

                    <button
                      onClick={() => sendCommand('fan', !telemetry.fan)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        telemetry.fan
                          ? 'bg-sky-500 text-white border-sky-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-sm'
                      }`}
                    >
                      {telemetry.fan ? 'STOP FAN' : 'START FAN'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
