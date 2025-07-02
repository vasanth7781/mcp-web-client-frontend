'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Server, CheckCircle, Settings, Bot, User, Search, HelpCircle, Book, Zap, Database, Globe, GitBranch, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import McpCredentialModal from './McpCredentialModal';
import SearchReferenceModal from './SearchReferenceModal';
import MarkdownJSX from 'markdown-to-jsx';

interface McpServer {
  id: string;
  name: string;
  description: string;
  category: string;
  install_command: string;
  tools: string[];
  metadata?: {
    quality_score?: string;
    stars?: number;
  };
}

interface FunctionCall {
  type: string;
  function_name: string;
  function_args: any;
  function_result: any;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  functionCalls?: FunctionCall[];
}

interface SessionServer {
  sessionId: string;
  serverId: string;
  serverName: string;
  installedAt: string;
  isActive: boolean;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(`session-${Date.now()}`); // Default fallback
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [credentialRequirements, setCredentialRequirements] = useState<any>(null);
  const [sessionServers, setSessionServers] = useState<SessionServer[]>([]);
  const [showSessionPanel, setShowSessionPanel] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [pendingFunctionCalls, setPendingFunctionCalls] = useState<FunctionCall[]>([]);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [isProcessingFunctions, setIsProcessingFunctions] = useState(false);
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize sessionId from localStorage on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try to get existing sessionId from localStorage, or create new one
      const existingSessionId = localStorage.getItem('mcp-chat-session-id');
      if (existingSessionId) {
        setSessionId(existingSessionId);
      } else {
        const newSessionId = `session-${Date.now()}`;
        localStorage.setItem('mcp-chat-session-id', newSessionId);
        setSessionId(newSessionId);
      }
    }
  }, []);

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isProcessingFunctions) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add to conversation history
    setConversationHistory(prev => [...prev, {
      role: 'user',
      content: input
    }]);

    try {
      const response = await fetch(`http://localhost:3001/chat/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      await processStreamingResponse(response.body, true);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-error`,
        content: 'Sorry, there was an error processing your request.',
        sender: 'assistant',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const processStreamingResponse = async (responseBody: ReadableStream<Uint8Array>, isInitialMessage: boolean = false) => {
    const reader = responseBody.getReader();
    const decoder = new TextDecoder();
    
    let assistantMessage: Message = {
      id: `msg-${Date.now()}-assistant`,
      content: '',
      sender: 'assistant',
      timestamp: new Date(),
      functionCalls: [],
    };

    let currentFunctionCalls: FunctionCall[] = [];
    let textContent = '';

    setMessages(prev => [...prev, assistantMessage]);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // Only process function calls that should continue the conversation
              // Don't auto-process recommendation function calls - wait for user action
              // Don't auto-process final function calls - they terminate the flow
              const shouldProcessFunctionResults = currentFunctionCalls.some(fc => 
                fc.function_result?.type !== 'mcp_recommendations' &&
                fc.function_result?.requires_user_action !== true &&
                fc.function_result?.is_final !== true
              );

              if (shouldProcessFunctionResults && currentFunctionCalls.length > 0) {
                await processFunctionCallResults(currentFunctionCalls, textContent);
              }
              return;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'text') {
                textContent += parsed.content;
                assistantMessage.content += parsed.content;
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: assistantMessage.content }
                    : msg
                ));
              } else if (parsed.type === 'function_call') {
                const functionCall: FunctionCall = {
                  type: 'function_call',
                  function_name: parsed.function_name,
                  function_args: parsed.function_args,
                  function_result: parsed.function_result,
                };
                
                currentFunctionCalls.push(functionCall);
                assistantMessage.functionCalls = [...(assistantMessage.functionCalls || []), functionCall];
                
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, functionCalls: assistantMessage.functionCalls }
                    : msg
                ));
              }
            } catch (e) {
              // Ignore parsing errors for malformed chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing stream:', error);
    }
  };

  const processFunctionCallResults = async (functionCalls: FunctionCall[], textContent: string) => {
    if (functionCalls.length === 0) return;

    setIsProcessingFunctions(true);

    // Update conversation history with assistant response
    const assistantHistoryItem = {
      role: 'assistant',
      text_content: textContent,
      function_calls: functionCalls.map(fc => ({
        id: `${fc.function_name}-${Date.now()}`,
        function_name: fc.function_name,
        function_args: fc.function_args,
        function_result: fc.function_result
      }))
    };

    const updatedHistory = [...conversationHistory, assistantHistoryItem];
    setConversationHistory(updatedHistory);

    // Prepare function results for backend
    const functionResults = functionCalls.map(fc => ({
      id: `${fc.function_name}-${Date.now()}`,
      function_name: fc.function_name,
      function_args: fc.function_args,
      result: fc.function_result
    }));

    try {
      const response = await fetch(`http://localhost:3001/chat/${sessionId}/function-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function_results: functionResults,
          conversation_history: updatedHistory
        }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      await processStreamingResponse(response.body, false);
    } catch (error) {
      console.error('Error processing function results:', error);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-error`,
        content: 'Sorry, there was an error processing the function results.',
        sender: 'assistant',
        timestamp: new Date(),
      }]);
    } finally {
      setIsProcessingFunctions(false);
    }
  };

  const handleAddServer = async (serverId: string, serverName: string) => {
    try {
      // Check if server requires credentials
      const response = await fetch(`http://localhost:3001/chat/${sessionId}/servers/${serverId}/credentials/requirements`);
      const data = await response.json();
      
      if (data.credential_requirements && data.credential_requirements.length > 0) {
        setCredentialRequirements({
          server_id: serverId,
          server_name: serverName,
          required_fields: data.credential_requirements
        });
        setShowCredentialModal(true);
      } else {
        // Server doesn't need credentials, add directly
        const addResponse = await fetch(`http://localhost:3001/chat/${sessionId}/servers/${serverId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ server_name: serverName })
        });
        
        const addResult = await addResponse.json();
        
        // Update session servers with a small delay to ensure backend processing is complete
        setTimeout(() => {
          loadSessionServers();
        }, 100);
        setStatusMessage(`✅ Added ${serverName} to your session!`);
        setTimeout(() => setStatusMessage(''), 3000);

        // Trigger function results continuation after successful server addition
        try {
          const continuationResponse = await fetch(`http://localhost:3001/chat/${sessionId}/function-results`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              function_results: [{
                id: `server-added-${Date.now()}`,
                function_name: 'add_server_to_session',
                function_result: {
                  type: 'server_added_success',
                  server_id: serverId,
                  server_name: serverName,
                  message: `Successfully added ${serverName} to session`,
                  success: true,
                  ...addResult
                }
              }],
              conversation_history: conversationHistory
            }),
          });

          if (continuationResponse.body) {
            await processStreamingResponse(continuationResponse.body, false);
          }
        } catch (error) {
          console.error('Error continuing conversation after server addition:', error);
        }
      }
    } catch (error) {
      console.error('Error adding server:', error);
      setStatusMessage('❌ Failed to add server');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleCredentialsSubmitted = async (success: boolean, message: string, serverId?: string) => {
    setShowCredentialModal(false);
    setCredentialRequirements(null);
    setStatusMessage(success ? `✅ ${message}` : `❌ ${message}`);
    setTimeout(() => setStatusMessage(''), 5000);
    
    if (success && serverId) {
      // Wait a moment for backend to process, then refresh session
      setTimeout(() => {
        loadSessionServers();
      }, 1000);
      
      // // Send a simple completion message instead of triggering more function calls
      // const completionMessage: Message = {
      //   id: `msg-${Date.now()}-completion`,
      //   content: `✅ **${serverId} is now active!**\n\nYour server is running and ready to use. You can now:\n- View active tools\n- Execute MCP commands\n- Manage your session\n\nTry asking: "What tools are available?" or "Show me the session status"`,
      //   sender: 'assistant',
      //   timestamp: new Date(),
      // };
      
      // setMessages(prev => [...prev, completionMessage]);
    }
  };

  const handleExecuteTool = async (serverId: string, toolName: string, parameters: any = {}) => {
    try {
      // Add a loading message to indicate tool execution started
      const loadingMessage: Message = {
        id: `msg-${Date.now()}-tool-loading`,
        content: `🔧 Executing \`${toolName}\` on \`${serverId}\`...`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, loadingMessage]);
      
      const response = await fetch(`http://localhost:3001/chat/${sessionId}/servers/${serverId}/tools/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters })
      });
      
      if (!response.body) {
        throw new Error('No response body');
      }

      // Remove the loading message and process streaming response
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id));
      
      // Handle streaming response similar to sendMessage
      await processToolExecutionStream(response.body, serverId, toolName);
      
    } catch (error) {
      console.error('Error executing tool:', error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-tool-error`,
        content: `❌ Error executing \`${toolName}\`: ${error instanceof Error ? error.message : String(error)}`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const processToolExecutionStream = async (responseBody: ReadableStream<Uint8Array>, serverId: string, toolName: string) => {
    const reader = responseBody.getReader();
    const decoder = new TextDecoder();
    
    let toolExecutionMessage: Message = {
      id: `msg-${Date.now()}-tool-result`,
      content: '',
      sender: 'assistant',
      timestamp: new Date(),
    };

    let hasExecutionResult = false;
    let hasAiAnalysis = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'tool_execution_result') {
                // Display tool execution result
                const resultMessage = `🔧 **Tool Execution Result: \`${toolName}\`**\n\n`;
                const statusMessage = parsed.result.success 
                  ? `✅ **Status**: ${parsed.result.message}\n`
                  : `❌ **Status**: ${parsed.result.message}\n`;
                
                const detailsMessage = `**Execution Time**: ${parsed.result.execution_time}ms\n\n`;
                
                let resultContent = '';
                if (parsed.result.result && Array.isArray(parsed.result.result)) {
                  resultContent = `**Results** (${parsed.result.result.length} items):\n\`\`\`json\n${JSON.stringify(parsed.result.result, null, 2)}\n\`\`\`\n\n`;
                } else if (parsed.result.result) {
                  resultContent = `**Result**:\n\`\`\`json\n${JSON.stringify(parsed.result.result, null, 2)}\n\`\`\`\n\n`;
                }

                toolExecutionMessage.content = resultMessage + statusMessage + detailsMessage + resultContent;
                
                if (!hasExecutionResult) {
                  setMessages(prev => [...prev, toolExecutionMessage]);
                  hasExecutionResult = true;
                } else {
                  setMessages(prev => prev.map(msg => 
                    msg.id === toolExecutionMessage.id 
                      ? { ...msg, content: toolExecutionMessage.content }
                      : msg
                  ));
                }
              } else if (parsed.type === 'ai_analysis') {
                // Add AI analysis as separate content
                if (hasExecutionResult) {
                  // Update the existing message with AI analysis
                  const analysisContent = `\n---\n\n🤖 **AI Analysis**:\n\n${parsed.content}`;
                  toolExecutionMessage.content += analysisContent;
                  
                  setMessages(prev => prev.map(msg => 
                    msg.id === toolExecutionMessage.id 
                      ? { ...msg, content: toolExecutionMessage.content }
                      : msg
                  ));
                } else {
                  // Create new message with just AI analysis if execution result wasn't captured
                  const analysisMessage: Message = {
                    id: `msg-${Date.now()}-ai-analysis`,
                    content: `🤖 **AI Analysis of \`${toolName}\` execution**:\n\n${parsed.content}`,
                    sender: 'assistant',
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, analysisMessage]);
                }
                hasAiAnalysis = true;
              }
            } catch (e) {
              // Ignore parsing errors for malformed chunks
              console.warn('Failed to parse streaming chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing tool execution stream:', error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-stream-error`,
        content: `❌ Error processing tool execution results: ${error instanceof Error ? error.message : String(error)}`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const loadSessionServers = async () => {
    try {
      console.log(`Loading session servers for session: ${sessionId}`);
      const response = await fetch(`http://localhost:3001/chat/${sessionId}/servers`);
      const data = await response.json();
      console.log('Session servers response:', data);
      setSessionServers(data.servers || []);
      console.log('Updated session servers state:', data.servers || []);
    } catch (error) {
      console.error('Failed to load session servers:', error);
    }
  };

  useEffect(() => {
    loadSessionServers();
  }, [sessionId]);

  const toggleFunctionExpansion = (functionId: string) => {
    setExpandedFunctions(prev => {
      const newSet = new Set(prev);
      // For all function calls, toggle the "collapsed" state (default to expanded)
      const collapsedId = `collapsed-${functionId}`;
      if (newSet.has(collapsedId)) {
        newSet.delete(collapsedId);
      } else {
        newSet.add(collapsedId);
      }
      return newSet;
    });
  };

  const show_mcp_recommendations = (functionCall: FunctionCall) => {
    const functionId = `${functionCall.function_name}-${Date.now()}`;
    // For all function calls, default to expanded (open) unless explicitly collapsed
    const mcpFunctionTypes = ['mcp_recommendations', 'available_tools', 'tool_execution_result'];
    const isExpanded = mcpFunctionTypes.includes(functionCall.function_result?.type)
      ? !expandedFunctions.has(`collapsed-${functionId}`)
      : !expandedFunctions.has(`collapsed-${functionId}`);
    
    if (functionCall.function_result?.type === 'mcp_recommendations') {
      const servers = functionCall.function_result.recommendations || [];
      return (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div 
            className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded px-2 -mx-2"
            onClick={() => toggleFunctionExpansion(functionId)}
          >
            <div className="flex items-center space-x-2">
              <Server size={14} className="text-gray-600" />
              <span className="text-xs font-medium text-gray-900">Found {servers.length} MCP Servers</span>
            </div>
            {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
          </div>
          
          {isExpanded && (
            <div className="mt-3 space-y-3">
              {servers.map((server: McpServer) => (
                <div key={server.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-sm text-gray-900">{server.name}</h4>
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                          {server.category}
                        </span>
                        {server.metadata?.quality_score && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            {server.metadata.quality_score}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-3 leading-relaxed">{server.description}</p>
                      {server.tools && server.tools.length > 0 && (
                        <div className="mb-3">
                          <span className="text-xs font-medium text-gray-700">Tools: </span>
                          <span className="text-xs text-gray-600">{server.tools.slice(0, 3).join(', ')}</span>
                          {server.tools.length > 3 && <span className="text-xs text-gray-500"> +{server.tools.length - 3} more</span>}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddServer(server.id, server.name)}
                      className="ml-4 px-3 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-1"
                    >
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (functionCall.function_result?.type === 'session_status') {
      const result = functionCall.function_result;
      return (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div 
            className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded px-2 -mx-2"
            onClick={() => toggleFunctionExpansion(functionId)}
          >
            <div className="flex items-center space-x-2">
              <Settings size={14} className="text-gray-600" />
              <span className="text-xs font-medium text-gray-900">Session Status</span>
            </div>
            {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
          </div>
          
          {isExpanded && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Session ID:</span>
                  <span className="text-xs text-gray-600 font-mono">{result.session_id?.slice(-8)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Active Servers:</span>
                  <span className="text-xs text-gray-600">{result.total_servers}</span>
                </div>
                {result.servers && result.servers.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <span className="text-xs font-medium text-gray-700">Configured Servers:</span>
                    {result.servers.map((server: any, index: number) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-white rounded border">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-900 font-medium">{server.serverName}</span>
                        <span className="text-xs text-gray-500">({server.serverId})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (functionCall.function_result?.type === 'available_tools') {
      const result = functionCall.function_result;
      return (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div 
            className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded px-2 -mx-2"
            onClick={() => toggleFunctionExpansion(functionId)}
          >
            <div className="flex items-center space-x-2">
              <Zap size={14} className="text-gray-600" />
              <span className="text-xs font-medium text-gray-900">Available Tools ({result.tools})</span>
            </div>
            {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
          </div>
          
          {isExpanded && (
            <div className="mt-3 space-y-3">
              {result.servers?.map((server: any, serverIndex: number) => (
                <div key={serverIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-900">{server.server_name}</span>
                    <span className="text-xs text-gray-500">({server.tools?.length || 0} tools)</span>
                  </div>
                  {server.tools && server.tools.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {server.tools.map((tool: any, toolIndex: number) => {
                        // Handle both string and object tool formats
                        const toolName = typeof tool === 'string' ? tool : tool.name;
                        const toolDescription = typeof tool === 'string' ? tool : tool.description;
                        
                        return (
                          <button
                            key={toolIndex}
                            onClick={() => handleExecuteTool(server.server_id, toolName)}
                            className="bg-black text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors flex items-center space-x-2 group"
                            title={toolDescription}
                          >
                            <span>{toolName}</span>
                            <Zap size={12} className="opacity-70 group-hover:opacity-100" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No tools available</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (functionCall.function_result?.type === 'tool_execution_result') {
      const result = functionCall.function_result.result;
      return (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div 
            className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded px-2 -mx-2"
            onClick={() => toggleFunctionExpansion(functionId)}
          >
            <div className="flex items-center space-x-2">
              <Zap size={14} className="text-gray-600" />
              <span className="text-xs font-medium text-gray-900">EXECUTION RESULTS</span>
              <span className={`px-2 py-1 text-xs rounded ${result?.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {result?.success ? 'Success' : 'Failed'}
              </span>
            </div>
            {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
          </div>
          
          {isExpanded && result && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Status:</span>
                  <span className="text-xs text-gray-600">{result.message}</span>
                </div>
                {result.execution_time && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700">Execution Time:</span>
                    <span className="text-xs text-gray-600">{result.execution_time}ms</span>
                  </div>
                )}
                {result.result && (
                  <div className="mt-3">
                    <span className="text-xs font-medium text-gray-700 block mb-2">Result:</span>
                    <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto text-gray-800 leading-relaxed">
                      {typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Default function call rendering
    return (
      <div className="mt-4 border-t border-gray-100 pt-4">
        <div 
          className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded px-2 -mx-2"
          onClick={() => toggleFunctionExpansion(functionId)}
        >
          <div className="flex items-center space-x-2">
            <Settings size={14} className="text-gray-600" />
            <span className="text-xs font-medium text-gray-900">{functionCall.function_name}</span>
          </div>
          {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        </div>
        
        {isExpanded && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-3">
              {functionCall.function_args && Object.keys(functionCall.function_args).length > 0 && (
                <div>
                  <span className="text-xs font-medium text-gray-700 block mb-2">Arguments:</span>
                  <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto text-gray-800">
                    {JSON.stringify(functionCall.function_args, null, 2)}
                  </pre>
                </div>
              )}
              {functionCall.function_result && (
                <div>
                  <span className="text-xs font-medium text-gray-700 block mb-2">Result:</span>
                  <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto text-gray-800">
                    {JSON.stringify(functionCall.function_result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const SearchQueryGuide = () => (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="text-center space-y-3">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
          <Bot size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">MCP Chat Assistant</h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          Discover and integrate MCP (Model Context Protocol) servers for your projects. 
          I'll help you find the perfect tools and guide you through the setup process.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Bot className="text-blue-600" size={20} />
            <h3 className="font-semibold text-gray-900">🤖 Smart Tool Execution</h3>
            <span className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">NEW</span>
          </div>
                     <div className="bg-white rounded-lg p-3 mb-4">
             <p className="text-sm text-blue-800">
               <strong>Claude now executes tools automatically!</strong> No more clicking buttons - just ask for what you need and I'll execute the right tools immediately.
             </p>
             <p className="text-xs text-blue-700 mt-2">
               Try: "Query my database", "Search my files", "Create an issue" - I'll execute the tools and show results instantly!
             </p>
           </div>
          <div className="space-y-3">
                         <button
               onClick={() => handleSuggestionClick("Show me my database tables")}
               className="w-full text-left p-3 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-blue-200"
             >
               <div className="text-sm font-medium text-gray-900">🗄️ List Database Tables</div>
               <div className="text-xs text-gray-600">Instant database schema information</div>
             </button>
             <button
               onClick={() => handleSuggestionClick("Query my users table and show me the first 10 records")}
               className="w-full text-left p-3 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-blue-200"
             >
               <div className="text-sm font-medium text-gray-900">📊 Quick Data Query</div>
               <div className="text-xs text-gray-600">Execute SQL queries automatically</div>
             </button>
             <button
               onClick={() => handleSuggestionClick("Search for files containing 'API' in my project")}
               className="w-full text-left p-3 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-blue-200"
             >
               <div className="text-sm font-medium text-gray-900">📁 Find Files</div>
               <div className="text-xs text-gray-600">Search and locate files instantly</div>
             </button>
             <button
               onClick={() => handleSuggestionClick("Search for recent AI developments")}
               className="w-full text-left p-3 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-blue-200"
             >
               <div className="text-sm font-medium text-gray-900">📰 Web Search</div>
               <div className="text-xs text-gray-600">Get latest information from the web</div>
             </button>
          </div>
        </div>

        {/* Quick Start Examples */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Zap className="text-orange-500" size={20} />
            <h3 className="font-semibold text-gray-900">Quick Start Examples</h3>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => handleSuggestionClick("I need database tools for PostgreSQL and MySQL")}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <div className="text-sm font-medium text-gray-900">Database Management</div>
              <div className="text-xs text-gray-600">PostgreSQL, MySQL, Supabase tools</div>
            </button>
            <button
              onClick={() => handleSuggestionClick("Show me web scraping and browser automation tools")}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <div className="text-sm font-medium text-gray-900">Web Automation</div>
              <div className="text-xs text-gray-600">Puppeteer, scraping, browser control</div>
            </button>
            <button
              onClick={() => handleSuggestionClick("I want GitHub integration and version control tools")}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <div className="text-sm font-medium text-gray-900">Version Control</div>
              <div className="text-xs text-gray-600">GitHub, Git operations, repositories</div>
            </button>
            <button
              onClick={() => handleSuggestionClick("Help me with document and note management")}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <div className="text-sm font-medium text-gray-900">Document Tools</div>
              <div className="text-xs text-gray-600">Notion, notes, file management</div>
            </button>
          </div>
        </div>

        {/* Search Methods */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Search className="text-blue-500" size={20} />
            <h3 className="font-semibold text-gray-900">Search Methods</h3>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">By Server Name</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>• <code className="bg-gray-100 px-2 py-1 rounded">postgres</code></div>
                <div>• <code className="bg-gray-100 px-2 py-1 rounded">supabase server</code></div>
                <div>• <code className="bg-gray-100 px-2 py-1 rounded">notion mcp</code></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">By Functionality</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>• <code className="bg-gray-100 px-2 py-1 rounded">database operations</code></div>
                <div>• <code className="bg-gray-100 px-2 py-1 rounded">web scraping</code></div>
                <div>• <code className="bg-gray-100 px-2 py-1 rounded">file management</code></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Direct API URLs</h4>
              <div className="text-xs text-gray-600">
                Paste Glama API URLs, GitHub URLs, or curl commands for direct server details
              </div>
            </div>
          </div>
        </div>

        {/* MCP Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="text-green-500" size={20} />
            <h3 className="font-semibold text-gray-900">MCP Configuration</h3>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Paste your Claude Desktop MCP configuration JSON to extract server details and get setup guidance.
            </p>
            <button
              onClick={() => handleSuggestionClick(`{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@joshuarileydev/supabase-mcp-server"],
      "env": {
        "SUPABASE_API_KEY": "your-api-key",
      }
    }
  }
}`)}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <div className="text-sm font-medium text-gray-900">Try Example Configuration</div>
              <div className="text-xs text-gray-600">Paste MCP JSON for automatic parsing</div>
            </button>
          </div>
        </div>

        {/* Advanced Features */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="text-purple-500" size={20} />
            <h3 className="font-semibold text-gray-900">Advanced Features</h3>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => handleSuggestionClick("https://glama.ai/api/mcp/v1/servers/JoshuaRileyDev/supabase-mcp-server")}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <div className="text-sm font-medium text-gray-900">Direct API Fetch</div>
              <div className="text-xs text-gray-600">Use Glama API URLs for specific servers</div>
            </button>
            <button
              onClick={() => handleSuggestionClick("curl -X GET 'https://glama.ai/api/mcp/v1/servers/dynamicendpoints/postgres-mcp'")}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <div className="text-sm font-medium text-gray-900">Curl Commands</div>
              <div className="text-xs text-gray-600">Execute API calls directly</div>
            </button>
            <button
              onClick={() => handleSuggestionClick("https://github.com/modelcontextprotocol/servers")}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <div className="text-sm font-medium text-gray-900">GitHub Repositories</div>
              <div className="text-xs text-gray-600">Analyze MCP server repositories</div>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start space-x-3">
          <HelpCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Pro Tips</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Be specific about your use case for better recommendations</li>
              <li>• I can parse MCP configurations and extract environment requirements</li>
              <li>• Ask about installation steps, environment setup, or tool capabilities</li>
              <li>• Use natural language - describe what you want to accomplish</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">MCP Chat Assistant</h1>
              <p className="text-xs text-gray-600">Find and interact with MCP servers</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowReferenceModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
            >
              <Book size={16} />
              <span>Reference</span>
            </button>
            <button
              onClick={() => setShowSessionPanel(!showSessionPanel)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
            >
              <Server size={16} />
              <span>{sessionServers.length} active</span>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full overflow-y-auto">
              <SearchQueryGuide />
            </div>
          ) : (
            <div className="p-6 space-y-6 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-3xl ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.sender === 'user' 
                        ? 'bg-black ml-3' 
                        : 'bg-white border-2 border-gray-200 mr-3'
                    }`}>
                      {message.sender === 'user' ? (
                        <User size={16} className="text-white" />
                      ) : (
                        <Bot size={16} className="text-gray-600" />
                      )}
                    </div>
                    
                    <div className={`rounded-2xl px-6 py-4 max-w-full shadow-sm ${
                      message.sender === 'user' 
                        ? 'bg-black text-white' 
                        : 'bg-white border border-gray-200'
                    }`}>
                      {message.sender === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      ) : (
                        <div className="streaming-message text-sm text-gray-800 leading-relaxed">
                          <MarkdownJSX 
                            options={{
                              overrides: {
                                p: { props: { className: 'mb-4 last:mb-0 leading-relaxed text-gray-800' } },
                                ul: { props: { className: 'mb-4 last:mb-0 space-y-1 pl-4 text-gray-800' } },
                                ol: { props: { className: 'mb-4 last:mb-0 space-y-1 pl-4 text-gray-800' } },
                                li: { props: { className: 'leading-relaxed text-gray-800' } },
                                code: { props: { className: 'bg-gray-100 px-2 py-1 rounded font-mono text-xs text-gray-900' } },
                                pre: { props: { className: 'bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4 last:mb-0 text-xs' } },
                                h1: { props: { className: 'text-lg font-bold mb-4 text-gray-900' } },
                                h2: { props: { className: 'text-base font-bold mb-3 text-gray-900' } },
                                h3: { props: { className: 'text-sm font-semibold mb-3 text-gray-900' } },
                                h4: { props: { className: 'text-sm font-semibold mb-2 text-gray-900' } },
                                strong: { props: { className: 'font-semibold text-gray-900' } },
                                em: { props: { className: 'italic text-gray-700' } },
                                blockquote: { props: { className: 'border-l-4 border-gray-300 pl-4 mb-4 last:mb-0 italic text-gray-700' } },
                                a: { props: { className: 'text-black underline hover:text-gray-700 transition-colors font-medium' } },
                              }
                            }}
                          >
                            {message.content || (isLoading && message.id === messages[messages.length - 1]?.id ? 'Thinking...' : '')}
                          </MarkdownJSX>
                          {isLoading && message.id === messages[messages.length - 1]?.id ? (
                            <span className="streaming-cursor inline-block w-2 h-5 bg-black ml-1 align-middle animate-pulse"></span>
                          ) : null}
                        </div>
                      )}
                      
                      {message.functionCalls?.map((functionCall, index) => (
                        <div key={index}>
                          {show_mcp_recommendations(functionCall)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me to find MCP servers, paste URLs, or describe your use case..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white text-gray-900 placeholder-gray-500 text-sm shadow-sm"
                disabled={isLoading || isProcessingFunctions}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || isProcessingFunctions || !input.trim()}
                className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 shadow-sm min-w-[100px] justify-center"
              >
                {isLoading || isProcessingFunctions ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm font-medium">{isProcessingFunctions ? 'Processing' : 'Sending'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="text-sm font-medium">Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Session Panel */}
      {showSessionPanel && (
        <div className="w-80 border-l border-gray-200 bg-white shadow-lg">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Active Session</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={loadSessionServers}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
                  title="Refresh servers"
                >
                  🔄
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('mcp-chat-session-id');
                    window.location.reload();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
                  title="Start new session"
                >
                  🔄🆕
                </button>
                <button
                  onClick={() => setShowSessionPanel(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-1">Session ID: {sessionId.slice(-8)}</p>
          </div>
          
          <div className="p-4 space-y-3">
            {sessionServers.length === 0 ? (
              <div className="text-center py-8">
                <Server size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">No servers in this session</p>
                <p className="text-xs text-gray-400 mt-1">Add servers through chat recommendations</p>
              </div>
            ) : (
              <>
                <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Active Servers ({sessionServers.length})
                </h3>
                <div className="space-y-2">
                  {sessionServers.map((server) => (
                    <div key={server.serverId} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{server.serverName}</p>
                          <p className="text-xs text-gray-500">Added {new Date(server.installedAt).toLocaleTimeString()}</p>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm z-40">
          {statusMessage}
        </div>
      )}

      {/* Credential Modal */}
      {showCredentialModal && credentialRequirements && (
        <McpCredentialModal
          isOpen={showCredentialModal}
          onClose={() => setShowCredentialModal(false)}
          sessionId={sessionId}
          credentialRequirements={credentialRequirements}
          onCredentialsSubmitted={handleCredentialsSubmitted}
        />
      )}

      {/* Reference Modal */}
      <SearchReferenceModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
      />
    </div>
  );
}

export default ChatInterface; 