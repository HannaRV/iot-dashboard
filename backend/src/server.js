/**
 * @file Application entry point. Wires together database, MQTT ingestion,
 * and the HTTP API. Handles graceful shutdown on SIGINT and SIGTERM.
 * @module src/server
 */

import express from 'express'
import { database } from './Database.js'
import { ingestion } from './MqttIngestion.js'
import { config } from './config.js'

const app = express()

// API routes will be mounted here once api.js is implemented.

let server = null

/**
 * Start the application: connect to DB, begin ingesting MQTT messages,
 * and start the HTTP server.
 */
async function start() {
  await database.connect()
  ingestion.start()
  server = app.listen(config.http.port, () => {
    console.log(`HTTP server listening on port ${config.http.port}.`)
  })
}

/**
 * Gracefully shut down all subsystems in reverse order of startup.
 *
 * @param {string} signal - The signal that triggered shutdown.
 */
async function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down gracefully...`)
  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }
  await ingestion.stop()
  await database.disconnect()
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

start().catch((error) => {
  console.error('Failed to start backend:', error)
  process.exit(1)
})
