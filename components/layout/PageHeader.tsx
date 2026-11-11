import { cn } from '@/lib/utils';

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div data-reveal className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div data-reveal className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
