# NIVIE — Nivie Designs landing page (Next.js)

One-page landing page built with Next.js (App Router), GSAP + ScrollTrigger and Lenis smooth scroll.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

## Open it on your phone / another computer (same Wi-Fi)

Fast, exactly like the live site (recommended for checking animations):

```bash
npm run network    # builds, then serves on port 3000
```

Then open the **Network** address it prints (e.g. `http://192.168.1.5:3000`) on the other device.

`npm run dev` also works on the network address, but development mode is always slower
(it compiles pages on demand), so animations can feel heavy there. Use `npm run network`
to judge speed and smoothness.

If Windows asks to allow Node.js through the firewall, click **Allow** (Private networks).

## Enquiries → MySQL

Every form submission (hero form + pop-up) is saved to MySQL through `app/api/leads/route.js`.

1. Copy `.env.example` to `.env.local` and fill in your MySQL password and admin login.
2. Create the database and table (only needed once):

   ```bash
   npm run db:setup
   ```

   It prints `✔ Database "nivie_db" and table "leads" are ready`. (Or run `sql/schema.sql` in MySQL Workbench.)
3. `npm run dev`, submit the form, then in Workbench refresh **SCHEMAS** → `nivie_db` → `leads`.
4. Admin panel: open `/login`, sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, and see all leads at `/panel`.

If MySQL is unreachable the form still opens the visitor's email app, so no enquiry is lost —
the reason is printed in the `npm run dev` terminal as `[leads] MySQL save failed: …`.

## Build for hosting

```bash
npm run build
npm start
```

Because enquiries are saved by a server route, the site needs **Node.js hosting**
(Vercel, Hostinger Node.js / VPS, Render…). Set the same `.env.local` values as
environment variables on the host, pointing `MYSQL_HOST` at the hosting company's MySQL server.

## Where to edit

| What | File |
| --- | --- |
| Projects, services, testimonials, contact details, Instagram images | `lib/content.js` |
| Terms & Conditions, Cookie Policy | `lib/legal.js` |
| Page title & meta description | `app/layout.js` |
| Section layout | `components/Sections.jsx`, `components/*.jsx` |
| Colours, fonts, styles | `app/globals.css` (variables at the top) |
| Animations (loader, cursor, scroll effects) | `components/Experience.jsx` |
| Images | `public/images/` |

## Fonts

Bodoni Moda (headings) and Familjen Grotesk (text), self-hosted through `@fontsource` — no external font requests.
