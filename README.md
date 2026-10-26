# Cabline — taxi company demo

Cabline is a browser application built with plain HTML, CSS, and JavaScript. It does not use React, Next.js, or a database. The small Node.js server is for local development only. Vercel serves the built web pages directly.

## Open it on Vercel (no downloads needed)

1. Sign in to [Vercel](https://vercel.com/) using your GitHub account.
2. Choose **Add New → Project** and import **Craigaberdeen/New-Application**. If it is missing, allow Vercel access to that repository.
3. Use branch **main**. Leave **Root Directory** at the repository root (blank or `./`).
4. Choose **Other** as the framework. The included `vercel.json` sets **Build Command** to `npm run build` and **Output Directory** to `dist`. Leave **Install Command** at its default. If asked for a Node.js version, choose **24.x**.
5. Leave **Environment Variables** empty and click **Deploy**.
6. When Vercel finishes, click **Visit** to open the app. Copy that address to open it on your phone or share the demo.

You do not need a Netlify token or Vercel token when using this GitHub import flow. Vercel will ask you to connect GitHub and choose a plan if necessary. No deployment URL exists until you complete deployment in your Vercel account.

## What to try

- **Overview:** view example jobs, go on a break, or end a shift with an odometer reading of at least 42,816.
- **Book a taxi:** create a booking; use its details button to edit or cancel it.
- **My jobs:** start a journey when available, then complete it and enter the final fare.
- **Vehicle & checks:** confirm safety checks, report a defect with an optional photo, or switch vehicle with both odometer readings.
- **Company settings:** change the base fare, price per mile, and company percentage.
- **Shift log:** download the completed jobs and fare split as an Excel-compatible `.xml` spreadsheet. This is not an `.xlsx` file.

The demo starts as a fictional driver already on shift. There is no password or login. Use made-up information while testing. Each browser keeps its own data; another device will not see your bookings. Clearing the site's browser data resets the demo. You will also see fresh sample data if you switch between a Vercel preview URL and its main URL.

## Database, keys, and variables

**None are required for this demo.** Data and defect photos are saved in the current browser's local storage. Location access is optional and requested only when using “Use current location”; it requires HTTPS or localhost. It fills coordinates, not a street address. Fonts optionally load from Google Fonts; the app also works with system fonts.

`PORT` optionally changes the local development server port (default 3000). `SERVE_DIST=1` optionally serves the built `dist` folder locally. Neither is required on Vercel. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` optionally points browser tests at an installed Chromium browser.

## Build and tests (for developers)

Requires Node.js 22 or newer (24 recommended).

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

`npm test` checks the local web server. Browser tests exercise the built `dist` app: desktop/mobile navigation, bookings and persistence, cancellation, driver break status, journey completion, mileage validation, Excel export, vehicle switching, safety checks, fare settings, and defect photos. If Chromium is already at `/usr/bin/chromium`, the tests use it automatically. Otherwise install Playwright's Chromium as shown above. On Linux, additional browser system packages may require `npx playwright install --with-deps chromium`.

For local use: `npm start`, then open port 3000. No build is necessary for local development; the server reads `public` directly. The build checks JavaScript and copies the browser files into `dist` for deployment. The files `node_modules` and `dist` are generated and intentionally not committed; Vercel recreates them using the committed `package-lock.json`.

## Demo limitations — not ready for real taxi operations

This is a single-device prototype, not a complete booking or dispatch service. It has no secure login, account roles, shared booking database, automatic allocation, road-based ETA calculation, live GPS tracking, payments, notifications, or installable phone app. The 15-minute location sharing rule is not implemented. Estimated fares use manually entered distance; pickup time requires dispatcher confirmation. Customer and driver screens can both be opened by anyone viewing the demo.

Reports currently include all locally completed journeys, not separate historical driver/shift records. Company split changes recalculate the demo's historical totals. A production version needs permanent shift records, a stored fare policy for each job, and per-driver/per-vehicle job assignment. Photos and vehicle checks remain in the current browser rather than being sent to a company office. Starting a new shift does not archive jobs into a separate shift.

A production service needs a secure backend/database, login and permissions, durable image storage, mapping/routing and live location services, company configuration, data protection controls, and additional business rules and testing. Choose those providers before configuring API keys or database credentials.
