import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { hasuraRequest } from "@/lib/hasura";
import { GET_USER_BY_EMAIL } from "@/lib/graphql/queries";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const data = await hasuraRequest<{
          users: Array<{
            id: string;
            email: string;
            name: string;
            password: string;
            role: string;
            isActive: boolean;
          }>;
        }>(
          GET_USER_BY_EMAIL,
          { email: email.toLowerCase() }
        );

        const user = data.users[0];
        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
