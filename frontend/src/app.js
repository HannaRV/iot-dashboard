/**
 * @file Application entry point and composition root.
 *
 * Resolves DOM references, constructs the API client, chart, and MQTT
 * client, wires events between them, and bootstraps the dashboard. The
 * only file that knows about both the DOM and the domain modules.
 *
 * @module app
 * @author Hanna Rubio Vretby <hr222sy@student.lnu.se>
 * @version 1.0.0
 */

import { config } from './config.js'
import { DashboardApi } from './DashboardApi.js'
import { DashboardChart } from './DashboardChart.js'
import { MqttClient } from './MqttClient.js'

// ----- DOM references -----

const elements = Object.freeze({
  temperatureValue: document.querySelector('[data-temperature]'),
  humidityValue: document.querySelector('[data-humidity]'),
  connectionStatus: document.querySelector('[data-connection-status]'),
  connectionText: document.querySelector('[data-connection-text]'),
  chartCanvas: document.querySelector('[data-chart]'),
  loadingOverlay: document.querySelector('[data-loading]'),
  noDataOverlay: document.querySelector('[data-no-data]'),
  ledToggle: document.querySelector('[data-led-toggle]')
})

// ----- Composition root: construct and wire dependencies -----

const api = new DashboardApi(config.api)

const chart = new DashboardChart(config.chart, {
  canvas: elements.chartCanvas,
  loadingOverlay: elements.loadingOverlay,
  noDataOverlay: elements.noDataOverlay
})

const mqtt = new MqttClient(config.mqtt, {
  onSensorReading: handleSensorReading,
  onConnectionChange: handleConnectionChange
})

// ----- UI state -----

// Local representation of the LED's intended state. The device is the source
// of truth, but we don't subscribe to a status topic, so this assumes our
// last command succeeded. Acceptable for a single-user dashboard.
let ledState = false

const CONNECTION_STATE_LABELS = Object.freeze({
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected'
})

// ----- Event handlers -----

/**
 * Handle a new sensor reading from MQTT: update chart and metric displays.
 *
 * @param {{timestamp: string, temperature: number, humidity: number}} reading
 */
function handleSensorReading(reading) {
  chart.appendDataPoint(reading)
  elements.temperatureValue.textContent = reading.temperature.toFixed(1)
  elements.humidityValue.textContent = reading.humidity.toFixed(1)
}

/**
 * Handle a connection state change: update the indicator color and label.
 *
 * @param {'connecting' | 'connected' | 'disconnected'} state
 */
function handleConnectionChange(state) {
  elements.connectionStatus.dataset.state = state
  elements.connectionText.textContent = CONNECTION_STATE_LABELS[state] ?? state
}

/**
 * Handle a click on the LED toggle button: flip local state, publish the
 * command, and update the button's text and aria-pressed attribute.
 */
function handleLedToggle() {
  ledState = !ledState
  mqtt.publishLedCommand(ledState)
  elements.ledToggle.setAttribute('aria-pressed', String(ledState))
  elements.ledToggle.textContent = ledState ? 'Turn OFF' : 'Turn ON'
}

elements.ledToggle.addEventListener('click', handleLedToggle)

// ----- Bootstrap -----

/**
 * Start the dashboard: connect to MQTT, fetch historical data, initialize
 * the chart. If the historical fetch fails, the chart still initializes with
 * an empty data set so live MQTT readings can populate it as they arrive.
 */
async function initialize() {
  mqtt.connect()

  try {
    const historicalData = await api.fetchHistoricalData()
    chart.initialize(historicalData)
  } catch (error) {
    console.error('Failed to load historical data:', error)
    chart.initialize([])
    const noDataMessage = elements.noDataOverlay.querySelector('p')
    if (noDataMessage) {
      noDataMessage.textContent = 'Failed to load history. Live readings will still appear.'
    }
  }
}

initialize().catch((error) => {
  console.error('Failed to start dashboard:', error)
})
