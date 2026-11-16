# Family Secret Santa v1.1.0
Upload these files to the root of the public `hancock-d/secret-santa` GitHub repository.
In Settings > Pages, select Deploy from a branch, `main` and `/ (root)`, then Save.
Open https://hancock-d.github.io/secret-santa/ after deployment finishes.
Add people and households, draw names, then send each private link; mark Sent only after sending.
Gift ideas load saved people automatically; you can edit them without setting up households or drawing.
Select Prepare wish list update, download wishlists.json, then upload it to the repository root and commit.
Mark the update uploaded after committing; names and ideas are public, so omit private information.
Reopen an existing recipient link after deployment to see updated ideas; old matches survive re-draws.
Run `node tests/draw.test.mjs`; also check real iOS and Android SMS prefilling and phone reveal links.
