# Portal Parser Prompt And Open Actions

- Updated the structured portal parser prompt to follow the action-item analysis guide semantically while keeping the existing JSON schema and six-field OpenAI input payload intact.
- Bumped the parser debug response version to `2026-06-portal-parse-v2` in both enabled and disabled parser paths.
- Switched structured todo rendering to merge parser output with same-index snapshot records so request IDs, titles, links, owners, and due dates fall back to snapshot data when the model leaves them blank.
- Added lower-card request ID and `Open` actions for the top priority card and queue cards, using snapshot `href` and normal external links.
- Extended smoke coverage to verify parser versioning plus snapshot `id` and `href` retention through dashboard, cache, and HTML crawl scenarios.
- Follow-up adjustment: snapshot titles now stay authoritative for the card heading, and HTML crawl records derive their displayed ID from `editid` links or the request URL instead of the synthetic `row-#` fallback whenever possible.
- Follow-up adjustment: card headings now prefer parser-derived titles again, with summary-based fallback when the snapshot title is only a generic portal label such as `Help Me! #...`; the lower chip still uses the real action item ID from the portal link.
- Added a due-date badge to the top badge row on lead and queue cards, styled to match the urgency pill with a smaller relative-days sublabel. Removed the duplicate due date from the metadata chip row and footer so each card shows the date only once.
- Added copyable curl examples under each Diagnostics card so Health, Parser, Snapshot, and full Dashboard refresh requests can be imported into Postman or re-run directly with the current app origin and control values.
