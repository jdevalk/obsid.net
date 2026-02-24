# Obsidian Link Redirect Worker

Cloudflare Worker that redirects requests like:

`https://obsid.net/?vault=Obsidian&file=Sites%2FJoost.blog%2FPosts`

to:

`obsidian://open?vault=Obsidian&file=Sites%2FJoost.blog%2FPosts`

## Setup

1. Install dependencies:
   `npm install`
2. Authenticate with Cloudflare:
   `npx wrangler login`
3. Deploy:
   `npm run deploy`

## Domain notes

- `wrangler.toml` is configured for custom domain `obsid.net`.
- Ensure the domain is added to your Cloudflare account.
- If you prefer `www.obsid.net` or a subdomain, change `routes` in `wrangler.toml`.

## Behavior

- Worker returns `400` if `vault` or `file` is missing.
- Redirect uses HTTP status `308`.
