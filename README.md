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
- `script.js`: client behavior, GA4 tracking, and admin/config loading
- `resume.html`: resume preview and download page
- `admin.html`: server-backed admin editor
- `api/config.js`: Vercel function for reading and saving live site config
- `api/upload.js`: Vercel function for uploading files used by the live site
- `api/contact.js`: Vercel function for sending contact messages through Resend

## What to update later

1. In Vercel, add a Blob store and expose `BLOB_READ_WRITE_TOKEN` to the project.
2. In Vercel, add `ADMIN_PASSWORD` and set it to your chosen save password.
3. In Vercel, add `RESEND_API_KEY`.
4. In Vercel, add `RESEND_FROM_EMAIL` using a verified sender/domain in Resend.
5. Optionally add `CONTACT_TO_EMAIL` if you want messages sent somewhere other than `fvitak@gmail.com`.
6. Push the repo to `https://github.com/fvitak/Frank_Vitak_Experiments`.
7. Connect the repo to Vercel.

## Tracking behavior

All major links use a `data-analytics-label` attribute and send `portfolio_click` events to GA4.

## Admin behavior

The `Admin` button opens a simple editor page. Saving changes now goes through Vercel serverless
functions and persists configuration in Vercel Blob storage, so visitors see updated links and
uploaded files after changes are saved.

## Contact flow

The homepage email action now opens a contact form modal that sends messages through Resend using
the server-side `api/contact.js` function.
