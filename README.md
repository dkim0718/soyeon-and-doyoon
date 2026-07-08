# Soyeon & Doyoon — Wedding Website

A self-hosted wedding website with the same structure as your Joy site — but with
none of the restrictions. Every font, color, and layout choice is yours, and all
of your original content (story, schedule, Q&A, hotels) has been carried over.

No build step, no framework, no server required. Open `index.html` in a browser
and it works.

## Quick start

```bash
# from this folder — any static server works, or just double-click index.html
python3 -m http.server 8000
# then open http://localhost:8000
```

## Editing your content

Everything on the site lives in **`js/content.js`** — names, date, venue,
welcome message, story, schedule items, hotels, travel notes, all 20 Q&As,
registry links, and the RSVP email address. It's a plain JavaScript object:
change any text, save, refresh.

- **Add a schedule item:** copy one of the `{ title, date, time, location, note }`
  blocks in the `schedule` array. The ceremony/reception times are placeholders —
  set your real times.
- **Hide a page:** delete its line from the `navigation` array at the bottom.
- **Reorder pages:** reorder the `navigation` lines.

## The Design panel (the part Joy wouldn't let you do)

Click the **✎ Design** button in the bottom-right corner:

- **Fonts** — pick heading, script-accent, and body fonts from a curated list,
  or choose *Custom Google Font…* and type **any** font name from
  [fonts.google.com](https://fonts.google.com) (press Enter to apply).
- **Colors** — six ready-made palettes (the first one is your current Joy
  theme, "Magnolia"), or set each color individually with the pickers.
- **Layout** — hero style (Banner / Classic / Minimal), header style
  (Stacked / Inline), separate pages vs. one long scrolling page, and
  content width.

Settings persist in your browser (`localStorage`). **Reset to defaults**
clears them.

## Photos

Every dashed frame is a photo slot — click it (or drag a picture onto it) to
upload. The **Moments** page accepts multiple photos at once. Photos are
automatically downscaled and stored in your browser's IndexedDB, so they
survive refreshes on *your* machine.

> **Important:** uploaded photos live only in the browser where you added them —
> they are a private preview, not published files. When you're happy with the
> layout, put the final images in a `photos/` folder and reference them from
> the HTML/CSS (or ask Claude to wire them in), then deploy.

## RSVP

The RSVP form composes an email to the address set in `js/content.js`
(`rsvp.email`) — no server needed. If you'd rather collect responses in a
spreadsheet, swap the form for:

- [Formspree](https://formspree.io) — point the form's `action` at your form ID, or
- an embedded Google Form.

## Deploying

Any static host works — the whole site is three files plus this README:

- **Netlify:** drag the folder onto [app.netlify.com/drop](https://app.netlify.com/drop)
- **GitHub Pages:** push to a repo → Settings → Pages → deploy from branch
- **Cloudflare Pages / Vercel:** connect the repo, no build command needed

You can point a custom domain (e.g. `soyeonanddoyoon.com`) at any of these.

## Notes

- Fonts load from Google Fonts, so first paint needs internet access.
- The site is a single `index.html`; pages are rendered client-side and
  navigated with URL hashes (`#/schedule`), so deep links work on any host.
