import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { getServerSession as nextAuthGetServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;

        // Fetch subscription info from the database
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: {
            stripePriceId: true,
            stripeSubscriptionId: true,
            stripeCurrentPeriodEnd: true,
            stripeCustomerId: true,
          },
        });

        if (dbUser) {
          session.user.stripePriceId = dbUser.stripePriceId;
          session.user.stripeSubscriptionId = dbUser.stripeSubscriptionId;
          session.user.stripeCurrentPeriodEnd = dbUser.stripeCurrentPeriodEnd;
          session.user.stripeCustomerId = dbUser.stripeCustomerId;
        }
      }
      return session;
    },
  },
};

/**
 * Helper to retrieve the server-side session using the configured authOptions.
 * Use this in Server Components and Route Handlers instead of importing
 * `getServerSession` from next-auth directly.
 */
export async function getServerSession() {
  return nextAuthGetServerSession(authOptions);
}

// ---------------------------------------------------------------------------
// Type augmentations
// ---------------------------------------------------------------------------

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      stripePriceId?: string | null;
      stripeSubscriptionId?: string | null;
      stripeCurrentPeriodEnd?: Date | null;
      stripeCustomerId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
