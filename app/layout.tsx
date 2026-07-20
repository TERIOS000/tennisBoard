import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tennis Board",
  description: "View and update the tennis courts reserved by our group.",
  applicationName: "Tennis Board",
  icons: {
    apple: "/apple-touch-icon.png",
  },
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
