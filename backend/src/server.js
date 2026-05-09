/**
 * @file Application entry point and composition root. Wires database, MQTT
 * ingestion, and the HTTP API; handles graceful shutdown on SIGINT/SIGTERM.
 * @module src/server
 * @author Hanna Rubio Vretby <hr222sy@student.lnu.se>
 * @version 1.0.0
 */

import express from 'express'
import { config } from './config.js'
import { Database } from './Database.js'
import { MqttIngestion } from './MqttIngestion.js'
import { createApiRouter } from './api.js'

// Composition root: construct and wire all dependencies.
const database = new Database(config.mongodb)
const ingestion = new MqttIngestion(database, config.mqtt)
const apiRouter = createApiRouter(database)

const app = express()
app.use('/api', apiRouter)

let server = null

/**
 * Start all subsystems: connect to DB, begin ingesting MQTT messages,
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
