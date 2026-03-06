import { describe, it, expect } from "vitest"
import { allocateBatchesFefo, FefoBatch } from "@/lib/pos-sales"

describe("FEFO Allocation", () => {
  const batches: FefoBatch[] = [
    {
      id: "batch-1",
      lotNumber: "L001",
      expirationDate: new Date("2024-12-31"),
      remainingQty: 10,
    },
    {
      id: "batch-2",
      lotNumber: "L002",
      expirationDate: new Date("2024-06-30"), // Earlier expiration
      remainingQty: 15,
    },
    {
      id: "batch-3",
      lotNumber: "L003",
      expirationDate: new Date("2025-03-31"),
      remainingQty: 20,
    },
  ]

  it("should allocate from earliest expiring batch first", () => {
    const { allocations, remaining } = allocateBatchesFefo(batches, 5)

    expect(remaining).toBe(0)
    expect(allocations).toHaveLength(1)
    expect(allocations[0].batchId).toBe("batch-2") // L002 expires first
    expect(allocations[0].quantity).toBe(5)
  })

  it("should allocate from multiple batches when needed", () => {
    const { allocations, remaining } = allocateBatchesFefo(batches, 20)

    expect(remaining).toBe(0)
    expect(allocations).toHaveLength(2)
    
    // First batch: L002 (15 units)
    expect(allocations[0].batchId).toBe("batch-2")
    expect(allocations[0].quantity).toBe(15)
    
    // Second batch: L001 (5 units)
    expect(allocations[1].batchId).toBe("batch-1")
    expect(allocations[1].quantity).toBe(5)
  })

  it("should return remaining quantity when stock is insufficient", () => {
    const { allocations, remaining } = allocateBatchesFefo(batches, 50)

    expect(remaining).toBe(5) // 45 available, need 50
    expect(allocations).toHaveLength(3)
    
    // Should allocate all available stock
    const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity, 0)
    expect(totalAllocated).toBe(45)
  })

  it("should handle empty batches", () => {
    const { allocations, remaining } = allocateBatchesFefo([], 10)

    expect(allocations).toHaveLength(0)
    expect(remaining).toBe(10)
  })

  it("should handle zero quantity", () => {
    const { allocations, remaining } = allocateBatchesFefo(batches, 0)

    expect(allocations).toHaveLength(0)
    expect(remaining).toBe(0)
  })

  it("should maintain proper order for complex allocation", () => {
    const complexBatches: FefoBatch[] = [
      {
        id: "b1",
        lotNumber: "LATE",
        expirationDate: new Date("2025-01-01"),
        remainingQty: 100,
      },
      {
        id: "b2",
        lotNumber: "EARLY",
        expirationDate: new Date("2024-01-01"),
        remainingQty: 5,
      },
      {
        id: "b3",
        lotNumber: "MID",
        expirationDate: new Date("2024-06-01"),
        remainingQty: 10,
      },
    ]

    const { allocations, remaining } = allocateBatchesFefo(complexBatches, 12)

    expect(remaining).toBe(0)
    expect(allocations).toHaveLength(2)
    
    // Should allocate from EARLY first, then MID
    expect(allocations[0].lotNumber).toBe("EARLY")
    expect(allocations[0].quantity).toBe(5)
    expect(allocations[1].lotNumber).toBe("MID")
    expect(allocations[1].quantity).toBe(7)
  })
})
