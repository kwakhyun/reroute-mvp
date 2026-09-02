import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-kr/wght.css";
import "@fontsource-variable/newsreader/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "REROUTE",
    template: "%s · REROUTE",
  },
  description: "기업이 처분할 사무 자산의 매각 대금, 비용 절감액과 재사용률을 함께 비교하는 B2B 매칭 서비스",
  openGraph: {
    title: "REROUTE · B2B 사무 자산 처분 MVP",
    description: "문제 정의부터 풀스택 구현과 개발 인력 투입 결정까지 정리한 개인 제품 개발 사례",
    type: "website",
    images: [
      {
        url: "/portfolio/walkthrough-frames/01-case-study-hero.png",
        width: 1280,
        height: 720,
        alt: "REROUTE B2B 사무 자산 처분 MVP 제품 개발 사례",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "REROUTE · B2B 사무 자산 처분 MVP",
    description: "문제 정의부터 풀스택 구현과 개발 인력 투입 결정까지 정리한 개인 제품 개발 사례",
    images: ["/portfolio/walkthrough-frames/01-case-study-hero.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
