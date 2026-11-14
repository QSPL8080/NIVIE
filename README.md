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

Every form submission (hero form + pop-up) is saved to MySQL through `app/api/leads/route.js`,
and shown in the admin panel at `/login` → `/panel`.

### Two databases, one codebase

| Where | Database | Settings come from |
| --- | --- | --- |
| Your PC (`npm run dev`) | local MySQL (`nivie_db`) | `.env.local` — never pushed to GitHub |
| Live site on Hostinger | Hostinger MySQL (`u123456789_…`) | hPanel → your Node.js app → **Environment variables** |

The code never contains database details, so pushing to GitHub changes nothing locally,
and the live site always uses the Hostinger database.

### Database structure updates itself — no phpMyAdmin

Tables are defined in **`lib/migrations.mjs`**. Each change runs once per database and is
recorded in the `schema_migrations` table. They are applied automatically:

- on every deploy — `npm run build` runs `scripts/migrate.mjs` first (Hostinger runs the build on every push)
- when the site first talks to the database after starting
- locally with `npm run db:migrate`

To change the database later, **add** a new migration at the bottom of `lib/migrations.mjs`
(never edit one that's already pushed), test with `npm run db:migrate`, then push.
If a migration has an SQL error, the Hostinger build fails and the old site stays online.

### Local setup

1. Copy `.env.example` to `.env.local` and fill in your local MySQL password and admin login.
2. `npm run db:migrate` → prints `✔ Database …` (creates `nivie_db` if needed).
3. `npm run dev`, submit the form, open `/login`.

If MySQL is unreachable the form still opens the visitor's email app, so no enquiry is lost —
the reason is printed in the terminal as `[leads] MySQL save failed: …`.

## Deploy on Hostinger (auto-deploy from GitHub)

1. **Database** — hPanel → *Websites* → *Manage* → *Databases* → *MySQL Databases* → create one.
   Note the full database name, user and password (host is `localhost`). Don't create any tables.
2. **App** — hPanel → *Websites* → *Add Website* → *Node.js web app* → *Import Git repository* →
   connect GitHub → pick `QSPL8080/NIVIE`, branch `main`. Framework: Next.js, Node 20+,
   build command `npm run build` (default).
3. **Environment variables** (same screen, or later under *Environment variables*):

   ```
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=u123456789_nivie        (from step 1)
   MYSQL_PASSWORD=…                   (from step 1)
   MYSQL_DATABASE=u123456789_nivie    (from step 1)
   ADMIN_EMAIL=…
   ADMIN_USERNAME=Nivie Admin
   ADMIN_PASSWORD=…                   (strong, not the local one)
   SESSION_SECRET=…                   (long random text, 32+ characters)
   ```

4. **Deploy.** From now on every `git push` to `main` rebuilds the site and updates the database.

### WhatsApp alert for every new enquiry

Each enquiry is also sent to WhatsApp (name, mobile, budget, location, property, timeline,
form, date & time in IST, lead ID and a link to the panel). Set up once:

1. On the phone with WhatsApp **+91 92263 33902**, open
   https://www.callmebot.com/blog/free-api-whatsapp-messages/ and save the CallMeBot number shown there.
2. Send it: `I allow callmebot to send me messages` — it replies with an **API key**.
3. In hPanel → Environment variables add `WHATSAPP_NOTIFY_PHONE=+919226333902`,
   `CALLMEBOT_APIKEY=<the key>` and `SITE_URL=https://niviedesignsstudio.com`, then redeploy.

If the alert can't be sent, the enquiry is still saved and the reason appears in the logs as `[whatsapp] Not sent: …`.

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
| Database tables / changes | `lib/migrations.mjs` |
| Lead status options & colours | `lib/leadStatus.js` |
| WhatsApp alert text | `lib/notify.js` |

## Fonts

Cormorant Garamond (headings) and Inter (text), self-hosted through `@fontsource` — no external font requests.
