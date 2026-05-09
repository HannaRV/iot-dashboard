/**
 * @file Browser MQTT client for live sensor data and device control.
 * @module MqttClient
 * @author Hanna Rubio Vretby <hr222sy@student.lnu.se>
 * @version 1.0.0
 */

/**
 * MQTT-over-WebSocket client that subscribes to live sensor data from the
 * broker and publishes LED commands to the device. Created in the
 * application's composition root with config and event callbacks injected.
 */
export class MqttClient {
  #config = null
  #onSensorReading = null
  #onConnectionChange = null
  #client = null

  /**
   * @param {object} config - MQTT configuration sub-object.
   * @param {string} config.url - WSS URL of the MQTT broker.
   * @param {string} config.deviceId - Device identifier.
   * @param {object} config.topics
   * @param {string} config.topics.sensor - Topic to subscribe to for sensor messages.
   * @param {string} config.topics.commandLed - Topic to publish LED commands to.
   * @param {object} callbacks
   * @param {(reading: {timestamp: string, temperature: number, humidity: number}) => void} callbacks.onSensorReading
   * @param {(state: 'connecting' | 'connected' | 'disconnected') => void} callbacks.onConnectionChange
   */
  constructor(config, callbacks) {
    this.#config = config
    this.#onSensorReading = callbacks.onSensorReading
    this.#onConnectionChange = callbacks.onConnectionChange
  }

  /**
   * Connect to the broker and subscribe to the sensor topic.
   * mqtt.js handles automatic reconnection on its own; we just observe events
   * to keep the UI's connection-state indicator in sync.
   */
  connect() {
    this.#onConnectionChange('connecting')

    this.#client = window.mqtt.connect(this.#config.url)

    this.#client.on('connect', () => {
      this.#onConnectionChange('connected')
      this.#client.subscribe(this.#config.topics.sensor, (error) => {
        if (error) {
          console.error('MQTT subscribe failed:', error)
        }
      })
    })

    this.#client.on('message', (_topic, message) => this.#handleMessage(message))
    this.#client.on('reconnect', () => this.#onConnectionChange('connecting'))
    this.#client.on('close', () => this.#onConnectionChange('disconnected'))
    this.#client.on('error', (error) => console.error('MQTT error:', error))
  }

  /**
   * Publish an LED command to the device.
   * Silently no-ops if not connected — UI should signal this via the
   * connection-state indicator rather than blocking the action.
   *
   * @param {boolean} state - true to turn ON, false to turn OFF.
   */
  publishLedCommand(state) {
    if (!this.#client || !this.#client.connected) {
      console.warn('Cannot publish LED command: MQTT client not connected.')
      return
    }
    this.#client.publish(this.#config.topics.commandLed, JSON.stringify({ state }))
  }

  /**
   * Disconnect from the broker. Used during page unload or teardown.
   */
  disconnect() {
    if (this.#client) {
      this.#client.end()
      this.#client = null
    }
  }

  /**
   * Parse and validate an incoming sensor message, then notify the consumer.
   * Invalid payloads are logged and dropped — never crashing the UI loop.
   *
   * @param {Uint8Array} message - Raw message payload from the broker.
   */
  #handleMessage(message) {
    let payload
    try {
      payload = JSON.parse(message.toString())
    } catch (error) {
      console.error('Ignoring non-JSON MQTT payload:', error.message)
      return
    }

    if (!isValidReading(payload)) {
      console.error('Ignoring invalid sensor reading:', payload)
      return
    }

    // Synthesize a browser-side timestamp for live readings; the broker
    // does not deliver timestamped messages, and the device's own timestamp
    // (in 2000-epoch seconds for ESP32 MicroPython) would require translation
    // and isn't aligned with the historical data's server-side timestamps.
    const reading = {
      timestamp: new Date().toISOString(),
      temperature: payload.temperature,
      humidity: payload.humidity
    }

    this.#onSensorReading(reading)
  }
}

/**
 * Verify that a parsed payload contains valid temperature and humidity fields.
 *
 * @param {unknown} payload
 * @returns {boolean}
 */
function isValidReading(payload) {
  return (
    payload !== null &&
    typeof payload === 'object' &&
    typeof payload.temperature === 'number' &&
    typeof payload.humidity === 'number'
  )
}
