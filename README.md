# LV55 — SEO landing page + admin CMS

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
lv55-cms/
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

## Popular Games landing page

`/popular-games` is a server-rendered landing page with category filters, editable
game cards, provider names, guides, FAQ and calls to action. Manage it under
the **Editing page** selector in the admin dashboard, including its SEO fields
and publication status. Cards support images, links, ordering and visibility.
The initial game cards are sample content; replace them with your own collection.
No games are hosted or executed by this project.

Run `npm run db:setup` after upgrading to create and seed the `landing_pages` table
without replacing existing content. On first creation, the setup adds Popular Games
to the header navigation. Unpublished pages return 404 and leave the sitemap.

## Languages

Public pages support English (`/en/`), Bahasa Melayu (`/ms/`) and Simplified
Chinese (`/zh/`). The header language menu keeps visitors on the same page;
internal links stay in the selected language. Original URLs such as `/` and
`/popular-games` still serve English, with canonical URLs pointing to `/en/`.
Each version has its own title, description, HTML language and hreflang links,
and the sitemap includes all three languages.

The admin editor and preview display English only. Visitors choose their language on the public website.
English saves automatically refresh translations; section ordering, visibility, publication and branding remain shared.

Run `npm run db:setup` when upgrading to create translation tables and add the
initial Bahasa Melayu and Chinese content. Brand names, game titles and payment
provider names may remain in their original form.

## Shared page editor

### Homepage section builder

Select **Homepage → Add section** to create a blank section. Use **Add content** inside it to
combine Text, Image, Cards, Table, FAQ and Button blocks. Content blocks can be reordered and
deleted independently. **Use template** provides the earlier ready-made section layouts as shortcuts.
Blank homepage sections also have **Section layout & appearance** controls for one, two or three
columns, content width, padding, gaps, background image/colour and text colour. Each block's
**Layout & style** controls its column or full-width placement, alignment, width, text size,
padding, corner style and colours. Blocks can be duplicated. Columns stack on screens up to 700px.
Add a Heading block for an editable H2, H3 or H4 inside a column. Layout settings are shared
across languages; the translator only changes content text.
The homepage Hero now uses this same section builder: Label / Badge, an H1 Heading with optional
highlighted words, Text, Button group and Hero visual (image or emoji with editable tags).
Its existing content, translations and history are converted once by setup; the original records
are retained in `cms_migration_backups`. H1 headings are available in the block editor, with a
guard against publishing more than one H1 on a page. Hero gradient is an optional background
style rather than a separate fixed-content section template.
Hero visual tags have independent top/middle/bottom placement, left/centre/right alignment,
small/normal/large size, text colour and background colour. Tags in the same region stack
without overlapping. Existing string tags and older history entries retain their default positions
until edited; saved tag styling stays identical across languages.
Existing sections retain their layouts and content. Tables support 1–12 editable columns and up to 200 rows, with column and row
reordering. Existing two-column tables and older history snapshots retain their content.
New sections start hidden, in both the public page and admin preview. Edit the content, enable **Show this section on this page**, then save to make it public.
English saves also generate Malay and Chinese content.

Builder sections can be renamed, duplicated, reordered, hidden and removed. Existing homepage
sections, including the hero, can also be renamed and removed. Shared header/footer stay separate.
**Removed sections** restores content as hidden, including its history. Removal is stored separately
from visibility so rerunning setup does not recreate removed starter sections. Duplicating existing
legacy layouts and adding sections to other pages are outside this first homepage release.

Floating Register now and Log in links appear at the bottom of every public page.
Edit their labels or disable them under **Header & navigation → Floating actions**.
Their destinations follow the shared header's signup and login button URLs.

`/sports-betting` adds editable match previews, six sports categories, market guides,
getting-started steps, mobile information, responsible participation, FAQ and a
closing call to action. Scores and odds are labelled illustrative. The page does
not accept wagers or connect to a live sports feed. Run setup to add it to the
database and shared header without overwriting existing edits.

The `/welcome-bonus` landing page uses the same editor and is linked from the
shared header. Its nine sections cover the hero, bonus types, introduction, claim
steps, comparison, payment information, terms, FAQ and contact call to action.
Initial offers are marked as samples; replace them with confirmed offer details
and destination links. The landing page does not process claims or payments.
Running setup seeds the new page without replacing existing page or section edits.
The promotional layout includes six offer cards, editable artwork, payment tiles,
and a detailed comparison table. Set **Hero → Event date & time** to enable the
countdown; leaving it empty shows an unset-date placeholder. Setup upgrades untouched
starter content, preserves customised sections, and saves earlier content in section
history. The included offer amounts are illustrative examples.

All four landing pages use the same editor. Choose a page, then edit its SEO
and publication status under **Page settings & SEO**, or select one of its sections.
Sections support individual saves, visibility, drag/arrow ordering and revision
restore. The preview and View page link follow the selected page. Header, footer
and branding remain shared across the site.

Setup migrates existing homepage content and splits the original Popular Games
document into seven sections without overwriting saved edits. The original document
is retained in its database record as a migration backup. Rerunning setup does not
recreate or overwrite the migrated sections. Authenticated `?preview=1` requests
can preview an unpublished page; these previews use noindex and are not cached.

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
| `settings` | Shared branding, site canonical URL, language, analytics and global indexing settings |
| `landing_pages` | Page-specific SEO settings and publication status |
| `page_translations` | Bahasa Melayu and Chinese SEO content |
| `section_translations` | Language-specific section headings and JSON content |
| `sections` | Page-owned or shared sections: template, headings, content JSON, visibility and sort order |
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

### Automatic offline translations

The admin editor and preview display English only. Visitors can choose English, Bahasa Melayu or
Simplified Chinese on the public website. Saving a section or
page SEO generates Malay and Chinese versions locally using Argos/CTranslate2 models. Existing
approved starter phrases use the included dictionary; new text uses the local model. No translation
API or API key is required. Machine translations can need linguistic review.

On a new computer or server, install Python 3.12 with venv support, then run:

```sh
npm run translations:setup
npm run db:setup
npm run translations:sync
```

Setup downloads Python dependencies and two model packages once; translating content afterward
uses local files. Models and the Python environment live in ignored `.translation-runtime/`.
Set `TRANSLATION_SETUP_PYTHON` when the Python installer command is not `python` (Windows)
or `python3` (Linux). Optional `TRANSLATION_PYTHON` and `TRANSLATION_MODEL_DIR` override runtime paths.
Run setup on the hosting server too; the existing Node-only Render build does not install these models.

Source fingerprints prevent older translations from appearing after English changes. If the local
worker is unavailable, English still saves, the admin receives a pending warning, and affected public
content uses current English until the next save or `npm run translations:sync` succeeds.

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
3. Deploy. On start, `npm run db:setup` creates the `lv55` database, tables, content and admin.
4. Open `https://<your-app>.onrender.com/admin`, log in, and check **Site settings & branding → Site canonical URL**.

**Changing the admin password later:** use *Change password* inside the admin, or change `ADMIN_PASSWORD`
in Render's Environment tab, add `ADMIN_RESET_PASSWORD=true`, redeploy once, then remove that variable
(otherwise every restart resets the password). Locally: edit `.env`, then run `npm run admin:password`.

**Creating pages:** Add an internal link in **Header & navigation** and save. The CMS creates
a published page with one blank section and lists it in **Editing page**, in header order.
Leave the link URL empty to generate it from the English label, or enter a unique /page-url.
External links and #anchors do not create pages. Duplicate destinations are rejected. Use
**+ Add section** and **+ Add content** to build the page. Existing content is retained when
linking an existing page. Only header-linked pages appear in the editing selector.

**Homepage content:** All homepage body sections use the content item builder. Setup converts legacy
sections, translations and revision history once, preserving their saved copy and backing up originals
in `cms_migration_backups`. Shared header and footer remain in their shared editors. Use **+ Add content**
to search the reusable content types; the picker is sorted A–Z and scrolls independently. Countdown and
bonus wheel items support multiple instances on a page. Existing `#how` and `#signup` links are preserved.

**Popular Games:** All seven sections use the same item builder. Game collections, collection visuals,
provider lists and notices are reusable items in the searchable content picker. Category filters are
scoped to each collection so duplicated collections work independently. Existing game visibility,
destinations, copy, translations and revision history are retained, with migration backups. Empty
provider lists stay hidden from the public page. The `#game-collection` anchor is preserved.

**Welcome Bonus:** All nine sections use items, including reusable reward cards, offer collections,
breadcrumbs and bullet lists. The comparison table has editable columns, with eligibility retained
as a separate column. Setup preserves saved content, translations, revision history and offer/terms
anchors, and backs up the original sections before converting them.

**Remaining landing pages:** Sports Betting, Virtual Sports, Sports, Match Odds and Baccarat use
the item builder throughout. Match previews, highlights and sport category cards are reusable items.
Setup backs up and converts their legacy content, translations and history once. Existing section
anchors and destination links are retained; the shared header and footer keep their shared editors.

Notes for the free plan: the app sleeps after ~15 minutes idle (first visit takes ~30–60 s to wake),
and the disk is temporary, so **uploaded images are lost on each redeploy** — use image URLs
(e.g. from an image host) for anything that must stay.
