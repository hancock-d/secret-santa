# Changelog

## 1.3.0 (2026-11-18)

- Add Share invitation with a complete personalized message and private reveal link.
- Fall back to Copy invitation on unsupported browsers or sharing failures.
- Keep canceled shares unchanged and never mark an invitation sent automatically.
- Address kid invitations to their chosen adult without sharing contact details.
- Rename send shortcuts to Open text draft and Open email draft to clarify their behavior.
- Explain that sharing requires choosing a recipient, while drafts prefill the saved contact.

Validation: 51 Node tests passed, covering native sharing, cancellation, copy fallback,
parent addressing and pending-share safeguards. No browser, screen or audio access was
used. Native share menus and messaging apps still require a real-device check.

## 1.2.2 (2026-11-18)

- Show a brief Link copied popup and change the clicked button label after a successful copy.
- Show Update copied for wish list copies and an honest fallback when clipboard access fails.
- Keep sent status unchanged and ignore clipboard results after switching views or clearing setup.

Validation: 44 Node tests passed, including clipboard success and failure. No browser,
screen or audio access was used; device clipboard behavior remains unverified.

## 1.2.1 (2026-11-18)

- Open email and text drafts in a separate browsing context instead of navigating the organizer page.
- Keep the unsent-link and unpublished-idea exit warnings active.
- Explain the external messaging handoff and offer Copy link if no app opens.

Validation: all 42 Node tests passed, including email and SMS launch targets,
unchanged organizer location, and preserved exit warnings. No browser, screen or
audio access was used. Real-device messaging handoff remains unverified.

## 1.2.0 (2026-11-18)

- Replace the disabled kid contact field with an adult selector during setup.
- Allow kid links to use an adult from any household, independent of draw rules.
- Show adult names and households; refresh choices when adults are added, edited or removed.
- Add Everyone together as an alternative to separate adult and kid pools.
- Add an independent setting to allow same-household matches; self draws are always forbidden.
- Keep existing rules as defaults and show the active rules on the delivery screen.
- Clarify that adding a wish list alone does not enter someone into the draw.

Validation: 40 Node tests cover all draw configurations, random seeds and backtracking,
contacts across households, setup controls and the one-kid/two-adult example. No browser,
screen or audio access was used. Real-device delivery and live deployment remain unverified.

## 1.1.2 (2026-11-18)

- Add Check published ideas to verify the served file matches the prepared update.
- Keep drafts and the exit warning when publication fails or still shows older ideas.
- Ignore publication-check responses after edits, reloads or regenerated updates.
- Warn about message templates missing {link} and block their send action; keep Copy link available.
- Remove generated release folders and use one current set of project files for GitHub uploads.

Validation: 33 dependency-free Node tests passed. Checks used local files and mocked
network responses only, with no browser, screen or audio access. Live publication
and real-device messaging remain unverified.

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
