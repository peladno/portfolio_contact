/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// export default {
// 	async fetch(request, env, ctx): Promise<Response> {
// 		return new Response("Hello World!");
// 	},
// } satisfies ExportedHandler<Env>;

export interface Env {
	RESEND_API_KEY: string;
	MY_EMAIL: string; // Personal email where you will receive messages
	FROM_EMAIL: string; // Verified sender email in Resend (e.g. onboarding@your-domain.com or onboarding@resend.dev)
	TURNSTILE_SECRET_KEY?: string; // Optional if using Cloudflare Turnstile
}

function escapeHtml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Configure CORS headers to allow requests from your frontend
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*', // Or set to your specific portfolio URL for increased security
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		if (request.method !== 'POST') {
			return new Response('Method not allowed', { status: 405, headers: corsHeaders });
		}

		try {
			const body: any = await request.json();
			const { name, email, message, bot_field } = body;

			// 1. Anti-spam protection: Honeypot (If a bot fills this hidden field, fake success without sending anything)
			if (bot_field) {
				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			// 2. Validate required fields
			if (!name || !email || !message) {
				return new Response(JSON.stringify({ error: 'Missing required fields (name, email, message)' }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			if (!env.RESEND_API_KEY || env.RESEND_API_KEY === 'tu_resend_api_key_aqui') {
				return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not properly configured in .dev.vars' }), {
					status: 500,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			// 3. Send email via Resend API
			const resendResponse = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${env.RESEND_API_KEY}`,
				},
				body: JSON.stringify({
					from: env.FROM_EMAIL || 'Acme <onboarding@resend.dev>',
					to: [env.MY_EMAIL],
					subject: `New contact message from ${name}`,
					reply_to: email, // Allows replying directly to the sender from your email client
					html: `
            <h2>New message from your portfolio</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
          `,
				}),
			});

			const data = await resendResponse.json();

			if (!resendResponse.ok) {
				throw new Error(JSON.stringify(data));
			}

			return new Response(JSON.stringify({ success: true, data }), {
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};
