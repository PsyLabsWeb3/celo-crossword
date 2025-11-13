import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

import Navbar from '@/components/navbar';
import Providers from "@/components/providers"

const pressStart2P = localFont({
  src: '../assets/fonts/PressStart2P.ttf',
  display: 'swap',
});

const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

// Embed metadata for Farcaster sharing
const frame = {
  version: "1",
  imageUrl: `${appUrl}/opengraph-image.png`,
  button: {
    title: "Launch celo-crossword",
    action: {
      type: "launch_frame",
      name: "celo-crossword",
      url: appUrl,
      splashImageUrl: `${appUrl}/icon.png`,
      splashBackgroundColor: "#ffffff",
    },
  },
};

export const metadata: Metadata = {
  title: 'celo-crossword',
  description: 'A crossword in the celo chain ',
  openGraph: {
    title: 'celo-crossword',
    description: 'A crossword in the celo chain ',
    images: [`${appUrl}/opengraph-image.png`],
  },
  other: {
    "fc:frame": JSON.stringify(frame),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={pressStart2P.className}>
        {/* Navbar is included on all pages */}
        <div className="relative flex flex-col min-h-screen">
          <Providers>
            <Navbar />
            <main className="flex-1 pb-16 sm:pb-0">
              {children}
            </main>
            <footer className="p-4 text-center text-gray-600">
              Made with passion ❤️ by Psylabs
            </footer>
          </Providers>
        </div>
      </body>
    </html>
  );
}
