# Frank Vitak Portfolio

Employer-facing static portfolio for:

- LinkedIn profile
- CSM certificate
- CSPO certificate
- Resume
- Links to experimental web apps
- Google Analytics click tracking

## Files

- `index.html`: employer-facing homepage with selected work, resume, credentials, and contact
- `styles.css`: shared visual system and responsive layout
- `script.js`: click tracking and Google Analytics placeholder setup
- `resume.html`: resume preview and download page

## What to update later

1. Replace `G-XXXXXXXXXX` in `script.js` with your GA4 measurement ID.
2. Push the repo to `https://github.com/fvitak/Frank_Vitak_Experiments`.
3. Connect the repo to Vercel.

## Tracking behavior

All major links use a `data-analytics-label` attribute. When Google Analytics is configured,
the site sends a `portfolio_click` event for each tracked click. Until then, clicks are logged
to the browser console for local testing.
