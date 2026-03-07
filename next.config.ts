import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 빌드 시 TypeScript 타입 체크 스킵 (Vercel 45분 제한 초과 방지)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Turbopack 명시 (Next.js 16 기본값 — webpack 경고 방지)
  turbopack: {},
  // 브라우저 전용 패키지를 서버 번들에서 제외
  serverExternalPackages: ['fabric', 'html2canvas', 'html-to-image'],
};

export default nextConfig;
