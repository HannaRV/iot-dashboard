/**
 * @file Centralized configuration loaded from environment variables.
 * @module src/config
 */

import 'dotenv/config'

const required = (name) => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const deviceId = 'hr222sy'

export const config = {
  mqtt: {
    broker: process.env.MQTT_BROKER || 'broker.emqx.io',
    port: Number(process.env.MQTT_PORT) || 1883,
    keepalive: 60,
    deviceId,
    topic: `lnu/iot/${deviceId}/sensor`
  },
  mongodb: {
    uri: required('MONGODB_URI'),
    dbName: process.env.DB_NAME || 'iot_dashboard',
    collection: 'sensor_readings',
    retentionDays: 7
  },
  http: {
    port: Number(process.env.HTTP_PORT) || 3000
  }
}
