(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Reveal on scroll. The hide state is only armed here, so if this
     script never runs every section stays visible. */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length && !reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-reveal-ready");
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -32px 0px" });
    revealEls.forEach((el) => io.observe(el));
    // Safety net in case something never intersects
    setTimeout(() => revealEls.forEach((el) => el.classList.add("is-visible")), 2500);
  }

  /* Press state: scale to 0.95 on pointer-down, cancel if the finger
     moves more than 10px (a scroll) or leaves. Haptic weight follows
     the action: light tick for navigation, medium for primary actions. */
  const HAPTIC = { light: 15, medium: 30 };
  const CANCEL_DISTANCE = 10;

  document.querySelectorAll(".pressable").forEach((el) => {
    let startX = 0;
    let startY = 0;
    let active = false;

    const release = () => {
      active = false;
      el.classList.remove("is-pressed");
    };

    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      active = true;
      startX = e.clientX;
      startY = e.clientY;
      el.classList.add("is-pressed");
      const weight = HAPTIC[el.dataset.haptic];
      if (weight && navigator.vibrate) navigator.vibrate(weight);
    });

    el.addEventListener("pointermove", (e) => {
      if (!active) return;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > CANCEL_DISTANCE) release();
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((type) => el.addEventListener(type, release));
  });

  window.addEventListener("scroll", () => {
    document.querySelectorAll(".pressable.is-pressed").forEach((el) => el.classList.remove("is-pressed"));
  }, { passive: true });

  /* Count-up for the stats. The HTML already holds the final value,
     so the numbers are correct even without this. */
  const counters = document.querySelectorAll("[data-counter]");
  if (counters.length && !reduceMotion && "IntersectionObserver" in window) {
    const run = (el) => {
      const target = Number(el.dataset.target);
      const suffix = el.dataset.suffix || "";
      const start = performance.now();
      const duration = 900;
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString("en-IN") + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const co = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          run(e.target);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => co.observe(el));
  }

  /* Active section in both the desktop top links and the mobile tab bar */
  const sections = document.querySelectorAll("main section[id]");
  const links = document.querySelectorAll("[data-nav]");
  if (sections.length && links.length && "IntersectionObserver" in window) {
    const setActive = (id) => {
      links.forEach((l) => {
        const on = l.getAttribute("href") === `#${id}`;
        l.classList.toggle("is-active", on);
        if (on) l.setAttribute("aria-current", "true");
        else l.removeAttribute("aria-current");
      });
    };
    const nav = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = e.target.id === "background" ? "skills" : e.target.id;
        setActive(id);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => nav.observe(s));
  }
})();
