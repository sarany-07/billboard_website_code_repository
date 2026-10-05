# Billboard Inventory Data

## Live source

Optional `inventory_type`: use `owned` for tūvi pixel screens and `partner` for
other operators. Blank/unknown values stay unclassified and do not block publication.
Ownership badges and junction-specific presentation use this field, not row IDs.
With more than three listings, the catalogue fits four cards per row on wide
desktops, three on smaller desktops, two on tablets and a carousel on mobile.
The initial batch contains three rows; Load more adds two rows at the current width.
Campaign duration and full specifications remain in the details popup.

The website reads billboard inventory directly from the published Google Sheets
CSV configured in `inventory.js`.

The admin edits the single `Inventory` tab. Only rows whose `status` value is
`published` are rendered on the website.

The required sheet structure, dropdown values and editing rules are documented
in:

```text
GOOGLE_SHEETS_COPY_PASTE_TEMPLATE.md
```

## Failure behaviour

There is intentionally no local inventory fallback. If the live Google Sheet
cannot be fetched or contains no valid published rows, the location grid is
hidden and visitors receive a Contact Us action.

This prevents removed, repriced or otherwise outdated billboards from being
shown from an old local file.

## Legacy files

The CSV files in this directory are retained only as historical source data.
They are not loaded by the website. New inventory changes must be made in the
Google Sheet.

The old `billboards.json` file has been removed and must not be regenerated or
reintroduced as a runtime fallback.

## Images

Add public image URLs to `image_1_url` through `image_5_url` in the Google
Sheet. The first image is used on the card and every populated image is used in
the detail carousel.

Use optimized WebP or AVIF images where possible. Avoid Google Drive preview
links because they are not stable production image URLs.
