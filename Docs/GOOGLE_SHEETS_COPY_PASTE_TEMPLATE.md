# Single-Tab Google Sheets Template

Use one Google Sheets tab named `Inventory`. This is the only tab the admin
needs to edit and the same tab the website reads as CSV.

```text
Admin edits Inventory → website fetches Inventory CSV → published rows appear
```

## 1. Rename the tab

Rename `Sheet1` to exactly:

```text
Inventory
```

## 2. Paste the header

Copy this tab-separated row and paste it into `Inventory!A1`:

```tsv
billboard_id	status	sort_order	city	location_name	location_description	locality	zone	footfall	visibility	it_tech_parks	high_street_retail	residential_catchments	airport_connectivity	transit_hubs	media_type	structure	width_ft	height_ft	sqft	slot_seconds	loop_minutes	slot_count	duration_days	monthly_price_inr	map_label	map_url	street_view_url	image_1_url	image_2_url	image_3_url	image_4_url	image_5_url	updated_at	inventory_type
```

## 3. Example row

Copy this into `Inventory!A2`, then replace it with real information:

```tsv
BLR-001	draft	1	Bengaluru	Sadashivanagar	Sadashivanagar / Sankey Road / Bhashyam Circle - facing traffic towards Kaveri Junction and Malleshwaram	Sadashivanagar	Central	high	high						LED	Unipole	16	9	144	15	1	4	30	150000	Sadashivanagar Billboard	https://www.google.com/maps/search/?api=1&query=13.006088,77.578818	https://www.google.com/maps/						2026-09-18	partner
```

The header and example both contain 35 columns.

### Screen ownership

Add `inventory_type` to your existing Inventory tab (no new tab required).
Use `owned` for your Meanee Avenue, Assaye Road and combined booking rows.
Use `partner` for another operator’s billboard. Add a dropdown with these two values.
Blank or unrecognised values remain unclassified; those rows can still be published.
The website reads headers by name, so an existing column can stay where you added it.
Do not paste this whole template over live inventory just to add this column.

Owned listings display a `tūvi pixel` badge; partner listings display `Partner screen`.
Only explicitly owned listings can receive our junction-specific names and concept images.
Uploaded `image_1_url` always takes priority. Classification does not alter pricing or sort order.

## 4. Required fields

Complete these before changing a row to `published`:

- `billboard_id`: Permanent unique ID such as `BLR-001`.
- `status`: `draft`, `published`, or `archived`.
- `sort_order`: Display order such as `1`, `2`, `3`.
- `city`: Currently `Bengaluru`.
- `location_name`: Short name shown over the card image.
- `location_description`: Complete road and facing-direction description.
- `locality`: Consistent locality used by the filter.
- `footfall`: `high`, `medium`, or `low`.
- `visibility`: `high`, `medium`, or `low`.
- `media_type`: Normally `LED`.
- `width_ft` and `height_ft`: Numbers only.

## 5. Optional fields

- `zone`: Area or business zone.
- The five nearby fields: use `yes`, `no`, or leave blank when unknown.
- `structure`: For example `Unipole`.
- `sqft`: May be blank; the website can calculate width × height.
- Playback and duration fields: numbers only.
- `monthly_price_inr`: Current public monthly selling price as numbers only.
- `map_label`: Human-readable place name, such as `Mother Teresa Circle Billboard`.
- `map_url`: Google Maps pin or place URL for the billboard's exact location.
- `street_view_url`: Google Street View URL showing the billboard from the road.
- `image_1_url` to `image_5_url`: Public image URLs in carousel order.
- `updated_at`: Date in `YYYY-MM-DD` format.

Unknown values must remain blank. Do not enter `-`, `N/A`, `#REF!`, `null`, or
zero as placeholders.

## 6. Add dropdowns directly in Inventory

No `Lists` tab is required. Use **Data → Data validation → Dropdown** and enter
these values manually:

| Column | Dropdown options |
| --- | --- |
| `status` | `draft`, `published`, `archived` |
| `city` | `Bengaluru` |
| `footfall` | `high`, `medium`, `low` |
| `visibility` | `high`, `medium`, `low` |
| Five nearby fields | `yes`, `no` |
| `media_type` | `LED`, `Digital Billboard`, `Static Billboard` |

Choose **Reject input** for each dropdown so spelling stays consistent.

## 7. Pricing

Enter the current public monthly price in `monthly_price_inr`. Use numbers only:

```text
150000
```

Do not enter `₹`, commas, `/month`, or text in the cell. The website can format
the value as:

```text
₹1,50,000/month
```

The admin can replace the number whenever the public price changes.

## 8. Map and Street View

Keep the two map links separate:

| Column | Example purpose |
| --- | --- |
| `map_label` | `Mother Teresa Circle Billboard` |
| `map_url` | Opens the billboard's pinned location in Google Maps |
| `street_view_url` | Opens the road-level Google Street View panorama |

The website popup can show two buttons whenever both URLs are available:

```text
View on map     Open Street View
```

If only one URL is available, the website should show only its corresponding
button. Both URLs must be complete public links beginning with `https://`.

## 9. Images

- `image_1_url` is the card image and first carousel image.
- Additional images go in `image_2_url` through `image_5_url`.
- Use public HTTPS image URLs.
- Prefer WebP images below approximately 300 KB.
- Do not use Google Drive preview-page links.
- If every image cell is blank, the website uses its fallback image.

## 10. Publish the single tab

In Google Sheets:

1. Open **File → Share → Publish to web**.
2. Select the `Inventory` tab only.
3. Choose **Comma-separated values (.csv)**.
4. Click **Publish**.
5. Copy the generated CSV URL for the website integration.

The current connected CSV endpoint is:

```text
https://docs.google.com/spreadsheets/d/e/2PACX-1vQIoYLf8HYoIOhAuQSaDylz2Ed4tNgjApXKSlVnpsu8-ZC17E6SE9pq_NJw0BS2smSaCUqAHr2umZzO/pub?gid=0&single=true&output=csv
```

The frontend must display only rows where:

```text
status = published
```

Rows marked `draft` or `archived` will not appear as cards.

## Important privacy note

Because this single tab is published as CSV, every value in it is technically
publicly readable—including rows marked `draft` or `archived`. The status field
controls what the website displays; it does not make a row private.

Therefore, never store these in the Inventory sheet:

- internal costs or profit margins;
- private negotiated rates;
- client contact details;
- passwords or credentials;
- internal comments that should not be public.

The `monthly_price_inr` column is acceptable because it is the public selling
price shown to visitors.

## 11. Admin workflow

1. Add or edit a row in `Inventory`.
2. Keep its status as `draft` while it is incomplete.
3. Review its location, measurements, price, map and images.
4. Change its status to `published`.
5. Allow approximately 5–10 minutes and refresh the website.
6. Change inactive billboards to `archived`; do not delete their IDs.

## 12. Sheet protection

- Freeze and protect row 1 so headers cannot be changed accidentally.
- Do not rename or reorder columns after the website is connected.
- Use Google Sheets version history to recover accidental edits.
- Give edit access only to authorized administrators.
- Add a filter to row 1 so the admin can view draft, published or archived rows.

## 13. Future fields

Do not add empty future columns now. Add them only when the website needs them.
Likely future additions include coordinates, measured daily traffic,
availability, billboard face/direction and video.

When a new field is required, add it to the right side of the sheet and update
the frontend importer before entering data in that column.
