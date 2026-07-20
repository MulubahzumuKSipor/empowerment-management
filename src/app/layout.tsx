import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Load standard Next.js optimized fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Update standard SEO and Tab Metadata
export const metadata: Metadata = {
  title: "Liberian Learning Center",
  description: "Central portal for Empowerment Squared programs, attendance tracking, and learning management.",
};

// Enforce the brand color on mobile browsers and control scaling
export const viewport: Viewport = {
  themeColor: "#8cc63f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents input zoom on iOS Safari
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}