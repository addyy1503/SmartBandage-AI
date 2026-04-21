# 🩹 SmartBandage AI — Intelligent Wound Monitoring Dashboard

> A clinical-grade Progressive Web App (PWA) for real-time wound monitoring, AI-powered drug recommendations, and intelligent drug delivery control.

![SmartBandage AI](https://img.shields.io/badge/status-active-brightgreen) ![PWA](https://img.shields.io/badge/PWA-ready-blue) ![AI](https://img.shields.io/badge/AI-Gemini%202.0-orange) ![License](https://img.shields.io/badge/license-MIT-purple)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🌡 **Real-time Vitals** | Live Temperature, SpO₂, H₂O₂ monitoring with animated gauges |
| 📈 **Trend Chart** | 60-second rolling window with toggle controls |
| 🩹 **AI Wound Analysis** | Upload wound image → Gemini 2.0 Flash classifies type, severity, tissue composition |
| 💊 **Drug Engine** | 28 drugs × 25 clinical rules + Gemini AI recommendations |
| 🔬 **Drug Release Controller** | Weight-based dose calculation, release logging |
| 🔗 **Hardware Support** | Web Bluetooth (BLE) · Web Serial (USB) · Simulation mode |
| 🔐 **Auth System** | Secure PIN login, multi-step registration (localStorage) |
| 📱 **PWA** | Installable on mobile & desktop, offline capable |
| 🧠 **TF.js Scaffold** | MobileNetV2 transfer learning ready for custom wound training |

---

## 🚀 Quick Start

### Run Locally
```bash
npx serve . -p 3000
```
Then open **https://smartbandage.com** in Chrome or Edge.

And for Mobile app **https://smartbandage-ai.vercel.app/** , Select "Add to home screen" on the page 

### Deploy (Free)
```bash
# Vercel (recommended)
npx vercel

# Or drag & drop folder to https://app.netlify.com/drop
```

---

## 📁 Project Structure

```
My-Project/
├── index.html          # Main app shell + auth screens + dashboard
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline caching)
│
├── css/
│   ├── main.css        # Design system tokens, components, animations
│   ├── dashboard.css   # Dashboard grid, gauges, panels, responsive
│   └── auth.css        # Welcome, login, register screens
│
├── js/
│   ├── app.js          # Main app logic, state, chart, UI updates
│   ├── auth.js         # Auth flow (welcome → login/register → dashboard)
│   ├── drug-engine.js  # Drug DB (28 drugs), rule engine, Gemini API calls
│   ├── hardware.js     # BLE / Web Serial / Simulation adapter
│   └── wound-model.js  # TF.js wound classification scaffold
│
└── assets/
    └── icons/          # PWA icons (192×192, 512×512)
```

---

## 🔧 Hardware Integration

### Arduino / ESP32 — Serial (USB)
The app reads **JSON lines** from the serial port at **115200 baud**.

**Expected JSON format (one line per reading):**
```json
{"temp": 37.2, "spo2": 98.1, "h2o2": 0.21, "hr": 74}
```

**Arduino sketch template:**
```cpp
void loop() {
  float temp = readTemperature();   // DS18B20 or MLX90614
  float spo2 = readSpO2();          // MAX30102
  float h2o2 = readH2O2();          // Custom H2O2 sensor (0–3 mM range)
  int   hr   = readHeartRate();

  Serial.print("{\"temp\":");   Serial.print(temp, 2);
  Serial.print(",\"spo2\":");   Serial.print(spo2, 1);
  Serial.print(",\"h2o2\":");   Serial.print(h2o2, 3);
  Serial.print(",\"hr\":");     Serial.print(hr);
  Serial.println("}");

  delay(1000); // 1 reading per second
}
```

**In the app:** Click **Connect Device → USB Serial** → select your COM port.

> ⚠️ Web Serial requires **Chrome/Edge** and **HTTPS** (or localhost).

---

### ESP32 — Bluetooth Low Energy (BLE)
The app connects to a device advertising the name **`SmartBandage`**.

**BLE Service UUID:** `12345678-1234-1234-1234-123456789abc`

| Characteristic | UUID | Metric |
|----------------|------|--------|
| Temperature | `aaaa0001-0000-1000-8000-00805f9b34fb` | Float32 (°C) |
| SpO₂ | `aaaa0002-0000-1000-8000-00805f9b34fb` | Float32 (%) |
| H₂O₂ | `aaaa0003-0000-1000-8000-00805f9b34fb` | Float32 (mM) |

**Values are sent as notify events with 4-byte little-endian Float32.**

**ESP32 BLE sketch template:**
```cpp
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define CHAR_TEMP_UUID      "aaaa0001-0000-1000-8000-00805f9b34fb"
#define CHAR_SPO2_UUID      "aaaa0002-0000-1000-8000-00805f9b34fb"
#define CHAR_H2O2_UUID      "aaaa0003-0000-1000-8000-00805f9b34fb"

BLECharacteristic *tempChar, *spo2Char, *h2o2Char;

void sendFloat(BLECharacteristic* c, float val) {
  uint8_t buf[4];
  memcpy(buf, &val, 4);
  c->setValue(buf, 4);
  c->notify();
}

void setup() {
  BLEDevice::init("SmartBandage");
  BLEServer* server = BLEDevice::createServer();
  BLEService* svc = server->createService(SERVICE_UUID);
  tempChar = svc->createCharacteristic(CHAR_TEMP_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  spo2Char = svc->createCharacteristic(CHAR_SPO2_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  h2o2Char = svc->createCharacteristic(CHAR_H2O2_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  tempChar->addDescriptor(new BLE2902());
  spo2Char->addDescriptor(new BLE2902());
  h2o2Char->addDescriptor(new BLE2902());
  svc->start();
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->start();
}

void loop() {
  sendFloat(tempChar, readTemperature());
  sendFloat(spo2Char, readSpO2());
  sendFloat(h2o2Char, readH2O2());
  delay(1000);
}
```

**In the app:** Click **Connect Device → Bluetooth** → select **SmartBandage** from the device list.

> ⚠️ Web Bluetooth requires **Chrome/Edge** on **HTTPS** or **localhost**.

---

## 🤖 AI Setup (Gemini API)

1. Get a free API key at [aistudio.google.com](https://aistudio.google.com)
2. Open the app → **Settings (⚙)** → paste key → **Save**
3. Key is stored permanently in your browser — you won't need to enter it again

---

## 🧠 ML Model Training (Future)

The `wound-model.js` scaffold uses **MobileNetV2 transfer learning** (TensorFlow.js).  
Once you have wound images:
1. Collect labeled images per category: `laceration`, `bruise`, `burn`, `abrasion`, `ulcer`, `infected`, `surgical`, `pressure_injury`
2. Use the in-app training UI (coming soon) or export from Python with `tensorflowjs_converter`
3. Trained model auto-saves to browser `localStorage`

---

## 🛡 Security & Privacy

- All data is stored **locally in the browser** (localStorage / sessionStorage)
- No backend server — nothing leaves your device except Gemini API calls
- PIN is hashed with **SHA-256** before storage
- API key stored in `localStorage['sb_api_key']` — never sent anywhere except Google's API

---

## 📜 License

MIT License — free to use, modify, and distribute.

---

*Built with ❤️ for the future of wound care.*
