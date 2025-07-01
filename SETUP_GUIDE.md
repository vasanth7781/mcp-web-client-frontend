# MCP Web Client Frontend - Setup Guide

## 🎯 Overview

This guide provides step-by-step instructions to set up and run the MCP Web Client frontend application locally.

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Backend server** running (see [Backend README](../backend/README.md))
- **Git** for version control

### **Verify Prerequisites**

```bash
# Check Node.js version
node --version  # Should be 18.0.0 or higher

# Check npm version
npm --version   # Should be 8.0.0 or higher

# Check Git
git --version
```

## 🚀 Quick Start

### **1. Clone Repository**

```bash
# Clone the repository
git clone <your-repository-url>
cd mcp-chat-app

# Navigate to frontend directory
cd frontend
```

### **2. Install Dependencies**

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### **3. Environment Configuration**

```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local  # or use your preferred editor
```

Add the following environment variables:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Development Settings
NODE_ENV=development
```

### **4. Start Development Server**

```bash
# Start the development server
npm run dev

# Or with yarn
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## ⚙️ Configuration Details

### **Environment Variables**

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL | `http://localhost:3001` |
| `NODE_ENV` | No | Environment mode | `development` |

### **Next.js Configuration**

The `next.config.js` file contains:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // API proxy configuration
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`
      }
    ];
  },
  
  // Experimental features
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

### **Tailwind CSS Configuration**

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
};
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                     # Next.js 13+ App Router
│   │   ├── layout.tsx          # Root layout component
│   │   ├── page.tsx            # Main chat page
│   │   ├── globals.css         # Global styles
│   │   └── loading.tsx         # Loading component
│   ├── components/             # React components
│   │   ├── ChatInterface.tsx   # Main chat interface
│   │   ├── McpServerCard.tsx   # Server recommendation cards
│   │   ├── McpCredentialModal.tsx # Credential forms
│   │   ├── McpToolExecutor.tsx # Tool execution interface
│   │   ├── McpSessionPanel.tsx # Session management
│   │   └── ui/                 # Reusable UI components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       └── Card.tsx
│   ├── types/                  # TypeScript definitions
│   │   ├── index.ts           # Main type definitions
│   │   ├── api.ts             # API response types
│   │   └── mcp.ts             # MCP-specific types
│   ├── lib/                    # Utility functions
│   │   ├── utils.ts           # General utilities
│   │   ├── api.ts             # API client functions
│   │   └── constants.ts       # Application constants
│   └── hooks/                  # Custom React hooks
│       ├── useChat.ts         # Chat state management
│       ├── useMcpServers.ts   # MCP server management
│       └── useSession.ts      # Session management
├── public/                     # Static assets
│   ├── favicon.ico
│   ├── logo.svg
│   └── images/
├── package.json               # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.js        # Tailwind CSS config
├── next.config.js            # Next.js configuration
├── .env.example              # Environment template
└── README.md                 # This file
```

## 🛠️ Development Scripts

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Start production server (after build)
npm start

# Type checking
npm run type-check

# Linting
npm run lint

# Linting with auto-fix
npm run lint:fix

# Format code with Prettier
npm run format
```

## 🔧 Development Workflow

### **1. Component Development**

Create new components in the `src/components/` directory:

```typescript
// src/components/ExampleComponent.tsx
import { useState } from 'react';

interface ExampleComponentProps {
  title: string;
  onAction?: () => void;
}

export default function ExampleComponent({ 
  title, 
  onAction 
}: ExampleComponentProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold">{title}</h2>
      <button 
        onClick={onAction}
        disabled={isLoading}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {isLoading ? 'Loading...' : 'Action'}
      </button>
    </div>
  );
}
```

### **2. API Integration**

Use the API utilities in `src/lib/api.ts`:

```typescript
// src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export async function sendChatMessage(sessionId: string, message: string) {
  const response = await fetch(
    `${API_BASE}/chat/${sessionId}/stream?message=${encodeURIComponent(message)}`,
    {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
}

export async function addServerToSession(
  sessionId: string, 
  serverId: string, 
  serverName: string
) {
  const response = await fetch(
    `${API_BASE}/chat/${sessionId}/servers/${serverId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ server_name: serverName }),
    }
  );

  return response.json();
}
```

### **3. State Management**

Use custom hooks for state management:

```typescript
// src/hooks/useChat.ts
import { useState, useCallback } from 'react';
import { sendChatMessage } from '../lib/api';

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    
    try {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        content,
        sender: 'user',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Send to API and handle streaming response
      const response = await sendChatMessage(sessionId, content);
      // Handle streaming response...
      
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  return {
    messages,
    isLoading,
    sendMessage,
  };
}
```

## 🎨 Styling Guidelines

### **Tailwind CSS Classes**

Use consistent utility classes:

```css
/* Layout */
.container { @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8; }
.section { @apply py-8 md:py-12 lg:py-16; }

/* Typography */
.heading-1 { @apply text-3xl md:text-4xl lg:text-5xl font-bold; }
.heading-2 { @apply text-2xl md:text-3xl font-semibold; }
.body-text { @apply text-base text-gray-700; }

/* Components */
.btn-primary { @apply px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-300; }
.card { @apply bg-white rounded-lg shadow-md p-6; }
```

### **Component Styling**

```typescript
// Use clsx for conditional classes
import clsx from 'clsx';

function Button({ variant = 'primary', disabled, children, ...props }) {
  return (
    <button
      className={clsx(
        'px-4 py-2 rounded font-medium transition-colors',
        {
          'bg-blue-500 text-white hover:bg-blue-600': variant === 'primary',
          'bg-gray-200 text-gray-800 hover:bg-gray-300': variant === 'secondary',
          'opacity-50 cursor-not-allowed': disabled,
        }
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
```

## 🧪 Testing

### **Component Testing**

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

Example test:

```typescript
// src/components/__tests__/ExampleComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ExampleComponent from '../ExampleComponent';

describe('ExampleComponent', () => {
  it('renders correctly', () => {
    render(<ExampleComponent title="Test Title" />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onAction when button is clicked', () => {
    const mockAction = jest.fn();
    render(<ExampleComponent title="Test" onAction={mockAction} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });
});
```

## 🚀 Production Build

### **Build Process**

```bash
# Create production build
npm run build

# Test production build locally
npm start
```

### **Build Optimization**

The build process includes:
- TypeScript compilation
- CSS optimization and purging
- JavaScript minification
- Image optimization
- Static generation for applicable pages

### **Performance Considerations**

- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **CSS Purging**: Unused Tailwind classes removed
- **Bundle Analysis**: Use `npm run analyze` to check bundle size

## 🐛 Troubleshooting

### **Common Issues**

1. **Port Already in Use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   
   # Or use different port
   npm run dev -- -p 3001
   ```

2. **Environment Variables Not Loading**
   ```bash
   # Ensure file is named .env.local (not .env)
   # Variables must start with NEXT_PUBLIC_ for client-side access
   # Restart development server after changes
   ```

3. **API Connection Issues**
   ```bash
   # Check backend is running
   curl http://localhost:3001/health
   
   # Check environment variable
   echo $NEXT_PUBLIC_API_URL
   ```

4. **Build Errors**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

5. **TypeScript Errors**
   ```bash
   # Run type checking
   npm run type-check
   
   # Check tsconfig.json for proper configuration
   ```

### **Debug Mode**

Enable debug logging:

```bash
# Enable debug mode
DEBUG=* npm run dev

# Enable Next.js specific debugging
DEBUG=next:* npm run dev
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/learn)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🆘 Getting Help

If you encounter issues:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review the [backend documentation](../backend/README.md)
3. Search existing issues in the repository
4. Create a new issue with detailed error information

---

For backend setup and configuration, see the [Backend README](../backend/README.md) and [Technical Documentation](../backend/TECHNICAL_DOCUMENTATION.md). 