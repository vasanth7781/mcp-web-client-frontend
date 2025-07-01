import React, { useState } from 'react';
import { X, Key, Database, Github, FileText, Globe, Loader2, Check, AlertCircle } from 'lucide-react';

interface CredentialField {
  name: string;
  type: 'text' | 'password' | 'url';
  label: string;
  placeholder?: string;
  required: boolean;
  help?: string;
}

interface McpCredentialRequirement {
  server_id: string;
  server_name: string;
  required_fields: CredentialField[];
}

interface McpCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  credentialRequirements: McpCredentialRequirement;
  onCredentialsSubmitted: (success: boolean, message: string, serverId?: string) => void;
}

const getServerIcon = (serverId: string) => {
  switch (serverId) {
    case 'notion-mcp':
      return <FileText size={18} className="text-black" />;
    case 'supabase-mcp':
      return <Database size={18} className="text-green-600" />;
    case 'github-mcp':
      return <Github size={18} className="text-gray-800" />;
    case 'google-news-mcp':
      return <Globe size={18} className="text-blue-600" />;
    default:
      return <Key size={18} className="text-gray-600" />;
  }
};

export default function McpCredentialModal({
  isOpen,
  onClose,
  sessionId,
  credentialRequirements,
  onCredentialsSubmitted,
}: McpCredentialModalProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleInputChange = (fieldName: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    credentialRequirements.required_fields.forEach(field => {
      if (field.required && !credentials[field.name]?.trim()) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `http://localhost:3001/chat/${sessionId}/servers/${credentialRequirements.server_id}/credentials`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        }
      );

      const result = await response.json();

      if (result.success) {
        onCredentialsSubmitted(true, result.message, credentialRequirements.server_id);
        onClose();
      } else {
        onCredentialsSubmitted(false, result.message, credentialRequirements.server_id);
      }
    } catch (error) {
      onCredentialsSubmitted(false, 'Failed to save credentials. Please try again.', credentialRequirements.server_id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInputType = (fieldType: string) => {
    switch (fieldType) {
      case 'password':
        return 'password';
      case 'url':
        return 'url';
      default:
        return 'text';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center space-x-3">
            {getServerIcon(credentialRequirements.server_id)}
            <div>
              <h2 className="text-sm font-semibold text-black">Configure Credentials</h2>
              <p className="text-xs text-gray-600">{credentialRequirements.server_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            <div className="mb-3">
              <p className="text-xs text-gray-600">
                Please provide the required credentials to enable MCP tool functionality.
              </p>
            </div>

            {credentialRequirements.required_fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                <input
                  type={getInputType(field.type)}
                  value={credentials[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                    errors[field.name] 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  disabled={isSubmitting}
                />
                
                {field.help && (
                  <p className="text-xs text-gray-500">{field.help}</p>
                )}
                
                {errors[field.name] && (
                  <div className="flex items-center space-x-1 text-red-600 text-xs">
                    <AlertCircle size={12} />
                    <span>{errors[field.name]}</span>
                  </div>
                )}
              </div>
            ))}

            {/* Help Text */}
            <div className="bg-gray-50 rounded-lg p-3 mt-4">
              <h4 className="text-xs font-medium text-gray-700 mb-1.5">🔒 Security Note</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Your credentials are encrypted and stored securely. They're only used to authenticate 
                with the MCP server for your session.
              </p>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-gray-100">
          <div className="flex space-x-3 p-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-xs font-medium bg-black text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Configuring...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Save & Test Connection</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 