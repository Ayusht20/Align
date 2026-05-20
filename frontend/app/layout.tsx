import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/app/context/ThemeContext';
import { AuthProvider } from '@/app/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Align',
  description: 'A community discussion platform',
  icons: {
    icon: '/align.png',
    apple: '/align.png',
    shortcut: '/align.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={inter.className}
        style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      >
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 py-6">
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}