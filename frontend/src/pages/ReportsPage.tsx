import { useQuery } from 'react-query';
import { 
  BarChart3, 
  Users, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Download,
  PieChart
} from 'lucide-react';
import { getDashboardStats, getComplianceReport, exportReport } from '../services/reports';
import { RiskBadge } from '../components/RiskBadge';

export function ReportsPage() {
  const { data: statsData } = useQuery('dashboardStats', getDashboardStats);
  const { data: complianceData } = useQuery('complianceReport', () => getComplianceReport());

  const stats = statsData?.data;
  const compliance = complianceData?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Reports</h1>
          <p className="text-gray-600 mt-1">
            Overview of your firm's AML compliance status
          </p>
        </div>
        <button
          onClick={() => exportReport('json')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
                <p className="text-xs text-green-600">+{stats.recentClients} this month</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Compliance Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.complianceRate}%</p>
                <p className="text-xs text-gray-500">Fully verified clients</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FileText className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Documents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingDocuments}</p>
                <p className="text-xs text-gray-500">Awaiting verification</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Upcoming Reviews</p>
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingReviews}</p>
                <p className="text-xs text-gray-500">Next 30 days</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Distribution */}
      {stats && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h2>
          <div className="flex items-center space-x-8">
            <div className="flex-1">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Low Risk</span>
                    <span className="font-medium">{stats.riskDistribution.low}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(stats.riskDistribution.low / stats.totalClients) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Medium Risk</span>
                    <span className="font-medium">{stats.riskDistribution.medium}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${(stats.riskDistribution.medium / stats.totalClients) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">High Risk</span>
                    <span className="font-medium">{stats.riskDistribution.high}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${(stats.riskDistribution.high / stats.totalClients) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-48 h-48">
              {/* Simple pie chart representation */}
              <div className="relative w-full h-full rounded-full overflow-hidden" style={{
                background: `conic-gradient(
                  #22c55e ${(stats.riskDistribution.low / stats.totalClients) * 360}deg,
                  #eab308 ${(stats.riskDistribution.low / stats.totalClients) * 360}deg ${((stats.riskDistribution.low + stats.riskDistribution.medium) / stats.totalClients) * 360}deg,
                  #ef4444 ${((stats.riskDistribution.low + stats.riskDistribution.medium) / stats.totalClients) * 360}deg
                )`
              }}>
                <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{stats.totalClients}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Overrides */}
      {compliance?.manualOverrides && compliance.manualOverrides.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Risk Assessment Overrides</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {compliance.manualOverrides.slice(0, 5).map((override: any, index: number) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{override.clientName}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Reason: {override.reason}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RiskBadge level={override.originalRisk} size="sm" />
                    <span className="text-gray-400">→</span>
                    <RiskBadge level={override.manualRisk} size="sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
