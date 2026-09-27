import AdminShell from "@/components/admin/AdminShell";

export const metadata = {
  title: "Admin | NIFT Jodhpur Converge 2026",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
