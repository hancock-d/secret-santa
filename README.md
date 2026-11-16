# Family Secret Santa
Create a public GitHub repository named `secret-santa` under `hancock-d`.
Upload `index.html`, `wishlists.json`, `.gitignore`, this README and `tests/draw.test.mjs` to the repository root.
In Settings > Pages, select Deploy from a branch, `main` and `/ (root)`, then Save.
Open https://hancock-d.github.io/secret-santa/ after deployment finishes.
Add households and people, draw names, then send or copy each private link before closing the tab.
For wish lists, enter one idea per line and select Generate wishlists.json, then Copy.
Replace `wishlists.json` on GitHub with the copied contents and commit; names and ideas are public, so omit private information.
Reopen an existing recipient link after a minute or two to see updated ideas; old matches remain valid after a re-draw.
Run `node tests/draw.test.mjs`; also check a real phone reveal, iOS and Android SMS prefilling, and updated ideas on an old link.
