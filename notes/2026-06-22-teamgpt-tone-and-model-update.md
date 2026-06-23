# 2026-06-22 TeamGPT Tone And Model Update

- Switched the default TeamGPT model to `anthropic.claude-sonnet-4-5-20250929-v1:0`.
- Enabled TeamGPT long context and extended thinking defaults in the local server config and `.env.example`.
- Updated the local `.env` to explicitly use the Sonnet 4.5 model with long context and extended thinking turned on.
- Changed dashboard summary requests so `summaryTone` flows from the frontend to the TeamGPT summarizer.
- Added a persisted tone dropdown to the left of the `Quick Read` button. The selected tone is saved in local storage and reused until manually changed again.
- Included `summaryTone` in cached dashboard control metadata so the saved queue state records which summary tone generated it.
- Replaced the native browser tone dropdown with a reusable custom select menu so the control and option list remain readable on the dark dashboard theme.
- Fixed a hydration mismatch by changing the tone persistence read path to a subscribed client-side store pattern instead of reading local storage during the first render.
- Wired the selected tone into the structured parser path so the dashboard card prose (`What to Do Now`, `Summary`, and related narrative fields) follows the chosen TeamGPT tone instead of staying fixed at a professional parser default.
