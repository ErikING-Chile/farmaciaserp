import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UserRole } from "@prisma/client"

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }
  return user
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role as UserRole)) {
    redirect("/dashboard")
  }
  return user
}

export function hasPermission(userRole: UserRole, permission: string): boolean {
  const { ROLE_PERMISSIONS } = require("@/lib/constants")
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false
}