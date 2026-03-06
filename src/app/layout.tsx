import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "보험수리 화이트보드",
  description: "보험수리 강의용 디지털 화이트보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <TooltipProvider delayDuration={400}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
