import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Temporarily disable CSP for development to fix auth issues
  // async headers() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       headers: [
  //         {
  //           key: 'Content-Security-Policy',
  //           value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http://localhost:* https://localhost:* ws: wss:; frame-src 'self'; object-src 'none';"
  //         },
  //         {
  //           key: 'X-Frame-Options',
  //           value: 'SAMEORIGIN'
  //         },
  //         {
  //           key: 'X-Content-Type-Options',
  //           value: 'nosniff'
  //         }
  //       ],
  //     },
  //   ];
  // },
};

export default nextConfig;
