import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Workbench",
  description: "Edit images with Gemini 3 Pro Image.",
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
