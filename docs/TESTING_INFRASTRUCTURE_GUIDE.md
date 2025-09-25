# Testing Infrastructure Guide - FE-Engine Prime

## 📋 Overview

The FE-Engine Prime project implements a comprehensive testing infrastructure
using the latest testing tools and methodologies. This guide provides complete
documentation for all testing layers, patterns, and practices implemented in
Epic 5.

## 🏗️ Testing Architecture

### Testing Pyramid

```
                    E2E Tests (Playwright)
                   /                      \
                  /     Integration Tests   \
                 /    (API, Socket.io, Auth) \
                /                              \
               /          Unit Tests             \
              /     (Components, Hooks, Utils)   \
             /____________________________________\
            Security & Performance Testing Foundation
```

### Technology Stack

- **Unit/Integration Testing**: Vitest 2.1.8 + React Testing Library 16.1.0
- **End-to-End Testing**: Playwright 1.55.1
- **Performance Testing**: Custom Core Web Vitals monitoring
- **Security Testing**: Custom security test suites
- **Coverage**: Vitest's built-in v8 coverage
- **CI/CD**: GitHub Actions with quality gates

## 🧪 Unit & Integration Testing

### Configuration

**Vitest Configuration** (`vitest.config.ts`):

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      thresholds: {
        global: {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
  },
});
```

### Test Structure

```
src/
├── test/
│   ├── setup.ts                    # Global test configuration
│   ├── utils/
│   │   ├── test-utils.tsx          # Custom render with providers
│   │   ├── auth-mocks.ts           # Authentication mocking utilities
│   │   └── socket-mocks.ts         # Socket.io mocking utilities
│   ├── performance/                # Performance test suites
│   └── security/                   # Security test suites
├── components/
│   ├── ui/__tests__/               # ShadCN component tests
│   └── realtime/__tests__/         # Real-time component tests
└── lib/
    ├── auth/__tests__/             # Authentication logic tests
    ├── hooks/__tests__/            # Custom hooks tests
    └── middleware/__tests__/       # Middleware tests
```

### Testing Patterns

#### 1. Component Testing

```typescript
import { render, screen, fireEvent } from '@/test/utils/test-utils'
import { Button } from '../button'

describe('Button Component', () => {
  it('renders with correct variant styling', () => {
    render(<Button variant="destructive">Delete</Button>)

    const button = screen.getByRole('button', { name: /delete/i })
    expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground')
  })
})
```

#### 2. Authentication Testing

```typescript
import { mockUseSession, createMockAdminSession } from '@/test/utils/auth-mocks'

describe('Protected Component', () => {
  it('allows admin access', () => {
    mockUseSession(createMockAdminSession())

    render(<AdminPanel />)
    expect(screen.getByText('Admin Controls')).toBeInTheDocument()
  })
})
```

#### 3. Socket.io Testing

```typescript
import {
  mockRealtimeHooks,
  simulateSocketConnection,
} from "@/test/utils/socket-mocks";

describe("Real-time Features", () => {
  beforeEach(() => {
    mockRealtimeHooks();
  });

  it("handles presence updates", async () => {
    const socket = createMockSocket();
    await simulateSocketConnection(socket, mockUser);

    // Test real-time functionality
  });
});
```

### Custom Testing Utilities

#### Test Utils (`src/test/utils/test-utils.tsx`)

Provides custom render function with all necessary providers:

```typescript
function customRender(ui: ReactElement, options = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <SessionProvider session={session}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SessionProvider>
      </QueryClientProvider>
    ),
    ...options
  })
}
```

#### Auth Mocks (`src/test/utils/auth-mocks.ts`)

- `mockUseSession()`: Mock Next-Auth session
- `createMockSession()`: Create test user sessions
- `mockProtectedApiCall()`: Mock authenticated API calls

#### Socket Mocks (`src/test/utils/socket-mocks.ts`)

- `createMockSocket()`: Create mock Socket.io instance
- `mockRealtimeHooks()`: Mock all real-time hooks
- `simulateSocketConnection()`: Simulate connection lifecycle

## 🎭 End-to-End Testing

### Playwright Configuration

**Configuration** (`playwright.config.ts`):

```typescript
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },
  ],
});
```

### E2E Test Structure

```
e2e/
├── global-setup.ts              # Global test setup
├── global-teardown.ts           # Global test cleanup
├── auth/
│   └── authentication.spec.ts   # Authentication flows
├── ui/
│   └── components.spec.ts       # UI component interactions
└── realtime/
    └── socket-features.spec.ts  # Real-time features
```

### E2E Testing Patterns

#### Authentication Flow Testing

```typescript
test("should handle complete authentication flow", async ({ page }) => {
  await page.goto("/login");

  // OAuth provider buttons should be visible
  await expect(page.locator("text=Sign in with GitHub")).toBeVisible();

  // Test authentication redirect
  await page.goto("/dashboard");
  await page.waitForURL(/\/login|\/api\/auth/);
});
```

#### Cross-browser Testing

All E2E tests run across:

- Desktop: Chrome, Firefox, Safari, Edge
- Mobile: Chrome (Pixel 5), Safari (iPhone 12)

## ⚡ Performance Testing

### Core Web Vitals Monitoring

**Performance Test Suite** (`src/test/performance/core-web-vitals.test.ts`):

```typescript
describe("Core Web Vitals", () => {
  it("should meet LCP threshold", async () => {
    const lcp = await collector.measureLCP();
    expect(lcp).toBeLessThan(2500); // Good LCP threshold
  });

  it("should meet FID threshold", async () => {
    const fid = await collector.measureFID();
    expect(fid).toBeLessThan(100); // Good FID threshold
  });

  it("should meet CLS threshold", async () => {
    const cls = await collector.measureCLS();
    expect(cls).toBeLessThan(0.1); // Good CLS threshold
  });
});
```

### Bundle Size Analysis

```typescript
it("should enforce bundle size thresholds", async () => {
  const analysis = await bundleAnalyzer.analyzeJavaScriptBundles();
  const thresholds = bundleAnalyzer.getThresholds();

  expect(analysis.total).toBeLessThan(thresholds.javascript.error);
});
```

### Performance Budgets

| Metric | Good    | Needs Improvement | Poor    |
| ------ | ------- | ----------------- | ------- |
| LCP    | ≤ 2.5s  | 2.5s - 4.0s       | > 4.0s  |
| FID    | ≤ 100ms | 100ms - 300ms     | > 300ms |
| CLS    | ≤ 0.1   | 0.1 - 0.25        | > 0.25  |
| FCP    | ≤ 1.8s  | 1.8s - 3.0s       | > 3.0s  |
| TTFB   | ≤ 600ms | 600ms - 1.5s      | > 1.5s  |

## 🔒 Security Testing

### Security Test Categories

1. **Authentication Bypass Prevention**
2. **Authorization Validation**
3. **Input Sanitization**
4. **Token Manipulation Prevention**
5. **CORS and Security Headers**

### Security Testing Patterns

```typescript
describe("Security Testing - Authentication Bypass", () => {
  it("should prevent access with null session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await handler(request);
    expect(response.status).toBe(401);
  });

  it("should prevent privilege escalation", async () => {
    const session = createMockSession();
    session.user.role = UserRole.USER;

    const response = await adminHandler(request);
    expect(response.status).toBe(403);
  });
});
```

### Vulnerability Scanning

- **npm audit**: Dependency vulnerability scanning
- **OWASP Dependency Check**: Comprehensive security analysis
- **Custom Security Tests**: Application-specific security validations

## 🚀 Quality Gates & CI/CD

### Automated Quality Gates

**GitHub Actions Workflow** (`.github/workflows/quality-gates.yml`):

1. **Code Quality**: TypeScript, ESLint, Prettier
2. **Unit Tests**: 90%+ coverage requirement
3. **E2E Tests**: Cross-browser compatibility
4. **Performance**: Bundle size and Core Web Vitals
5. **Security**: Vulnerability scanning and security tests
6. **Build Validation**: Multi-Node.js version testing

### Quality Gate Thresholds

| Gate                     | Threshold     | Action     |
| ------------------------ | ------------- | ---------- |
| Test Coverage            | 90%           | ❌ Fail    |
| Bundle Size              | 1MB           | ⚠️ Warning |
| Security Vulnerabilities | High/Critical | ❌ Fail    |
| Performance Regression   | >10%          | ⚠️ Warning |
| Type Errors              | Any           | ❌ Fail    |
| Lint Errors              | Any           | ❌ Fail    |

### Local Quality Checking

**Quality Check Script** (`scripts/quality-check.js`):

```bash
# Run all quality gates locally
npm run quality:check

# Include E2E tests
npm run quality:check:e2e

# Skip build for faster feedback
npm run quality:check:fast
```

## 📊 Test Commands

### Development Workflow

```bash
# Start test watcher during development
npm run test:watch

# Run specific test suites
npm run test:unit
npm run test:security
npm run test:performance
npm run test:e2e

# Generate coverage report
npm run test:coverage

# Run all tests
npm run test:all
```

### CI/CD Commands

```bash
# Complete quality gate check
npm run quality:check

# Type checking
npm run type-check

# Code quality
npm run lint && npm run format:check

# Build validation
npm run build
```

## 🎯 Testing Best Practices

### 1. Test Organization

- **Arrange, Act, Assert** pattern
- **Given, When, Then** for BDD-style tests
- One assertion per test (when possible)
- Descriptive test names

### 2. Component Testing

- Test behavior, not implementation
- Use semantic queries (`getByRole`, `getByLabelText`)
- Test accessibility features
- Mock external dependencies

### 3. Authentication Testing

- Test all user roles and permissions
- Verify unauthorized access prevention
- Test session management
- Mock authentication providers

### 4. Real-time Testing

- Mock Socket.io connections
- Test connection states
- Verify event handling
- Test error scenarios

### 5. Performance Testing

- Establish performance baselines
- Monitor Core Web Vitals
- Test bundle sizes
- Validate performance budgets

### 6. Security Testing

- Test authentication bypass attempts
- Validate authorization checks
- Test input sanitization
- Verify security headers

## 🔧 Troubleshooting

### Common Issues

#### Test Failures

```bash
# Clear test cache
npx vitest run --no-cache

# Update snapshots
npx vitest run --update-snapshots

# Debug specific test
npx vitest run --reporter=verbose src/path/to/test.ts
```

#### E2E Test Issues

```bash
# Install browser binaries
npx playwright install

# Run E2E tests with debug
npm run test:e2e:debug

# View test report
npx playwright show-report
```

#### Coverage Issues

```bash
# Generate detailed coverage report
npm run test:coverage -- --reporter=html

# Check specific file coverage
npx vitest run --coverage --reporter=verbose src/path/to/file.ts
```

## 📈 Metrics & Monitoring

### Test Metrics

- **Test Coverage**: 95%+ for utilities, 90%+ for components
- **E2E Test Success Rate**: 99%+
- **Performance Budget Adherence**: 100%
- **Security Scan Pass Rate**: 100%

### Quality Metrics

- **Build Success Rate**: 99%+
- **Deployment Success Rate**: 99%+
- **Quality Gate Pass Rate**: 95%+
- **Zero Critical Vulnerabilities**: Always

## 🔄 Continuous Improvement

### Monthly Reviews

1. **Test Coverage Analysis**: Identify gaps and improve coverage
2. **Performance Monitoring**: Review Core Web Vitals trends
3. **Security Updates**: Update dependencies and security tests
4. **Tool Updates**: Keep testing tools up to date

### Quarterly Updates

1. **Testing Strategy Review**: Assess effectiveness
2. **Tool Evaluation**: Consider new testing tools
3. **Performance Baseline Updates**: Adjust thresholds
4. **Documentation Updates**: Keep guides current

## 🎓 Learning Resources

### Documentation

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Web Vitals](https://web.dev/vitals/)

### Best Practices

- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [E2E Testing Best Practices](https://playwright.dev/docs/best-practices)

---

**This testing infrastructure provides a solid foundation for maintaining high
code quality, security, and performance in the FE-Engine Prime project and all
derivative projects.**
