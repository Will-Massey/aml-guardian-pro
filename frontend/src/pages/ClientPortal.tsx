import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  FileCheck,
  AlertCircle,
  CheckCircle,
  Clock,
  Building2,
  Shield,
  FileText,
  Lock,
  ArrowLeft,
  Camera,
  X,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';

interface PortalData {
  companyName: string;
  companyNumber?: string;
  firmName: string;
  firmAddress?: string;
  firmEmail?: string;
  firmPhone?: string;
  requiredDocuments: string[];
  uploadedDocuments: Document[];
  complianceStatus: {
    identityVerified: boolean;
    addressVerified: boolean;
    pepScreened: boolean;
    sanctionsScreened: boolean;
  };
}

interface Document {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

interface Requirement {
  type: string;
  title: string;
  description: string;
  acceptedFormats: string[];
  required: boolean;
}

// Get token from URL query param
const getPortalToken = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
};

export default function ClientPortal() {
  const [token, setToken] = useState<string | null>(getPortalToken());
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'status'>('upload');

  // Fetch portal data
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [clientRes, reqRes] = await Promise.all([
          fetch(`/api/portal/client?token=${token}`),
          fetch(`/api/portal/requirements?token=${token}`),
        ]);

        if (!clientRes.ok || !reqRes.ok) {
          throw new Error('Invalid or expired link');
        }

        const [clientData, reqData] = await Promise.all([
          clientRes.json(),
          reqRes.json(),
        ]);

        setPortalData(clientData.data);
        setRequirements(reqData.data.requirements);
      } catch (error) {
        toast.error('This link has expired or is invalid');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleUpload = async (requirementType: string, file: File) => {
    setUploading(requirementType);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', requirementType);
      formData.append('name', file.name);

      const response = await fetch(`/api/portal/documents?token=${token}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      toast.success('Document uploaded successfully');
      
      // Refresh data
      const clientRes = await fetch(`/api/portal/client?token=${token}`);
      const reqRes = await fetch(`/api/portal/requirements?token=${token}`);
      
      const [clientData, reqData] = await Promise.all([
        clientRes.json(),
        reqRes.json(),
      ]);

      setPortalData(clientData.data);
      setRequirements(reqData.data.requirements);
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Invalid Access Link
          </h1>
          <p className="text-gray-600">
            This portal requires a valid access link. Please contact your accountant for assistance.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!portalData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Link Expired
          </h1>
          <p className="text-gray-600">
            This secure link has expired. Please contact your accountant to request a new one.
          </p>
        </div>
      </div>
    );
  }

  const completedCount = Object.values(portalData.complianceStatus).filter(Boolean).length;
  const totalCount = Object.keys(portalData.complianceStatus).length;
  const progress = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  AML Compliance Portal
                </h1>
                <p className="text-sm text-gray-500">
                  Secure document upload for {portalData.firmName}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Lock className="h-4 w-4" />
              <span>Secure Connection</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome, {portalData.companyName}
              </h2>
              <p className="text-gray-600 max-w-2xl">
                Your accountant needs to verify your business information for Anti-Money Laundering (AML) compliance. 
                Please upload the required documents below. All uploads are encrypted and secure.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600">{progress}%</div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'upload'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>Upload Documents</span>
                  {requirements.length > 0 && (
                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">
                      {requirements.length} pending
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'status'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Status & History</span>
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'upload' ? (
              <UploadTab
                requirements={requirements}
                uploading={uploading}
                onUpload={handleUpload}
              />
            ) : (
              <StatusTab
                complianceStatus={portalData.complianceStatus}
                uploadedDocuments={portalData.uploadedDocuments}
              />
            )}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-8 bg-indigo-50 rounded-lg p-6">
          <h3 className="text-sm font-medium text-indigo-900 mb-2">
            Need Help?
          </h3>
          <p className="text-sm text-indigo-700 mb-3">
            If you're having trouble uploading documents or have questions about the requirements, 
            please contact your accountant directly.
          </p>
          <div className="flex items-center space-x-4 text-sm text-indigo-700">
            {portalData.firmEmail && (
              <a href={`mailto:${portalData.firmEmail}`} className="flex items-center space-x-1 hover:underline">
                <span>✉</span>
                <span>{portalData.firmEmail}</span>
              </a>
            )}
            {portalData.firmPhone && (
              <span className="flex items-center space-x-1">
                <span>📞</span>
                <span>{portalData.firmPhone}</span>
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Upload Tab Component
function UploadTab({
  requirements,
  uploading,
  onUpload,
}: {
  requirements: Requirement[];
  uploading: string | null;
  onUpload: (type: string, file: File) => void;
}) {
  if (requirements.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          All Requirements Met
        </h3>
        <p className="text-gray-600">
          Thank you! You've uploaded all required documents. Your accountant will review them shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-yellow-800">
            Documents Required
          </h4>
          <p className="text-sm text-yellow-700 mt-1">
            Please upload the following documents to complete your compliance verification. 
            Accepted formats: PDF, JPG, PNG (max 10MB each).
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {requirements.map((req) => (
          <UploadCard
            key={req.type}
            requirement={req}
            isUploading={uploading === req.type}
            onUpload={(file) => onUpload(req.type, file)}
          />
        ))}
      </div>
    </div>
  );
}

// Individual Upload Card
function UploadCard({
  requirement,
  isUploading,
  onUpload,
}: {
  requirement: Requirement;
  isUploading: boolean;
  onUpload: (file: File) => void;
}) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    disabled: isUploading,
  });

  return (
    <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition-colors">
      <div className="flex items-start space-x-4">
        <div className="bg-indigo-50 p-3 rounded-lg">
          <FileCheck className="h-6 w-6 text-indigo-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-medium text-gray-900">{requirement.title}</h4>
            {requirement.required && (
              <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-medium">
                Required
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-3">{requirement.description}</p>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-indigo-500 bg-indigo-50'
                : isUploading
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-indigo-400'
            }`}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                <span className="text-sm text-gray-600">Uploading...</span>
              </div>
            ) : isDragActive ? (
              <p className="text-indigo-600 font-medium">Drop the file here</p>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  {requirement.acceptedFormats.join(', ')} up to 10MB
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Status Tab Component
function StatusTab({
  complianceStatus,
  uploadedDocuments,
}: {
  complianceStatus: PortalData['complianceStatus'];
  uploadedDocuments: Document[];
}) {
  const statusItems = [
    { key: 'identityVerified', label: 'Identity Verification', icon: FileCheck },
    { key: 'addressVerified', label: 'Address Verification', icon: Building2 },
    { key: 'pepScreened', label: 'PEP Screening', icon: Shield },
    { key: 'sanctionsScreened', label: 'Sanctions Screening', icon: Shield },
  ];

  return (
    <div className="space-y-8">
      {/* Compliance Status */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Compliance Status
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {statusItems.map(({ key, label, icon: Icon }) => {
            const isComplete = complianceStatus[key as keyof typeof complianceStatus];
            return (
              <div
                key={key}
                className={`flex items-center space-x-3 p-4 rounded-lg border ${
                  isComplete
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    isComplete ? 'bg-green-100' : 'bg-gray-100'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      isComplete ? 'text-green-600' : 'text-gray-400'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{label}</p>
                  <p
                    className={`text-sm ${
                      isComplete ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {isComplete ? 'Verified' : 'Pending'}
                  </p>
                </div>
                {isComplete && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Document History */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Uploaded Documents
        </h3>
        {uploadedDocuments.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploadedDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {doc.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-800',
    VERIFIED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    PENDING_SIGNATURE: 'bg-blue-100 text-blue-800',
    SIGNED: 'bg-purple-100 text-purple-800',
    EXPIRED: 'bg-gray-100 text-gray-500',
    SUPERSEDED: 'bg-gray-100 text-gray-500',
  };

  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    PENDING_VERIFICATION: 'Pending Review',
    VERIFIED: 'Verified',
    REJECTED: 'Rejected',
    PENDING_SIGNATURE: 'Pending Signature',
    SIGNED: 'Signed',
    EXPIRED: 'Expired',
    SUPERSEDED: 'Superseded',
  };

  return (
    <span
      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
        styles[status] || styles.DRAFT
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
