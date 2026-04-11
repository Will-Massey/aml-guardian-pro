import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Search, Building2, User, ArrowRight, Check, Loader2, X } from 'lucide-react';
import { searchCompanies, getFullCompanyProfile } from '../services/companiesHouse';
import { createClient } from '../services/clients';
import { CHCompanyProfile } from '../types';
import toast from 'react-hot-toast';

interface ManualFormData {
  companyName: string;
  businessDescription: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
}

export function NewClientPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'search' | 'confirm' | 'creating' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CHCompanyProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Manual form state
  const [manualForm, setManualForm] = useState<ManualFormData>({
    companyName: '',
    businessDescription: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    county: '',
    postcode: '',
    country: 'United Kingdom',
  });

  // Debounced search
  const { data: searchResults, isLoading: isSearching } = useQuery(
    ['companySearch', searchQuery],
    () => searchCompanies(searchQuery),
    {
      enabled: searchQuery.length >= 2,
      staleTime: 60000,
    }
  );

  const handleSelectCompany = async (companyNumber: string) => {
    try {
      const response = await getFullCompanyProfile(companyNumber);
      if (response.data) {
        setSelectedCompany(response.data);
        setStep('confirm');
      }
    } catch (error) {
      toast.error('Failed to fetch company details');
    }
  };

  const handleCreateClient = async () => {
    if (!selectedCompany?.company.companyNumber) return;

    setIsCreating(true);
    try {
      const response = await createClient({
        companyNumber: selectedCompany.company.companyNumber,
      });

      if (response.success) {
        toast.success('Client created successfully with AI risk assessment');
        navigate(`/clients/${response.data?.id}`);
      } else {
        toast.error(response.error?.message || 'Failed to create client');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create client');
    } finally {
      setIsCreating(false);
    }
  };

  const handleManualEntry = () => {
    setStep('manual');
  };

  const handleManualFormChange = (field: keyof ManualFormData, value: string) => {
    setManualForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateManualClient = async () => {
    if (!manualForm.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }

    setIsCreating(true);
    try {
      const response = await createClient({
        manualEntry: true,
        companyName: manualForm.companyName,
        businessDescription: manualForm.businessDescription,
        registeredAddress: {
          addressLine1: manualForm.addressLine1,
          addressLine2: manualForm.addressLine2 || undefined,
          city: manualForm.city,
          county: manualForm.county || undefined,
          postcode: manualForm.postcode,
          country: manualForm.country,
        },
        sicCodes: [],
      });

      if (response.success) {
        toast.success('Client created successfully with AI risk assessment');
        navigate(`/clients/${response.data?.id}`);
      } else {
        toast.error(response.error?.message || 'Failed to create client');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create client');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Add New Client</h1>
        <p className="text-gray-600 mt-1">
          Search for a UK company or enter details manually
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center">
          <div className={`flex items-center ${step === 'search' || step === 'manual' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'search' || step === 'manual' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {step === 'search' || step === 'manual' ? <Search className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            </div>
            <span className="ml-2 font-medium">Search or Enter</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4" />
          <div className={`flex items-center ${step === 'confirm' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'confirm' ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Building2 className="w-4 h-4" />
            </div>
            <span className="ml-2 font-medium">Confirm Details</span>
          </div>
        </div>
      </div>

      {/* Step 1: Search */}
      {step === 'search' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by company name or number
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., 'Acme Ltd' or '12345678'"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Data will be retrieved from Companies House
              </p>
            </div>

            {/* Search Results */}
            {isSearching && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-2 text-gray-600">Searching Companies House...</p>
              </div>
            )}

            {searchResults?.data && searchResults.data.length > 0 && (
              <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700">
                    {searchResults.data.length} results found
                  </span>
                </div>
                <div className="divide-y divide-gray-200">
                  {searchResults.data.map((company) => (
                    <button
                      key={company.companyNumber}
                      onClick={() => handleSelectCompany(company.companyNumber)}
                      className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 text-left"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{company.companyName}</p>
                        <p className="text-sm text-gray-500">
                          {company.companyNumber} • {company.companyStatus}
                        </p>
                        {company.address && (
                          <p className="text-sm text-gray-400 mt-1">
                            {company.address.city}, {company.address.postcode}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchQuery.length >= 2 && !isSearching && searchResults?.data?.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-600">No companies found matching &quot;{searchQuery}&quot;</p>
                <button
                  onClick={handleManualEntry}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Enter company details manually
                </button>
              </div>
            )}

            {/* Manual Entry Option */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleManualEntry}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <User className="w-5 h-5 mr-2" />
                Can&apos;t find the company? Enter details manually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Form */}
      {step === 'manual' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Manual Client Entry</h2>
              <p className="text-gray-600 mt-1">
                Enter the company details manually
              </p>
            </div>
            <button
              onClick={() => setStep('search')}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={manualForm.companyName}
                onChange={(e) => handleManualFormChange('companyName', e.target.value)}
                placeholder="e.g., Acme Limited"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Business Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Description
              </label>
              <textarea
                value={manualForm.businessDescription}
                onChange={(e) => handleManualFormChange('businessDescription', e.target.value)}
                placeholder="Describe the nature of the business..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Address */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Registered Address
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={manualForm.addressLine1}
                    onChange={(e) => handleManualFormChange('addressLine1', e.target.value)}
                    placeholder="Street address"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={manualForm.addressLine2}
                    onChange={(e) => handleManualFormChange('addressLine2', e.target.value)}
                    placeholder="Apartment, suite, unit, etc. (optional)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={manualForm.city}
                      onChange={(e) => handleManualFormChange('city', e.target.value)}
                      placeholder="City"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      County
                    </label>
                    <input
                      type="text"
                      value={manualForm.county}
                      onChange={(e) => handleManualFormChange('county', e.target.value)}
                      placeholder="County (optional)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postcode
                    </label>
                    <input
                      type="text"
                      value={manualForm.postcode}
                      onChange={(e) => handleManualFormChange('postcode', e.target.value)}
                      placeholder="Postcode"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={manualForm.country}
                      onChange={(e) => handleManualFormChange('country', e.target.value)}
                      placeholder="Country"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>AI-Powered Risk Assessment:</strong> Once you create this client, 
                our AI will automatically analyze the company information and generate a 
                comprehensive risk assessment based on UK AML regulations.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
            <button
              onClick={() => setStep('search')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
            >
              Back to Search
            </button>
            <button
              onClick={handleCreateManualClient}
              disabled={isCreating || !manualForm.companyName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Client...
                </>
              ) : (
                <>
                  Create Client
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Confirm Details */}
      {step === 'confirm' && selectedCompany && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Confirm Company Details</h2>
            <p className="text-gray-600 mt-1">
              Review the information below before creating the client
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Company Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Company Information
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedCompany.company.companyName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedCompany.company.companyNumber}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedCompany.company.companyType}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Incorporation Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(selectedCompany.company.dateOfCreation).toLocaleDateString('en-GB')}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Registered Address</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {selectedCompany.company.registeredOfficeAddress.addressLine1}
                    {selectedCompany.company.registeredOfficeAddress.addressLine2 && (
                      <>, {selectedCompany.company.registeredOfficeAddress.addressLine2}</>
                    )}
                    , {selectedCompany.company.registeredOfficeAddress.city}
                    , {selectedCompany.company.registeredOfficeAddress.postcode}
                    , {selectedCompany.company.registeredOfficeAddress.country}
                  </dd>
                </div>
                {selectedCompany.company.sicCodes.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">SIC Codes</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <ul className="list-disc list-inside">
                        {selectedCompany.company.sicDescriptions.map((sic) => (
                          <li key={sic.code}>
                            {sic.code} - {sic.description}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Officers */}
            {selectedCompany.officers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Officers ({selectedCompany.officers.length})
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="space-y-2">
                    {selectedCompany.officers.slice(0, 3).map((officer, index) => (
                      <li key={index} className="text-sm text-gray-900">
                        <span className="font-medium">{officer.name}</span>
                        <span className="text-gray-500"> - {officer.role}</span>
                      </li>
                    ))}
                    {selectedCompany.officers.length > 3 && (
                      <li className="text-sm text-gray-500">
                        +{selectedCompany.officers.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* PSCs */}
            {selectedCompany.pscs.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Persons with Significant Control ({selectedCompany.pscs.length})
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="space-y-2">
                    {selectedCompany.pscs.slice(0, 3).map((psc, index) => (
                      <li key={index} className="text-sm text-gray-900">
                        <span className="font-medium">{psc.name}</span>
                        <span className="text-gray-500">
                          {' '}
                          - {psc.natureOfControl?.slice(0, 2).join(', ')}
                          {psc.natureOfControl && psc.natureOfControl.length > 2 && '...'}
                        </span>
                      </li>
                    ))}
                    {selectedCompany.pscs.length > 3 && (
                      <li className="text-sm text-gray-500">
                        +{selectedCompany.pscs.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* AI Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>AI-Powered Risk Assessment:</strong> Once you create this client, 
                our AI will automatically analyze the company information and generate a 
                comprehensive risk assessment based on UK AML regulations.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
            <button
              onClick={() => setStep('search')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
            >
              Back to Search
            </button>
            <button
              onClick={handleCreateClient}
              disabled={isCreating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Client...
                </>
              ) : (
                <>
                  Create Client
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
