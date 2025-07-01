import React, { useState, useEffect } from 'react';
import { Play, Loader2, CheckCircle, XCircle, Database, Github, FileText, Globe } from 'lucide-react';

interface McpTool {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
}

interface ConfiguredServer {
  id: string;
  session_id: string;
  server_id: string;
  server_name: string;
  is_configured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface McpToolExecutorProps {
  sessionId: string;
}

const getServerIcon = (serverId: string) => {
  switch (serverId) {
    case 'notion-mcp':
      return <FileText size={16} className="text-black" />;
    case 'supabase-mcp':
      return <Database size={16} className="text-green-600" />;
    case 'github-mcp':
      return <Github size={16} className="text-gray-800" />;
    case 'google-news-mcp':
      return <Globe size={16} className="text-blue-600" />;
    default:
      return <Database size={16} className="text-gray-600" />;
  }
};

const getServerTools = (serverId: string): McpTool[] => {
  const toolsMap: Record<string, McpTool[]> = {
    'notion-mcp': [
      {
        name: 'search_notion',
        description: 'Search for pages in Notion workspace',
        parameters: [
          { name: 'query', type: 'string', required: true, description: 'Search query' },
          { name: 'limit', type: 'number', required: false, description: 'Maximum results (default: 10)' }
        ]
      },
      {
        name: 'create_page',
        description: 'Create a new page in Notion',
        parameters: [
          { name: 'title', type: 'string', required: true, description: 'Page title' },
          { name: 'content', type: 'string', required: false, description: 'Page content' }
        ]
      }
    ],
    'supabase-mcp': [
      {
        name: 'query_db',
        description: 'Execute SQL query on Supabase database',
        parameters: [
          { name: 'table', type: 'string', required: true, description: 'Table name' },
          { name: 'limit', type: 'number', required: false, description: 'Limit results (default: 10)' }
        ]
      },
      {
        name: 'create_record',
        description: 'Create a new record in table',
        parameters: [
          { name: 'table', type: 'string', required: true, description: 'Table name' },
          { name: 'data', type: 'object', required: true, description: 'Record data as JSON' }
        ]
      }
    ],
    'github-mcp': [
      {
        name: 'search_code',
        description: 'Search code in repository',
        parameters: [
          { name: 'query', type: 'string', required: true, description: 'Search query' },
          { name: 'language', type: 'string', required: false, description: 'Programming language filter' }
        ]
      },
      {
        name: 'create_issue',
        description: 'Create a new GitHub issue',
        parameters: [
          { name: 'title', type: 'string', required: true, description: 'Issue title' },
          { name: 'body', type: 'string', required: false, description: 'Issue description' }
        ]
      }
    ],
    'google-news-mcp': [
      {
        name: 'google_news_search',
        description: 'Search Google News for articles',
        parameters: [
          { name: 'query', type: 'string', required: true, description: 'Search query' },
          { name: 'language', type: 'string', required: false, description: 'Language code (e.g., en, es)' }
        ]
      }
    ]
  };

  return toolsMap[serverId] || [];
};

export default function McpToolExecutor({ sessionId }: McpToolExecutorProps) {
  const [configuredServers, setConfiguredServers] = useState<ConfiguredServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [toolParameters, setToolParameters] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfiguredServers();
  }, [sessionId]);

  const loadConfiguredServers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/chat/${sessionId}/servers/configured`);
      const data = await response.json();
      setConfiguredServers(data.servers || []);
      
      if (data.servers?.length > 0) {
        setSelectedServer(data.servers[0].server_id);
      }
    } catch (error) {
      console.error('Failed to load configured servers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedServerTools = selectedServer ? getServerTools(selectedServer) : [];

  const handleParameterChange = (paramName: string, value: any) => {
    setToolParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const executeTool = async () => {
    if (!selectedServer || !selectedTool) return;

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const response = await fetch(
        `http://localhost:3001/chat/${sessionId}/servers/${selectedServer}/tools/${selectedTool}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(toolParameters),
        }
      );

      const result = await response.json();
      setExecutionResult(result);
    } catch (error) {
      setExecutionResult({
        success: false,
        error: 'Failed to execute tool: ' + (error instanceof Error ? error.message : String(error))
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const selectedToolInfo = selectedServerTools.find(tool => tool.name === selectedTool);

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading configured servers...</span>
        </div>
      </div>
    );
  }

  if (configuredServers.length === 0) {
    return (
      <div className="p-6 bg-white rounded-xl border border-gray-200">
        <div className="text-center py-8">
          <Database size={32} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Configured Servers</h3>
          <p className="text-gray-500 text-sm">
            Add and configure MCP servers through the chat interface to start using tools.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-black mb-2">MCP Tool Executor</h2>
        <p className="text-sm text-gray-600">Execute MCP server tools with your configured credentials.</p>
      </div>

      {/* Server Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Server</label>
        <select
          value={selectedServer}
          onChange={(e) => {
            setSelectedServer(e.target.value);
            setSelectedTool('');
            setToolParameters({});
            setExecutionResult(null);
          }}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
        >
          {configuredServers.map((server) => (
            <option key={server.server_id} value={server.server_id}>
              {server.server_name}
            </option>
          ))}
        </select>
      </div>

      {/* Tool Selection */}
      {selectedServer && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Tool</label>
          <select
            value={selectedTool}
            onChange={(e) => {
              setSelectedTool(e.target.value);
              setToolParameters({});
              setExecutionResult(null);
            }}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="">Choose a tool...</option>
            {selectedServerTools.map((tool) => (
              <option key={tool.name} value={tool.name}>
                {tool.name} - {tool.description}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tool Parameters */}
      {selectedTool && selectedToolInfo && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Tool Parameters</h3>
          <div className="space-y-3">
            {selectedToolInfo.parameters.map((param) => (
              <div key={param.name}>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  {param.name}
                  {param.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type={param.type === 'number' ? 'number' : 'text'}
                  value={toolParameters[param.name] || ''}
                  onChange={(e) => handleParameterChange(param.name, e.target.value)}
                  placeholder={param.description}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">{param.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execute Button */}
      {selectedTool && (
        <button
          onClick={executeTool}
          disabled={isExecuting}
          className="w-full flex items-center justify-center space-x-2 bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExecuting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Executing...</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>Execute Tool</span>
            </>
          )}
        </button>
      )}

      {/* Execution Result */}
      {executionResult && (
        <div className="mt-6">
          <div className="flex items-center space-x-2 mb-3">
            {executionResult.success ? (
              <CheckCircle size={18} className="text-green-600" />
            ) : (
              <XCircle size={18} className="text-red-600" />
            )}
            <h3 className="text-sm font-medium text-gray-700">
              Execution {executionResult.success ? 'Successful' : 'Failed'}
            </h3>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border">
            <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(executionResult, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 