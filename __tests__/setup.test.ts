import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('Setup Verification', () => {
  it('should verify Vitest is working', () => {
    expect(1 + 1).toBe(2)
  })

  it('should verify fast-check is working', () => {
    fc.assert(
      fc.property(fc.integer(), (num) => {
        return num + 0 === num
      }),
      { numRuns: 100 }
    )
  })
})
