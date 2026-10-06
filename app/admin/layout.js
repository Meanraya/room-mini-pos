import AdminShell from '../../components/AdminShell';

export const metadata = { title: 'หลังร้าน', robots: { index: false, follow: false } };

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
