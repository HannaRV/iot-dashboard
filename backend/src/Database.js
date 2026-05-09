/**
 * @file MongoDB connection and time-series collection management.
 * @module src/Database
 * @author Hanna Rubio Vretby <hr222sy@student.lnu.se>
 * @version 1.0.0
 */

import { MongoClient } from 'mongodb'

/**
 * Manages the lifecycle of a MongoDB connection and ensures the time-series
 * collection exists. Created once in the application's composition root and
 * passed to consumers via constructor injection.
 */
export class Database {
  #config = null
  #client = null
  #collection = null

  /**
   * @param {object} config - MongoDB configuration sub-object.
   * @param {string} config.uri - MongoDB connection string.
   * @param {string} config.dbName - Database name.
   * @param {string} config.collection - Time-series collection name.
   * @param {number} config.retentionDays - TTL for stored documents in days.
   */
  constructor(config) {
    this.#config = config
  }

  /**
   * Connect to MongoDB and ensure the time-series collection exists.
   * Idempotent — safe to call once at application startup.
   *
   * @throws {Error} If the connection or collection setup fails.
   */
  async connect() {
    this.#client = new MongoClient(this.#config.uri)
    await this.#client.connect()

    const mongoDb = this.#client.db(this.#config.dbName)
    await this.#ensureTimeSeriesCollection(mongoDb)
    this.#collection = mongoDb.collection(this.#config.collection)

    console.log(
      `MongoDB connected: db='${this.#config.dbName}', collection='${this.#config.collection}'`,
    )
  }

  /**
   * Returns the active sensor readings collection.
   *
   * @returns {import('mongodb').Collection}
   * @throws {Error} If called before {@link connect}.
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
   * with built-in compression and efficient range queries. Documents older
   * than the configured retention window are auto-removed by MongoDB's
   * background TTL monitor.
   *
   * @param {import('mongodb').Db} mongoDb
   */
  async #ensureTimeSeriesCollection(mongoDb) {
    const collections = await mongoDb
      .listCollections({ name: this.#config.collection })
      .toArray()
    if (collections.length > 0) return

    await mongoDb.createCollection(this.#config.collection, {
      timeseries: {
        timeField: 'timestamp',
        metaField: 'deviceId',
        granularity: 'seconds',
      },
      expireAfterSeconds: this.#config.retentionDays * 24 * 60 * 60,
    })
    console.log(
      `Created time-series collection '${this.#config.collection}' with ${this.#config.retentionDays}-day TTL.`,
    )
  }
}
