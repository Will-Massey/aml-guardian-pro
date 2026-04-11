import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  Plus,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatsCard } from '../components/StatsCard';
import { RiskBadge } from '../components/RiskBadge';
import { getClientStats } from '../services/clients';
import { getClients } from '../services/clients';
import { Client, ClientStats } from '../types';

export function DashboardPage() {
  const [stats, setStats] = useState<ClientStats | null>(null);
  
  const { data: statsData } = useQuery('clientStats', getClientStats);
  const { data: recentClientsData } = useQuery('recentClients', () => 
    getClients({ search: '' })
  );

  useEffect(() => {
    if (statsData?.data) {
      setStats(statsData.data);
    }
  }, [statsData]);

  const recentClients = recentClientsData?.data?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Clients"
          value={stats?.totalClients || 0}
          description="Active client relationships"
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="High Risk Clients"
          value={stats?.riskDistribution?.high || 0}
          description="Requiring enhanced monitoring"
          icon={AlertTriangle}
          color="red"
        />
        <StatsCard
          title="Compliance Rate"
          value={`${stats?.complianceRate || 0}%`}
          description="Up to date risk assessments"
          icon={TrendingUp}
          color="green"
        />
        <StatsCard
          title="Documents Generated"
          value={recentClients.reduce((acc, client) => acc + (client.documents?.length || 0), 0)}
          description="Total compliance documents"
          icon={FileText}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/clients/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Client
          </Link>
          <Link
            to="/clients"
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="w-5 h-5 mr-2" />
            View All Clients
          </Link>
        </div>
      </div>

      {/* Recent Clients */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Clients</h3>
          <Link 
            to="/clients" 
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            View all
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="divide-y divide-gray-200">
          {recentClients.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <p>No clients yet. Get started by adding your first client.</p>
              <Link
                to="/clients/new"
                className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Client
              </Link>
            </div>
          ) : (
            recentClients.map((client) => (
              <div key={client.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <Link 
                    to={`/clients/${client.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600"
                  >
                    {client.companyName}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {client.companyNumber || 'No company number'}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <RiskBadge level={client.riskLevel} size="sm" />
                  <span className="text-sm text-gray-500">
                    {new Date(client.createdAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Low Risk</span>
                <span className="font-medium">{stats?.riskDistribution?.low || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ 
                    width: `${stats?.totalClients ? (stats.riskDistribution.low / stats.totalClients) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Medium Risk</span>
                <span className="font-medium">{stats?.riskDistribution?.medium || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ 
                    width: `${stats?.totalClients ? (stats.riskDistribution.medium / stats.totalClients) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">High Risk</span>
                <span className="font-medium">{stats?.riskDistribution?.high || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ 
                    width: `${stats?.totalClients ? (stats.riskDistribution.high / stats.totalClients) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Overview</h3>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-blue-100">
                <div className="text-center">
                  <span className="text-3xl font-bold text-gray-900">
                    {stats?.complianceRate || 0}%
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Overall compliance rate based on<br />up-to-date risk assessments
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
