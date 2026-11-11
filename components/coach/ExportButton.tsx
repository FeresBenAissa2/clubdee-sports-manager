'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet } from 'lucide-react';

interface ExportButtonProps {
  onExportCSV: () => Promise<{ data?: string; error?: string }>;
  filename: string;
  disabled?: boolean;
}

export function ExportButton({ onExportCSV, filename, disabled }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportCSV = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await onExportCSV();

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!result.data) {
        setError('No data to export');
        return;
      }

      // Create blob and download
      const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setError('Error exporting data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={disabled || loading} className="gap-2">
            <Download className="h-4 w-4" />
            {loading ? 'Exporting...' : 'Export data'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export as CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
