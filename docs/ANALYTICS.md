# Jacob Bros hub analytics
GA4 account Y2J → **Jacob Bros Games**, property 561068654, stream 16215972677, tag G-ZHTSP3LEH3.
https://analytics.google.com/analytics/web/#/a412250833p561068654/realtime/overview

`game_id=jacobbros_hub` separates website visits from games.
- page_view: visits. Built-in GA metrics supply users, sessions and acquisition.
- hub_view: catalogue entry, source_game is an allowlisted catalogue game ID from the badge's `?from=` link, or direct_or_other. It is not authoritative attribution.
- game_click: actual link activation to a live catalogue game. destination_game and link_position (catalogue, world_popup, bro_profile, recommendation) identify the choice. Includes middle-click; no prevention of navigation. Repeated clicks count separately.

Clicks are NOT proof of a game starting. Tehara and Dreidel send their own game_start events to the same property. Other games may have independent properties or no instrumentation. No historical reconstruction. QA visits count; blockers, opt-outs and navigation timing can cause gaps. Standard reports need processing time.

Registered event dimensions: game_id, destination_game, source_game, link_position. Use Explore to compare game_click event count by destination_game and link_position; use Reports for visits, users and traffic sources. No saved custom funnel is implied.

No raw search text, profile names, query strings or hashes are sent. Enhanced measurement and advertising signals are off. Privacy and browser opt-out are at privacy.html. badge.js itself is unchanged and does not load analytics into other websites.

Checks: `node --check js/analytics.js`, `node --check js/hub-analytics.js`, `git diff --check`. Verify real catalogue clicks in an isolated browser and inspect /g/collect responses, including newline-separated POST events, for the correct measurement ID.

Local browser test (requires Playwright): `node tests/analytics-browser.cjs`; optional CHROMIUM_PATH selects a Chrome executable. It verifies referral, catalogue click and opt-out without sending Google traffic.
