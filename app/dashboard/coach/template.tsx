import { PageTransition } from '@/components/layout/PageTransition';

export default function CoachTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
