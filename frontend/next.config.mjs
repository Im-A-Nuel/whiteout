/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The relayer SDK is WASM and browser-only. It is imported dynamically on the client (lib/chain.ts).
  webpack: (config, { isServer }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
    if (!isServer) config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    return config;
  },
};
export default nextConfig;
