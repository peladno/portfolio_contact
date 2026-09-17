# Contact Form Email Worker

A lightweight, serverless email backend built with **Cloudflare Workers** and **Resend** to handle contact form submissions from your website or portfolio.

---

## Features

- **Serverless & Fast**: Runs globally on Cloudflare's edge network with ultra-low latency.
- **Resend Integration**: Sends transactional emails via the Resend REST API using native `fetch` (no bulky dependencies).
- **Anti-Spam Honeypot**: Silently discards bot submissions that fill the hidden `bot_field`.
- **HTML Sanitization**: Escapes user input to protect against HTML and script injection in your email inbox.
- **Direct Reply-To**: When you click "Reply" in your email client (e.g. Gmail), you reply directly to the person who filled out the form.
- **Custom Domain Optional**: Works out of the box with Resend's free testing sender (`onboarding@resend.dev`) or your own verified domain.
- **CORS Configured**: Pre-configured for cross-origin requests from your frontend.

---

## Project Structure

```text
├── src/
│   └── index.ts               # Worker entrypoint (CORS, validation, Resend API call)
├── .dev.vars                  # Local environment secrets (gitignored)
├── wrangler.jsonc             # Cloudflare Wrangler configuration
├── worker-configuration.d.ts  # Auto-generated Cloudflare environment types
├── package.json               # Scripts and dev dependencies
└── tsconfig.json              # TypeScript configuration
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- A free [Resend](https://resend.com/) account and an API Key (`re_...`)
- A [Cloudflare](https://dash.cloudflare.com/) account (for deployment)

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
npm install
```

### 2. Configure Local Secrets

Create a `.dev.vars` file in the project root:

```ini
# .dev.vars
RESEND_API_KEY=re_your_api_key_here
MY_EMAIL=your_email@gmail.com
FROM_EMAIL=Acme <onboarding@resend.dev>
```

> **Note**: If you don't have a verified custom domain on Resend, keep `FROM_EMAIL=Acme <onboarding@resend.dev>` and make sure `MY_EMAIL` is set to the same email address you registered with on Resend.

### 3. Run Locally

Start the Wrangler development server:

```bash
npm run dev
```

The worker will be available at `http://127.0.0.1:8787`.

---

## Testing the Worker

You can test the endpoint from your terminal using any of the following:

### Using PowerShell

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8787" -Method Post -ContentType "application/json" -Body '{"name":"John Doe","email":"john@example.com","message":"Hello from my terminal!"}'
```

### Using Node.js

```bash
node -e "fetch('http://127.0.0.1:8787', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'John Doe', email: 'john@example.com', message: 'Testing contact form'}) }).then(r => r.json()).then(console.log)"
```

### Using cURL

```bash
curl -X POST http://127.0.0.1:8787 \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","message":"Testing contact form"}'
```

---

## Frontend Integration

### HTML Form Example

Include a hidden honeypot input (`bot_field`) to trap spam bots:

```html
<form id="contact-form">
	<!-- Honeypot (hidden from human visitors) -->
	<input type="text" name="bot_field" style="display: none;" tabindex="-1" autocomplete="off" />

	<div>
		<label for="name">Name</label>
		<input type="text" id="name" name="name" required />
	</div>

	<div>
		<label for="email">Email</label>
		<input type="email" id="email" name="email" required />
	</div>

	<div>
		<label for="message">Message</label>
		<textarea id="message" name="message" rows="4" required></textarea>
	</div>

	<button type="submit">Send Message</button>
	<p id="form-status"></p>
</form>
```

### JavaScript Fetch Example

```javascript
const form = document.getElementById('contact-form');
const statusText = document.getElementById('form-status');

// Replace with your local dev URL or your production Cloudflare Worker URL
const WORKER_URL = 'http://127.0.0.1:8787';

form.addEventListener('submit', async (e) => {
	e.preventDefault();
	statusText.textContent = 'Sending...';

	const formData = new FormData(form);
	const payload = {
		name: formData.get('name'),
		email: formData.get('email'),
		message: formData.get('message'),
		bot_field: formData.get('bot_field') || '',
	};

	try {
		const response = await fetch(WORKER_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		const result = await response.json();

		if (response.ok) {
			statusText.textContent = 'Message sent successfully!';
			form.reset();
		} else {
			statusText.textContent = result.error || 'Failed to send message.';
		}
	} catch (error) {
		statusText.textContent = 'Network error. Please try again later.';
	}
});
```

---

## Production Deployment

### 1. Set Your Resend API Key in Cloudflare Secrets

Run the following command to store your API Key securely on Cloudflare:

```bash
npx wrangler secret put RESEND_API_KEY
```

When prompted, paste your Resend API Key (`re_...`).

### 2. Verify `wrangler.jsonc` Variables

Ensure `vars` in `wrangler.jsonc` contains your recipient and sender emails:

```jsonc
"vars": {
  "MY_EMAIL": "your_email@gmail.com",
  "FROM_EMAIL": "Acme <onboarding@resend.dev>"
}
```

### 3. Deploy to Cloudflare

```bash
npm run deploy
```

Wrangler will output your live public URL:

```text
https://worker.<your-subdomain>.workers.dev
```

Replace the `WORKER_URL` in your frontend code with this production URL.

---

## Available Scripts

| Script         | Command              | Description                                                  |
| :------------- | :------------------- | :----------------------------------------------------------- |
| **dev**        | `npm run dev`        | Runs the local development server at `http://127.0.0.1:8787` |
| **deploy**     | `npm run deploy`     | Deploys the worker to Cloudflare                             |
| **cf-typegen** | `npm run cf-typegen` | Regenerates TypeScript types from `wrangler.jsonc`           |
| **test**       | `npm test`           | Runs the test suite via Vitest                               |

---

## License

MIT
