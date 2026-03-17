# QualyLeads Backend

AI-powered sales setter for SMEs — Gyms, Plumbers, and Agencies.

## Architecture

```
Incoming Lead (webhook)
        │
        ▼
  ┌─────────────┐
  │  Express    │  POST /webhook/lead
  │  Server     │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  Blueprint  │  Selects logic based on Industry
  │  Engine     │  (gym / plumber / agency)
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  OpenAI     │  GPT-4o generates personalised SMS
  │  GPT-4o     │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐       ┌──────────────┐
  │   Twilio    │──────▶│  Lead's Phone│
  │   SMS       │       └──────────────┘
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  Supabase   │  Saves lead + all messages
  │  Database   │
  └─────────────┘
```

When a lead replies, Twilio calls `POST /sms/reply`, which continues
the AI conversation using full chat history from Supabase.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your keys
```

### 3. Set up Supabase
- Create a new Supabase project at https://supabase.com
- Open the SQL Editor and run `supabase-schema.sql`
- Copy your Project URL and Service Role key into `.env`

### 4. Set up Twilio
- Buy a phone number in your [Twilio Console](https://console.twilio.com)
- Under the number's settings → Messaging → set webhook to:
  `https://your-domain.com/sms/reply`
- Add your Account SID, Auth Token, and phone number to `.env`

### 5. Start the server
```bash
npm run dev      # development (with auto-reload)
npm start        # production
```

---

## API Reference

### `POST /webhook/lead`
Receives a new lead and triggers the AI outreach.

**Headers:**
```
x-webhook-secret: your-secret-token
Content-Type: application/json
```

**Body:**
```json
{
  "name": "John Smith",
  "phone": "+31612345678",
  "industry": "gym"
}
```

**Response:**
```json
{
  "success": true,
  "leadId": "uuid-here",
  "message": "Lead processed and SMS sent.",
  "preview": "Hey John! Congrats on taking the first step..."
}
```

**Supported industry values:**
| Value | Blueprint Used |
|-------|---------------|
| `gym`, `fitness`, `sport` | Gym Blueprint |
| `plumber`, `plumbing`, `home service` | Plumber Blueprint |
| `agency`, `marketing`, `digital`, `seo` | Agency Blueprint |
| anything else | General Blueprint |

---

### `POST /sms/reply`
Twilio calls this when a lead replies. Not called manually.

---

### `GET /health`
Returns `{ status: "ok" }` — useful for uptime monitoring.

---

## Project Structure

```
qualyleads/
├── src/
│   ├── index.js                  # Express server entry point
│   ├── blueprints/
│   │   └── index.js              # Industry logic blueprints
│   ├── routes/
│   │   ├── webhook.js            # POST /webhook/lead
│   │   └── sms.js                # POST /sms/reply (Twilio)
│   └── services/
│       ├── openai.js             # GPT-4o message generation
│       ├── twilio.js             # SMS sending
│       └── supabase.js           # Database (leads + messages)
├── supabase-schema.sql           # Run this in Supabase SQL Editor
├── .env.example                  # Environment variable template
└── package.json
```

---

## Adding a New Industry Blueprint

Edit `src/blueprints/index.js`:

```javascript
const blueprints = {
  // ... existing blueprints ...

  dentist: {
    industry: "Dental Practice",
    persona: "You are a friendly patient coordinator at a dental clinic.",
    goal: "Book a new patient consultation.",
    tone: "Calm, caring, and reassuring.",
    context: `
      - Mention free new patient consultations
      - Address common fears about dental visits
      - Highlight flexible appointment times
    `,
    openingStrategy: "Start with a warm welcome and mention the free consultation offer.",
  },
};
```

Then add the keyword matcher in `getBlueprint()`:
```javascript
if (key.includes("dentist") || key.includes("dental")) {
  return blueprints.dentist;
}
```

---

## Deployment

Recommended: **Railway**, **Render**, or **Fly.io** for simple Node.js hosting.

1. Push to GitHub
2. Connect your repo to Railway/Render
3. Add environment variables in the dashboard
4. Set your Twilio webhook to your live URL
