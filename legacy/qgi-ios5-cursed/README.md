# iGlass — QGI for iOS 5 (2011)

The QGI Platform, cursed back to 2011. A skeuomorphic iOS 5 skin over the
entire glass shop app. iGlass edition. Probably a war crime.

Built by cloning [qgi-platform](https://github.com/legobele/qgi-platform) and
re-skinning the whole thing to look like it was designed in Cupertino in 2011:

- **iPhone frame** — thick bezel, 9:41 status bar with AT&T + battery, physical
  home button that does nothing (like the real one)
- **Skeuomorphic design system** — glossy aqua buttons, grouped-table gray
  background, white table cells, iOS blue links, Helvetica Neue everywhere
- **Springboard language picker** — glossy rounded-square app tiles + page dots
- **iOS segmented controls** — Phone/Email/Both/None contact tabs
- **iOS toggle switches** — Tempered / Ultra-Clear pills
- **iOS keyboard numpad** — dark keyboard chrome, glossy keys, aqua confirm
- **Linen toasts** — the texture from the original iOS keyboard/notifications
- Shared Firebase backend with the real app (same Firestore, same functions)

Live at **https://qgi-ios5.web.app** (hosting site `qgi-ios5` in the qgi-kiosk
Firebase project). The real app is at https://qgi-kiosk.web.app.

## Run locally

```
npm install --include=dev
npm run dev
```

## Deploy

```
npm run build
firebase deploy --only hosting
```

## Content note

The only thing that's real here is the pain of the 2011 UI. The glass shop
business logic is 100% functional — it just looks like it came from a
forgotten iPhone 4.
