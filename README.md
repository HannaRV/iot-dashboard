# IoT Dashboard

End-to-end IoT pipeline: Wokwi-simulated ESP32 publishes sensor data via MQTT to a Node.js backend with MongoDB time-series storage, visualized in a real-time Vanilla JS dashboard. 1DV027 — Linnaeus University.

![Wokwi](https://img.shields.io/badge/Wokwi-FFCA28?style=for-the-badge&logo=wokwi&logoColor=black)
![ESP32](https://img.shields.io/badge/ESP32-E7352C?style=for-the-badge&logo=espressif&logoColor=white)
![MicroPython](https://img.shields.io/badge/MicroPython-2B2728?style=for-the-badge&logo=micropython&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-660066?style=for-the-badge&logo=mqtt&logoColor=white)
![EMQX](https://img.shields.io/badge/EMQX-3C9CDC?style=for-the-badge&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

## 1. Project Links

| Resource | URL |
|---|---|
| Live Dashboard | _TODO_ |
| Wokwi Simulation | https://wokwi.com/projects/463274235615279105 |
| Backend/Database | _TODO_ |
| Source Repository | https://github.com/HannaRV/iot-dashboard |

## 2. Project Overview

_TODO_

## 3. Architecture and Data Flow

_TODO: Insert architecture diagram (Mermaid or screenshot) with explicit protocol labels (MQTT, WebSocket, HTTP/HTTPS)._

## 4. Database Strategy

**Database:** MongoDB time-series collection.

_TODO: Document data model, indexing strategy, retention policy, and aggregation approach._

## 5. MQTT Topics and Payload Documentation

### Sensor Data (published by device)

- **Topic:** `lnu/iot/hr222sy/sensor`
- **Frequency:** Every 2 seconds
- **Payload (JSON):**
```json
  {
    "temperature": 22.5,
    "humidity": 45.0,
    "timestamp": 1710063386
  }
```

### Device Commands (published by dashboard)

- **Topic:** `lnu/iot/hr222sy/command/led`
- **Payload (JSON):**
```json
  { "state": true }
```

The schema extends the assignment's recommended payload to include both temperature and humidity (DHT22 returns both) and a Unix timestamp synced via NTP.

## 6. Reflection

### Which frontend technologies did you choose, and why?

_TODO_

### How does handling real-time MQTT data over WebSockets differ from a standard REST API workflow?

_TODO_

### What was the most challenging integration step (hardware, broker, backend, database, frontend), and how did you solve it?

_TODO_

## VG Extension: VG-C — Self-hosted MQTT Broker

_TODO: Document EMQX setup in Docker on DigitalOcean, auth + ACL configuration, TLS, security considerations, and risk comparison vs. public broker._
