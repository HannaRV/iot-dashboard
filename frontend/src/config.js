/**
 * @file Centralized frontend configuration.
 * @module config
 * @author Hanna Rubio Vretby <hr222sy@student.lnu.se>
 * @version 1.0.0
 */

const deviceId = 'hr222sy'

// Object.freeze prevents accidental or malicious mutation of configuration
// at runtime — e.g., a compromised library cannot redirect API or broker URLs.
export const config = Object.freeze({
  api: Object.freeze({
    baseUrl: 'http://localhost:3000/api',
    historicalWindowMinutes: 10,
    requestTimeoutMs: 10000
  }),
  mqtt: Object.freeze({
    // wss endpoint for browser MQTT-over-WebSocket. Path /mqtt is broker.emqx.io convention.
    url: 'wss://broker.emqx.io:8084/mqtt',
    deviceId,
    topics: Object.freeze({
      sensor: `lnu/iot/${deviceId}/sensor`,
      commandLed: `lnu/iot/${deviceId}/command/led`
    })
  }),
  chart: Object.freeze({
    // Sliding window: 10 min × 30 readings/min = 300 points.
    maxPoints: 300
  })
})
