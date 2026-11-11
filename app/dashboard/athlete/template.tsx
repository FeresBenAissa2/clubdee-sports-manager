import { PageTransition } from '@/components/layout/PageTransition';

export default function AthleteTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
