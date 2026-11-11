# Legacy QGI repos

On 2026-11-11 the scattered Quality Glass software family was consolidated into
this repo. Each project below was imported with its full git history preserved
(`git subtree`), so its commits, changelogs and crimes are all still readable in
the log. The original repos were re-archived after their imports were verified
(qgi-platform was archived by the owner directly). The sibling READMEs inside
each folder are untouched historical documents, rickrolls included.

The living product is the React rebuild in `web/` (v1.3.0). Everything under
`legacy/` is history.

## The strata

### glassai — the ancestor (repo: March 2025)
- Original: https://github.com/legobele/glassai
- Last upstream commit: 74e30ce, 2025-06-26, "Merge pull request #1 from legobele/master"
- The GlassAI origin: pitch deck, QGI-QGC pilot testing agreement, pricing PDF.
- **The v0.3 era lives here.** In one commit (2025-06-24, "ADDED: sales kiosk
  mockup") the folder `glassai-kiosk-sales/` landed holding the entire system in
  ONE folder: `glassai_kiosk_v0.3.html` (title "QGI/QGC Kiosk v0.3"), the admin
  dashboard, the customer portal, an Express `server.js`, and `orders.json`
  (an empty array) as the database — kiosk, admin, customer, server and data in
  a single directory, before the Feb 2026 repo-per-page fragmentation split it
  all apart. Also here: a self-referential gitlink named `glassai` (points at
  this repo's own third commit, no .gitmodules; a nested-clone accident that
  carries no content) and committed node_modules. No v0.2 artifact exists in any
  repo's history; v0.3 is the earliest surviving kiosk.

### glass-shop-install-coordinator-thingy — the coordinator (Nov 2025 – Jan 2026)
- Original: https://github.com/legobele/glass-shop-install-coordinator-thingy
- Last upstream commit: e019ffd, 2026-01-12, "the whole fucken html code is
  hanging on a prayer (also its autistic too)"
- Standalone install coordinator, one HTML file. Its README confesses the
  innerHTML architecture and the installation step "pray". Superseded by the
  coordinator inside qgi-platform, and by nothing since (the React rebuild has
  no coordinator surface yet).

### qgi-customer-portal — the customer portal (Feb – Mar 2026)
- Original: https://github.com/legobele/qgi-customer-portal
- Last upstream commit: 0402447, 2026-03-16, "the worlds stupidest update ever"
- Track your order by ID, Request Order Change with the 6-digit PIN, QR order
  code. Its history contains the original file QGI-CUSTOMER-DASHBOARD-v0.5r2.html
  (renamed to index.html on 2026-02-11).

### glass-shop-admin-tool — the sales dashboard (Feb 2026)
- Original: https://github.com/legobele/glass-shop-admin-tool
- Last upstream commit: 97d4ae8, 2026-02-13, "v0.7.3-access: Ungodly bugfixing"
- The Ventas dashboard: stats cards, status filters, PIN-gated order edits, and
  the downloadable activity log (a feature no later generation rebuilt until
  the React rebuild's spec). Its history carries the v0.5r2 → v0.6 → v0.7-access
  lineage (QGI-ADMIN-DASHBOARD-v0.6.html and friends).

### glass-shop-admin-tool-acc-settings — account settings (Feb 2026)
- Original: https://github.com/legobele/glass-shop-admin-tool-acc-settings
- Last upstream commit: 2cc0192, 2026-02-25, "changed the page title"
- The admin tool's account-settings page, spun off into its own repo for
  reasons lost to time.

### glass-shop-admin-login-page — the login page (Feb 2026)
- Original: https://github.com/legobele/glass-shop-admin-login-page
- Last upstream commit: 1748e8c, 2026-02-25, "changed the suffering title"
- A standalone login page for the admin tools. Yes, it had its own repo.

### QGI-SERVER — the server (Mar 2026)
- Original: https://github.com/legobele/QGI-SERVER
- Last upstream commit: 6dfd22c, 2026-03-22, "suffer"
- Three commits of Node server for the QGI webapps, from the month the system
  graduated off the laptop. The commit messages are a mood.

### qgi-platform — the unified platform attempt (Aug 2026)
- Original: https://github.com/legobele/qgi-platform
- Last upstream commit: 6aac568, 2026-08-05, "feat: thickness slider step before
  type, width-filtered colors, animations, rebrand"
- The August 2026 unified-platform attempt (built with DeepSeek V4): one
  Vite + React + Firebase app holding kiosk, order tracking, admin dashboard,
  catalog editor and install coordinator, with customer accounts, mandatory
  2FA (TOTP + SMS) and a staff permission framework. Functionally it superseded
  every Feb 2026 repo above. It is preserved here complete, and was superseded
  in turn by the React rebuild in `web/` (v1.3.0), which is the flagship going
  forward. Features that exist only in this stratum, for the record: customer
  accounts + 2FA, the permission framework, the live catalog editor, the
  coordinator, and cloud sync itself.

### qgi-ios5-cursed — iGlass (Aug 2026)
- Original: https://github.com/legobele/qgi-ios5-cursed
- Last upstream commit: 1cf05fa, 2026-08-05, "feat: thickness slider before
  type, width-filtered colors, animations, rebrand"
- qgi-platform cloned and reskinned as iOS 5 (2011) skeuomorphism: bezel,
  9:41 status bar, glossy aqua buttons. Self-described as "probably a war
  crime". Only the styles, Numpad, LangStep, index.html and firebase.json
  differ from qgi-platform.

### qgi-suite — the empty one (May 2026)
- Original: https://github.com/legobele/qgi-suite
- No commits, no files, nothing to import. Created 2026-05-12 and left as a
  name reservation. It is listed here so the family record is complete; it was
  not archived by the consolidation because there was nothing to verify.
