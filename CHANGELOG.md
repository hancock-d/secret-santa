# Changelog

## 1.1.1 (2026-11-18)

- Reload published ideas after clearing setup and block exports until the load completes.
- Keep draft ideas attached to the person during renames, including temporarily blank names.
- Preserve published names for old recipient links and reject renames into another saved person.
- Block export after a failed load; allow a new file only after an explicit replacement confirmation.
- Invalidate prepared files on reload and ignore superseded network responses.
- Use stable error codes instead of matching user-facing error text.
- Provide separate update and fresh-install archives; updates exclude wishlists.json.
- Check version consistency across app metadata, footer, README and changelog.

Validation: 26 dependency-free Node tests passed, including clear and reload, rename,
failed load and retry, explicit reset, and overlapping responses. No screen or audio
access was used. Real iOS and Android messaging and live deployment remain unverified.

## 1.1.0 (2026-11-15)

- Organize the exchange around People, Draw and Send; collapse household setup after drawing.
- Show one delivery action for the contact type, plus Copy link.
- Make the adult receiving a kid's link explicit and select the sole adult automatically.
- Separate opening a message from marking it sent; add Undo sent and a completion message.
- Tuck message settings, re-draw and clear controls away from everyday actions.
- Load published people into Gift ideas independently of household setup.
- Preserve other published lists when editing one person, and keep contacts out of exports.
- Allow gift idea preparation with incomplete households and show errors beside the button.
- Add wishlists.json downloads, hide raw JSON by default and explain the upload steps.
- Invalidate prepared updates after edits and warn before leaving with unpublished ideas.
- Show version 1.1.0 in the organizer footer and application metadata.

Validation: 17 Node tests cover draws, wish list preservation, stale updates, leave warnings,
parent routing, delivery URLs and the distinction between opened and sent. Browser checks
covered collapsed setup, parent labels, completion, file download and stale-update feedback.
Real iOS and Android messaging and this release's live deployment remain unverified.
