import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://partyflow.vercel.app"),
  title: {
    default: "PartyFlow",
    template: "%s | PartyFlow",
  },
  description:
    "PartyFlow streamlines guest ordering and host-side queue management for live events.",
  applicationName: "PartyFlow",
  keywords: [
    "PartyFlow",
    "event ordering",
    "party menu",
    "guest requests",
    "host dashboard",
    "queue management",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/branding/partyflow-logo-icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/branding/partyflow-logo-icon.png", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: "PartyFlow",
    description:
      "Guest ordering and live host queue management for events.",
    siteName: "PartyFlow",
    images: [
      {
        url: "/branding/partyflow-logo-impact.png",
        width: 1200,
        height: 630,
        alt: "PartyFlow",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PartyFlow",
    description:
      "Guest ordering and live host queue management for events.",
    images: ["/branding/partyflow-logo-impact.png"],
  },
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}