import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/articles/:path*", "/api/seo/:path*", "/api/keywords/:path*", "/api/billing/:path*", "/api/usage/:path*"],
};
