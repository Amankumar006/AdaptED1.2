import React from 'react';

const SettingsPage: React.FC = () => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">⚙️</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Account Settings
          </h3>
          <p className="text-gray-500 mb-6">
            Settings and preferences management coming soon.
          </p>
          <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
            Manage Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;