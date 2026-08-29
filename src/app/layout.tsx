import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "강서나눔돌봄센터 CS 티켓 관리 시스템",
  description: "강서나눔돌봄센터 챗봇 접수 민원 티켓 관리 및 업무 처리 통합 관제 웹앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-ace-ivory text-ace-charcoal antialiased selection:bg-ace-orange selection:text-ace-charcoal">
        {children}
      </body>
    </html>
  );
}
