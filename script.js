const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-toggle]");
const navigation = document.querySelector("[data-nav]");
const heroImage = document.querySelector("[data-hero-image]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Trigger the initial hero entrance after the first browser paint.
requestAnimationFrame(() => document.body.classList.add("is-ready"));

// Mobile navigation helpers keep the button state and visible menu synchronized.
const closeMenu = () => {
  menuButton?.setAttribute("aria-expanded", "false");
  menuButton?.setAttribute("aria-label", "Open navigation");
  navigation?.classList.remove("is-open");
};

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
  navigation?.classList.toggle("is-open", !isOpen);
});

navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton?.getAttribute("aria-expanded") === "true") {
    closeMenu();
    menuButton.focus();
  }
});

// This is a non-modal dropdown: allow normal tabbing and close when leaving it.
document.addEventListener("pointerdown", (event) => {
  if (header && !header.contains(event.target)) closeMenu();
});
header?.addEventListener("focusout", (event) => {
  if (!header.contains(event.relatedTarget)) closeMenu();
});
window.matchMedia("(max-width: 960px)").addEventListener("change", closeMenu);

let scrollTicking = false;
let updateActiveNavigation = () => {};

const updateOnScroll = () => {
  const scrollY = window.scrollY;
  header?.classList.toggle("is-scrolled", scrollY > 24);

  if (heroImage && !reduceMotion.matches && scrollY < window.innerHeight) {
    heroImage.style.transform = `translate3d(0, ${scrollY * 0.08}px, 0)`;
  }

  updateActiveNavigation();
  scrollTicking = false;
};

window.addEventListener(
  "scroll",
  () => {
    if (!scrollTicking) {
      requestAnimationFrame(updateOnScroll);
      scrollTicking = true;
    }
  },
  { passive: true }
);

// Highlight the homepage section currently in view for faster orientation.
const homeNavLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const homeNavSections = homeNavLinks
  .map((link) => ({
    link,
    section: document.querySelector(link.getAttribute("href"))
  }))
  .filter((item) => item.section);

if (homeNavSections.length) {
  updateActiveNavigation = () => {
    const readingLine = window.scrollY + window.innerHeight * 0.32;
    const activeItem = homeNavSections.find(({ section }) => {
      const sectionTop = section.offsetTop;
      return readingLine >= sectionTop && readingLine < sectionTop + section.offsetHeight;
    });

    homeNavSections.forEach(({ link }) => {
      const isActive = link === activeItem?.link;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  requestAnimationFrame(updateActiveNavigation);
}

// Reveal supporting sections only once as they enter the viewport.
const revealItems = document.querySelectorAll(".scroll-reveal");

if (reduceMotion.matches || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

// Move the panel's soft glow with the pointer without causing layout changes.
const impactPanel = document.querySelector("[data-impact-panel]");

impactPanel?.addEventListener("pointermove", (event) => {
  if (reduceMotion.matches) return;

  const bounds = impactPanel.getBoundingClientRect();
  const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
  const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100;

  impactPanel.style.setProperty("--pointer-x", `${pointerX}%`);
  impactPanel.style.setProperty("--pointer-y", `${pointerY}%`);
});

// Digital showcase tabs: update imagery and support arrow-key navigation.
const showcase = document.querySelector("[data-showcase]");
const showcaseTabs = [...document.querySelectorAll("[data-showcase-tab]")];
const showcaseSlides = [...document.querySelectorAll("[data-showcase-slide]")];
const showcaseCounter = document.querySelector("[data-showcase-current]");
const showcaseEnquire = document.querySelector("[data-showcase-enquire]");
// Named choices do not depend on editable Google Sheet inventory IDs.
// The screen query stays in source_page for admin context, without a visible form field.
const showcaseChoices = [
  { key: "meanee-avenue", name: "Meanee Avenue" },
  { key: "assaye-road", name: "Assaye Road" },
  { key: "both-faces", name: "Both faces — Meanee Avenue and Assaye Road" }
];

// Update the nested image gallery inside a selected showcase category.
const activateGalleryImage = (slide, nextIndex) => {
  const images = [...slide.querySelectorAll("[data-gallery-image]")];
  const dots = [...slide.querySelectorAll("[data-gallery-dot]")];
  if (!images.length) return;

  const normalizedIndex = (nextIndex + images.length) % images.length;

  images.forEach((image, index) => {
    const isActive = index === normalizedIndex;
    image.classList.toggle("is-active", isActive);
    image.setAttribute("aria-hidden", String(!isActive));
  });

  dots.forEach((dot, index) => {
    const isActive = index === normalizedIndex;
    dot.classList.toggle("is-active", isActive);
    if (isActive) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
  });

  slide.dataset.galleryIndex = String(normalizedIndex);
};

const activateShowcaseSlide = (nextIndex) => {
  showcaseTabs.forEach((tab, index) => {
    const isActive = index === nextIndex;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.setAttribute("tabindex", isActive ? "0" : "-1");
  });

  showcaseSlides.forEach((slide, index) => {
    const isActive = index === nextIndex;
    slide.classList.toggle("is-active", isActive);
    slide.setAttribute("aria-hidden", String(!isActive));
    slide.querySelectorAll(".showcase-gallery-nav button").forEach((button) => {
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });
  });

  if (showcaseCounter) {
    showcaseCounter.textContent = String(nextIndex + 1).padStart(2, "0");
  }

  // A newly selected category always begins with its first image.
  if (showcaseSlides[nextIndex]) activateGalleryImage(showcaseSlides[nextIndex], 0);
  if (showcaseEnquire && showcaseChoices[nextIndex]) {
    const choice = showcaseChoices[nextIndex];
    const bothFaces = choice.key === "both-faces";
    showcaseEnquire.href = `contact.html?screen=${encodeURIComponent(choice.key)}#enquiry-form`;
    showcaseEnquire.setAttribute("aria-label", `Enquire about ${choice.name}`);
    showcaseEnquire.querySelector("[data-showcase-cta-label]").textContent =
      bothFaces ? "Enquire about both screens" : "Enquire about this screen";
    showcase.querySelector("[data-showcase-selection]").textContent =
      bothFaces ? "Make both faces yours." : `Interested in ${choice.name}?`;
  }
};

showcaseTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateShowcaseSlide(index));

  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + showcaseTabs.length) % showcaseTabs.length;
    activateShowcaseSlide(nextIndex);
    showcaseTabs[nextIndex].focus();
  });
});

// Dots, arrows and swipe gestures control each category's local gallery.
showcaseSlides.forEach((slide) => {
  const dots = [...slide.querySelectorAll("[data-gallery-dot]")];
  const previousButton = slide.querySelector("[data-gallery-previous]");
  const nextButton = slide.querySelector("[data-gallery-next]");
  const gallery = slide.querySelector("[data-slide-gallery]");
  let touchStartX = 0;

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => activateGalleryImage(slide, index));
  });

  previousButton?.addEventListener("click", () => {
    activateGalleryImage(slide, Number(slide.dataset.galleryIndex || 0) - 1);
  });

  nextButton?.addEventListener("click", () => {
    activateGalleryImage(slide, Number(slide.dataset.galleryIndex || 0) + 1);
  });

  gallery?.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.changedTouches[0].clientX;
    },
    { passive: true }
  );

  gallery?.addEventListener(
    "touchend",
    (event) => {
      const distance = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(distance) < 45) return;

      const direction = distance < 0 ? 1 : -1;
      activateGalleryImage(slide, Number(slide.dataset.galleryIndex || 0) + direction);
    },
    { passive: true }
  );

  activateGalleryImage(slide, 0);
});

// Initialize accessibility state for the first visible category.
activateShowcaseSlide(0);

// Autoplay the active showcase gallery; interaction pauses the two-second timer.
let showcaseAutoplay;
const startShowcaseAutoplay = () => {
  window.clearInterval(showcaseAutoplay);
  if (reduceMotion.matches || !showcase) return;
  showcaseAutoplay = window.setInterval(() => {
    const activeSlide = showcaseSlides.find((slide) => slide.classList.contains("is-active"));
    if (!activeSlide) return;
    activateGalleryImage(activeSlide, Number(activeSlide.dataset.galleryIndex || 0) + 1);
  }, 2000);
};

showcase?.addEventListener("mouseenter", () => window.clearInterval(showcaseAutoplay));
showcase?.addEventListener("mouseleave", startShowcaseAutoplay);
showcase?.addEventListener("focusin", () => window.clearInterval(showcaseAutoplay));
showcase?.addEventListener("focusout", startShowcaseAutoplay);
startShowcaseAutoplay();

// Assurance accordion keeps one answer open and synchronizes ARIA state.
const assuranceTriggers = [...document.querySelectorAll("[data-assurance-trigger]")];

assuranceTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const selectedItem = trigger.closest(".assurance-item");
    const selectedPanel = document.getElementById(trigger.getAttribute("aria-controls"));

    assuranceTriggers.forEach((otherTrigger) => {
      const otherItem = otherTrigger.closest(".assurance-item");
      const otherPanel = document.getElementById(otherTrigger.getAttribute("aria-controls"));
      const isSelected = otherTrigger === trigger;

      otherTrigger.setAttribute("aria-expanded", String(isSelected));
      otherItem?.classList.toggle("is-open", isSelected);

      if (otherPanel) {
        otherPanel.hidden = !isSelected;
      }
    });

    selectedItem?.classList.add("is-open");
    if (selectedPanel) selectedPanel.hidden = false;
  });
});

// Keep the footer year current without requiring annual markup changes.
const currentYear = document.querySelector("[data-current-year]");
if (currentYear) currentYear.textContent = new Date().getFullYear();

// Back-to-top control respects the user's reduced-motion preference.
document.querySelector("[data-back-to-top]")?.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: reduceMotion.matches ? "auto" : "smooth"
  });
});

// Contact form submissions are saved by the bound Google Apps Script web app.
const contactForm = document.querySelector("[data-contact-form]");

if (contactForm) {
  const contactEndpoint =
    "https://script.google.com/macros/s/AKfycbyptw0SC8Ml_Tow280Bdcb-1rIiBuG3DWeGSXg5MGgBQesP_alD1GDGTL9dnyv0A3Vy/exec";
  const requiredFields = [...contactForm.querySelectorAll("[required]")];
  const formStatus = contactForm.querySelector("[data-form-status]");
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const billboardId = new URLSearchParams(window.location.search).get("billboard")?.trim();

  // Preserve the inventory ID invisibly so the future admin sheet can store it.
  if (billboardId) {
    const selectedInput = contactForm.querySelector("[data-selected-billboard]");
    if (selectedInput) selectedInput.value = billboardId;
  }

  const getFieldError = (field) => {
    if (field.type === "checkbox" && !field.checked) {
      return "Please confirm before sending your enquiry.";
    }

    if (field.validity.valueMissing) return "This field is required.";
    if (field.validity.typeMismatch) return "Enter a valid email address.";
    return "";
  };

  const showFieldError = (field) => {
    const errorKey = field.dataset.consent !== undefined ? "consent" : field.id;
    const errorElement = contactForm.querySelector(`[data-error-for="${errorKey}"]`);
    const message = getFieldError(field);  

    field.setAttribute("aria-invalid", String(Boolean(message)));
    if (errorElement) errorElement.textContent = message;
    return !message;
  };

  requiredFields.forEach((field) => {
    field.addEventListener("blur", () => showFieldError(field));
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") showFieldError(field);
    });
    field.addEventListener("change", () => {
      if (field.getAttribute("aria-invalid") === "true") showFieldError(field);
    });
  });

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const isValid = requiredFields.map(showFieldError).every(Boolean);

    if (!isValid) {
      const firstInvalidField = contactForm.querySelector('[aria-invalid="true"]');
      firstInvalidField?.focus();
      return;
    }

    const payload = Object.fromEntries(new FormData(contactForm).entries());
    payload.source_page = window.location.href;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    submitButton.disabled = true;
    formStatus.hidden = false;
    formStatus.dataset.state = "sending";
    formStatus.textContent = "Sending your enquiry…";

    try {
      const response = await fetch(contactEndpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow",
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Submission failed: ${response.status}`);

      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "Unable to save your enquiry.");

      const selectedBillboard = payload.billboard;
      contactForm.reset();
      const selectedInput = contactForm.querySelector("[data-selected-billboard]");
      if (selectedInput) selectedInput.value = selectedBillboard;
      formStatus.dataset.state = "success";
      formStatus.textContent = "Thank you. We’ve received your enquiry and will be in touch.";
    } catch (error) {
      console.error(error);
      formStatus.dataset.state = "error";
      formStatus.textContent =
        "We couldn’t confirm your submission. Please try again in a moment.";
    } finally {
      window.clearTimeout(timeout);
      submitButton.disabled = false;
      formStatus.scrollIntoView({
        behavior: reduceMotion.matches ? "auto" : "smooth",
        block: "nearest"
      });
    }
  });
}
