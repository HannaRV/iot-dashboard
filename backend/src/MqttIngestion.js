/**
 * @file MQTT subscriber that ingests sensor messages and persists them to MongoDB.
 * @module src/MqttIngestion
 */

import mqtt from 'mqtt'
import { config } from './config.js'
import { database } from './database.js'

/**
 * Subscribes to the device's sensor topic on the MQTT broker, parses incoming
 * JSON messages, and persists each reading to the time-series collection with
 * a server-side timestamp.
 */
export class MqttIngestion {
  #client = null

  /**
   * Connect to the broker and start ingesting messages.
   */
  start() {
    const url = `mqtt://${config.mqtt.broker}:${config.mqtt.port}`
    this.#client = mqtt.connect(url, { keepalive: config.mqtt.keepalive })

    this.#client.on('connect', () => {
      console.log(`MQTT connected to ${url}.`)
      this.#client.subscribe(config.mqtt.topic, (error) => {
        if (error) {
          console.error('MQTT subscribe failed:', error)
        } else {
          console.log(`Subscribed to ${config.mqtt.topic}.`)
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
      await new Promise((resolve) => this.#client.end(false, {}, resolve))
      this.#client = null
      console.log('MQTT disconnected.')
    }
  }

  /**
   * Handle a single incoming sensor message.
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
      deviceId: config.mqtt.deviceId,
      timestamp: new Date(),
      temperature: payload.temperature,
      humidity: payload.humidity,
      deviceTimestamp: payload.timestamp
    }

    try {
      await database.getCollection().insertOne(document)
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

export const ingestion = new MqttIngestion()
