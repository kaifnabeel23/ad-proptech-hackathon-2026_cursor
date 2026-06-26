import type { Metadata } from "next";
import "./globals.css";

// Update this with your project's name and pitch — it sets the browser tab
// title and social previews.
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
      <body className="min-h-screen bg-night-900 text-sand-50 antialiased">
        {children}
      </body>
    </html>
  );
}
