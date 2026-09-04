/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@libsql/client", "libsql", "postgres", "bcryptjs"],
};
export default nextConfig;
