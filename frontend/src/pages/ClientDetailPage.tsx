import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Users, 
  FileText, 
  AlertTriangle,
  RefreshCw,
  Download,
  Plus,
  CheckCircle,
  XCircle,
  Upload,
  Clock,
  Trash2,
  Shield,
  ExternalLink,
  Copy,
  Mail
} from 'lucide-react';
import { getClient, generatePortalLink, revokePortalAccess } from '../services/clients';
import { regenerateRiskAssessment, overrideRiskAssessment } from '../services/riskAssessment';
import { generateDocument, generateAMLPackage, uploadDocument, verifyDocument, downloadDocument, deleteDocument } from '../services/documents';
import { RiskBadge } from '../components/RiskBadge';
import { Client, DocumentStatus, DocumentType } from '../types';
import toast from 'react-hot-toast';

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'ID_VERIFICATION', label: 'ID Verification' },
  { value: 'ADDRESS_VERIFICATION', label: 'Address Verification' },
  { value: 'RISK_ASSESSMENT', label: 'Risk Assessment' },
  { value: 'SOURCE_OF_FUNDS', label: 'Source of Funds' },
  { value: 'SOURCE_OF_WEALTH', label: 'Source of Wealth' },
  { value: 'PEP_SCREENING', label: 'PEP Screening' },
  { value: 'SANCTIONS_SCREENING', label: 'Sanctions Screening' },
  { value: 'OTHER', label: 'Other' },
];

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ manualRiskLevel: '', overrideReason: '' });
  const [uploadForm, setUploadForm] = useState({
    type: '' as DocumentType | '',
    name: '',
    description: '',
    file: null as File | null,
  });
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [portalLink, setPortalLink] = useState('');
  const [portalExpiry, setPortalExpiry] = useState('');

  const { data, isLoading, refetch } = useQuery(
    ['client', id],
    () => getClient(id!),
    { enabled: !!id, refetchInterval: 30000 } // Auto refresh every 30s
  );

  const client = data?.data;

  const regenerateMutation = useMutation(
    () => regenerateRiskAssessment(client?.riskAssessment?.id || ''),
    {
      onSuccess: () => {
        toast.success('Risk assessment regenerated');
        queryClient.invalidateQueries(['client', id]);
      },
      onError: () => {
        toast.error('Failed to regenerate risk assessment');
      },
    }
  );

  const overrideMutation = useMutation(
    () => overrideRiskAssessment(client?.riskAssessment?.id || '', {
      manualRiskLevel: overrideForm.manualRiskLevel as any,
      overrideReason: overrideForm.overrideReason,
    }),
    {
      onSuccess: () => {
        toast.success('Risk assessment overridden');
        setShowOverrideModal(false);
        queryClient.invalidateQueries(['client', id]);
      },
      onError: () => {
        toast.error('Failed to override risk assessment');
      },
    }
  );

  const generatePackageMutation = useMutation(
    () => generateAMLPackage(id!),
    {
      onSuccess: () => {
        toast.success('Complete AML package generated');
        queryClient.invalidateQueries(['client', id]);
      },
      onError: () => {
        toast.error('Failed to generate AML package');
      },
    }
  );

  const uploadMutation = useMutation(
    () => {
      if (!uploadForm.file || !uploadForm.type) throw new Error('Missing fields');
      return uploadDocument(uploadForm.file, {
        clientId: id!,
        type: uploadForm.type,
        name: uploadForm.name || uploadForm.file.name,
        description: uploadForm.description,
      });
    },
    {
      onSuccess: () => {
        toast.success('Document uploaded successfully');
        setShowUploadModal(false);
        setUploadForm({ type: '', name: '', description: '', file: null });
        queryClient.invalidateQueries(['client', id]);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to upload document');
      },
    }
  );

  const verifyMutation = useMutation(
    ({ docId, status, notes }: { docId: string; status: DocumentStatus; notes?: string }) =>
      verifyDocument(docId, { status, notes }),
    {
      onSuccess: () => {
        toast.success('Document status updated');
        queryClient.invalidateQueries(['client', id]);
      },
      onError: () => {
        toast.error('Failed to update document status');
      },
    }
  );

  const downloadMutation = useMutation(
    (docId: string) => downloadDocument(docId),
    {
      onSuccess: (blob, docId) => {
        const doc = client?.documents?.find(d => d.id === docId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc?.fileName || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      onError: () => {
        toast.error('Failed to download document');
      },
    }
  );

  const deleteMutation = useMutation(
    (docId: string) => deleteDocument(docId),
    {
      onSuccess: () => {
        toast.success('Document deleted');
        queryClient.invalidateQueries(['client', id]);
      },
      onError: () => {
        toast.error('Failed to delete document');
      },
    }
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'PENDING_VERIFICATION':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-800',
      VERIFIED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PENDING_SIGNATURE: 'bg-blue-100 text-blue-800',
      SIGNED: 'bg-green-100 text-green-800',
      EXPIRED: 'bg-gray-100 text-gray-500',
      SUPERSEDED: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Client not found</p>
        <Link to="/clients" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
          Back to clients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            to="/clients" 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.companyName}</h1>
            <p className="text-gray-500">
              {client.companyNumber || 'No company number'} • {client.companyType || 'Unknown type'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              generatePortalLink(client.id).then((res: any) => {
                setPortalLink(res.data?.portalUrl || '');
                setPortalExpiry(res.data?.expiresAt || '');
                setShowPortalModal(true);
              }).catch(() => toast.error('Failed to generate portal link'));
            }}
            className="flex items-center px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200"
          >
            <ExternalLink className="w-4 h-4 mr-1.5" />
            Client Portal
          </button>
          {client.riskAssessment?.manualOverride && (
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
              Manual Override
            </span>
          )}
          <RiskBadge level={client.riskLevel} size="lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Company Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Details */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <dt className="flex items-center text-sm font-medium text-gray-500">
                    <Building2 className="w-4 h-4 mr-2" />
                    Company Status
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">{client.companyStatus || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="flex items-center text-sm font-medium text-gray-500">
                    <MapPin className="w-4 h-4 mr-2" />
                    Registered Address
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {client.registeredAddress ? (
                      <>
                        {client.registeredAddress.addressLine1}
                        {client.registeredAddress.addressLine2 && <>, {client.registeredAddress.addressLine2}</>}
                        <br />
                        {client.registeredAddress.city}, {client.registeredAddress.postcode}
                        <br />
                        {client.registeredAddress.country}
                      </>
                    ) : (
                      'Not provided'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Incorporation Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {client.incorporationDate 
                      ? new Date(client.incorporationDate).toLocaleDateString('en-GB')
                      : 'N/A'
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Business Activity</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {client.businessDescription || 'Not provided'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Risk Assessment */}
          {client.riskAssessment && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Risk Assessment</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => regenerateMutation.mutate()}
                    disabled={regenerateMutation.isLoading}
                    className="flex items-center px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <RefreshCw className={`w-4 h-4 mr-1.5 ${regenerateMutation.isLoading ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                  <button
                    onClick={() => setShowOverrideModal(true)}
                    className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Override
                  </button>
                </div>
              </div>
              <div className="p-6">
                {/* Risk Score */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Overall Risk Score</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {client.riskAssessment.riskScore}/100
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Risk Level</p>
                    <RiskBadge level={client.riskAssessment.overallRiskLevel} size="lg" />
                  </div>
                </div>

                {/* Risk Factors */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Business Sector', value: client.riskAssessment.businessSectorRisk },
                    { label: 'Geographic', value: client.riskAssessment.geographicRisk },
                    { label: 'Structure', value: client.riskAssessment.structureRisk },
                    { label: 'Transparency', value: client.riskAssessment.transparencyRisk },
                    { label: 'PEP Risk', value: client.riskAssessment.pepRisk },
                    { label: 'Sanctions', value: client.riskAssessment.sanctionsRisk },
                  ].map((factor) => (
                    <div key={factor.label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{factor.label}</p>
                      <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                        factor.value === 'LOW' ? 'bg-green-100 text-green-800' :
                        factor.value === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {factor.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* AI Analysis */}
                {client.riskAssessment.aiAnalysis && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">AI Analysis</h3>
                    <p className="text-sm text-blue-800 whitespace-pre-line">
                      {client.riskAssessment.aiAnalysis}
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Generated by {client.riskAssessment.aiModel} on{' '}
                      {new Date(client.riskAssessment.aiGeneratedAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                )}

                {/* Required Documents */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Required Documents</h3>
                  <ul className="space-y-2">
                    {client.riskAssessment.requiredDocuments?.map((doc, index) => (
                      <li key={index} className={`flex items-center text-sm ${
                        doc.includes('(recommended)') || doc.includes('(enhanced)') || doc.includes('(optional)')
                          ? 'text-gray-500 italic'
                          : 'text-gray-800 font-medium'
                      }`}>
                        <CheckCircle className={`w-4 h-4 mr-2 ${
                          doc.includes('(recommended)') || doc.includes('(enhanced)') || doc.includes('(optional)')
                            ? 'text-gray-400'
                            : 'text-green-500'
                        }`} />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Officers */}
          {client.officers && client.officers.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Officers ({client.officers.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {client.officers.map((officer, index) => (
                  <div key={index} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{officer.name}</p>
                        <p className="text-sm text-gray-500">{officer.role}</p>
                      </div>
                      {officer.appointedDate && (
                        <span className="text-sm text-gray-500">
                          Appointed: {new Date(officer.appointedDate).toLocaleDateString('en-GB')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </button>
              <button
                onClick={() => generatePackageMutation.mutate()}
                disabled={generatePackageMutation.isLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate AML Package
              </button>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            </div>
            <div className="p-4">
              {client.documents && client.documents.length > 0 ? (
                <div className="space-y-3">
                  {client.documents.map((doc) => (
                    <div key={doc.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          {getStatusIcon(doc.status)}
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-500">{doc.type.replace(/_/g, ' ')}</p>
                            <div className="mt-1">
                              {getStatusBadge(doc.status)}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => downloadMutation.mutate(doc.id)}
                            disabled={downloadMutation.isLoading}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this document?')) {
                                deleteMutation.mutate(doc.id);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {/* Verification Actions */}
                      {doc.status === 'PENDING_VERIFICATION' && (
                        <div className="mt-3 flex space-x-2">
                          <button
                            onClick={() => verifyMutation.mutate({ docId: doc.id, status: 'VERIFIED' })}
                            className="flex-1 px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => verifyMutation.mutate({ docId: doc.id, status: 'REJECTED' })}
                            className="flex-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No documents yet</p>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Upload your first document
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Verification Status */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <Shield className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Verification Status</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Identity Verified', checked: client.identityVerified },
                { label: 'Address Verified', checked: client.addressVerified },
                { label: 'PEP Screened', checked: client.pepScreened },
                { label: 'Sanctions Screened', checked: client.sanctionsScreened },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  {item.checked ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-300" />
                  )}
                </div>
              ))}
            </div>
            {client.nextReviewDate && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Next Review:{' '}
                  <span className={new Date(client.nextReviewDate) < new Date() ? 'text-red-600 font-medium' : 'text-gray-900'}>
                    {new Date(client.nextReviewDate).toLocaleDateString('en-GB')}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Override Risk Assessment
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manual Risk Level
                </label>
                <select
                  value={overrideForm.manualRiskLevel}
                  onChange={(e) => setOverrideForm({ ...overrideForm, manualRiskLevel: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select risk level</option>
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Override Reason
                </label>
                <textarea
                  value={overrideForm.overrideReason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, overrideReason: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Explain why you're overriding the AI assessment..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => overrideMutation.mutate()}
                disabled={!overrideForm.manualRiskLevel || overrideForm.overrideReason.length < 10}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Override Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Document
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value as DocumentType })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select document type</option>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Name (optional)
                </label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="e.g., Director Passport"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  rows={2}
                  placeholder="Additional notes..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max size: 10MB. Allowed: PDF, JPEG, PNG, DOC, DOCX
                </p>
              </div>
              {uploadForm.file && (
                <p className="text-sm text-green-600">
                  Selected: {uploadForm.file.name}
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({ type: '', name: '', description: '', file: null });
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => uploadMutation.mutate()}
                disabled={!uploadForm.type || !uploadForm.file || uploadMutation.isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {uploadMutation.isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portal Link Modal */}
      {showPortalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Client Portal Link
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Share this secure link with {client?.companyName} to allow them to upload documents directly.
              The link expires on {new Date(portalExpiry).toLocaleDateString()}.
            </p>
            <div className="bg-gray-50 p-3 rounded-lg break-all text-sm text-gray-700 mb-4 font-mono">
              {portalLink}
            </div>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(portalLink);
                  toast.success('Link copied to clipboard');
                }}
                className="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </button>
              <button
                onClick={() => {
                  const subject = encodeURIComponent(`Document Upload Required - ${client?.companyName}`);
                  const body = encodeURIComponent(`Hello,\n\nPlease upload your compliance documents using this secure link:\n\n${portalLink}\n\nThis link will expire on ${new Date(portalExpiry).toLocaleDateString()}.\n\nThank you.`);
                  window.open(`mailto:?subject=${subject}&body=${body}`);
                }}
                className="flex items-center justify-center w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Mail className="w-4 h-4 mr-2" />
                Open Email Client
              </button>
              <button
                onClick={() => setShowPortalModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
