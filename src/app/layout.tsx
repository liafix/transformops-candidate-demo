import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TransformOps — Candidate Demonstrator",
  description:
    "Independent candidate demonstrator for deterministic enterprise data transformation and validation using synthetic data.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
