import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

const barlowCondensed = Barlow_Condensed({
  variable: '--font-barlow-condensed',
  subsets: ['latin'],
  weight: ['700', '800'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: {
    default: 'ClubDee Sports Club — Train, compete, belong',
    template: '%s · ClubDee',
  },
  description:
    'ClubDee is a multi-sport club for athletes of every level. Explore our sports, meet our coaches and apply for membership online.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ClubDee',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafd' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d16' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <noscript>
          <style>{'[data-reveal]{opacity:1!important;animation:none!important}'}</style>
        </noscript>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} ${barlowCondensed.variable} font-sans antialiased`}
      >
        {/* Skip to main content link for keyboard navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <ToastProvider>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <PWAInstallPrompt />
          <OfflineIndicator />
          <SyncStatusIndicator />
        </ToastProvider>
      </body>
    </html>
  );
}
