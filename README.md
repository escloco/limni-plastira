# limni-plastira

Accommodation research for a 4-person **food-and-villages weekend** at **Lake Plastira (Limni
Plastira)**, Greece — **Fri 10 → Sun 12 July 2026** (2 nights, everyone together), driving from Athens.

**🌐 Live site:** https://escloco.github.io/limni-plastira/

A single-page browser of 9 real listings across the lake's villages (Neochori, Kalyvia & Pezoula,
Kryoneri, Agrafa), each with a live price quote pulled for our exact dates and, where available, the
property's own photo.

## What's here
- **`index.html`** — the listings page (same Airbnb-style browser as the trip_search project;
  filter by lake area and price tier).
- **`destinations/<area>/notes.md`** — per-area research notes with types, beds, and dated quotes.
- **`images/`** — each listing's own photo, downloaded by `download_images.js`.
- **`PLAN.md`** — full itinerary, drive route from Athens, budget, and booking logistics.

## Notes on photos
The 4 **Airbnb** photos download automatically (`node download_images.js`). **Booking.com** blocks
automated fetches, so the 5 Booking listings show a coloured gradient placeholder — drop a manual
photo into `images/<key>.jpg` (e.g. `images/neochori-1.jpg`) to replace it. Keys are listed in
`download_images.js`.

> Prices are live quotes for 10–12 July 2026, 4 guests (Booking totals include taxes & fees), not
> estimates. Rates and availability can change, so reconfirm on each listing before booking.
