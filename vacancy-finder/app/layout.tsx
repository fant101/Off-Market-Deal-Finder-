import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vacancy Finder | Resolute, Inc.",
  description:
    "Discover vacant commercial properties not listed on major platforms. An off-market prospecting tool for CRE brokers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-resolute-cream">{children}</body>
    </html>
  );
}
