import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Science Diagram Maker | Udhi Technologies Review Portal',
  description: 'AI-generated GCSE animated science diagrams with programmatic validation and reviewer workflow.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
