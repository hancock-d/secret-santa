# Family Secret Santa v1.1.2
For upgrades, upload the current index.html, README.md, CHANGELOG.md and tests folder; keep your existing wishlists.json.
In Settings > Pages, select Deploy from a branch, `main` and `/ (root)`, then Save.
Open https://hancock-d.github.io/secret-santa/ after deployment finishes.
Add people and households, draw names, then send each private link; mark Sent only after sending.
Gift ideas load saved people automatically; if loading fails, retry or explicitly start a new file.
Select Prepare wish list update, download wishlists.json, then upload it to the repository root and commit.
After deployment, select Check published ideas; names and ideas are public, so omit private information.
Reopen an existing recipient link after deployment to see updated ideas; old matches survive re-draws.
Run `node tests/draw.test.mjs`; also check real iOS and Android SMS prefilling and phone reveal links.
