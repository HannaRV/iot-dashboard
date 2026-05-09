/**
 * @file MQTT subscriber that ingests sensor messages and persists them to MongoDB.
 * @module src/MqttIngestion
 * @author Hanna Rubio Vretby <hr222sy@student.lnu.se>
 * @version 1.0.0
 */

import mqtt from 'mqtt'

/**
 * Subscribes to the device's sensor topic on the MQTT broker, parses incoming
 * JSON messages, and persists each reading to the time-series collection with
 * a server-side timestamp. Created in the application's composition root with
 * its database dependency injected.
 */
export class MqttIngestion {
  #config = null
  #database = null
  #client = null

  /**
   * @param {Database} database - The Database instance for persisting readings.
   * @param {object} config - MQTT configuration sub-object.
   * @param {string} config.broker - MQTT broker hostname.
   * @param {number} config.port - MQTT broker port.
   * @param {number} config.keepalive - MQTT keepalive in seconds.
   * @param {string} config.deviceId - Device identifier stored as metadata.
   * @param {string} config.topic - Topic to subscribe to for sensor messages.
   */
  constructor(database, config) {
    this.#database = database
    this.#config = config
  }

  /**
   * Connect to the broker and start ingesting messages.
   */
  start() {
    const url = `mqtt://${this.#config.broker}:${this.#config.port}`
    this.#client = mqtt.connect(url, { keepalive: this.#config.keepalive })

    this.#client.on('connect', () => {
      console.log(`MQTT connected to ${url}.`)
      this.#client.subscribe(this.#config.topic, (error) => {
        if (error) {
          console.error('MQTT subscribe failed:', error)
        } else {
          console.log(`Subscribed to ${this.#config.topic}.`)
        }
      })
    })

    this.#client.on('message', (topic, message) => this.#onMessage(message))
    this.#client.on('error', (error) => console.error('MQTT error:', error))
    this.#client.on('reconnect', () => console.log('MQTT reconnecting...'))
    this.#client.on('close', () => console.log('MQTT connection closed.'))
  }

  /**
   * Disconnect from the broker. Used during graceful shutdown.
   */
  async stop() {
    if (this.#client) {
      // end(force=false, opts, cb) waits for in-flight messages before closing.
      await new Promise((resolve) => this.#client.end(false, {}, resolve))
      this.#client = null
      console.log('MQTT disconnected.')
    }
  }

  /**
   * Handle a single incoming sensor message: parse JSON, validate, and persist
   * with a server-side timestamp. Invalid payloads are logged and ignored
   * rather than crashing the ingestion loop.
   *
   * @param {Buffer} message - Raw message buffer from the MQTT client.
   */
  async #onMessage(message) {
    let payload
    try {
      payload = JSON.parse(message.toString())
    } catch (error) {
      console.error('Ignoring non-JSON payload:', message.toString())
      return
    }

    if (!this.#isValidPayload(payload)) {
      console.error('Ignoring invalid payload:', payload)
      return
    }

    const document = {
      deviceId: this.#config.deviceId,
      timestamp: new Date(),
      temperature: payload.temperature,
      humidity: payload.humidity,
      deviceTimestamp: payload.timestamp
    }

    try {
      await this.#database.getCollection().insertOne(document)
    } catch (error) {
      console.error('Failed to persist sensor reading:', error)
    }
  }

  /**
   * Verify that a parsed payload contains the expected sensor fields.
   *
   * @param {unknown} payload
   * @returns {boolean}
   */
  #isValidPayload(payload) {
    return (
      payload !== null &&
      typeof payload === 'object' &&
      typeof payload.temperature === 'number' &&
      typeof payload.humidity === 'number'
    )
  }
}
