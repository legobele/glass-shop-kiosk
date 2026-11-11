# QGI System (web)

The 1.3.0 rebuild of the Quality Glass kiosk system: React + TypeScript + Vite, one SPA with three surfaces.

- `/` the order kiosk (10-slide flow, EN / ES)
- `/admin` the sales dashboard
- `/portal` customer order tracking

Routing is hash-based and the asset base is relative, so the production build runs from any static subpath with no server rewrites. Orders live in one local-first store (`localStorage`, keys `qgi.orders.v1` / `qgi.activity.v1`) shared by all three surfaces and synced across tabs. There is no backend; the order payload keeps the old server contract shape.

## Run it

```sh
npm install
npm run dev      # develop
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

Shop mode: open the kiosk with `?IsKioskInShop=true` before the `#` (for example `/?IsKioskInShop=true#/`) to enable the "continue on your device" handoff slide.

Demo: the store seeds the historical order `QG1HZLVYSG`, so the portal works out of the box.
