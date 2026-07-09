import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { api } from '@/lib/api';

const LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';
const googleEnabled =
  !!process.env.AUTH_GOOGLE_ID?.trim() && !!process.env.AUTH_GOOGLE_SECRET?.trim();

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
            email: credentials.email as string,
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

      if (token.accessToken && token.isSuperAdmin === undefined) {
        try {
          const profile = (await api.auth.me(token.accessToken as string)) as { isSuperAdmin?: boolean };
          token.isSuperAdmin = profile.isSuperAdmin ?? false;
        } catch {
          token.isSuperAdmin = false;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.accessToken = token.accessToken as string;
      session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET,
});
