import { PrismaClient } from '@/app/generated/prisma'

// Singleton pattern para o cliente Prisma
declare global {
  var prisma: PrismaClient | undefined
}

export const prisma = globalThis.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}