import './globals.css';
import ClientTelemetry from '@/components/ClientTelemetry';

export const metadata = {
  title: 'GoCreate OS',
  description: 'Public RFID check-in, badges, employees, guests, access rosters, and operations analytics for GoCreate.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0499DB',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body><ClientTelemetry />{children}</body></html>;
}
