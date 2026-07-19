import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { api } from '@/lib/api';

const LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';
const googleEnabled =
  !!process.env.AUTH_GOOGLE_ID?.trim() && !!process.env.AUTH_GOOGLE_SECRET?.trim();

function isApiJwtExpired(accessToken: string): boolean {
  try {
    const payloadPart = accessToken.split('.')[1];
    if (!payloadPart) return true;
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(payloadPart, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    // Prefer re-login a minute before API rejects the token.
    return payload.exp * 1000 <= Date.now() + 60_000;
  } catch {
    return true;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    ...(LOCAL_MODE
      ? [
          Credentials({
            id: 'local',
            name: 'local',
            credentials: {},
            async authorize() {
              try {
                const result = await api.auth.bootstrap();
                return {
                  id: result.user.id,
                  email: result.user.email,
                  name: result.user.name,
                  accessToken: result.token,
                  isSuperAdmin: result.user.isSuperAdmin ?? false,
                };
              } catch {
                return null;
              }
            },
          }),
        ]
      : []),
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const result = await api.auth.login({
            email: String(credentials.email).trim().toLowerCase(),
            password: credentials.password as string,
          });
          return {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            accessToken: result.token,
            isSuperAdmin: result.user.isSuperAdmin ?? false,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as { accessToken?: string; id?: string; isSuperAdmin?: boolean };
        token.accessToken = authUser.accessToken;
        token.id = authUser.id ?? user.id;
        token.isSuperAdmin = authUser.isSuperAdmin ?? false;
      }

      if (token.accessToken && isApiJwtExpired(String(token.accessToken))) {
        delete token.accessToken;
        token.isSuperAdmin = false;
        return token;
      }

      if (token.accessToken && token.isSuperAdmin === undefined) {
        try {
          const profile = (await api.auth.me(token.accessToken as string)) as {
            isSuperAdmin?: boolean;
          };
          token.isSuperAdmin = profile.isSuperAdmin ?? false;
        } catch {
          delete token.accessToken;
          token.isSuperAdmin = false;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.accessToken = token.accessToken as string | undefined;
      session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    // Keep NextAuth aligned with API JWT default (7d) so stale UI sessions don't linger.
    maxAge: 7 * 24 * 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
});
