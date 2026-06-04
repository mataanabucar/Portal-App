# Graph Tester mail body rendering log

## 2026-05-22

- Updated the Graph tester result renderer so `mail.getMessage` now renders the
  full returned `body.content` when the response includes body data.
- Added a lightweight HTML sanitizer for the rendered message body, so the
  tester can show the email markup without exposing obvious script or handler
  injection vectors.
- Kept list-style mail results compact, so `mailMessages` views still show the
  existing preview behavior instead of expanding every row into full message
  content.
- Added supporting styles for the expanded mail body section so long HTML
  messages can flow naturally instead of being clipped by the preview card.
- Validation: `node --check src/graph-tester/public/app.js`
