import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  LogOut,
  Shield,
  Bell,
  History,
  BarChart3,
  Calendar,
  Key,
  MessageSquare
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { AIChat } from './AIChat';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/audit', label: 'Audit Trail', icon: History },
  { path: '/api-keys', label: 'Integrations', icon: Key },
  { path: '/chat', label: 'AI Assistant', icon: MessageSquare },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 z-40 w-64 h-screen bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b border-gray-200">
            <Shield className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">AML Guardian</h1>
              <p className="text-xs text-gray-500">Pro</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.firmName}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center w-full px-4 py-2 mt-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-8 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {navItems.find(item => 
                location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path))
              )?.label || 'Dashboard'}
            </h2>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Bell className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-8">
          {children}
        </main>
      </div>
      
      {/* AI Chat */}
      <AIChat />
    </div>
  );
}
