import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { CalendarProvider } from "@/context/calendar-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "SaveSlot • Campus Events & Scheduling • AISAT",
  description:
    "Official centralized student notice board and conflict-free event scheduling platform for Albertian Institute of Science & Technology (AISAT).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-white text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 font-sans">
        <CalendarProvider>
          <Navbar />
          <main className="flex-1 w-full flex flex-col min-h-0">{children}</main>
        </CalendarProvider>
      </body>
    </html>
  );
}
