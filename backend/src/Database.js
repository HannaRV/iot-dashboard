/**
 * @file MongoDB connection and time-series collection management.
 * @module src/Database
 */

import { MongoClient } from 'mongodb'
import { config } from './config.js'

/**
 * Manages the lifecycle of a MongoDB connection and ensures the time-series
 * collection exists. Used as a single instance per application via the exported
 * `database` constant, but constructable for tests.
 */
export class Database {
  #client = null
  #collection = null

  /**
   * Connect to MongoDB and ensure the time-series collection exists.
   * Idempotent — safe to call once at application startup.
   */
  async connect() {
    this.#client = new MongoClient(config.mongodb.uri)
    await this.#client.connect()

    const db = this.#client.db(config.mongodb.dbName)
    await this.#ensureTimeSeriesCollection(db)
    this.#collection = db.collection(config.mongodb.collection)

    console.log(`MongoDB connected: db='${config.mongodb.dbName}', collection='${config.mongodb.collection}'`)
  }

  /**
   * Returns the active sensor readings collection.
   *
   * @returns {import('mongodb').Collection}
   */
  getCollection() {
    if (!this.#collection) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.#collection
  }

  /**
   * Disconnect from MongoDB. Used during graceful shutdown.
   */
  async disconnect() {
    if (this.#client) {
      await this.#client.close()
      this.#client = null
      this.#collection = null
      console.log('MongoDB disconnected.')
    }
  }

  /**
   * Create the time-series collection if it does not already exist.
   * Time-series collections are optimized for measurements indexed by time,
   * with built-in compression and efficient range queries.
   *
   * @param {import('mongodb').Db} db
   */
  async #ensureTimeSeriesCollection(db) {
    const collections = await db.listCollections({ name: config.mongodb.collection }).toArray()
    if (collections.length > 0) return

    await db.createCollection(config.mongodb.collection, {
      timeseries: {
        timeField: 'timestamp',
        metaField: 'deviceId',
        granularity: 'seconds'
      }
    })
    console.log(`Created time-series collection '${config.mongodb.collection}'.`)
  }
}

/**
 * Default singleton instance used throughout the application.
 * Tests can construct their own Database instance instead.
 */
export const database = new Database()
