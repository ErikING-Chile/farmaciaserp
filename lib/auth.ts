import type { NextAuthConfig, Session, User } from "next-auth"
import type { JWT } from "next-auth/jwt"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { z } from "zod"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().optional(),
})

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as NextAuthConfig["adapter"],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        tenantSlug: { label: "Farmacia", type: "text" },
      },
      async authorize(credentials) {
        try {
          const parsed = credentialsSchema.safeParse(credentials)
          if (!parsed.success) {
            return null
          }

          const { email, password, tenantSlug } = parsed.data

          // Buscar usuario por email y tenant
          const user = await prisma.user.findFirst({
            where: {
              email: email.toLowerCase(),
              isActive: true,
              ...(tenantSlug && {
                tenant: {
                  slug: tenantSlug,
                  isActive: true,
                },
              }),
            },
            include: {
              tenant: true,
              branch: true,
            },
          })

          if (!user || !user.password) {
            return null
          }

          const isValid = await bcrypt.compare(password, user.password)
          if (!isValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
            branchId: user.branchId,
            image: user.image,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({
      token,
      user,
      trigger,
      session,
    }: {
      token: JWT
      user?: User | null
      trigger?: "signIn" | "signUp" | "update"
      session?: Session
    }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.tenantId = user.tenantId
        token.branchId = user.branchId
      }

      // Handle session updates
      if (trigger === "update" && session?.user) {
        token.branchId = session.user.branchId
      }

      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.tenantId = token.tenantId as string
        session.user.branchId = token.branchId as string | null
      }
      return session
    },
  },
  events: {
    async signIn({ user }: { user: User }) {
      // Audit log
      await prisma.auditLog.create({
        data: {
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          tenantId: user.tenantId,
          userId: user.id,
        },
      })
    },
  },
}
