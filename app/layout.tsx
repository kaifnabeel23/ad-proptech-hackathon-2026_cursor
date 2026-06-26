import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Community Gap & Confidence Copilot",
  description:
    "Identify underserved Abu Dhabi districts, explain the evidence, and recommend the next community intervention with a confidence badge.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
