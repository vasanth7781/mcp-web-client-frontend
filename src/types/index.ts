export interface McpServer {
  id: string;
  name: string;
  description: string;
  category: string;
  install_command: string;
  tools: string[];
  metadata: any;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  id: string;
  session_id: string;
  persona: string;
  conversation_type: string;
  content: string;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export interface ContentItem {
  id: string;
  type: string;
  content?: string;
  function_name?: string;
  function_id?: string;
  call_id?: string;
  args?: any;
  output?: any;
  order: number;
}

export interface StreamMessage {
  type: string;
  content: string;
  recommendations?: McpServer[];
} 