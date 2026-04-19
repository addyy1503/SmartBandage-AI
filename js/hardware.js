/* ═══════════════════════════════════════════
   hardware.js — BLE / Serial / Simulation adapter
   ═══════════════════════════════════════════ */
class HardwareAdapter extends EventTarget {
  constructor() {
    super();
    this.mode = 'simulation';
    this._simInterval = null;
    this._serialPort = null;
    this._bleDevice = null;
    this._scenario = 'normal';
    this._tick = 0;
  }
  setScenario(s) { this._scenario = s; this._tick = 0; }
  async connect(mode) {
    this.mode = mode;
    if (mode === 'bluetooth') return this._connectBLE();
    if (mode === 'serial')    return this._connectSerial();
    return this._startSimulation();
  }
  disconnect() {
    clearInterval(this._simInterval); this._simInterval = null;
    if (this._bleDevice?.gatt?.connected) this._bleDevice.gatt.disconnect();
    if (this._serialPort) this._serialPort.close().catch(() => {});
    this._emit({ connected: false, mode: this.mode });
  }
  async _connectBLE() {
    if (!navigator.bluetooth) { alert('Web Bluetooth not supported. Using Simulation.'); return this._startSimulation(); }
    try {
      this._bleDevice = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'SmartBandage' }],
        optionalServices: ['12345678-1234-1234-1234-123456789abc']
      });
      const server = await this._bleDevice.gatt.connect();
      const service = await server.getPrimaryService('12345678-1234-1234-1234-123456789abc');
      const charMap = {
        'aaaa0001-0000-1000-8000-00805f9b34fb': 'temperature',
        'aaaa0002-0000-1000-8000-00805f9b34fb': 'spo2',
        'aaaa0003-0000-1000-8000-00805f9b34fb': 'h2o2',
      };
      for (const [uuid, metric] of Object.entries(charMap)) {
        const char = await service.getCharacteristic(uuid);
        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', (e) => {
          const val = new DataView(e.target.value.buffer).getFloat32(0, true);
          this._emit({ metric, value: val, mode: 'bluetooth' });
        });
      }
      this._bleDevice.addEventListener('gattserverdisconnected', () => this._emit({ connected: false, mode: 'bluetooth' }));
      this._emit({ connected: true, mode: 'bluetooth' });
    } catch (err) { alert('BLE failed: ' + err.message + '\nUsing Simulation.'); this._startSimulation(); }
  }
  async _connectSerial() {
    if (!navigator.serial) { alert('Web Serial not supported. Using Simulation.'); return this._startSimulation(); }
    try {
      this._serialPort = await navigator.serial.requestPort();
      await this._serialPort.open({ baudRate: 115200 });
      const decoder = new TextDecoderStream();
      this._serialPort.readable.pipeTo(decoder.writable);
      const reader = decoder.readable.getReader();
      this._emit({ connected: true, mode: 'serial' });
      let buffer = '';
      (async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split('\n'); buffer = lines.pop();
          for (const line of lines) {
            try {
              const data = JSON.parse(line.trim());
              if (data.temp  !== undefined) this._emit({ metric: 'temperature', value: data.temp,  mode: 'serial' });
              if (data.spo2  !== undefined) this._emit({ metric: 'spo2',        value: data.spo2,  mode: 'serial' });
              if (data.h2o2  !== undefined) this._emit({ metric: 'h2o2',        value: data.h2o2,  mode: 'serial' });
              if (data.hr    !== undefined) this._emit({ metric: 'heartRate',   value: data.hr,    mode: 'serial' });
            } catch(_) {}
          }
        }
      })();
    } catch (err) { alert('Serial failed: ' + err.message + '\nUsing Simulation.'); this._startSimulation(); }
  }
  _startSimulation() {
    this.mode = 'simulation';
    clearInterval(this._simInterval);
    this._emit({ connected: true, mode: 'simulation' });
    this._simInterval = setInterval(() => {
      this._tick++;
      this._emit({ batch: this._generateSimData(this._tick), mode: 'simulation' });
    }, 1000);
  }
  _generateSimData(t) {
    const gauss = (mean, std) => {
      const u = 1 - Math.random(), v = Math.random();
      return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    let temp, spo2, h2o2;
    switch (this._scenario) {
      case 'infection':
        temp = gauss(37.2 + Math.min(t * 0.018, 1.8), 0.12);
        spo2 = gauss(96 - Math.min(t * 0.03, 4), 0.6);
        h2o2 = gauss(0.3 + Math.min(t * 0.012, 0.7), 0.04); break;
      case 'critical':
        temp = gauss(39.2, 0.15); spo2 = gauss(88, 1.2); h2o2 = gauss(1.1, 0.08); break;
      default:
        temp = gauss(36.8, 0.12); spo2 = gauss(97.5, 0.5); h2o2 = gauss(0.20, 0.03);
    }
    if (Math.random() < 0.04) spo2 -= gauss(3, 1);
    return {
      temperature: parseFloat(Math.max(34, Math.min(42, temp)).toFixed(1)),
      spo2:        parseFloat(Math.max(70, Math.min(100, spo2)).toFixed(1)),
      h2o2:        parseFloat(Math.max(0,  Math.min(3,   h2o2)).toFixed(3)),
      heartRate:   Math.round(gauss(72, 5)),
    };
  }
  _emit(detail) { this.dispatchEvent(new CustomEvent('data', { detail })); }
}
window.HardwareAdapter = HardwareAdapter;
