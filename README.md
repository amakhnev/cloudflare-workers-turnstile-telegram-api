# Cloudflare Workers Turnstile Telegram API

A lightweight REST API server deployable to Cloudflare Workers for headless notifications to Telegram with Cloudflare Turnstile verification.

## Features

- 🔐 **Cloudflare Turnstile** - Bot protection without CAPTCHAs
- 📱 **Telegram Notifications** - Send messages via Telegram Bot API
- 🔑 **Optional API Key Auth** - Additional layer of security
- 🔌 **Pluggable Actions** - Easily replace Telegram with other notification services
- ⚡ **Edge Deployment** - Runs on Cloudflare's global network
- 🌐 **CORS Support** - Configurable cross-origin requests

## Architecture

```
┌─────────────┐     ┌──────────────────────────────────────────────────┐
│   Client    │     │              Cloudflare Worker                   │
│  (Browser)  │────▶│  ┌─────────┐  ┌───────────┐  ┌───────────────┐   │
│             │     │  │ API Key │─▶│ Turnstile │─▶│    Action     │   │
│  Turnstile  │     │  │  Auth   │  │  Verify   │  │  (Telegram)   │   │
│   Widget    │     │  └─────────┘  └───────────┘  └───────────────┘   │
└─────────────┘     └──────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare account
- Telegram Bot

### 1. Clone and Install

```bash
git clone https://github.com/amakhnev/cloudflare-workers-turnstile-telegram-api.git
cd cloudflare-workers-turnstile-telegram-api
npm install
```

### 2. Set Up Cloudflare Turnstile

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** in the sidebar
3. Click **Add Site**
4. Enter your site details:
   - **Site name**: Your identifier
   - **Domain**: Your website domain(s)
   - **Widget Mode**: Choose based on your needs:
     - **Managed** - Cloudflare decides when to show challenge
     - **Non-interactive** - Never shows visual challenge
     - **Invisible** - Completely invisible to users
5. Copy the **Site Key** (for frontend) and **Secret Key** (for backend)

📚 [Turnstile Documentation](https://developers.cloudflare.com/turnstile/)

### 3. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the **Bot Token** provided
4. To get your **Chat ID**:
   - Start a chat with your bot
   - Send any message to the bot
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find `"chat":{"id":YOUR_CHAT_ID}` in the response

📚 [Telegram Bot API Documentation](https://core.telegram.org/bots/api)

### 4. Configure Secrets

Set up your secrets using Wrangler CLI:

```bash
# Required secrets
wrangler secret put TURNSTILE_SECRET_KEY
# Enter your Turnstile secret key when prompted

wrangler secret put TELEGRAM_BOT_TOKEN
# Enter your Telegram bot token when prompted

wrangler secret put TELEGRAM_CHAT_ID
# Enter your Telegram chat ID when prompted

# Optional: API key for additional security
wrangler secret put API_KEY
# Enter a strong random string when prompted
```

### 5. Deploy

```bash
# Development
npm run dev

# Production
npm run deploy
```

### 6. Configure Custom Domain (Optional)

After deploying, you can map your Worker to a custom domain:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. Click on your worker (`turnstile-telegram-api`)
3. Navigate to **Settings** → **Domains & Routes**
4. Click **Add** → **Custom Domain**
5. Enter your domain (e.g., `api.yourdomain.com`)
6. Cloudflare will automatically create the DNS record

**Requirements:**
- Your domain must be managed by Cloudflare DNS
- The domain must have the orange cloud (proxy) enabled

Your Worker will then be accessible at `https://api.yourdomain.com/notify`

### Default URL
Without custom domain, your worker is available at:

https://turnstile-telegram-api.<your-account>.workers.dev

You can find your exact URL after running npm run deploy - it will be printed in the terminal.

## API Reference

### Health Check

Check if the service is running and configured.

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "healthy",
    "timestamp": "2024-12-10T12:00:00.000Z",
    "config": {
      "turnstile": true,
      "telegram": true,
      "apiKeyRequired": false
    }
  }
}
```

### Send Notification

Send a notification after Turnstile verification.

```http
POST /notify
Content-Type: application/json
X-API-Key: your-api-key  # Optional, if API_KEY is configured
```

**Request Body:**
```json
{
  "turnstile_token": "0.xxxxx",
  "message": "Your notification message",
  "subject": "Optional Subject",
  "metadata": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Notification sent successfully"
}
```

**Error Responses:**

| Status | Message |
|--------|---------|
| 400 | Invalid JSON body |
| 400 | Missing required field: turnstile_token |
| 400 | Missing required field: message |
| 401 | Missing API key |
| 401 | Invalid API key |
| 403 | Turnstile verification failed |
| 500 | Telegram action not properly configured |

## Frontend Integration


### Adding Turnstile Widget

#### Option 1: Explicit Rendering (Recommended)

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
<body>
  <form id="notification-form">
    <textarea name="message" placeholder="Your message" required></textarea>
    
    <!-- Turnstile Widget Container -->
    <div class="cf-turnstile" 
         data-sitekey="YOUR_TURNSTILE_SITE_KEY"
         data-callback="onTurnstileSuccess">
    </div>
    
    <button type="submit" id="submit-btn" disabled>Send Notification</button>
  </form>

  <script>
    let turnstileToken = null;

    function onTurnstileSuccess(token) {
      turnstileToken = token;
      document.getElementById('submit-btn').disabled = false;
    }

    document.getElementById('notification-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const message = e.target.message.value;
      
      try {
        const response = await fetch('https://your-worker.your-account.workers.dev/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Include if API_KEY is configured
            // 'X-API-Key': 'your-api-key'
          },
          body: JSON.stringify({
            turnstile_token: turnstileToken,
            message: message,
            subject: 'Contact Form Submission'
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert('Message sent successfully!');
          // Reset Turnstile widget
          turnstile.reset();
          turnstileToken = null;
        } else {
          alert('Error: ' + data.message);
        }
      } catch (error) {
        alert('Network error. Please try again.');
      }
    });
  </script>
</body>
</html>
```

#### Option 2: Invisible Turnstile

```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<div id="turnstile-container"></div>

<script>
  async function submitWithTurnstile(message) {
    return new Promise((resolve, reject) => {
      turnstile.render('#turnstile-container', {
        sitekey: 'YOUR_TURNSTILE_SITE_KEY',
        callback: async (token) => {
          try {
            const response = await fetch('https://your-worker.your-account.workers.dev/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                turnstile_token: token,
                message: message
              })
            });
            resolve(await response.json());
          } catch (error) {
            reject(error);
          }
        },
        'expired-callback': () => reject(new Error('Token expired')),
        'error-callback': () => reject(new Error('Turnstile error'))
      });
    });
  }
</script>
```

#### Option 3: React Integration

```jsx
import { useEffect, useRef, useState } from 'react';

function TurnstileWidget({ siteKey, onVerify }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (window.turnstile && containerRef.current) {
      window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
      });
    }
  }, [siteKey, onVerify]);

  return <div ref={containerRef} />;
}

function NotificationForm() {
  const [token, setToken] = useState(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const response = await fetch('https://your-worker.your-account.workers.dev/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        turnstile_token: token,
        message,
        subject: 'React Form Submission'
      })
    });
    
    const data = await response.json();
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea 
        value={message} 
        onChange={(e) => setMessage(e.target.value)} 
        required 
      />
      <TurnstileWidget 
        siteKey="YOUR_TURNSTILE_SITE_KEY" 
        onVerify={setToken} 
      />
      <button type="submit" disabled={!token}>Send</button>
    </form>
  );
}
```

📚 [Turnstile Client-Side Integration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TURNSTILE_SECRET_KEY` | Yes | Cloudflare Turnstile secret key |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram Bot API token |
| `TELEGRAM_CHAT_ID` | Yes | Telegram chat ID for notifications |
| `API_KEY` | No | Optional API key for authentication |
| `ALLOWED_ORIGINS` | No | Comma-separated list of allowed origins (default: `*`) |

### wrangler.toml Options

```toml
name = "turnstile-telegram-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"

# Configure allowed origins (optional)
[vars]
ALLOWED_ORIGINS = "https://example.com,https://app.example.com"

# Enable Workers Logs (optional)
[observability]
enabled = true
```

## Extending with Custom Actions

The action layer is designed to be easily replaceable. To add a new notification action:

### 1. Create a New Action

```typescript
// src/actions/slack.ts
import type { Action, ActionPayload, ActionResult } from './types';

export class SlackAction implements Action {
  constructor(private webhookUrl: string) {}

  validate(): boolean {
    return Boolean(this.webhookUrl);
  }

  async execute(payload: ActionPayload): Promise<ActionResult> {
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: payload.subject 
          ? `*${payload.subject}*\n${payload.message}` 
          : payload.message
      })
    });

    return {
      success: response.ok,
      message: response.ok ? 'Slack notification sent' : 'Failed to send'
    };
  }
}
```

### 2. Export the Action

```typescript
// src/actions/index.ts
export { TelegramAction } from './telegram';
export { SlackAction } from './slack';
export type { Action, ActionPayload, ActionResult } from './types';
```

### 3. Use in Handler

```typescript
// In src/index.ts
import { SlackAction } from './actions';

const action = new SlackAction(env.SLACK_WEBHOOK_URL);
```

## Testing

### Local Development

```bash
npm run dev
```

### Test with cURL

```bash
# Health check
curl http://localhost:8787/health

# Send notification (use a test token in development)
curl -X POST http://localhost:8787/notify \
  -H "Content-Type: application/json" \
  -d '{
    "turnstile_token": "test-token",
    "message": "Hello from cURL!",
    "subject": "Test"
  }'
```

### Turnstile Test Keys

For development, use Cloudflare's test keys:

| Key Type | Value | Behavior |
|----------|-------|----------|
| Site Key | `1x00000000000000000000AA` | Always passes |
| Site Key | `2x00000000000000000000AB` | Always blocks |
| Secret Key | `1x0000000000000000000000000000000AA` | Always passes |
| Secret Key | `2x0000000000000000000000000000000AA` | Always fails |

📚 [Turnstile Testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

## CI/CD with GitHub Actions

This project includes a GitHub Actions workflow that automatically tests and deploys your Worker.

### Workflow Features

- **Type checking** on every push and PR to `main`
- **Automatic deployment** to Cloudflare Workers on push to `main`
- **Secrets managed on Cloudflare** - no duplication needed

### Required GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Required | How to Get It |
|--------|----------|---------------|
| `CLOUDFLARE_API_TOKEN` | Yes | [Create API Token](#creating-cloudflare-api-token) |
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Dashboard URL: `dash.cloudflare.com/<ACCOUNT_ID>/...` |

**Note:** App secrets (`TURNSTILE_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, etc.) are managed only on Cloudflare via `wrangler secret put`. They persist across deployments - no need to set them in GitHub.

### Creating Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use the **Edit Cloudflare Workers** template, or create custom token with:
   - **Account** → **Workers Scripts** → **Edit**
   - **Zone** → **Zone** → **Read** (if using custom domains)
4. Click **Continue to summary** → **Create Token**
5. Copy the token and add it as `CLOUDFLARE_API_TOKEN` secret in GitHub

### Finding Your Account ID

Your Cloudflare Account ID is in the URL when you're logged into the dashboard:

```
https://dash.cloudflare.com/abc123def456/workers
                         ^^^^^^^^^^^^
                         This is your Account ID
```

Or go to **Workers & Pages** → **Overview** → Look for **Account ID** in the right sidebar.

## Security Best Practices

1. **Always use HTTPS** - Cloudflare Workers automatically serve over HTTPS
2. **Enable API Key** - Add an extra layer of protection for your endpoint
3. **Restrict CORS origins** - Set `ALLOWED_ORIGINS` to your specific domains
4. **Monitor usage** - Enable Workers Logs to track suspicious activity
5. **Rate limiting** - Consider adding [Cloudflare Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)

## Troubleshooting

### Common Issues

**"Turnstile verification failed"**
- Ensure your Turnstile secret key is correct
- Check that the site key matches the domain
- Token may have expired (10 min lifetime)

**"Telegram action not properly configured"**
- Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set
- Ensure the bot has permission to send messages to the chat

**CORS Errors**
- Check `ALLOWED_ORIGINS` includes your frontend domain
- Ensure your frontend is making requests correctly

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [Turnstile Client-Side Rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
- [Turnstile Server-Side Validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

## License

MIT
