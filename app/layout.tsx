import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai"],
  weight: "variable",
});

export const metadata: Metadata = {
  title: "Tennis Board",
  description: "View and update the tennis courts reserved by our group.",
  applicationName: "Tennis Board",
  openGraph: {
    title: "Tennis Board",
    description: "View the group's weekly reserved tennis courts.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#198754",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
