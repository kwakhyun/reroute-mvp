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
  description: "기업 유휴 자산의 회수 가치를 높이는 순환 자산 매칭 마켓플레이스",
  openGraph: {
    title: "REROUTE · B2B 순환 자산 매칭 MVP",
    description: "가설 설계부터 풀스택 구현과 투자 판단까지 정리한 독립 제품 케이스 스터디",
    type: "website",
    images: [
      {
        url: "/portfolio/walkthrough-frames/01-case-study-hero.png",
        width: 1280,
        height: 720,
        alt: "REROUTE B2B 순환 자산 매칭 MVP 공개 케이스 스터디",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "REROUTE · B2B 순환 자산 매칭 MVP",
    description: "가설 설계부터 풀스택 구현과 투자 판단까지 정리한 독립 제품 케이스 스터디",
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
