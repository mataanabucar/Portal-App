import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal Visualizer",
  description: "AI-summarized view of today's portal request queue.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-screen bg-[#07111f] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
