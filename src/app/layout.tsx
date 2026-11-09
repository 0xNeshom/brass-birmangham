import type { Metadata } from 'next';
import '@fontsource/libre-baskerville/400.css';
import '@fontsource/libre-baskerville/400-italic.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Brass Tournament', template: '%s · Brass Tournament' },
  description: 'A private tournament ledger for three industrialists. Ten matches. One legacy.',
  robots: { index: false, follow: false }
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
