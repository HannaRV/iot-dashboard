/**
 * @file Centralized application configuration.
 * @module src/config
 * @author Hanna Rubio Vretby <hr222sy@student.lnu.se>
 * @version 1.0.0
 */

import 'dotenv/config'

/**
 * Read a required environment variable or throw if it is missing.
 *
 * @param {string} name - The environment variable name.
 * @returns {string} The non-empty value of the environment variable.
 * @throws {Error} If the variable is unset or empty.
 */
const requireEnv = (name) => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const deviceId = 'hr222sy'

// Object.freeze prevents accidental or malicious mutation of configuration at runtime
export const config = Object.freeze({
  mqtt: Object.freeze({
    broker: process.env.MQTT_BROKER || 'broker.emqx.io',
    port: Number(process.env.MQTT_PORT) || 1883,
    keepalive: 60, // seconds; broker drops clients silent longer than this
    deviceId,
    topic: `lnu/iot/${deviceId}/sensor`,
  }),
  mongodb: Object.freeze({
    uri: requireEnv('MONGODB_URI'),
    dbName: process.env.DB_NAME || 'iot_dashboard',
    collection: 'sensor_readings',
    retentionDays: 7, // documents older than this are auto-removed by MongoDB TTL
  }),
  http: Object.freeze({
    port: Number(process.env.HTTP_PORT) || 3000,
  }),
})
