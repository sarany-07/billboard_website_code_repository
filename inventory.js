const inventoryRoot = document.querySelector("[data-inventory]");

if (inventoryRoot) {
  const elements = {
    filters: inventoryRoot.querySelector("[data-inventory-filters]"),
    search: inventoryRoot.querySelector("[data-inventory-search]"),
    locality: inventoryRoot.querySelector("[data-inventory-locality]"),
    footfall: inventoryRoot.querySelector("[data-inventory-footfall]"),
    visibility: inventoryRoot.querySelector("[data-inventory-visibility]"),
    sort: inventoryRoot.querySelector("[data-inventory-sort]"),
    count: inventoryRoot.querySelector("[data-inventory-count]"),
    clear: inventoryRoot.querySelector("[data-inventory-clear]"),
    emptyClear: inventoryRoot.querySelector("[data-inventory-empty-clear]"),
    grid: inventoryRoot.querySelector("[data-inventory-grid]"),
    empty: inventoryRoot.querySelector("[data-inventory-empty]"),
    error: inventoryRoot.querySelector("[data-inventory-error]"),
    loadMore: inventoryRoot.querySelector("[data-inventory-load-more]"),
    previous: inventoryRoot.querySelector("[data-inventory-previous]"),
    next: inventoryRoot.querySelector("[data-inventory-next]")
  };

  const drawer = {
    root: document.querySelector("[data-inventory-drawer]"),
    panel: document.querySelector("[data-inventory-drawer-panel]"),
    closeButtons: document.querySelectorAll("[data-inventory-drawer-close]"),
    id: document.querySelector("[data-drawer-id]"),
    title: document.querySelector("[data-drawer-title]"),
    locality: document.querySelector("[data-drawer-locality]"),
    media: document.querySelector("[data-drawer-media]"),
    gallery: document.querySelector("[data-drawer-gallery]"),
    images: document.querySelector("[data-drawer-images]"),
    dots: document.querySelector("[data-drawer-dots]"),
    previous: document.querySelector("[data-drawer-previous]"),
    next: document.querySelector("[data-drawer-next]"),
    audience: document.querySelector("[data-drawer-audience]"),
    specifications: document.querySelector("[data-drawer-specifications]"),
    playback: document.querySelector("[data-drawer-playback]"),
    map: document.querySelector("[data-drawer-map]"),
    streetView: document.querySelector("[data-drawer-street-view]"),
    enquire: document.querySelector("[data-drawer-enquire]")
  };

  // Read the responsive grid so loading stays in rows, even as inventory grows.
  // Mobile remains a horizontal carousel with small, manageable batches.
  const getInventoryBatchSize = (rows) => {
    if (window.matchMedia("(max-width: 600px)").matches) return rows * 2;
    const columns = getComputedStyle(elements.grid).gridTemplateColumns.split(" ").filter(Boolean).length;
    return Math.max(1, columns) * rows;
  };
  const state = {
    records: [],
    filteredRecords: [],
    visibleCount: 0,
    returnFocusTo: null,
    drawerImageIndex: 0,
    drawerAutoplay: null
  };
  const bandLabels = { high: "High", medium: "Medium", low: "Low" };
  const inventoryImages = [
    "assets/showcase-roadside.png",
    "assets/showcase-retail.png",
    "assets/showcase-airport.png",
    "assets/hero-digital-billboard.png",
    "assets/bengaluru-location-spotlight.png"
  ];
  const inventoryConfig = {
    csvUrl:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQIoYLf8HYoIOhAuQSaDylz2Ed4tNgjApXKSlVnpsu8-ZC17E6SE9pq_NJw0BS2smSaCUqAHr2umZzO/pub?gid=0&single=true&output=csv",
    timeout: 8000
  };

  // Escape source values before inserting them into a card template.
  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const formatNumber = (value) =>
    value === null || value === undefined
      ? null
      : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

  const formatPrice = (value) =>
    value === null || value === undefined
      ? null
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0
        }).format(value);

  // Parse published Google Sheets CSV without breaking quoted commas or URLs.
  const parseCsv = (source) => {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      const next = source[index + 1];
      if (character === '"' && quoted && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((character === "\n" || character === "\r") && !quoted) {
        if (character === "\r" && next === "\n") index += 1;
        row.push(field);
        if (row.some((value) => value.trim())) rows.push(row);
        row = [];
        field = "";
      } else {
        field += character;
      }  
    }
    if (field || row.length) {
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
    }
    if (!rows.length) throw new Error("The published sheet is empty.");

    const headers = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim());
    return rows.slice(1).map((values, index) => {
      if (values.length !== headers.length) {
        throw new Error(`Google Sheet row ${index + 2} has an invalid column count.`);
      }
      return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
    });
  };

  const cleanText = (value) => {
    const text = String(value ?? "").trim();
    return ["", "-", "n/a", "na", "#ref!", "null"].includes(text.toLowerCase())
      ? null
      : text;
  };
  const cleanNumber = (value) => {
    const text = cleanText(value);
    if (text === null) return null;
    const number = Number(text.replace(/[₹,\s]/g, ""));
    return Number.isFinite(number) ? number : null;
  };
  const cleanBand = (value) => {
    const band = cleanText(value)?.toLowerCase();
    return ["high", "medium", "low"].includes(band) ? band : null;
  };
  const cleanBoolean = (value) => {
    const text = cleanText(value)?.toLowerCase();
    if (text === "yes") return true;
    if (text === "no") return false;
    return null;
  };
  const expandDirection = (value) =>
    cleanText(value)
      ?.replace(/\bFTF\b/gi, "- facing traffic from")
      .replace(/\bFTT\b/gi, "- facing traffic towards")
      .replace(/\s+/g, " ")
      .trim() ?? null;

  const requiredHeaders = [
    "billboard_id",
    "status",
    "sort_order",
    "city",
    "location_name",
    "location_description",
    "locality",
    "footfall",
    "visibility",
    "media_type",
    "width_ft",
    "height_ft"
  ];

  // Keep the UI independent from the flat spreadsheet column structure.
  const normalizeSheetRows = (rows) => {
    const headers = new Set(Object.keys(rows[0] ?? {}));
    const missing = requiredHeaders.filter((header) => !headers.has(header));
    if (missing.length) throw new Error(`Missing Google Sheet columns: ${missing.join(", ")}`);

    const ids = new Set();
    const records = [];
    rows.forEach((row, index) => { 
      if (cleanText(row.status)?.toLowerCase() !== "published") return;

      const id = cleanText(row.billboard_id);
      const description = cleanText(row.location_description);
      const locality = cleanText(row.locality);
      const city = cleanText(row.city);
      const mediaType = cleanText(row.media_type);
      const width = cleanNumber(row.width_ft);
      const height = cleanNumber(row.height_ft);
      const footfall = cleanBand(row.footfall);
      const visibility = cleanBand(row.visibility);
      if (!id || !description || !locality || !city || !mediaType || width === null || height === null || !footfall || !visibility) {
        console.warn(`Skipped incomplete published billboard on sheet row ${index + 2}.`);
        return;
      }
      if (ids.has(id)) {
        console.warn(`Skipped duplicate billboard ID ${id} on sheet row ${index + 2}.`);
        return;
      }
      ids.add(id);

      const suppliedSqft = cleanNumber(row.sqft);
      const calculatedSqft = Math.round(width * height * 100) / 100;
      records.push({
        id,
        // Availability is explicit; dates never automatically release a booked screen.
        booking_status: ["available", "booked"].includes(cleanText(row.booking_status)?.toLowerCase())
          ? cleanText(row.booking_status).toLowerCase()
          : null,
        booked_until: cleanText(row.booked_until),
        // Optional public classification: blank/unknown must never imply ownership.
        inventory_type: ["owned", "partner"].includes(cleanText(row.inventory_type)?.toLowerCase())
          ? cleanText(row.inventory_type).toLowerCase()
          : null,
        source_id: cleanNumber(row.sort_order) ?? records.length + 1,
        city,
        location: {
          raw: description,
          display: expandDirection(description),
          name: cleanText(row.location_name) ?? locality,
          locality,
          zone: cleanText(row.zone)
        },
        audience: {
          footfall_band: footfall,
          vehicular_visibility: visibility
        },
        nearby: {
          it_tech_parks: cleanBoolean(row.it_tech_parks),
          high_street_retail: cleanBoolean(row.high_street_retail),
          residential_catchments: cleanBoolean(row.residential_catchments),
          airport_connectivity: cleanBoolean(row.airport_connectivity),
          transit_hubs: cleanBoolean(row.transit_hubs)
        },
        media: {
          type: mediaType,
          structure: cleanText(row.structure),
          width_ft: width,
          height_ft: height,
          sqft: suppliedSqft ?? calculatedSqft,
          sqft_source: suppliedSqft === null ? "calculated" : "supplied"
        },
        playback: {
          slot_seconds: cleanNumber(row.slot_seconds),
          loop_minutes: cleanNumber(row.loop_minutes),
          slot_count: cleanNumber(row.slot_count)
        },
        campaign: { duration_days: cleanNumber(row.duration_days) },
        pricing: { monthly_price_inr: cleanNumber(row.monthly_price_inr) },
        map: {
          label: cleanText(row.map_label),
          url: cleanText(row.map_url),
          street_view_url: cleanText(row.street_view_url)
        },
        images: [row.image_1_url, row.image_2_url, row.image_3_url, row.image_4_url, row.image_5_url]
          .map(cleanText)
          .filter(Boolean),
        updated_at: cleanText(row.updated_at)
      });
    });
    if (!records.length) throw new Error("No valid published billboards were found.");
    return records;
  };

  const formatDimensions = (media) =>
    media.width_ft === null || media.height_ft === null
      ? null
      : `${formatNumber(media.width_ft)} × ${formatNumber(media.height_ft)} ft`;

  const createSearchText = (record) =>
    [
      record.location.raw,
      record.location.display,
      record.location.locality,
      record.location.zone,
      record.media.type,
      record.media.structure
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("en-IN");

  // Match screen names, never row order or IDs. Uploaded site images take priority.
  // Unknown future locations retain their own names and a clearly labelled illustration.
  const getScreenPresentation = (record) => {
    const name = record.location.name || record.location.locality;
    const normalized = name.toLowerCase().trim();
    // Only recognise this junction's named options. A partner's "both faces"
    // or longer road-specific title must never become our connected canvas.
    const atOurJunction = record.inventory_type === "owned" && /^(halasuru|ulsoor)$/i.test(record.location.locality.trim());
    const meanee = atOurJunction && /\bmeanee\b/.test(normalized);
    const assaye = atOurJunction && /\bassaye\b/.test(normalized);
    
    if (meanee && assaye) {
      return { name: "Connected canvas", badge: "Both faces", description: "Meanee Avenue + Assaye Road. One campaign across the corner.", image: "assets/mother-teresa-circle-01-clear.png", combined: true };
    }
    if (meanee && /^meanee avenue(?: rd| road)?$/.test(normalized)) return { name: "Meanee Avenue", badge: "Single face", description: "Your campaign on the Meanee Avenue-facing screen.", image: "assets/meanee-avenue-01-clear.png" };
    if (assaye && /^assaye (?:road|rd)$/.test(normalized)) return { name: "Assaye Road", badge: "Single face", description: "Your campaign on the Assaye Road-facing screen.", image: "assets/assaye-road-01-clear.png" };
    return { name, badge: record.media.type || "Billboard", description: record.location.display, image: inventoryImages[0] };
  };

  // Validate calendar dates strictly and format in UTC to avoid timezone day shifts.
  const formatBookedUntil = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
    }).format(date);
  };

  const createBookingBadge = (record) => {
    if (record.booking_status !== "booked") return "";
    const until = formatBookedUntil(record.booked_until);
    return `<span class="inventory-booking inventory-booking--booked"><span class="inventory-booking__badge">Booked</span>${until ? `<small>Through ${escapeHtml(until)}</small>` : ""}</span>`;
  };

  const createCard = (record) => {
    const screen = getScreenPresentation(record);
    const dimensions = formatDimensions(record.media);
    const imageUrl = record.images?.[0] || screen.image;
    const price = formatPrice(record.pricing?.monthly_price_inr);
    const ownership = record.inventory_type === "owned" ? "tūvi pixel" : record.inventory_type === "partner" ? "Partner screen" : null;
    const card = document.createElement("article");
    card.className = `inventory-card${screen.combined ? " inventory-card--combined" : ""}`;
    card.innerHTML = `
      <button type="button" data-inventory-card="${escapeHtml(record.id)}" aria-label="View details for ${escapeHtml(screen.name)}">
        <div class="inventory-card__visual">
          <img src="${escapeHtml(imageUrl)}" alt="" loading="lazy">
          <div class="inventory-card__badges">
            <span class="inventory-card__ownership">${escapeHtml(ownership || screen.badge)}</span>
            ${createBookingBadge(record)}
          </div>
          ${record.images?.length ? "" : '<small class="inventory-card__illustration">Illustrative view</small>'}
        </div>
        <div class="inventory-card__content">
          <span class="inventory-card__meta">${escapeHtml(record.location.locality)} · ${escapeHtml(record.city)}</span>
          <h4>${escapeHtml(screen.name)}</h4>
          <!-- Keep the catalogue summary short; playback and campaign facts live in the drawer. -->
          <div class="inventory-card__metrics">
            <span><small>${screen.combined ? "Listed size" : "Screen size"}</small>${escapeHtml(dimensions || "Ask us")}</span>
            <div class="inventory-card__price"><strong>${escapeHtml(price || "Price on request")}</strong>${price ? '<span>/ month</span>' : ""}</div>
          </div>
          <span class="inventory-card__action">View screen details <b aria-hidden="true">↗</b></span>
        </div>
      </button>`;
    return card;
  };

  const renderResults = () => {
    const fragment = document.createDocumentFragment();
    state.filteredRecords
      .slice(0, state.visibleCount)
      .forEach((record) => fragment.append(createCard(record)));

    elements.grid.replaceChildren(fragment);
    elements.grid.setAttribute("aria-busy", "false");

    const total = state.filteredRecords.length;
    elements.count.textContent = `${total} screen option${total === 1 ? "" : "s"} found in Bengaluru`;
    elements.empty.hidden = total > 0;
    elements.grid.hidden = total === 0;
    elements.loadMore.hidden = state.visibleCount >= total;
  };

  const sortRecords = (records) => {
    const sorted = [...records];
    const rank = { high: 3, medium: 2, low: 1 };

    if (elements.sort.value === "footfall") {
      sorted.sort(
        (a, b) =>
          (rank[b.audience.footfall_band] ?? 0) - (rank[a.audience.footfall_band] ?? 0)
      );
    } else if (elements.sort.value === "size") {
      sorted.sort((a, b) => (b.media.sqft ?? 0) - (a.media.sqft ?? 0));
    } else if (elements.sort.value === "locality") {
      sorted.sort((a, b) =>
        a.location.locality.localeCompare(b.location.locality, "en-IN", {
          sensitivity: "base"
        })
      );
    } else {
      sorted.sort((a, b) => Number(a.source_id) - Number(b.source_id));
    }
    return sorted;
  };

  const applyFilters = () => {
    const query = elements.search.value.trim().toLocaleLowerCase("en-IN");
    const locality = elements.locality.value;
    const footfall = elements.footfall.value;
    const visibility = elements.visibility.value;

    state.filteredRecords = sortRecords(
      state.records.filter(
        (record) =>
          (!query || record.searchText.includes(query)) &&
          (!locality || record.location.locality === locality) &&
          (!footfall || record.audience.footfall_band === footfall) &&
          (!visibility || record.audience.vehicular_visibility === visibility)
      )
    );

    // Base density on the whole catalogue, not filtered matches, to prevent
    // cards changing size while a visitor searches or changes a filter.
    elements.grid.classList.toggle("inventory-grid--catalogue", state.records.length > 3);
    state.visibleCount = getInventoryBatchSize(3);
    elements.clear.hidden = !(query || locality || footfall || visibility);
    renderResults();
  };

  const clearFilters = () => {
    elements.filters.reset();
    elements.sort.value = "recommended";
    applyFilters();
    elements.search.focus();
  };

  const createDetailRow = (label, value) => {
    if (value === null || value === undefined || value === "") return null;
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    wrapper.append(term, description);
    return wrapper;
  };

  const renderDetailGroup = (list, rows) => {
    const validRows = rows.filter(Boolean);
    list.replaceChildren(...validRows);
    list.closest("section").hidden = validRows.length === 0;
  };

  const activateDrawerImage = (nextIndex) => {
    const images = [...drawer.images.children];
    const dots = [...drawer.dots.children];
    if (!images.length) return;
    state.drawerImageIndex = (nextIndex + images.length) % images.length;
    images.forEach((image, index) =>
      image.classList.toggle("is-active", index === state.drawerImageIndex)
    );
    dots.forEach((dot, index) => {
      const isActive = index === state.drawerImageIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", String(isActive));
    });
  };

  const startDrawerAutoplay = () => {
    window.clearInterval(state.drawerAutoplay);
    if (reduceMotion.matches) return;
    state.drawerAutoplay = window.setInterval(
      () => activateDrawerImage(state.drawerImageIndex + 1),
      2000
    );
  };

  // Use record images automatically; existing assets remain a no-data fallback.
  const renderDrawerGallery = (record) => {
    const placeholderUrls = [getScreenPresentation(record).image];
    const imageUrls = record.images?.length ? record.images : placeholderUrls;
    drawer.images.replaceChildren(
      ...imageUrls.map((url) => {
        const image = document.createElement("img");
        image.src = url;
        image.alt = `${getScreenPresentation(record).name} — ${record.images?.length ? "billboard view" : "illustrative view"}`;
        return image;
      })
    );
    drawer.dots.replaceChildren(
      ...imageUrls.map((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Show image ${index + 1}`);
        dot.addEventListener("click", () => {
          activateDrawerImage(index);
          startDrawerAutoplay();
        });
        return dot;
      })
    );
    activateDrawerImage(0);
    startDrawerAutoplay();
  };

  const openDrawer = (record, trigger) => {
    state.returnFocusTo = trigger;
    drawer.id.textContent = record.id;
    drawer.title.textContent = record.location.name ?? record.location.display;
    drawer.locality.textContent = `${record.location.locality} · ${record.city}`;
    drawer.media.textContent =
      [record.media.type, record.media.structure].filter(Boolean).join(" · ") || "Billboard";
    renderDrawerGallery(record);

    renderDetailGroup(drawer.audience, [
      createDetailRow("Footfall", bandLabels[record.audience.footfall_band]),
      createDetailRow("Vehicular visibility", bandLabels[record.audience.vehicular_visibility])
    ]);
    renderDetailGroup(drawer.specifications, [
      createDetailRow("Inventory", record.inventory_type === "owned" ? "tūvi pixel screen" : record.inventory_type === "partner" ? "Partner screen" : null),
      createDetailRow("Media type", record.media.type),
      createDetailRow("Structure", record.media.structure),
      createDetailRow("Dimensions", formatDimensions(record.media)),
      createDetailRow(
        "Display area",
        record.media.sqft === null ? null : `${formatNumber(record.media.sqft)} sq ft`
      )
    ]);
    renderDetailGroup(drawer.playback, [
      createDetailRow(
        "Slot duration",
        record.playback.slot_seconds === null ? null : `${record.playback.slot_seconds} sec`
      ),
      createDetailRow(
        "Loop time",
        record.playback.loop_minutes === null ? null : `${record.playback.loop_minutes} min`
      ),
      createDetailRow("Number of slots", formatNumber(record.playback.slot_count)),
      createDetailRow(
        "Campaign duration",
        record.campaign.duration_days === null ? null : `${record.campaign.duration_days} days`
      ),
      createDetailRow(
        "Monthly price",
        record.pricing?.monthly_price_inr === null || record.pricing?.monthly_price_inr === undefined
          ? null
          : `${formatPrice(record.pricing.monthly_price_inr)} / month`
      )
    ]);

    drawer.map.hidden = !record.map.url;
    if (record.map.url) drawer.map.href = record.map.url;
    drawer.streetView.hidden = !record.map.street_view_url;
    if (record.map.street_view_url) drawer.streetView.href = record.map.street_view_url;
    drawer.enquire.href = `contact.html?billboard=${encodeURIComponent(record.id)}`;

    drawer.root.hidden = false;
    document.body.classList.add("inventory-drawer-open");
    requestAnimationFrame(() => {
      drawer.root.classList.add("is-open");
      drawer.panel.focus();
    });
  };

  const closeDrawer = () => {
    window.clearInterval(state.drawerAutoplay);
    drawer.root.classList.remove("is-open");
    document.body.classList.remove("inventory-drawer-open");
    window.setTimeout(() => {
      drawer.root.hidden = true;
      state.returnFocusTo?.focus();
      state.returnFocusTo = null;
    }, 350);
  };

  const populateLocalities = () => {
    const localities = [...new Set(state.records.map((record) => record.location.locality))].sort(
      (a, b) => a.localeCompare(b, "en-IN", { sensitivity: "base" })
    );
    localities.forEach((locality) => {
      const option = document.createElement("option");
      option.value = locality;
      option.textContent = locality;
      elements.locality.append(option);
    });
  };

  const useRecords = (records) => {
    state.records = records.map((record) => ({
      ...record,
      searchText: createSearchText(record)
    }));
    elements.locality.replaceChildren(new Option("All localities", ""));
    populateLocalities();
    applyFilters();
  };

  const fetchSheetRecords = async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), inventoryConfig.timeout);
    try {
      // A changing query value avoids stale browser/CDN copies after an admin edit.
      const requestUrl = new URL(inventoryConfig.csvUrl);
      requestUrl.searchParams.set("updated", Date.now());
      const response = await fetch(requestUrl, {
        signal: controller.signal,
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Google Sheet request failed: ${response.status}`);
      return normalizeSheetRows(parseCsv(await response.text()));
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const loadInventory = async () => {
    elements.error.hidden = true;
    elements.grid.hidden = false;
    elements.grid.setAttribute("aria-busy", "true");
    try {
      useRecords(await fetchSheetRecords());
    } catch (sheetError) {
      console.error("Google Sheet inventory unavailable.", sheetError);
      elements.grid.hidden = true;
      elements.error.hidden = false;
      elements.count.textContent = "Screen details unavailable";
    }
  };

  let searchTimer;
  elements.search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(applyFilters, 150);
  });
  [elements.locality, elements.footfall, elements.visibility, elements.sort].forEach((control) =>
    control.addEventListener("change", applyFilters)
  );
  elements.clear.addEventListener("click", clearFilters);
  elements.emptyClear.addEventListener("click", clearFilters);
  elements.loadMore.addEventListener("click", () => {
    state.visibleCount += getInventoryBatchSize(2);
    renderResults();
  });

  // Mobile carousel buttons mirror touch swiping and move exactly one card.
  const scrollCarousel = (direction) => {
    const firstCard = elements.grid.querySelector(".inventory-card");
    if (!firstCard) return;
    const gap = Number.parseFloat(getComputedStyle(elements.grid).columnGap) || 0;
    elements.grid.scrollBy({
      left: direction * (firstCard.getBoundingClientRect().width + gap),
      behavior: reduceMotion.matches ? "auto" : "smooth"
    });
  };
  elements.previous.addEventListener("click", () => scrollCarousel(-1));
  elements.next.addEventListener("click", () => scrollCarousel(1));

  let inventoryAutoplay;
  const startInventoryAutoplay = () => {
    window.clearInterval(inventoryAutoplay);
    if (reduceMotion.matches || !window.matchMedia("(max-width: 600px)").matches) return;
    inventoryAutoplay = window.setInterval(() => {
      const atEnd =
        elements.grid.scrollLeft + elements.grid.clientWidth >= elements.grid.scrollWidth - 4;
      if (atEnd) {
        elements.grid.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollCarousel(1);
      }
    }, 2000);
  };
  elements.grid.addEventListener("mouseenter", () => window.clearInterval(inventoryAutoplay));
  elements.grid.addEventListener("mouseleave", startInventoryAutoplay);
  elements.grid.addEventListener("focusin", () => window.clearInterval(inventoryAutoplay));
  elements.grid.addEventListener("focusout", startInventoryAutoplay);
  window.addEventListener("resize", startInventoryAutoplay);
  startInventoryAutoplay();

  // One delegated handler supports current and future result counts.
  elements.grid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-inventory-card]");
    if (!trigger) return;
    const record = state.records.find((item) => item.id === trigger.dataset.inventoryCard);
    if (record) openDrawer(record, trigger);
  });

  drawer.closeButtons.forEach((button) => button.addEventListener("click", closeDrawer));
  drawer.previous.addEventListener("click", () => {
    activateDrawerImage(state.drawerImageIndex - 1);
    startDrawerAutoplay();
  });
  drawer.next.addEventListener("click", () => {
    activateDrawerImage(state.drawerImageIndex + 1);
    startDrawerAutoplay();
  });
  drawer.gallery.addEventListener("mouseenter", () => window.clearInterval(state.drawerAutoplay));
  drawer.gallery.addEventListener("mouseleave", startDrawerAutoplay);
  drawer.gallery.addEventListener("focusin", () => window.clearInterval(state.drawerAutoplay));
  drawer.gallery.addEventListener("focusout", startDrawerAutoplay);
  let drawerTouchStartX = 0;
  drawer.gallery.addEventListener(
    "touchstart",
    (event) => {
      drawerTouchStartX = event.changedTouches[0].clientX;
      window.clearInterval(state.drawerAutoplay);
    },
    { passive: true }
  );
  drawer.gallery.addEventListener(
    "touchend",
    (event) => {
      const distance = event.changedTouches[0].clientX - drawerTouchStartX;
      if (Math.abs(distance) >= 45) {
        activateDrawerImage(state.drawerImageIndex + (distance < 0 ? 1 : -1));
      }
      startDrawerAutoplay();
    },
    { passive: true }
  );
  document.addEventListener("keydown", (event) => {
    if (!drawer.root.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      closeDrawer();
      return;
    }

    // Keep keyboard focus inside the open detail drawer.
    if (event.key === "Tab") {
      const focusable = [
        ...drawer.panel.querySelectorAll(
          'a[href]:not([hidden]), button:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"])'
        )
      ];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  loadInventory();
}
