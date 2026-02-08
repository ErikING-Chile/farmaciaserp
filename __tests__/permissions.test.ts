import { describe, it, expect } from "vitest"
import { UserRole } from "@prisma/client"
import { ROLE_PERMISSIONS } from "@/lib/constants"

describe("Permissions", () => {
  describe("ROLE_PERMISSIONS", () => {
    it("should give ADMIN all permissions", () => {
      const adminPermissions = ROLE_PERMISSIONS[UserRole.ADMIN]
      
      // Check that admin has product permissions
      expect(adminPermissions).toContain("products:view")
      expect(adminPermissions).toContain("products:create")
      expect(adminPermissions).toContain("products:update")
      expect(adminPermissions).toContain("products:delete")
      
      // Check admin has POS access
      expect(adminPermissions).toContain("pos:access")
    })

    it("should give SELLER limited permissions", () => {
      const sellerPermissions = ROLE_PERMISSIONS[UserRole.SELLER]
      
      // Seller should have POS access
      expect(sellerPermissions).toContain("pos:access")
      expect(sellerPermissions).toContain("products:view")
      
      // Seller should NOT have product management
      expect(sellerPermissions).not.toContain("products:create")
      expect(sellerPermissions).not.toContain("products:delete")
      
      // Seller should NOT have settings access
      expect(sellerPermissions).not.toContain("settings:view")
    })

    it("should give WAREHOUSE inventory permissions", () => {
      const warehousePermissions = ROLE_PERMISSIONS[UserRole.WAREHOUSE]
      
      expect(warehousePermissions).toContain("inventory:view")
      expect(warehousePermissions).toContain("inventory:adjust")
      expect(warehousePermissions).toContain("inventory:transfer")
      
      // Warehouse should NOT have POS access
      expect(warehousePermissions).not.toContain("pos:access")
    })
  })
})