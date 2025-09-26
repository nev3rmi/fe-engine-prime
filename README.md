# FE-Engine Prime

A production-ready Next.js 15.5.4 application featuring enterprise
authentication, real-time communication, and modern UI components. Built with
TypeScript, Tailwind CSS v4, and shadcn/ui.

## Features

- **Enterprise Authentication**: NextAuth.js v5 with role-based access control
  (Admin, Editor, User)
- **Real-Time Communication**: Socket.io integration for WebSocket-based
  features
- **Modern UI Components**: 30+ shadcn/ui components with Radix UI primitives
- **Dark/Light Theme**: Theme switching with next-themes and OKLCH color format
- **Type Safety**: Full TypeScript coverage with strict compilation
- **Comprehensive Testing**: Vitest for unit tests, Playwright for E2E tests
- **Performance Optimized**: Turbopack, React Server Components, and streaming
  SSR

## Tech Stack

- **Framework**: Next.js 15.5.4 with App Router
- **Language**: TypeScript 5.6.3
- **Styling**: Tailwind CSS v4.1.13 (stable)
- **UI Components**: shadcn/ui with Radix UI
- **Authentication**: NextAuth.js v5
- **Real-Time**: Socket.io 4.8.1
- **State Management**: Zustand + TanStack Query
- **Testing**: Vitest + Playwright
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- Git

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd fe-engine-prime
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
DATABASE_URL=your-database-url
SOCKET_IO_PORT=3001
```

4. Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Development

### Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server

# Testing
pnpm test             # Run unit tests (watch mode)
pnpm test:run         # Run tests once
pnpm test:unit        # Run unit tests only
pnpm test:integration # Run integration tests
pnpm test:e2e         # Run E2E tests with Playwright
pnpm test:coverage    # Generate coverage report

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting
pnpm type-check       # TypeScript type checking

# Quality Checks
pnpm quality:check    # Full quality check (lint, format, typecheck, tests)
pnpm analyze          # Analyze bundle size
```

### Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── ui/          # shadcn/ui components
│   ├── showcase/    # Component demos
│   └── realtime/    # Socket.io components
├── lib/             # Core libraries
│   ├── auth/        # Authentication
│   ├── realtime/    # Socket.io setup
│   └── hooks/       # Custom hooks
├── types/           # TypeScript definitions
└── test/            # Test utilities
```

## Features Documentation

### Authentication System

The application implements a three-tier role hierarchy:

- **Admin**: Full system access
- **Editor**: Content management permissions
- **User**: Basic read/write for own resources

```typescript
// Using authentication in components
import { useAuth } from '@/hooks/use-auth'

function MyComponent() {
  const { user, hasPermission } = useAuth()

  if (!hasPermission('content:write')) {
    return <div>Unauthorized</div>
  }

  // Component logic
}
```

### Real-Time Features

Socket.io integration for live features:

```typescript
// Using Socket.io in components
import { useSocket } from "@/hooks/use-socket";

function RealtimeComponent() {
  const socket = useSocket();

  useEffect(() => {
    socket?.on("notification", data => {
      // Handle notification
    });

    return () => {
      socket?.off("notification");
    };
  }, [socket]);
}
```

### UI Components

All shadcn/ui components are available in `/src/components/ui`:

```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";

// Use components with full TypeScript support
<Button variant="primary" size="lg">
  Click me
</Button>;
```

### Theme System

Dark/light mode with OKLCH colors:

```tsx
// Theme toggle component
import { useTheme } from "next-themes";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Toggle theme
    </button>
  );
}
```

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run specific test file
pnpm test Button.test.tsx

# Generate coverage report
pnpm test:coverage
```

### E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Debug E2E tests
pnpm test:e2e:debug
```

## API Routes

The application includes several API endpoints:

- `/api/auth/*` - Authentication endpoints (NextAuth.js)
- `/api/users` - User management
- `/api/socket` - Socket.io server initialization

Example API route:

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Validate authentication
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return users
  const users = await getUsers();
  return NextResponse.json(users);
}
```

## Deployment

### Production Build

```bash
# Type checking
pnpm type-check

# Linting and formatting
pnpm lint
pnpm format:check

# Run tests
pnpm test:run
pnpm test:e2e

# Build application
pnpm build

# Start production server
pnpm start
```

### Deploy to Vercel

The easiest deployment option:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Connect your GitHub repository
2. Configure environment variables
3. Deploy

### Docker Deployment

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

## Performance

The application is optimized for performance:

- **Lighthouse Score**: 95+
- **First Contentful Paint**: < 1.2s
- **Time to Interactive**: < 3.8s
- **Bundle Size**: Optimized with tree shaking

### Optimization Features

- React Server Components
- Streaming SSR
- Image optimization
- Font optimization
- Code splitting
- Dynamic imports

## Security

Built-in security features:

- **Authentication**: Secure session management
- **Authorization**: Role-based access control
- **Input Validation**: Zod schema validation
- **CSRF Protection**: Built into NextAuth.js
- **XSS Prevention**: React's built-in protections
- **SQL Injection**: Parameterized queries
- **Rate Limiting**: API endpoint protection

## Contributing

Please read our [Contributing Guidelines](./CONTRIBUTING.md) before submitting
PRs.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Ensure all tests pass
6. Submit a pull request

### Code Style

Follow the established patterns:

- TypeScript for all code
- Functional components with hooks
- Tailwind CSS for styling
- shadcn/ui for UI components

## Troubleshooting

### Common Issues

**Port already in use**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Dependencies issues**

```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
```

**TypeScript errors**

```bash
# Regenerate types
pnpm type-check
```

## Documentation

- [Architecture Overview](../docs/architecture.md)
- [Tech Stack Details](../docs/architecture/tech-stack.md)
- [Coding Standards](../docs/architecture/coding-standards.md)
- [Source Tree Structure](../docs/architecture/source-tree.md)

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**:
  [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: [Project Docs](../docs/)

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE)
file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Radix UI](https://radix-ui.com/) - Accessible component primitives
- [Vercel](https://vercel.com/) - Deployment platform

---

Built with ❤️ using Next.js, TypeScript, and shadcn/ui
