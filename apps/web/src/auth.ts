import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { api } from '@/lib/api';

const LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

export const { handlers, signIn, signOut, auth } = NextAuth({
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
                };
              } catch {
                return null;
              }
            },
          }),
        ]
      : []),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
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
          } as { id: string; email: string; name: string; accessToken: string };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as { accessToken?: string; id?: string };
        token.accessToken = authUser.accessToken;
        token.id = authUser.id ?? user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.accessToken = token.accessToken as string;
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

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    id?: string;
  }
}
