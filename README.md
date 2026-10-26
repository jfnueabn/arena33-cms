# Arena33 — SEO landing page + admin CMS

A server-rendered SEO landing page whose content is fully editable from an admin panel.
Stack: **Node.js · Express · MySQL · EJS** (no frontend framework).

## Quick start

```bash
npm install
cp .env.example .env      # then fill in DB_USER / DB_PASSWORD and the admin login
npm run db:setup          # creates the database, tables, default content and first admin
npm start                 # http://localhost:3000   admin: http://localhost:3000/admin
```

`npm run db:reset` drops the CMS tables and reseeds from `backend/db/defaults.js`.

## Project structure

```text
arena33-cms/
├── backend/
│   ├── server.js       # Starts the HTTP server
│   ├── app.js          # Express configuration and route registration
│   ├── routes/         # Public, admin page and admin API endpoint definitions
│   ├── controllers/    # Request handlers grouped by feature
│   ├── middleware/     # Authentication, uploads and error handling
│   ├── services/       # Section revision operations
│   ├── config/         # Session configuration
│   ├── utils/          # Shared view and URL helpers
│   └── db/             # MySQL connection, schema, setup and default content
├── views/              # EJS page templates
├── public/             # Browser JavaScript, CSS and uploaded images
├── package.json        # Shared dependencies and commands
├── render.yaml         # Deployment configuration
└── .env                # Local environment settings (not committed)
```

Run all npm commands from the project root. The backend loads `.env` and relative
`DB_CA_CERT_PATH` values from the project root, regardless of the working directory.
New server-side functionality belongs in `backend/`; browser assets belong in
`public/` and page templates in `views/`.

To add an API feature, put its request handlers in `backend/controllers/` and
register its endpoints in `backend/routes/admin-api.js`. All routes in that router
share the admin authentication and CSRF middleware. For a separate feature router,
mount it in `backend/app.js` and apply the appropriate authentication middleware.
Run backend route checks with `node --test backend/tests/routes.test.js`.

## How it works

```
Admin form (/admin) ──PUT /api/admin/…──▶ MySQL ──▶ GET / renders EJS ──▶ full HTML for Google
```

- **Homepage (`/`)** is rendered on the server, so search engines receive complete HTML —
  title, meta, Open Graph and JSON-LD all come from the database.
- **Admin (`/admin`)** is a login-protected dashboard. Each section's form is generated from its
  JSON content, so adding a field in `backend/db/defaults.js` gives it an input automatically.

## Database

| Table | Purpose |
|---|---|
| `admins` | Admin users (bcrypt password hashes) |
| `settings` | Key/value site settings: SEO title, description, canonical, OG image, colours, GA ID |
| `sections` | One row per homepage section: heading columns + `content` JSON, visibility, sort order |
| `section_revisions` | Snapshot before every save (last 20 per section) for one-click restore |
| `sessions` | Login sessions (created automatically by express-mysql-session) |

## What the admin can edit

- **SEO & settings:** page title / meta description (with character counters and a Google preview),
  keywords, canonical URL, social share image, index/noindex, language, brand colours, Google Analytics ID
- **Header & footer:** logo (text or image), menu links, buttons, footer columns, contact email, copyright
- **Every section:** label / title / subtitle, all text, buttons, images (upload), list items
  (add · remove · reorder), countdown date, promo expiry, wheel prizes & colours, plans and prices
- **Layout:** show/hide and drag-to-reorder sections
- **History:** restore any of the last 20 versions of a section

## SEO features

Server-side rendering · one H1 per page · semantic landmarks · canonical + hreflang-ready ·
Open Graph / Twitter cards · JSON-LD (Organization, WebSite, FAQPage generated from the FAQ section) ·
dynamic `robots.txt` and `sitemap.xml` (lastmod = last content update) · mobile-first, fast, no images required.

## Security

bcrypt password hashing · session regenerated on login · httpOnly + SameSite=strict cookies ·
login lockout after 5 failed attempts · CSRF header check on API writes · parameterised SQL ·
all output HTML-escaped by EJS · link URLs restricted to http(s)/mailto/tel/relative ·
image uploads limited to PNG/JPG/WEBP/GIF ≤ 2 MB (no SVG).

## Deploy to Render (with Aiven MySQL)

Render has no managed MySQL, so the database runs on Aiven's free MySQL plan.

1. **Aiven:** sign up at aiven.io → *Create service* → **MySQL**, Free plan. When it's running,
   open *Overview* and note Host, Port, User, Password, and download the **CA certificate**.
2. **Render:** *New → Blueprint* → connect this GitHub repo. Render reads `render.yaml` and asks for:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` — from Aiven
   - `DB_CA_CERT` — paste the full contents of the CA certificate file
   - `ADMIN_PASSWORD` — the password for the `/admin` login (min 6 characters)
3. Deploy. On start, `npm run db:setup` creates the `arena33` database, tables, content and admin.
4. Open `https://<your-app>.onrender.com/admin`, log in, and check **SEO & site settings → Canonical URL**.

**Changing the admin password later:** use *Change password* inside the admin, or change `ADMIN_PASSWORD`
in Render's Environment tab, add `ADMIN_RESET_PASSWORD=true`, redeploy once, then remove that variable
(otherwise every restart resets the password). Locally: edit `.env`, then run `npm run admin:password`.

Notes for the free plan: the app sleeps after ~15 minutes idle (first visit takes ~30–60 s to wake),
and the disk is temporary, so **uploaded images are lost on each redeploy** — use image URLs
(e.g. from an image host) for anything that must stay.
