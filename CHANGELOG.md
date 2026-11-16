# Changelog

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
