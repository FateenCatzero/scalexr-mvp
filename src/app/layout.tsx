import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import Providers from "./providers";

// Load the Geist variable font from Google Fonts and expose it as a CSS variable
// so Tailwind can reference it via the `font-sans` class.
const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Default page metadata — individual pages override `title` via generateMetadata().
export const metadata: Metadata = {
  title: "ScaleXR — AR Menu",
  description: "Browse the menu in 2D, 3D, and AR",
};

// Viewport config — prevents the browser from zooming in on form inputs on iOS,
// which would break the mobile-first layout.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Root layout — wraps every page in the app.
// Responsibilities:
//   - Sets html lang and font class
//   - Wraps children in <Providers> (TanStack Query context)
//   - Mounts the Sonner toast renderer at the top center of the screen
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <Providers>{children}</Providers>
        {/* Toaster renders toast notifications from Sonner — positioned top-center
            with richColors enabled so success/error toasts use green/red */}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
