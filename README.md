# MCP Web Client - Frontend

## 🚀 What is this?

**MCP Web Client Frontend** is a Next.js web application that provides a chat interface for discovering and managing Model Context Protocol (MCP) servers. Users can chat with AI to find the right tools and integrate them into their workflows.

## 📋 What it does

- **AI Chat Interface**: Real-time chat with Claude AI for MCP server discovery
- **Server Discovery**: Visual cards showing recommended MCP servers
- **Credential Management**: Secure forms for configuring server credentials
- **Tool Execution**: Interactive interface for running MCP tools
- **Session Management**: Organize multiple MCP servers in sessions

## 🛠️ Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Programming language
- **Tailwind CSS** - Styling
- **Server-Sent Events** - Real-time streaming

## ⚙️ Environment Requirements

- **Node.js 18+**
- **Backend server running** (see backend README)

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Configuration
Create a `.env.local` file:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Development
NODE_ENV=development
```

### 3. Start Development Server
```bash
npm run dev
```

Application will run on `http://localhost:3000`

## 📝 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run linting
```

## 🔧 Main Features

- **Chat Interface**: Send messages and get AI responses
- **Server Cards**: Click "Add to Session" to integrate MCP servers
- **Credential Forms**: Fill in API keys and configuration details
- **Tool Executor**: Run MCP tools with parameters and see results
- **Session Panel**: Manage active servers and sessions

## 📞 Need Help?

Check the [Setup Guide](./SETUP_GUIDE.md) for detailed configuration and troubleshooting. 