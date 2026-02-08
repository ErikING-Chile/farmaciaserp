import { describe, it, expect } from "vitest"
import { generateIdempotencyKey } from "@/lib/utils"

describe("Utils", () => {
  describe("generateIdempotencyKey", () => {
    it("should generate unique keys", () => {
      const key1 = generateIdempotencyKey()
      const key2 = generateIdempotencyKey()
      
      expect(key1).not.toBe(key2)
      expect(key1).toContain("-")
      expect(key2).toContain("-")
    })

    it("should generate string keys", () => {
      const key = generateIdempotencyKey()
      
      expect(typeof key).toBe("string")
      expect(key.length).toBeGreaterThan(0)
    })
  })
})