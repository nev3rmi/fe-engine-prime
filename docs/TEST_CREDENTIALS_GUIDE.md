# Test Credentials Guide - FE-35 Authentication

## Overview

The FE-35 authentication UI includes **quick-click test user functionality** for
streamlined development and testing workflows. This feature provides one-click
access to different user roles without manual credential entry.

## Test User Quick Access

### Location

The test credential buttons appear **below the OAuth sign-in section** on the
login page (`/login`) in development mode only.

### Visual Design

- **Section Header**: "Test Accounts (Dev Only)" with separator line
- **Description**: "Quick sign-in for testing different user roles"
- **Button Layout**: Three buttons in responsive grid
  (`grid-cols-1 sm:grid-cols-3`)
- **Credential Display**: Shows actual email/password combinations for reference

## Available Test Accounts

### 👤 Test User (USER Role)

- **Button**: Secondary button with User icon
- **Email**: `test@example.com`
- **Password**: `testuser123`
- **Permissions**: Basic read access, dashboard view, realtime channels
- **Use Case**: Testing standard user functionality and permissions

### ✏️ Test Editor (EDITOR Role)

- **Button**: Secondary button with UserCheck icon
- **Email**: `editor@example.com`
- **Password**: `editoruser123`
- **Permissions**: Content management + user administration
- **Use Case**: Testing content creation, editing, and moderate admin functions

### 👑 Test Admin (ADMIN Role)

- **Button**: Secondary button with Crown icon
- **Email**: `admin@example.com`
- **Password**: `adminuser123`
- **Permissions**: Full system access (20+ permissions)
- **Use Case**: Testing admin panels, user management, system settings

## Functionality

### Auto-Fill and Submit

```typescript
const handleTestCredentials = async (userType: "user" | "editor" | "admin") => {
  // Auto-fills email and password fields
  form.setValue("email", credentials.email);
  form.setValue("password", credentials.password);

  // Auto-submits form after 100ms delay
  setTimeout(() => {
    form.handleSubmit(onSubmit)();
  }, 100);
};
```

### One-Click Testing Flow

1. **Click Test Button** → Credentials auto-filled
2. **Form Auto-Submits** → Validation runs
3. **Authentication Attempt** → NextAuth.js processes login
4. **Redirect to Dashboard** → User logged in with role-specific permissions

## Development Mode Only

### Visibility Condition

```typescript
{process.env.NODE_ENV !== 'production' && (
  // Test credential section only shows in development
)}
```

### Environment Detection

- **Development**: Buttons visible and functional
- **Production**: Section completely hidden for security
- **Testing**: Available for unit/integration test scenarios

## Integration with FE-36 & FE-37

### FE-36: User Menu & Profile Components

- Test accounts provide different role contexts for UI testing
- Admin account tests admin-specific menu items
- User account validates basic user experience

### FE-37: Complete Authentication Journey

- One-click access enables rapid E2E testing
- Different roles test authorization flows
- Supports comprehensive user journey validation

## Visual Reference

### Test Credentials Section Layout

```
┌─── Test Accounts (Dev Only) ────┐
│ Quick sign-in for testing roles │
│                                 │
│ [👤 Test User] [✏️ Test Editor] [👑 Test Admin] │
│                                 │
│           Test Credentials:     │
│ User: test@example.com / testuser123      │
│ Editor: editor@example.com / editoruser123 │
│ Admin: admin@example.com / adminuser123   │
└─────────────────────────────────┘
```

## Usage Examples

### Quick Role Testing

```bash
# Test basic user functionality
1. Navigate to /login
2. Click "Test User" button
3. Verify dashboard shows user-level content

# Test admin functionality
1. Navigate to /login
2. Click "Test Admin" button
3. Verify admin panels are accessible
```

### QA Validation Scenarios

```typescript
// E2E test using test credentials
test("Test admin can access admin panel", async ({ page }) => {
  await page.goto("/login");
  await page.click('button[text="Test Admin"]');
  await page.waitForURL("/dashboard");

  // Admin-specific UI should be visible
  await expect(page.locator('[data-testid="admin-panel"]')).toBeVisible();
});
```

## Security Considerations

### Development Only

- **Production Safety**: Test buttons never appear in production builds
- **Environment Isolation**: Credentials only work in development environment
- **No Security Risk**: Mock credentials have no production access

### Best Practices

- Use test accounts only for development and testing
- Never use test credentials in production environments
- Rotate test passwords periodically for security hygiene

## Related Stories

- **FE-35**: Authentication UI pages and login components ✅ **COMPLETE**
- **FE-36**: User menu, profile page and session UI components
- **FE-37**: Complete authentication user journey integration and testing

---

**This test credential system significantly improves developer productivity and
testing efficiency for the FE-Engine Prime authentication flows.**
