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

/* ---------- Round 2 motion ---------- */
(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* Resume download: check mark and label swap after click */
  document.querySelectorAll(".dl").forEach((btn) => {
    const label = btn.querySelector(".dl-label");
    const original = label ? label.textContent : "";
    btn.addEventListener("click", () => {
      btn.classList.add("is-done");
      if (label) label.textContent = label.dataset.done || original;
      clearTimeout(btn._t);
      btn._t = setTimeout(() => {
        btn.classList.remove("is-done");
        if (label) label.textContent = original;
      }, 2600);
    });
  });

  if (reduceMotion) return;

  /* Section titles: split into words, rise in when they enter the view */
  const split = (el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement("span");
            w.className = "w";
            w.setAttribute("aria-hidden", "true");
            const inner = document.createElement("span");
            inner.textContent = part;
            inner.style.setProperty("--i", i++);
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    el.setAttribute("aria-label", el.textContent.trim());
    walk(el);
  };

  const titles = document.querySelectorAll("[data-split-scroll]");
  titles.forEach(split);

  /* Kicker text scramble */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const scramble = (el) => {
    const target = el.dataset.text || el.textContent;
    el.dataset.text = target;
    const start = performance.now();
    const duration = 650;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const settled = Math.floor(p * target.length);
      let out = target.slice(0, settled);
      for (let k = settled; k < target.length; k++) {
        out += target[k] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    };
    requestAnimationFrame(tick);
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (e.target.hasAttribute("data-split-scroll")) e.target.classList.add("words-in");
        if (e.target.hasAttribute("data-scramble")) scramble(e.target);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    titles.forEach((t) => io.observe(t));
    document.querySelectorAll("[data-scramble]").forEach((k) => io.observe(k));
    setTimeout(() => titles.forEach((t) => t.classList.add("words-in")), 3000);
  } else {
    titles.forEach((t) => t.classList.add("words-in"));
  }

  /* Aurora parallax */
  const aurora = document.querySelector(".aurora");
  if (aurora) {
    let queued = false;
    window.addEventListener("scroll", () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (scrollY < 1200) aurora.style.setProperty("--py", `${(scrollY * 0.35).toFixed(1)}px`);
      });
    }, { passive: true });
  }

  /* Cursor follower: dot follows exactly, ring trails with a spring */
  if (finePointer) {
    const ring = document.createElement("div");
    const dot = document.createElement("div");
    ring.className = "cursor is-hidden";
    dot.className = "cursor-dot is-hidden";
    ring.setAttribute("aria-hidden", "true");
    dot.setAttribute("aria-hidden", "true");
    document.body.append(ring, dot);

    let mx = -100, my = -100, rx = -100, ry = -100, vx = 0, vy = 0, running = false;
    const STIFFNESS = 0.18, DAMPING = 0.72;
    const loop = () => {
      vx = (vx + (mx - rx) * STIFFNESS) * DAMPING;
      vy = (vy + (my - ry) * STIFFNESS) * DAMPING;
      rx += vx; ry += vy;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1 || Math.abs(vx) > 0.1) requestAnimationFrame(loop);
      else running = false;
    };
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      ring.classList.remove("is-hidden");
      dot.classList.remove("is-hidden");
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    document.addEventListener("pointerleave", () => { ring.classList.add("is-hidden"); dot.classList.add("is-hidden"); });
    document.addEventListener("pointerover", (e) => {
      ring.classList.toggle("is-hover", !!e.target.closest("a, button, .chip, .ticker__list li"));
    });
  }
})();

/* ---------- Round 3 motion ---------- */
(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  /* Back to top: show after the hero, ring shows scroll progress */
  const toTop = document.querySelector(".to-top");
  const bigTrack = document.querySelector(".bigname__track");
  let raf = false;
  const onScroll = () => {
    raf = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (toTop) {
      toTop.classList.toggle("is-shown", scrollY > 600);
      toTop.style.setProperty("--p", max > 0 ? (scrollY / max).toFixed(4) : 0);
    }
    if (bigTrack && !reduceMotion) {
      const r = bigTrack.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) {
        const p = 1 - r.top / innerHeight; // 0 when entering, grows as you scroll
        bigTrack.style.setProperty("--bx", `${(-p * 260).toFixed(1)}px`);
      }
    }
  };
  window.addEventListener("scroll", () => { if (!raf) { raf = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  if (reduceMotion) return;

  /* Career strip: draw the line and bring steps in one by one */
  const journey = document.querySelector(".journey");
  if (journey && "IntersectionObserver" in window) {
    const jo = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => { if (e.isIntersecting) { journey.classList.add("is-in"); obs.disconnect(); } });
    }, { threshold: 0.35 });
    jo.observe(journey);
    setTimeout(() => journey.classList.add("is-in"), 4000);
  } else if (journey) {
    journey.classList.add("is-in");
  }

  /* Stat numbers pop once their count-up finishes */
  const pops = document.querySelectorAll(".stat__pop");
  if (pops.length && "IntersectionObserver" in window) {
    const po = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        setTimeout(() => e.target.classList.add("popped"), 1150);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    pops.forEach((el) => po.observe(el));
  }

  /* Ticker: steady drift that speeds up while the page is scrolling */
  const ticker = document.querySelector(".ticker");
  const track = ticker && ticker.querySelector(".ticker__track");
  if (ticker && track) {
    ticker.classList.add("ticker--js");
    let x = 0, boost = 0, lastY = scrollY, paused = false, last = performance.now();
    const BASE = 40; // px per second
    ticker.addEventListener("pointerenter", () => { paused = true; });
    ticker.addEventListener("pointerleave", () => { paused = false; });
    window.addEventListener("scroll", () => {
      boost = Math.min(boost + Math.abs(scrollY - lastY) * 6, 1600);
      lastY = scrollY;
    }, { passive: true });
    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!paused) {
        x -= (BASE + boost) * dt;
        const half = track.scrollWidth / 2;
        if (half > 0 && -x >= half) x += half;
        track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      }
      boost *= 0.92;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* Portrait depth: layers drift at different speeds with the mouse */
  const stage = document.querySelector(".stage");
  const hero = document.querySelector(".hero");
  if (finePointer && stage && hero) {
    const layers = [...stage.querySelectorAll("[data-depth]")];
    const RANGE = 36; // px at depth 1
    hero.addEventListener("pointermove", (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      layers.forEach((l) => {
        const d = parseFloat(l.dataset.depth);
        l.style.setProperty("--tx", `${(nx * d * RANGE).toFixed(1)}px`);
        l.style.setProperty("--ty", `${(ny * d * RANGE).toFixed(1)}px`);
      });
    });
    hero.addEventListener("pointerleave", () => layers.forEach((l) => { l.style.setProperty("--tx", "0px"); l.style.setProperty("--ty", "0px"); }));
  }
})();
