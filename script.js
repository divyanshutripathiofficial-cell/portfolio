(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Headline: split into words that rise in one by one ---------- */
  if (!reduceMotion) {
    let i = 0;
    const splitNode = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement("span");
            w.className = "w";
            const inner = document.createElement("span");
            inner.textContent = part;
            inner.style.setProperty("--i", i++);
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          splitNode(child);
        }
      });
    };
    document.querySelectorAll("[data-split]").forEach((el) => {
      el.setAttribute("aria-label", el.textContent.trim());
      splitNode(el);
      el.querySelectorAll(".w").forEach((w) => w.setAttribute("aria-hidden", "true"));
    });
  }

  /* ---------- Reveal on scroll, staggered inside grids ---------- */
  document.querySelectorAll("[data-stagger]").forEach((group) => {
    [...group.querySelectorAll(":scope > [data-reveal]")].forEach((el, i) => el.style.setProperty("--i", i));
  });

  const revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length && !reduceMotion && "IntersectionObserver" in window) {
    root.classList.add("js-reveal-ready");
    const show = (el) => {
      el.classList.add("is-visible");
      // Once revealed, drop the stagger delay so hover effects respond instantly
      setTimeout(() => el.style.setProperty("--i", 0), 1200);
    };
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { show(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -32px 0px" });
    revealEls.forEach((el) => io.observe(el));
    setTimeout(() => revealEls.forEach((el) => el.classList.contains("is-visible") || show(el)), 3000);
  }

  /* ---------- Press state with scroll cancel, and haptics ---------- */
  const HAPTIC = { light: 15, medium: 30 };
  document.querySelectorAll(".pressable").forEach((el) => {
    let sx = 0, sy = 0, active = false;
    const release = () => { active = false; el.classList.remove("is-pressed"); };
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      active = true; sx = e.clientX; sy = e.clientY;
      el.classList.add("is-pressed");
      const ms = HAPTIC[el.dataset.haptic];
      if (ms && navigator.vibrate) navigator.vibrate(ms);
    });
    el.addEventListener("pointermove", (e) => {
      if (active && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) release();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((t) => el.addEventListener(t, release));
  });

  /* ---------- Counters ---------- */
  const counters = document.querySelectorAll("[data-counter]");
  if (counters.length && !reduceMotion && "IntersectionObserver" in window) {
    const run = (el) => {
      const target = Number(el.dataset.target);
      const suffix = el.dataset.suffix || "";
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / 1100, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-IN") + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const co = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => co.observe(el));
  }

  /* ---------- Scroll-linked: progress bar and experience rail ---------- */
  const progress = document.querySelector(".progress");
  const roles = document.querySelector(".roles");
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.setProperty("--p", max > 0 ? (scrollY / max).toFixed(4) : 0);
    if (roles) {
      const r = roles.getBoundingClientRect();
      const p = (innerHeight * 0.6 - r.top) / r.height;
      roles.style.setProperty("--rail", Math.min(Math.max(p, 0), 1).toFixed(4));
    }
    document.querySelectorAll(".pressable.is-pressed").forEach((el) => el.classList.remove("is-pressed"));
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Desktop pointer effects: spotlight, tilt, magnetic ---------- */
  if (finePointer) {
    document.querySelectorAll(".spot").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  if (finePointer && !reduceMotion) {
    const MAX_TILT = 6;
    document.querySelectorAll(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        if (!el.classList.contains("is-visible")) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add("is-tilting");
        el.style.transform = `perspective(900px) rotateX(${(-y * MAX_TILT).toFixed(2)}deg) rotateY(${(x * MAX_TILT).toFixed(2)}deg) translateY(-2px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.classList.remove("is-tilting");
        el.style.transform = "";
      });
    });

    const PULL = 0.18;
    document.querySelectorAll(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * PULL;
        const dy = (e.clientY - (r.top + r.height / 2)) * PULL;
        el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- Active section: top links, tab bar, sliding indicator ---------- */
  const sections = document.querySelectorAll("main section[id]");
  const links = document.querySelectorAll("[data-nav]");
  const tabs = [...document.querySelectorAll(".tab")];
  const tabBar = document.querySelector(".tab-bar");
  if (sections.length && links.length && "IntersectionObserver" in window) {
    const setActive = (id) => {
      links.forEach((l) => {
        const on = l.getAttribute("href") === `#${id}`;
        l.classList.toggle("is-active", on);
        on ? l.setAttribute("aria-current", "true") : l.removeAttribute("aria-current");
      });
      const idx = tabs.findIndex((t) => t.getAttribute("href") === `#${id}`);
      if (tabBar) {
        tabBar.style.setProperty("--tab-on", idx >= 0 ? 1 : 0);
        if (idx >= 0) tabBar.style.setProperty("--tab", idx);
      }
    };
    const nav = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        setActive(e.target.id === "background" ? "skills" : e.target.id);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => nav.observe(s));
  }
})();
