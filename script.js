(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     Scroll-reveal (IntersectionObserver, transform/opacity only)
     Arm the hide-then-reveal CSS only once we're guaranteed to be
     able to un-hide it — otherwise every section stays visible.
     --------------------------------------------------------- */
  const revealEls = document.querySelectorAll("[data-reveal]");

  if (revealEls.length && !prefersReducedMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-reveal-ready");

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));

    // Safety net: if anything is still hidden a couple seconds after
    // load (fonts/layout shift caused it to never intersect, a tab
    // opened in the background, etc.), reveal it anyway.
    window.setTimeout(() => {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    }, 2500);
  }

  /* ---------------------------------------------------------
     Mobile nav toggle
     --------------------------------------------------------- */
  const navToggle = document.getElementById("navToggle");
  const navPanel = document.getElementById("navPanel");

  if (navToggle && navPanel) {
    const closeNav = () => {
      navToggle.setAttribute("aria-expanded", "false");
      navPanel.classList.remove("is-open");
      navToggle.setAttribute("aria-label", "Open menu");
    };
    const openNav = () => {
      navToggle.setAttribute("aria-expanded", "true");
      navPanel.classList.add("is-open");
      navToggle.setAttribute("aria-label", "Close menu");
    };

    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      isOpen ? closeNav() : openNav();
    });

    navPanel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeNav);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });
  }

  /* ---------------------------------------------------------
     Animated impact counters
     --------------------------------------------------------- */
  const counters = document.querySelectorAll("[data-counter]");

  function animateCounter(el) {
    const target = parseFloat(el.dataset.target || "0");
    const suffix = el.dataset.suffix || "";
    const duration = 1100;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = Math.round(target * eased);
      el.textContent = value.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    if (prefersReducedMotion) {
      el.textContent = target.toLocaleString() + suffix;
    } else {
      requestAnimationFrame(tick);
    }
  }

  if (counters.length) {
    if ("IntersectionObserver" in window) {
      const counterObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      counters.forEach((el) => counterObserver.observe(el));
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* ---------------------------------------------------------
     Active nav-link highlighting on scroll
     --------------------------------------------------------- */
  const sections = document.querySelectorAll("main section[id]");
  const navLinks = document.querySelectorAll('.nav-links a[data-nav]');

  if (sections.length && navLinks.length && "IntersectionObserver" in window) {
    const linkFor = (id) =>
      document.querySelector(`.nav-links a[href="#${id}"]`);

    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const link = linkFor(entry.target.id);
          if (!link) return;
          if (entry.isIntersecting) {
            navLinks.forEach((l) => l.classList.remove("is-active"));
            link.classList.add("is-active");
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    sections.forEach((section) => navObserver.observe(section));
  }

  /* ---------------------------------------------------------
     Header shadow / density on scroll
     --------------------------------------------------------- */
  const header = document.querySelector(".site-header");
  let lastScrolled = false;

  function onScroll() {
    const scrolled = window.scrollY > 8;
    if (scrolled !== lastScrolled && header) {
      header.style.borderBottomColor = scrolled
        ? "rgba(255,255,255,0.14)"
        : "rgba(255,255,255,0.09)";
      lastScrolled = scrolled;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
})();
