import type { Metadata } from "next";
import { AppNav } from "./components/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boma",
  description:
    "A home operating system for African households. Track bills, chores, shopping, meals, school prep, and petty cash in one place."
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
