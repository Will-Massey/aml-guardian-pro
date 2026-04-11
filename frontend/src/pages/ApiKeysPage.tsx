import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Key, Plus, Trash2, Copy, Check } from 'lucide-react';
import { get, post, del } from '../services/api';
import toast from 'react-hot-toast';

interface ApiKey {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
}

export function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery('apiKeys', () =>
    get('/api-keys') as Promise<{ data: ApiKey[] }>
  );

  const createMutation = useMutation(
    () => post('/api-keys', { name: newKeyName }),
    {
      onSuccess: (response: any) => {
        setNewlyCreatedKey(response.data.key);
        setShowNewKey(false);
        setNewKeyName('');
        queryClient.invalidateQueries('apiKeys');
        toast.success('API key created!');
      },
      onError: () => {
        toast.error('Failed to create API key');
      },
    }
  );

  const revokeMutation = useMutation(
    (id: string) => del(`/api-keys/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('apiKeys');
        toast.success('API key revoked');
      },
    }
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const apiKeys = data?.data || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600 mt-1">
            Manage API keys for integrating with external systems
          </p>
        </div>
        <button
          onClick={() => setShowNewKey(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Generate New Key
        </button>
      </div>

      {/* New Key Modal */}
      {showNewKey && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Generate New API Key
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Name (e.g., "Capstone Integration")
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Enter a descriptive name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => createMutation.mutate()}
                disabled={!newKeyName || createMutation.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Generate Key
              </button>
              <button
                onClick={() => setShowNewKey(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Newly Created Key Alert */}
      {newlyCreatedKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                API Key Created Successfully!
              </h3>
              <p className="text-green-800 text-sm mb-4">
                Copy this key now - it will not be shown again!
              </p>
              <div className="flex items-center bg-white rounded-lg p-3 border border-green-200">
                <code className="flex-1 text-sm font-mono text-gray-800 break-all">
                  {newlyCreatedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newlyCreatedKey)}
                  className="ml-3 p-2 text-gray-500 hover:text-gray-700"
                >
                  {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* API Keys List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your API Keys</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : apiKeys.length === 0 ? (
          <div className="p-8 text-center">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No API keys yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Generate a key to start integrating
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {apiKeys.map((key: ApiKey) => (
              <div key={key.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Key className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span>
                        Created {new Date(key.createdAt).toLocaleDateString()}
                      </span>
                      {key.lastUsedAt && (
                        <span>
                          Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                      {key.expiresAt && (
                        <span className="text-orange-600">
                          Expires {new Date(key.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      key.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {key.isActive ? 'Active' : 'Revoked'}
                  </span>
                  {key.isActive && (
                    <button
                      onClick={() => {
                        if (confirm('Revoke this API key? This cannot be undone.')) {
                          revokeMutation.mutate(key.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documentation Link */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-2">Integration Guide</h3>
        <p className="text-gray-600 text-sm mb-4">
          Learn how to integrate AML Guardian Pro with your practice management software,
          proposal tools, and other systems.
        </p>
        <a
          href="/api-docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          View API Documentation →
        </a>
      </div>
    </div>
  );
}
