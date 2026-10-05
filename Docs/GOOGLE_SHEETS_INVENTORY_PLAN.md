# Google Sheets Inventory Architecture

For the exact header row and editing instructions, use
[GOOGLE_SHEETS_COPY_PASTE_TEMPLATE.md](GOOGLE_SHEETS_COPY_PASTE_TEMPLATE.md).

## Current architecture

The optional `inventory_type` column supports `owned` and `partner` listings
in the same tab. Blank or unknown values remain unclassified. Set all three
of our junction booking options to `owned`; partner inventory must use `partner`.
No additional sheet or API is required. This classification controls badges
and owned-screen presentation; it does not change publishing or pricing.

The project uses one public Google Sheets tab named `Inventory`:

```text
Admin edits Inventory
        ↓
Google publishes the tab as CSV
        ↓
inventory.js fetches and validates the CSV
        ↓
Only valid rows with status = published are displayed
```

This approach is appropriate for the current inventory of approximately 300
public billboard records. It keeps the admin workflow simple and requires no
database or traditional backend.

## Live source

The published CSV endpoint is configured once in `inventory.js`:

```text
https://docs.google.com/spreadsheets/d/e/2PACX-1vQIoYLf8HYoIOhAuQSaDylz2Ed4tNgjApXKSlVnpsu8-ZC17E6SE9pq_NJw0BS2smSaCUqAHr2umZzO/pub?gid=0&single=true&output=csv
```

Do not scatter this URL across other files. If the sheet is replaced, update
the configuration value in `inventory.js` and this document.

## Loading and validation

The frontend:

1. requests the published CSV with an eight-second timeout;
2. parses quoted commas, line breaks and long URLs correctly;
3. verifies required column names;
4. ignores `draft` and `archived` rows;
5. validates required values on each published row;
6. skips incomplete or duplicate rows with a console warning;
7. converts the flat row into the nested model used by cards and the drawer;
8. renders only after valid current data has been received.

## Failure behaviour

The Google Sheet is the only inventory source. There is no local JSON inventory
fallback and no persistent browser inventory cache.

If the sheet request fails, times out or contains no valid published records:

- the inventory card grid is hidden;
- old billboard records are not displayed;
- the page shows a helpful message;
- visitors receive a Contact Us button.

This is intentional. A stale location or stale public price could mislead a
visitor, so unavailable inventory is safer than outdated inventory.

## Data contract

The current sheet contains 34 columns. Important groups are:

- identity and publishing: `billboard_id`, `status`, `sort_order`;
- location: city, name, description, locality and zone;
- audience: footfall, visibility and nearby-place flags;
- media: type, structure and dimensions;
- campaign: slot, loop, slots and duration;
- public pricing: `monthly_price_inr`;
- navigation: `map_label`, `map_url`, `street_view_url`;
- gallery: `image_1_url` through `image_5_url`;
- maintenance: `updated_at`.

Column names are part of the frontend API contract. Protect the header row and
do not rename or reorder columns without updating `inventory.js`.

## Public-data limitation

Publishing the tab as CSV makes every cell in that tab publicly readable.
`status = draft` prevents a row from appearing in the interface but does not
make that row private.

The sheet may contain the public monthly selling price because the website is
intended to show it. It must not contain:

- acquisition costs or margins;
- private negotiated rates;
- customer information;
- credentials;
- confidential internal notes.

## Admin workflow

1. Create the row with `status = draft`.
2. Complete the required public fields.
3. Add the current public price, map links and images when available.
4. Review dimensions, spelling and URLs.
5. Change the status to `published`.
6. Allow for Google's publication delay and refresh the website.
7. Change unavailable records to `archived` instead of deleting their IDs.

## Website record model

Sheet rows are normalized into the existing model:

```json
{
  "id": "BLR-001",
  "city": "Bengaluru",
  "location": {
    "name": "Meanee Avenue",
    "display": "Mother Teresa Circle, Halasuru",
    "locality": "Halasuru",
    "zone": "Central"
  },
  "audience": {
    "footfall_band": "high",
    "vehicular_visibility": "high"
  },
  "media": {
    "type": "LED",
    "structure": "Unipole",
    "width_ft": 16,
    "height_ft": 9,
    "sqft": 144
  },
  "pricing": {
    "monthly_price_inr": 100000
  },
  "map": {
    "url": "https://maps.app.goo.gl/...",
    "street_view_url": "https://www.google.com/maps/@..."
  },
  "images": ["https://example.com/billboard.webp"]
}
```

This boundary lets the sheet remain flat and simple while the UI receives a
consistent structure.

## Images

The first populated image is used on the card. Every populated image is added
to the detail carousel. If a record has no images, the current design uses a
generic visual asset; this is an image-only placeholder, not an inventory-data
fallback.

Use public WebP or AVIF URLs when possible and avoid Google Drive preview links.

## Future growth

Client-side filtering remains appropriate for roughly 300 records. Consider an
API or CMS only if the project later requires confidential data, approval roles,
live booking availability, thousands of records or complex multi-user editing.

When a new public field is required, append it to the right of the sheet and
update validation and normalization in `inventory.js` before admins use it.
