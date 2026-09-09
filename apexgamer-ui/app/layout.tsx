import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApexGamer",
  description: "Browse tracked games",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg text-text font-sans">
        <header className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur-md px-8 py-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" priority />
            <span className="text-[1.15rem] font-bold tracking-tight">ApexGamer</span>
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
