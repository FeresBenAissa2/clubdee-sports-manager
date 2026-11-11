'use client';

import { useState } from 'react';
import { FileText, X, User, Phone, MapPin, AlertCircle, Calendar } from 'lucide-react';

interface ApplicationData {
  id: string;
  status: string;
  personal_info: {
    full_name?: string;
    phone_number?: string;
    address?: string;
    emergency_contact?: string;
    date_of_birth?: string;
    gender?: string;
    [key: string]: string | undefined;
  };
  documents?: Array<{
    type: string;
    url: string;
    file_name?: string;
  }>;
  created_at: string;
  review_info?: {
    reviewed_at?: string;
    notes?: string;
  };
}

interface ViewApplicationDialogProps {
  application: ApplicationData | null;
  athleteName: string;
}

export function ViewApplicationDialog({ application, athleteName }: ViewApplicationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!application) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm cursor-not-allowed"
      >
        <FileText className="h-4 w-4" />
        <span>No applications</span>
      </button>
    );
  }

  const personalInfo = application.personal_info || {};

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
      >
        <FileText className="h-4 w-4" />
        <span>View application</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-black">Application details</h2>
                  <p className="text-sm text-gray-500">{athleteName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  application.status === 'approved' 
                    ? 'bg-green-100 text-green-700'
                    : application.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {application.status === 'approved' ? 'Approved' : 
                   application.status === 'pending' ? 'Pending review' : 'Reject'}
                </span>
                <span className="text-sm text-gray-500">
                  Applied on {new Date(application.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {/* Personal Information */}
              <div>
                <h3 className="font-semibold text-black mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal information
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  {personalInfo.full_name && (
                    <div>
                      <p className="text-xs text-gray-500">Name-Last name</p>
                      <p className="font-medium text-black">{personalInfo.full_name}</p>
                    </div>
                  )}
                  
                  {personalInfo.date_of_birth && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Date of birth</p>
                        <p className="text-sm text-black">
                          {new Date(personalInfo.date_of_birth).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {personalInfo.gender && (
                    <div>
                      <p className="text-xs text-gray-500">Gender</p>
                      <p className="text-sm text-black">
                        {personalInfo.gender === 'male' ? 'Male' : 
                         personalInfo.gender === 'female' ? 'Female' : personalInfo.gender}
                      </p>
                    </div>
                  )}

                  {personalInfo.phone_number && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Phone number</p>
                        <p className="text-sm text-black">{personalInfo.phone_number}</p>
                      </div>
                    </div>
                  )}

                  {personalInfo.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-sm text-black">{personalInfo.address}</p>
                      </div>
                    </div>
                  )}

                  {personalInfo.emergency_contact && (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Emergency contact</p>
                        <p className="text-sm text-black">{personalInfo.emergency_contact}</p>
                      </div>
                    </div>
                  )}

                  {/* Other fields */}
                  {Object.entries(personalInfo)
                    .filter(([key]) => !['full_name', 'phone_number', 'address', 'emergency_contact', 'date_of_birth', 'gender'].includes(key))
                    .map(([key, value]) => value && (
                      <div key={key}>
                        <p className="text-xs text-gray-500">{key}</p>
                        <p className="text-sm text-black">{value}</p>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Documents */}
              {application.documents && application.documents.length > 0 && (
                <div>
                  <h3 className="font-semibold text-black mb-3">Attached documents</h3>
                  <div className="space-y-2">
                    {application.documents.map((doc, index) => (
                      <a
                        key={index}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-black">
                            {doc.file_name || doc.type}
                          </p>
                          <p className="text-xs text-gray-500">{doc.type}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Notes */}
              {application.review_info?.notes && (
                <div>
                  <h3 className="font-semibold text-black mb-3">Review notes</h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700">{application.review_info.notes}</p>
                    {application.review_info.reviewed_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Reviewed on {new Date(application.review_info.reviewed_at).toLocaleDateString('en-US')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Off
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
