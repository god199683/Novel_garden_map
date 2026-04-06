import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ciel's Garden - 정원 관리 시스템",
  description: "세계수와 호수가 있는 마법 정원의 관리 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
