# Solapur HeatGuard Frontend

Static frontend bot UI for deployment on Vercel.

## Files

- `index.html` - UI shell
- `styles.css` - visual style
- `app.js` - bot chat logic
- `config.js` - backend API base URL config

## Local Run

1. Start backend from `women-crime-backend`:

   ```bash
   node server.js
   ```

2. Open this frontend by serving `frontend-bot-ui` (recommended):

   ```bash
   # from frontend-bot-ui folder
   npx serve .
   ```

3. Visit the local frontend URL and send:
   - `hi`
   - `Sunstroke Help`

## Production Setup

1. Deploy backend to Render.
2. In `config.js`, change:

   ```js
   API_BASE_URL: "https://<your-render-backend-domain>"
   ```

3. Deploy `frontend-bot-ui` to Vercel as a static site.

## Notes

- Backend endpoint used by UI: `POST /api/dialogflow`
- Keep service-account JSON only on backend, never on frontend.
