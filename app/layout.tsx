import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Workbench",
  description: "Generate and edit images with Nano Banana models.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
