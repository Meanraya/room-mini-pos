import { Cormorant_Garamond, Noto_Sans_Thai, Noto_Serif_Thai } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-cormorant', display: 'swap' });
const serifTh = Noto_Serif_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500'], variable: '--font-serif-th', display: 'swap' });
const sansTh = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans-th', display: 'swap' });

export const metadata = {
  title: { default: 'Room Scent — น้ำหอมปรับบรรยากาศห้อง', template: '%s · Room Scent' },
  description: 'Room Scent สเปรย์และเทียนหอมปรับบรรยากาศห้อง 4 มู้ด Fresh, Relax, Focus, Romance',
};

export const viewport = { themeColor: '#fdfbf8' };

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${cormorant.variable} ${serifTh.variable} ${sansTh.variable}`}>
      <body>{children}</body>
    </html>
  );
}
