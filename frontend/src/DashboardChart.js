/**
 * @file Chart.js wrapper that visualizes historical and live sensor data
 * with a sliding window and loading/no-data state overlays.
 * @module DashboardChart
 * @author Hanna Rubio Vretby <hr222sy@student.lnu.se>
 * @version 1.0.0
 */

/**
 * Manages the dashboard's time-series chart: initializes from historical
 * data, appends live readings, and toggles loading / no-data overlays.
 * Created in the application's composition root with its config and
 * pre-resolved DOM element references injected.
 */
export class DashboardChart {
  #config = null
  #canvas = null
  #loadingOverlay = null
  #noDataOverlay = null
  #chart = null

  /**
   * @param {object} config - Chart configuration sub-object.
   * @param {number} config.maxPoints - Maximum data points retained before sliding.
   * @param {object} elements - Pre-resolved DOM element references.
   * @param {HTMLCanvasElement} elements.canvas - Canvas element for Chart.js.
   * @param {HTMLElement} elements.loadingOverlay - Overlay shown while loading.
   * @param {HTMLElement} elements.noDataOverlay - Overlay shown when there is no data.
   */
  constructor(config, elements) {
    this.#config = config
    this.#canvas = elements.canvas
    this.#loadingOverlay = elements.loadingOverlay
    this.#noDataOverlay = elements.noDataOverlay
  }

  /**
   * Initialize the chart with historical data fetched from the backend.
   * Hides the loading overlay and reveals the no-data overlay if the data set
   * is empty. Idempotent — calling this twice replaces the existing chart.
   *
   * @param {Array<{timestamp: string, temperature: number, humidity: number}>} historicalData
   */
  initialize(historicalData) {
    if (this.#chart) {
      this.#chart.destroy()
    }

    const labels = historicalData.map((reading) => formatTimestamp(reading.timestamp))
    const temperatures = historicalData.map((reading) => reading.temperature)
    const humidities = historicalData.map((reading) => reading.humidity)

    this.#chart = new window.Chart(this.#canvas.getContext('2d'), buildChartConfig(labels, temperatures, humidities))

    this.#loadingOverlay.hidden = true
    this.#noDataOverlay.hidden = historicalData.length > 0
  }

  /**
   * Append a single new reading to the chart and slide the window if the
   * configured maximum point count is exceeded. Hides the no-data overlay
   * automatically once the first reading arrives.
   *
   * @param {{timestamp: string, temperature: number, humidity: number}} reading
   */
  appendDataPoint(reading) {
    if (!this.#chart) {
      return
    }

    this.#noDataOverlay.hidden = true

    const { labels, datasets } = this.#chart.data
    labels.push(formatTimestamp(reading.timestamp))
    datasets[0].data.push(reading.temperature)
    datasets[1].data.push(reading.humidity)

    while (labels.length > this.#config.maxPoints) {
      labels.shift()
      datasets[0].data.shift()
      datasets[1].data.shift()
    }

    // 'none' disables animation so live updates don't visually stutter every 2 s.
    this.#chart.update('none')
  }
}

/**
 * Format an ISO 8601 timestamp as a localized HH:MM:SS string for axis labels.
 *
 * @param {string} isoString
 * @returns {string}
 */
function formatTimestamp(isoString) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Build the Chart.js configuration object for a dual-axis temperature/humidity
 * line chart.
 *
 * @param {string[]} labels
 * @param {number[]} temperatures
 * @param {number[]} humidities
 * @returns {object}
 */
function buildChartConfig(labels, temperatures, humidities) {
  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: temperatures,
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          yAxisID: 'y-temperature',
          tension: 0.3
        },
        {
          label: 'Humidity (%)',
          data: humidities,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          yAxisID: 'y-humidity',
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        'y-temperature': {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Temperature (°C)' }
        },
        'y-humidity': {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Humidity (%)' },
          grid: { drawOnChartArea: false } // Avoids double grid lines from two y-axes.
        }
      },
      plugins: {
        legend: { position: 'top' }
      }
    }
  }
}
