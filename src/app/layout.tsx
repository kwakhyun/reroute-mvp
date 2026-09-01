import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-kr/wght.css";
import "@fontsource-variable/newsreader/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "REROUTE",
    template: "%s · REROUTE",
  },
  description: "기업 유휴 자산의 회수 가치를 높이는 순환 자산 매칭 마켓플레이스",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
