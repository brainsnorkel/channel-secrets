# BlueskyLogin Component

Authentication component for Bluesky/ATProto login flow.

## Features

- Handle/email input field
- App password input with show/hide toggle
- Link to Bluesky app password generation page
- Security warning about using app passwords (not main password)
- Error handling for invalid credentials
- Loading state during authentication
- Responsive design with dark mode support
- Matches existing app aesthetic (UnlockScreen styling)

## Usage

```tsx
import { BlueskyLogin } from './components/BlueskyLogin';
import type { AtpSessionData } from '@atproto/api';

function App() {
  const handleLoginSuccess = (session: AtpSessionData) => {
    console.log('Logged in:', session.handle);
    // Save session to storage
    // Navigate to main app
  };

  const handleCancel = () => {
    // Navigate back or handle cancellation
  };

  return (
    <BlueskyLogin
      onLoginSuccess={handleLoginSuccess}
      onCancel={handleCancel}
      initialHandle="alice.bsky.social"
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onLoginSuccess` | `(session: AtpSessionData) => void` | Yes | Callback when login succeeds with session data |
| `onCancel` | `() => void` | No | Optional callback for cancel action |
| `initialHandle` | `string` | No | Pre-fill handle field (default: empty string) |

## State Management

The component manages its own internal state:
- `handle`: User's handle or email
- `appPassword`: App password input
- `isLoading`: Authentication in progress
- `error`: Error message from failed login
- `showPassword`: Toggle password visibility

## Error Handling

Errors from the BlueskyAdapter are displayed inline:
- Invalid credentials
- Network errors
- Rate limiting (handled automatically with retry)

Special handling for common mistakes:
- If user accidentally uses main password, error message suggests using app password

## Security

- Password input uses `type="password"` by default
- Toggle button for password visibility
- Prominent warning about using app passwords
- Link to generate app passwords: https://bsky.app/settings/app-passwords
- No password stored in component state after successful login

## Styling

- Matches UnlockScreen.tsx aesthetic
- Bluesky brand colors (#1185fe)
- Responsive design (mobile-friendly)
- Dark mode support
- Smooth animations and transitions

## Session Data

On successful login, `onLoginSuccess` receives `AtpSessionData`:
```typescript
interface AtpSessionData {
  did: string;
  handle: string;
  email?: string;
  accessJwt: string;
  refreshJwt: string;
}
```

This can be saved to storage and used to resume sessions later.
