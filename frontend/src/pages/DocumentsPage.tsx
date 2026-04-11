import { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  FileText, 
  Download, 
  Trash2, 
  Filter,
  Search,
  FileDown
} from 'lucide-react';
import { getDocuments, deleteDocument, downloadDocument, getDocumentStats } from '../services/documents';
import { Document, DocumentType } from '../types';
import toast from 'react-hot-toast';

const documentTypeLabels: Record<DocumentType, string> = {
  RISK_ASSESSMENT: 'Risk Assessment',
  AML_POLICY_ACKNOWLEDGEMENT: 'AML Policy Acknowledgement',
  ID_VERIFICATION: 'ID Verification',
  ADDRESS_VERIFICATION: 'Address Verification',
  SOURCE_OF_FUNDS: 'Source of Funds',
  SOURCE_OF_WEALTH: 'Source of Wealth',
  PEP_SCREENING: 'PEP Screening',
  SANCTIONS_SCREENING: 'Sanctions Screening',
  ONGOING_MONITORING_PLAN: 'Ongoing Monitoring Plan',
  CUSTOMER_DUE_DILIGENCE: 'Customer Due Diligence',
  ENGAGEMENT_LETTER: 'Engagement Letter',
  OTHER: 'Other',
};

const documentTypeColors: Record<DocumentType, string> = {
  RISK_ASSESSMENT: 'bg-blue-100 text-blue-800',
  AML_POLICY_ACKNOWLEDGEMENT: 'bg-green-100 text-green-800',
  ID_VERIFICATION: 'bg-purple-100 text-purple-800',
  ADDRESS_VERIFICATION: 'bg-purple-100 text-purple-800',
  SOURCE_OF_FUNDS: 'bg-yellow-100 text-yellow-800',
  SOURCE_OF_WEALTH: 'bg-yellow-100 text-yellow-800',
  PEP_SCREENING: 'bg-red-100 text-red-800',
  SANCTIONS_SCREENING: 'bg-red-100 text-red-800',
  ONGOING_MONITORING_PLAN: 'bg-gray-100 text-gray-800',
  CUSTOMER_DUE_DILIGENCE: 'bg-blue-100 text-blue-800',
  ENGAGEMENT_LETTER: 'bg-gray-100 text-gray-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

export function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('');

  const { data, refetch } = useQuery(
    ['documents', typeFilter],
    () => getDocuments({ type: typeFilter || undefined })
  );

  const { data: statsData } = useQuery('documentStats', getDocumentStats);

  const documents = data?.data || [];
  const stats = statsData?.data;

  const handleDownload = async (doc: Document) => {
    try {
      const blob = await downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteDocument(id);
      toast.success('Document deleted');
      refetch();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.client?.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalDocuments || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <FileDown className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Generated This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.recentDocuments || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Filter className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Document Types</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.documentsByType?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as DocumentType | '')}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              {Object.entries(documentTypeLabels).map(([type, label]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-lg font-medium">No documents found</p>
                    <p className="text-sm mt-1">Documents will appear here after you generate them</p>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{document.name}</p>
                          <p className="text-xs text-gray-500">
                            {(document.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {document.client?.companyName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${documentTypeColors[document.type]}`}>
                        {documentTypeLabels[document.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        document.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                        document.status === 'SIGNED' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {document.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(document.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDownload(document)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(document.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
