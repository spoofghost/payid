import * as v8 from 'v8'

import { assert } from 'chai'
import * as request from 'supertest'

import App from '../../src/app'
import config from '../../src/config'
import { SignatureWrapper, Invoice } from '../../src/types/publicAPI'

/**
 * Deep clones an object *properly*.
 *
 * @param obj - The object to be deep cloned.
 */
export default function structuredClone<T>(obj: T): T {
  return v8.deserialize(v8.serialize(obj))
}

/**
 * Initialize database connection pool & boot up the Express application.
 *
 * @returns The Express app.
 */
export async function appSetup(): Promise<App> {
  const app = new App()

  // Deep cloning the configuration so we don't mutate the global shared configuration
  const testConfig = structuredClone(config)
  testConfig.database.options.seedDatabase = true

  await app.init(testConfig)

  return app
}

/**
 * Shut down Express application & close database connections.
 *
 * @param app - The Express app.
 */
export function appCleanup(app: App): void {
  app.close()
}

/**
 * A custom helper to check if an Invoice is equivalent to our expected response (and thus has a valid expiration time).
 *
 * @param expectedResponse - The expected invoice output (which contains an older expiration time)
 * @returns
 */
export function isExpectedInvoice(expectedResponse: SignatureWrapper) {
  return (res: request.Response): void => {
    const {
      expirationTime: expectedExpirationTime,
      ...expectedResponseWithoutExpirationTime
    } = expectedResponse.message as Invoice
    const { expirationTime, ...responseWithoutExpirationTime } = res.body
      .message as Invoice
    const expirationTimeDelta = expirationTime - expectedExpirationTime

    assert(
      expirationTime > expectedExpirationTime,
      'Expiration time is a valid time',
    )
    assert(expirationTimeDelta < 1000, 'Expiration is within expected delta')
    assert.deepEqual(
      expectedResponseWithoutExpirationTime,
      responseWithoutExpirationTime,
    )
  }
}
