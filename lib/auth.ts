import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/lib/core/database/client';
import { admin } from 'better-auth/plugins';

export const auth = betterAuth({
  // Database configuration
  database: prismaAdapter(prisma, {
    provider: 'mysql',
  }),

  // OAuth Providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  // Email & Password disabled (using only Google OAuth)
  emailAndPassword: {
    enabled: false,
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Update session if older than 1 day
  },

  // Account linking configuration
  account: {
    accountLinking: {
      enabled: true, // Allow linking multiple OAuth providers to same email
      trustedProviders: ['google'], // Trust Google's email verification
    },
  },
  plugins: [admin()],
});

// Export type helpers for TypeScript
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
