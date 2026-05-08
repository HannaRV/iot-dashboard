/**
 * @file Express router for the historical sensor data API.
 * @module src/api
 */

import express from 'express'
import { database } from './Database.js'

const DEFAULT_MINUTES = 30
const MAX_MINUTES = 60 * 24
const MAX_DOCUMENTS = 5000

export const router = express.Router()

/**
 * GET /api/data
 *
 * Returns sensor readings from the last N minutes, sorted oldest first
 * for direct consumption by the dashboard chart.
 *
 * Query parameters:
 *   minutes - Time window size in minutes. Default 30, max 1440 (24h).
 *
 * Response:
 *   200 OK - JSON array of { timestamp, temperature, humidity }, ascending.
 *   400 Bad Request - Invalid 'minutes' parameter.
 *   500 Internal Server Error - Database query failed.
 */
router.get('/data', async (request, response) => {
  const minutes = parseMinutesParam(request.query.minutes)
  if (minutes === null) {
    return response.status(400).json({
      error: `Invalid 'minutes' parameter. Must be a number between 1 and ${MAX_MINUTES}.`
    })
  }

  const since = new Date(Date.now() - minutes * 60 * 1000)

  try {
    const documents = await database.getCollection()
      .find(
        { timestamp: { $gte: since } },
        { projection: { _id: 0, timestamp: 1, temperature: 1, humidity: 1 } }
      )
      .sort({ timestamp: 1 })
      .limit(MAX_DOCUMENTS)
      .toArray()

    response.json(documents)
  } catch (error) {
    console.error('Failed to fetch historical data:', error)
    response.status(500).json({ error: 'Failed to fetch historical data.' })
  }
})

/**
 * Parse and validate the 'minutes' query parameter.
 *
 * @param {string|undefined} raw - Raw query parameter value.
 * @returns {number|null} Validated minute count, or null if invalid.
 */
function parseMinutesParam(raw) {
  if (raw === undefined) {
    return DEFAULT_MINUTES
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_MINUTES) {
    return null
  }
  return Math.floor(parsed)
}
