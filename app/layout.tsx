import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLOOM · 꽃과 과일 마작",
  description: "큰 화면으로 즐기는 꽃과 과일 마작. 원작의 6단계 규칙, 생생한 효과음, 점수 기록.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
