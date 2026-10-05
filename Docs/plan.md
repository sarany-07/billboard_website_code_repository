# Hashdigital Billboard Inventory Explorer Plan

## 1. Goal

Build a fast, frontend-only inventory explorer for approximately 300 billboard
records. Visitors should be able to:

- Find inventory by locality or location name.
- Narrow results without understanding advertising terminology.
- Compare the most important facts at a glance.
- Open one record to inspect all available details.
- Open the supplied map or Street View link.
- Send an enquiry about the selected billboard.

The interface must remain useful when some fields are null.

## 2. Dataset Audit — 30 July 2026

Sources inspected:

```text
data/bill_board.csv
data/bill_board_v2.csv
```

### Current dataset

- 19 records.
- 27 CSV columns.
- All 19 records have an ID, Location and Locality.
- IDs are unique but not continuous (`14` is absent). IDs must be treated as
  opaque identifiers, not array positions.
- All inventory is currently Bengaluru inventory.

### Current filter values

After case and whitespace normalization:

- `Footfall`: `high`, `mid-high`, `medium`, `low`.
- `Vehicular visibility`: `high`, `medium`, `low`.
- `Media Type`: only `LED`.
- `Structure`: only one populated value, `Unipole`; 18 records are null.
- `Zone`: null in all 19 records.

`Footfall` is a qualitative band, not a numeric audience count. The UI must not
label it as a measured daily footfall number.

### Currently empty fields

These are null in all records:

- IT/Tech Parks.
- High Street Retail.
- Residential Catchments.
- Airport Connectivity.
- Transit Hubs.
- Loop time.
- Number of slots.
- Cost per month.
- Rent per square foot.
- GST.
- Total.

`Sq m` and `Rent psm` contain spreadsheet `#REF!` errors and must normalize to
`null`. They should not be displayed or used for filtering.

### Partial fields

- Width and height: populated for 18 of 19 records.
- Square feet: valid for 18 records, but ID 11 is blank and ID 20 contains `0`.
- Slot seconds: populated for 18 records.
- Structure: populated for only one record.
- Duration: all current records use 30 days.

All populated square-foot values are consistent with width × height. For missing
or zero square feet, the converter may calculate it only when both dimensions
are valid. A calculated value must be tagged as derived internally.

### Map/Street View issue

`Map_View` does not currently contain usable URLs:

- Most values contain only the visible text `Street view`.
- One value contains coordinates: `12.95556,77.58585`.
- One record is blank.

CSV export does not preserve a spreadsheet cell's hyperlink target when the
visible cell text is `Street view`. The source spreadsheet must add a plain-text
`Map_URL` column containing the complete URL, or separate `Latitude` and
`Longitude` columns.

Until this is corrected:

- Do not render a map action for text-only `Street view` values.
- Convert valid coordinates into a Google Maps query URL.
- Hide the map action when neither a URL nor coordinates are available.

### V2 update

`bill_board_v2.csv` now contains valid Google HTTPS map/Street View URLs for
17 of 19 records. ID 12 contains coordinates in `Map_Label`, which the converter
turns into a Google Maps query URL. Only ID 17 remains without a usable map
destination.

Two conversion rules are required:

- The CSV has two columns named `Location`. Rename the second column
  `Map_Label`; otherwise common CSV parsers reject the file.
- `mid-high` remains in the file and will normalize to `high`.

The value `₹0` is currently exported with an encoding artifact in pricing
columns. Pricing is private and these columns are excluded, so this does not
affect the public JSON.

### Direction terminology decision

Preserve the source `location` string for traceability and generate a separate
visitor-facing value:

- `FTF` → `Facing traffic from`.
- `FTT` → `Facing traffic towards`.

The expansion follows common outdoor-media usage, while removing unexplained
industry abbreviations from the customer interface.

### Pricing decision

Pricing is private for the current release:

- Do not include Cost per month, Rent psf, Rent psm, GST or Total in public JSON.
- Do not render hidden pricing values into HTML or JavaScript.
- Cards and drawers should show `Price on request` only if the client wants a
  commercial prompt.

### Images decision

No inventory record currently has an image. Use a consistent project-owned
placeholder in cards. Keep `images: []` in the schema so future records can add
one or multiple images without a UI rewrite.

## 3. Recommended Architecture

### Initial release: static JSON

Store the inventory in:

```text
data/billboards.json
```

Load it once:

```js
const records = await fetch("data/billboards.json").then((response) => response.json());
```

This is the recommended approach for 300 records because:

- One small request loads the entire inventory.
- Search and filtering happen instantly in the browser.
- No API key, database, login, cold start or monthly bill is required.
- JSON is cached alongside the website on the hosting CDN.
- The inventory still works if an external data provider is unavailable.
- Adding future cities only requires adding a `city` property.

Cloudflare Pages automatically serves static assets from its tiered cache and
supports browser revalidation with ETags. This is a better fit than querying a
database for every filter change.

### Data update workflow

Keep the client's working spreadsheet as the editable source of truth:

```text
Client spreadsheet → export CSV → validation/conversion script → billboards.json
```

The conversion script should:

1. Normalize column names.
2. Trim whitespace.
3. Convert numeric text into numbers.
4. Convert blank cells, `NA`, `N/A` and `-` into `null`.
5. Generate stable record IDs.
6. Validate map URLs.
7. Output a compact JSON file.

This avoids manually editing 300 JSON objects.

### Future upgrade

Move to Supabase only when the client requires:

- A password-protected inventory dashboard.
- Frequent non-developer edits.
- Real-time availability.
- User accounts or saved shortlists.
- Thousands of records across multiple cities.

Supabase is unnecessary for the current read-only 300-record requirement. Its
free projects can also pause after inactivity, which is undesirable for a
public catalogue.

Google Sheets API is not recommended as the public runtime data source. It
introduces quota, authentication, availability and spreadsheet-formatting
dependencies. The sheet is useful as the editing source, not as the website API.

## 4. Proposed Page Placement

Keep this inside the landing page as an expanded inventory section. Do not add
another website page.

Suggested flow:

```text
Section introduction
  ↓
Search and primary filters
  ↓
Results summary + sort
  ↓
Billboard cards
  ↓
Load more
  ↓
Record details drawer
  ↓
Campaign enquiry
```

On small screens, filters open in a bottom sheet. On desktop, they appear in a
compact toolbar and optional filter panel.

## 5. Information Hierarchy

Showing every field on every card would overwhelm users. Divide information
into three levels.

### Level 1: Search result card

Show only:

- Location name.
- Locality and zone.
- Media type.
- Width × height and square feet.
- Estimated footfall.
- Vehicular visibility.
- Monthly cost, if public and non-null.
- `View details` action.

Use small icon-label pairs for footfall, visibility and size. Do not show empty
labels. A missing value should consume no card space.

### Level 2: Details drawer

Open a right-side drawer on desktop and a full-screen sheet on mobile. A drawer
is preferred over a centered modal because:

- Users retain context from the result list.
- Long specification content scrolls naturally.
- Closing returns users to the same result and scroll position.
- It provides more width for grouped information.

Drawer header:

- Location.
- Locality and zone.
- Media-type badge.
- `Open in Maps / Street View`.
- `Enquire about this billboard`.

Drawer content groups:

#### Audience and surroundings

- Footfall.
- Vehicular visibility.
- IT/Tech Parks.
- High Street Retail.
- Residential Catchments.
- Airport Connectivity.
- Transit Hubs.

#### Media specifications

- Media Type.
- Structure.
- Width.
- Height.
- Square feet.

#### Playback

- Slot duration in seconds.
- Loop time in minutes.
- Number of slots.

#### Commercial information

- Cost per month.
- Campaign duration in days.
- Rent per square foot.

Do not render an entire group when all fields in that group are null.

### Level 3: Enquiry

The enquiry CTA opens the Contact page with the selected record ID and location:

```text
contact.html?billboard=BLR-001
```

JavaScript reads the query parameter and pre-fills a read-only `Selected
billboard` field.

Because current footfall is qualitative, cards should display `High footfall`,
`Mid-high footfall`, `Medium footfall` or `Low footfall`—not a fabricated
audience number.

## 6. Search and Filters

### Always visible

- Search: location or locality.
- Locality.
- Footfall band.
- Vehicular visibility.
- Sort.
- `More filters` button.

Search should:

- Match location, locality and zone.
- Ignore capitalization.
- Ignore accidental leading/trailing spaces.
- Use a 150 ms debounce.

### More filters

Group filters by user intent:

#### Audience

- Footfall band.
- Vehicular visibility.

#### Nearby demand generators

- IT/Tech Parks.
- High Street Retail.
- Residential Catchments.
- Airport Connectivity.
- Transit Hubs.

Do not show these filters in the current release because every value is null.
When populated, use simple `Nearby / Not required` toggles unless the source
contains meaningful distances or counts.

#### Format

- Media type.
- Structure.
- Minimum square feet.
- Width/height ranges only if users genuinely need them.

#### Campaign and price

- Maximum monthly cost.
- Slot duration.
- Campaign duration.

### Sorting

Offer only useful choices:

- Recommended.
- Highest footfall.
- Lowest monthly cost.
- Largest display.
- Locality A–Z.

Avoid exposing all database columns as sort options.

Do not show Zone, Media Type or Structure filters until each contains at least
two useful populated values. A filter with only one possible value adds noise.

## 7. Results UI

### Toolbar

Display:

- `128 locations found`.
- Active filter chips.
- `Clear all`.
- Sort control.

### Card grid

- Three columns on large desktop.
- Two columns on tablet.
- One column on mobile.
- Render 24 records initially.
- `Load 24 more` button instead of infinite scroll.

Load-more is preferred because it:

- Preserves the footer.
- Gives users a sense of progress.
- Is easier for keyboard and screen-reader users.
- Avoids rendering all 300 cards immediately.

### Card visual style

- Use one media thumbnail when available.
- If no image exists, show a consistent location-based visual placeholder.
- Keep the card title to two lines.
- Use a small badge for media type.
- Use three primary metrics maximum.
- Make the whole card clickable while preserving a visible `View details` label.
- Use subtle hover elevation and image scale only.

## 8. Null and Data Formatting Rules

- `null`, empty strings, `NA`, `N/A` and `-` become JavaScript `null`.
- Spreadsheet errors such as `#REF!`, `#VALUE!` and `#DIV/0!` become `null`.
- Never display `N/A` repeatedly in the UI.
- Hide individual null rows.
- Hide a details group if all its values are null.
- Do not treat `0` as missing.
- Use Indian number formatting:

```js
new Intl.NumberFormat("en-IN")
```

- Currency:

```js
new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
})
```

- Normalize boolean-like spreadsheet values (`yes`, `Y`, `1`) during conversion.
- Normalize case and whitespace before mapping categorical values.
- Preserve unknown categories instead of silently dropping future values.
- Store dimensions as numbers, not formatted strings.
- Store map URLs separately from human-readable location names.

## 9. Proposed Data Shape

```json
{
  "id": "BLR-001",
  "city": "Bengaluru",
  "location": "Example Junction",
  "locality": "Indiranagar",
  "zone": null,
  "footfall_band": "high",
  "vehicular_visibility": "high",
  "nearby": {
    "it_tech_parks": null,
    "high_street_retail": null,
    "residential_catchments": null,
    "airport_connectivity": null,
    "transit_hubs": null
  },
  "media": {
    "type": "Digital Billboard",
    "structure": "Unipole",
    "width_ft": 40,
    "height_ft": 20,
    "sqft": 800
  },
  "playback": {
    "slot_seconds": 10,
    "loop_minutes": 1,
    "slots": 6
  },
  "commercial": {
    "duration_days": 30
  },
  "map": {
    "url": null,
    "latitude": null,
    "longitude": null
  },
  "images": []
}
```

This nested structure makes the drawer groups easy to render and supports
future additions without creating unreadable flat objects in UI code.

Nearby values are tri-state:

- `true`: confirmed nearby.
- `false`: confirmed not nearby.
- `null`: unknown/not supplied.

This distinction prevents missing data from being presented as a negative fact.

## 10. Frontend Modules

Keep JavaScript separated by responsibility:

```text
inventory-data.js       Fetch, normalize and cache records
inventory-state.js      Search, filters, sorting and pagination state
inventory-render.js     Cards, chips, empty state and counts
inventory-drawer.js     Details drawer and focus management
inventory-format.js     Currency, dimensions, footfall and null formatting
inventory-app.js        Initialization and event coordination
```

No framework is required for 300 records.

## 11. Performance Plan

- Fetch JSON once.
- Keep the parsed records in memory.
- Precompute a lowercase searchable string per record.
- Debounce search by 150 ms.
- Filter in a single array pass.
- Render only the first 24 matching records.
- Use `DocumentFragment` for card rendering.
- Use event delegation on the results container.
- Use lazy-loaded WebP/AVIF thumbnails.
- Give all images explicit width and height.
- Do not create 300 click handlers.
- Do not embed map iframes in cards or the drawer.
- Open the supplied map URL in a new tab with `rel="noopener noreferrer"`.
- Cache static JSON with the website deployment.

For 300 records, these measures will feel instant on ordinary mobile devices.
Virtual scrolling and a database search service would add complexity without
meaningful benefit.

## 12. Accessibility

- Search input has a visible label.
- Result count uses `aria-live="polite"`.
- Filter controls are keyboard operable.
- Active chips have explicit remove buttons.
- Drawer uses `role="dialog"` and `aria-modal="true"`.
- Focus moves into the drawer when opened.
- Escape closes the drawer.
- Focus returns to the originating card after closing.
- Background scrolling is locked while the drawer is open.
- Map links state that they open a new tab.
- Color is never the only indicator of a filter or status.

## 13. Empty, Loading and Error States

### Loading

Show six lightweight skeleton cards while JSON loads.

### No results

Show:

```text
No billboards match these filters.
Try removing a filter or searching another Bengaluru locality.
```

Include `Clear all filters`.

### Data error

Show a concise retry state. Keep the rest of the landing page functional.

## 14. Privacy and Commercial Data

Decide before implementation whether monthly cost and rent per square foot are
public. Static JSON is publicly downloadable even when values are hidden by CSS.

If pricing is confidential:

- Do not include it in public JSON.
- Show `Price on request`.
- Keep pricing in the internal spreadsheet only.

The same rule applies to internal slot availability or private operational notes.

## 15. Implementation Phases

### Phase 1 — Data preparation

- Obtain a sample of 10–20 real rows.
- Confirm data types and possible values.
- Decide which commercial fields are public.
- Create CSV-to-JSON validation script.
- Produce the final JSON schema.

### Phase 2 — Inventory UI prototype

- Section introduction.
- Search and primary filters.
- Result cards.
- Load-more behavior.
- Empty and loading states.

### Phase 3 — Details experience

- Accessible drawer.
- Grouped specifications.
- Map/Street View action.
- Contact-page prefill.

### Phase 4 — Quality and performance

- Test all-null and partial-null records.
- Test 300-record filtering on mobile.
- Keyboard and screen-reader review.
- Image optimization.
- Cross-browser validation.

## 16. Remaining Inputs Before Building

Resolved:

- Representative V2 CSV is available.
- V2 contains plain-text map URLs for 17 records.
- Footfall is a qualitative band.
- `mid-high` normalizes to `high`.
- FTF and FTT expand for visitors while raw text is retained.
- Pricing remains private.
- Nearby-place values use `yes`, `no`, or blank.
- Optional nearby-place names use semicolon-separated `_names` columns.
- Images use up to five stable image URL/path columns.

Before importing V2:

1. Rename the second `Location` header to `Map_Label`.
2. Add map URLs for IDs 12 and 17 when available.
3. Follow the standards in `data/README.md`.

Image convention:

```text
assets/inventory/{record-id}-01.webp
assets/inventory/{record-id}-02.webp
```

The current data is sufficient to build a functional first version. Missing map
links, images and nearby-place fields will be hidden cleanly.

## 17. Implemented Data Pipeline

The initial conversion pipeline is now available:

```text
data/bill_board_v2.csv
        ↓
scripts/build-billboard-data.mjs
        ↓
data/billboards.json
        ↓
fetch("data/billboards.json")
        ↓
In-memory search, filtering and rendering
```

The converter currently:

- Parses quoted CSV values without an external dependency.
- Rejects duplicate headers and IDs.
- Creates stable IDs such as `BLR-001`.
- Normalizes `mid-high` Footfall to `high`.
- Normalizes Footfall and Vehicular visibility casing.
- Expands FTF and FTT into visitor-friendly text.
- Retains the raw location string.
- Converts blank/error values to `null`.
- Calculates missing square feet from valid dimensions.
- Validates Google HTTPS map URLs.
- Converts coordinate-only map labels into map query URLs.
- Excludes every private pricing field.
- Creates an empty/future-ready images array.
- Outputs warnings for missing map URLs and inconsistent dimensions.

Current output:

- 19 normalized records.
- 19 usable map links after coordinate fallback except `BLR-017`.
- Pricing excluded.
- Schema version `1`.
