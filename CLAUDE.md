# fe-engine-prime Application Guide

**Navigation:** [← Back to Root CLAUDE.md](../CLAUDE.md) |
[BMad Framework](../.bmad-core/claude/BMAD.md) |
[JIRA Integration](../.bmad-core/claude/JIRA.md) |
[Workflows](../.bmad-core/claude/WORKFLOWS.md)

This guide covers application-specific guidance for the **fe-engine-prime**
Next.js application.

---

## Tech Stack

### Framework & Core

- **Framework:** Next.js 15.5.4 (App Router, Turbopack)
- **Language:** TypeScript 5.6.3 (strict mode)
- **Package Manager:** pnpm

### Styling & UI

- **Styling:** Tailwind CSS v4.1.13 (OKLCH color space)
- **UI Components:** shadcn/ui + Radix UI primitives
- **Design System:** Component-based architecture

### Features

- **Authentication:** NextAuth.js v5 (Role-Based Access Control)
- **Real-time:** Socket.io integration
- **Testing:** Vitest (unit/integration), Playwright (E2E)

---

## Quick Start

### Development Server

```bash
cd fe-engine-prime
pnpm install          # Install dependencies
pnpm dev              # Start dev server (http://localhost:3000)
```

### Common Commands

```bash
pnpm build            # Production build
pnpm start            # Start production server
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint linting
pnpm test             # Run Vitest tests
pnpm test:e2e         # Run Playwright E2E tests
```

---

## Project Structure

```
fe-engine-prime/
├── src/                    # Application source code
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components (shadcn/ui)
│   ├── lib/               # Utility functions
│   ├── hooks/             # Custom React hooks
│   └── styles/            # Global styles (Tailwind)
├── e2e/                   # Playwright E2E tests
├── tests/                 # Vitest unit/integration tests
├── public/                # Static assets
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── tailwind.config.ts     # Tailwind config
├── next.config.ts         # Next.js config
└── playwright.config.ts   # Playwright config
```

**For detailed structure:** See `fe-engine-prime/README.md`

---

## Development Guidelines

### Next.js 15 Specifics

- Use **App Router** (not Pages Router)
- Leverage **Server Components** by default
- Use Client Components (`'use client'`) only when needed
- Utilize **Turbopack** for fast development builds

### TypeScript

- **Strict mode enabled** - no implicit any
- Type all props, state, and function signatures
- Use type inference where appropriate

### Styling with Tailwind v4

- Use **OKLCH color space** for better color management
- Follow component-first approach
- Leverage shadcn/ui components for consistency

### Authentication

- NextAuth.js v5 configured with RBAC
- Use `auth()` helper for server components
- Use `useSession()` hook for client components

### Testing Strategy

- **Unit/Integration:** Vitest for logic and component testing
- **E2E:** Playwright for user journey testing
- Follow QA standards: No flaky tests, stateless, self-cleaning

---

## App-Specific Notes

### Real-time Features

- Socket.io integration for real-time communication
- WebSocket connection management in `src/lib/socket.ts`

### Performance

- Turbopack enabled for development (faster builds)
- Image optimization with Next.js Image component
- Code splitting with dynamic imports

### Deployment

- Production builds optimized for Vercel/Node.js
- Environment variables managed via `.env.local`
- CI/CD integration with GitHub Actions (future)

---

## Related Documentation

- **[Root CLAUDE.md](../CLAUDE.md)** - Main navigation hub
- **[BMad Framework Guide](../.bmad-core/claude/BMAD.md)** - BMad rules, agents,
  commands
- **[JIRA Integration Guide](../.bmad-core/claude/JIRA.md)** - JIRA sync and
  specialist agents
- **[Development Workflows](../.bmad-core/claude/WORKFLOWS.md)** -
  Japanese-style workflow
- **[Architecture](../docs/architecture.md)** - System architecture
- **[PRD](../docs/prd.md)** - Product requirements
- **App README:** `fe-engine-prime/README.md` - Complete app documentation
