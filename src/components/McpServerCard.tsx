import React, { useState } from 'react';
import { Copy, ExternalLink, Code, Database, Globe, Search, File, Server, Plus, Check, X } from 'lucide-react';
import { McpServer } from '@/types';

interface McpServerCardProps {
  server: McpServer;
  sessionId?: string;
  isInSession?: boolean;
  onAddToSession?: (server: McpServer) => Promise<void>;
  onRemoveFromSession?: (serverId: string) => Promise<void>;
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'database':
    case 'databases':
      return <Database size={14} className="text-black" />;
    case 'search':
      return <Search size={14} className="text-black" />;
    case 'file management':
      return <File size={14} className="text-black" />;
    case 'http':
      return <Globe size={14} className="text-black" />;
    case 'version control':
      return <Code size={14} className="text-black" />;
    case 'browser automation':
    case 'web scraping':
      return <Globe size={14} className="text-black" />;
    case 'documentation':
    case 'content management':
      return <File size={14} className="text-black" />;
    default:
      return <Server size={14} className="text-gray-600" />;
  }
};

const getQualityBadge = (score?: string) => {
  if (!score) return null;
  
  return (
    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium border bg-gray-100 text-black border-gray-200">
      {score}
    </span>
  );
};

export default function McpServerCard({ 
  server, 
  sessionId, 
  isInSession = false, 
  onAddToSession, 
  onRemoveFromSession 
}: McpServerCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const copyInstallCommand = async () => {
    try {
      await navigator.clipboard.writeText(server.install_command);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAddToSession = async () => {
    if (!onAddToSession) return;
    setIsLoading(true);
    try {
      await onAddToSession(server);
    } catch (error) {
      console.error('Failed to add server to session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromSession = async () => {
    if (!onRemoveFromSession) return;
    setIsLoading(true);
    try {
      await onRemoveFromSession(server.id);
    } catch (error) {
      console.error('Failed to remove server from session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`group border rounded-xl p-3 transition-all duration-200 hover:shadow-md ${
      isInSession 
        ? 'border-black bg-gray-50' 
        : 'border-gray-200 bg-white shadow-sm hover:border-gray-300'
    }`}>
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {getCategoryIcon(server.category)}
          <h3 className="text-sm font-semibold text-black truncate">{server.name}</h3>
          <span className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-md whitespace-nowrap font-medium">
            {server.category}
          </span>
        </div>
        
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          {server.metadata?.quality_score && getQualityBadge(server.metadata.quality_score)}
          
          {server.metadata?.is_glama_server && (
            <span className="text-xs bg-gray-100 text-black px-1.5 py-0.5 rounded-md font-medium border border-gray-200">
              Glama
            </span>
          )}
          
          {sessionId && (
            <button
              onClick={isInSession ? handleRemoveFromSession : handleAddToSession}
              disabled={isLoading}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                isInSession 
                  ? 'bg-gray-200 text-black hover:bg-gray-300 border border-gray-300' 
                  : 'bg-black text-white hover:bg-gray-800 border border-black'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isInSession ? 'Remove from session' : 'Add to session'}
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isInSession ? (
                <X size={14} />
              ) : (
                <Plus size={14} />
              )}
            </button>
          )}
          
          {server.metadata?.source && (
            <a 
              href={server.metadata.source} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all duration-200"
              title="View source code"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {isInSession && (
        <div className="mb-2.5 flex items-center space-x-1.5 text-xs text-black bg-gray-100 px-2 py-1 rounded-lg">
          <Check size={12} />
          <span className="font-medium">Active in session</span>
        </div>
      )}
      
      <p className="text-xs text-gray-600 mb-3 leading-relaxed">{server.description}</p>
      
      {/* Metadata row */}
      {(server.metadata?.stars || server.metadata?.language || server.metadata?.license) && (
        <div className="flex items-center space-x-3 mb-3 text-xs text-gray-500">
          {server.metadata?.stars && (
            <span className="flex items-center space-x-1">
              <span className="text-black">⭐</span>
              <span className="font-medium">{server.metadata.stars.toLocaleString()}</span>
            </span>
          )}
          {server.metadata?.language && (
            <span className="bg-gray-100 text-black px-1.5 py-0.5 rounded-md font-medium">
              {server.metadata.language}
            </span>
          )}
          {server.metadata?.license && (
            <span className="text-gray-500">{server.metadata.license}</span>
          )}
        </div>
      )}
      
      <div className="mb-3">
        <p className="text-xs text-gray-600 mb-1.5 font-medium">Available Tools:</p>
        <div className="flex flex-wrap gap-1">
          {server.tools.slice(0, 4).map((tool, index) => (
            <span 
              key={index}
              className="text-xs bg-gray-100 text-black px-2 py-0.5 rounded-md font-medium border border-gray-200"
            >
              {tool}
            </span>
          ))}
          {server.tools.length > 4 && (
            <span className="text-xs text-gray-400 px-2 py-0.5">
              +{server.tools.length - 4} more
            </span>
          )}
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-gray-600 font-medium">Install Command:</p>
          <button
            onClick={copyInstallCommand}
            className="p-1 text-gray-400 hover:text-black hover:bg-white rounded transition-all duration-200"
            title="Copy install command"
          >
            {copySuccess ? (
              <Check size={12} className="text-black" />
            ) : (
              <Copy size={12} />
            )}
          </button>
        </div>
        <code className="text-xs text-black bg-white px-2 py-1.5 rounded border border-gray-200 block font-mono break-all">
          {server.install_command}
        </code>
        {copySuccess && (
          <p className="text-xs text-black mt-1 font-medium">Copied to clipboard!</p>
        )}
      </div>
    </div>
  );
} 