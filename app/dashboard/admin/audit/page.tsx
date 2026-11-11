import { FileText } from 'lucide-react';

export default function AuditLogsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Audit log</h1>
        <p className="mt-2 text-gray-600">View system activity and user actions</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12">
        <FileText className="mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">Audit logging is coming soon</h3>
        <p className="text-center text-gray-600">
          Audit logging will track all system events, including:
          <br />
          User sign-ins, data changes, and administrator actions
        </p>
      </div>
    </div>
  );
}
