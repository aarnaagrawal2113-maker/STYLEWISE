import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STYLEWISE — Your wardrobe, reimagined",
  description: "Your personal AI wardrobe and styling companion.",
  applicationName: "STYLEWISE",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "STYLEWISE" },
  themeColor: "#f7f5f0"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}