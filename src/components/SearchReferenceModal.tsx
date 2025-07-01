'use client';

import React from 'react';
import { X, Search, FileText, Globe, Terminal, Code, Database, GitBranch, Settings } from 'lucide-react';

interface SearchReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchReferenceModal({ isOpen, onClose }: SearchReferenceModalProps) {
  if (!isOpen) return null;

  const searchMethods = [
    {
      icon: <Search className="text-blue-500" size={20} />,
      title: "Server Name Search",
      description: "Search for specific MCP servers by name",
      examples: [
        "postgres",
        "supabase server", 
        "notion mcp",
        "github integration"
      ]
    },
    {
      icon: <Database className="text-green-500" size={20} />,
      title: "Functionality Search",
      description: "Find servers by what they do",
      examples: [
        "database operations",
        "web scraping tools",
        "file management",
        "version control"
      ]
    },
    {
      icon: <Globe className="text-purple-500" size={20} />,
      title: "Direct API URLs",
      description: "Paste URLs for immediate server details",
      examples: [
        "https://glama.ai/api/mcp/v1/servers/...",
        "https://github.com/user/mcp-server",
        "npm package URLs"
      ]
    },
    {
      icon: <Terminal className="text-orange-500" size={20} />,
      title: "Curl Commands",
      description: "Execute API calls directly",
      examples: [
        "curl -X GET 'https://glama.ai/api/...'",
        "API endpoint calls",
        "Direct data fetching"
      ]
    }
  ];

  const mcpFormats = [
    {
      icon: <FileText className="text-blue-600" size={20} />,
      title: "Claude Desktop Format",
      description: "Standard MCP configuration",
      example: `{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["@joshuarileydev/supabase-mcp-server"],
      "env": {
        "SUPABASE_API_KEY": "your-key",
        "SUPABASE_URL": "https://project.supabase.co"
      }
    }
  }
}`
    },
    {
      icon: <Code className="text-green-600" size={20} />,
      title: "Multi-Server Configuration",
      description: "Configure multiple servers at once",
      example: `{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["@dynamicendpoints/postgres-mcp"],
      "env": { "POSTGRES_CONNECTION_STRING": "..." }
    },
    "github": {
      "command": "npx", 
      "args": ["@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "..." }
    }
  }
}`
    },
    {
      icon: <Settings className="text-purple-600" size={20} />,
      title: "Simplified Format",
      description: "Minimal server definition",
      example: `{
  "name": "notion",
  "package": "@notionhq/notion-mcp-server",
  "environment": {
    "NOTION_API_KEY": "Your API key"
  },
  "description": "Notion integration server"
}`
    }
  ];

  const installationMethods = [
    {
      title: "NPM/NPX (Most Common)",
      command: "npx @package/mcp-server",
      description: "Install and run npm packages directly"
    },
    {
      title: "Global Installation",
      command: "npm install -g @package/mcp-server",
      description: "Install globally for reuse"
    },
    {
      title: "Local Development",
      command: "node dist/index.js",
      description: "Run locally built servers"
    },
    {
      title: "Python Servers",
      command: "python -m mcp_server_package",
      description: "Execute Python-based MCP servers"
    },
    {
      title: "Docker Containers",
      command: "docker run --rm -i mcp-server:latest",
      description: "Run containerized servers"
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">MCP Search & Configuration Guide</h2>
              <p className="text-gray-600 mt-1">Complete reference for finding and configuring MCP servers</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Search Methods */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Search className="mr-2 text-blue-600" size={24} />
              Search Methods
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {searchMethods.map((method, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    {method.icon}
                    <h4 className="font-semibold text-gray-900">{method.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{method.description}</p>
                  <div className="space-y-1">
                    {method.examples.map((example, idx) => (
                      <div key={idx} className="text-xs bg-white px-2 py-1 rounded border font-mono">
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* MCP JSON Formats */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="mr-2 text-green-600" size={24} />
              Supported MCP JSON Formats
            </h3>
            <div className="space-y-4">
              {mcpFormats.map((format, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    {format.icon}
                    <h4 className="font-semibold text-gray-900">{format.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{format.description}</p>
                  <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                    <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
                      {format.example}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Installation Methods */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Terminal className="mr-2 text-purple-600" size={24} />
              Installation Methods
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {installationMethods.map((method, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">{method.title}</h4>
                  <div className="bg-gray-900 rounded-lg p-2 mb-2">
                    <code className="text-green-400 text-xs font-mono">{method.command}</code>
                  </div>
                  <p className="text-xs text-gray-600">{method.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Pro Tips */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <GitBranch className="mr-2 text-orange-600" size={24} />
              Pro Tips
            </h3>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Search Tips</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Be specific about your use case</li>
                    <li>• Combine functionality keywords</li>
                    <li>• Try different search variations</li>
                    <li>• Use natural language descriptions</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Configuration Tips</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Always set required environment variables</li>
                    <li>• Test configurations before deployment</li>
                    <li>• Use descriptive server names</li>
                    <li>• Document custom configurations</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Examples */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Start Examples</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Database Integration</h4>
                <p className="text-sm text-blue-800 mb-2">Try saying:</p>
                <div className="bg-white rounded p-2 text-sm font-mono text-blue-900">
                  "I need PostgreSQL database tools"
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">Web Automation</h4>
                <p className="text-sm text-green-800 mb-2">Try saying:</p>
                <div className="bg-white rounded p-2 text-sm font-mono text-green-900">
                  "Show me web scraping servers"
                </div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-2">Direct API Access</h4>
                <p className="text-sm text-purple-800 mb-2">Paste URLs like:</p>
                <div className="bg-white rounded p-2 text-xs font-mono text-purple-900 break-all">
                  https://glama.ai/api/mcp/v1/servers/...
                </div>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <h4 className="font-semibold text-orange-900 mb-2">MCP Configuration</h4>
                <p className="text-sm text-orange-800 mb-2">Paste JSON like:</p>
                <div className="bg-white rounded p-2 text-xs font-mono text-orange-900">
                  {"{ \"mcpServers\": { ... } }"}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-2xl">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need help? Just ask in the chat! I can assist with specific configurations and troubleshooting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 