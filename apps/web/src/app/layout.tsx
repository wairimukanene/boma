import type { Metadata } from "next";
import { AppNav } from "./components/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boma",
  description: "An all-in-one home operating system for African households."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen md:flex">
          <AppNav />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
