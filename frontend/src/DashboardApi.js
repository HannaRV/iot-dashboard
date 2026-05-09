/**
 * @file Client for the backend's historical sensor data API.
 * @module DashboardApi
 * @author Hanna Rubio Vretby <hr222sy@student.lnu.se>
 * @version 1.0.0
 */

/**
 * HTTP client for fetching historical sensor data from the backend.
 * Requests are bounded by a configured timeout to prevent indefinite waits
 * when the backend or network is unavailable. Created in the application's
 * composition root with its api configuration injected via the constructor.
 */
export class DashboardApi {
  #config = null

  /**
   * @param {object} config - API configuration sub-object.
   * @param {string} config.baseUrl - Backend API base URL.
   * @param {number} config.historicalWindowMinutes - Default window size in minutes.
   * @param {number} config.requestTimeoutMs - Abort timeout for HTTP requests.
   */
  constructor(config) {
    this.#config = config
  }

  /**
   * Fetch sensor readings from the last N minutes, sorted oldest first.
   *
   * @param {number} [minutes] - Time window in minutes. Defaults to configured window.
   * @returns {Promise<Array<{timestamp: string, temperature: number, humidity: number}>>}
   * @throws {Error} On network failure, non-OK HTTP status, or timeout.
   */
  async fetchHistoricalData(minutes = this.#config.historicalWindowMinutes) {
    const url = `${this.#config.baseUrl}/data?minutes=${minutes}`

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.#config.requestTimeoutMs)
      })

      if (!response.ok) {
        throw new Error(
          `Failed to fetch historical data: HTTP ${response.status} ${response.statusText}`
        )
      }

      return await response.json()
    } catch (error) {
      if (error.name === 'TimeoutError') {
        throw new Error(
          `Request timed out after ${this.#config.requestTimeoutMs} ms. Is the backend reachable?`,
          { cause: error }
        )
      }
      throw error
    }
  }
}