import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      role: string
      tenantId: string
      branchId: string | null
      image?: string | null
    }
  }

  interface User {
    id: string
    role: string
    tenantId: string
    branchId: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    tenantId: string
    branchId: string | null
  }
}