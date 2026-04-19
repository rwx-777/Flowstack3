import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "../components/app-nav";

export const metadata: Metadata = {
  title: "Flowstack3",
  description: "Cloud-ready SaaS workflow automation dashboard"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppNav />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
