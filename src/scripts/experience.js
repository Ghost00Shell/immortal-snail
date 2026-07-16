// ============================================================
//  The Immortal Snail — the single owner of all page motion.
//  Everything (cursor companion, scroll-driven sky, section reveals,
//  the finale zoom, the shared blink) is built here inside one
//  gsap.context + matchMedia so nothing competes over the same nodes,
//  and every branch is reverted cleanly when the media query changes.
//  Built only after fonts settle so SplitText and pin measurements are
//  correct, and structured so the page is fully readable with no JS.
// ============================================================
import { gsap, ScrollTrigger, SplitText } from "../lib/gsap.js";

// Bright "day" sky the page ships with, and the dusk it drains toward.
const SKY = {
  day: { a: "#eaf6f3", b: "#d7ecea", veil: 0 },
  afternoon: { a: "#f2ecd9", b: "#d9e3d5", veil: 0.04 },
  dusk: { a: "#2f3f4c", b: "#1b2731", veil: 0.42 },
};

function build() {
  const root = document.documentElement;
  const mm = gsap.matchMedia();

  mm.add(
    {
      motion: "(prefers-reduced-motion: no-preference)",
      fine: "(pointer: fine)",
      wide: "(min-width: 820px)",
    },
    (context) => {
      const { motion, fine, wide } = context.conditions;
      const cleanups = [];

      // Reduced motion: leave the page in its readable, final state.
      if (!motion) {
        gsap.set("[data-reveal], [data-hero-line]", { clearProps: "all" });
        return;
      }

      // ---- Hero entrance (plays on load, never gated on scroll) ----
      const heroLines = gsap.utils.toArray("[data-hero-line]");
      const splits = [];
      if (heroLines.length) {
        const intro = gsap.timeline({
          defaults: { ease: "power3.out" },
          delay: 0.15,
        });
        heroLines.forEach((line, i) => {
          const isOffer = line.classList.contains("hero__line--offer");
          if (isOffer) {
            const split = new SplitText(line, { type: "words" });
            splits.push(split);
            gsap.set(line, { autoAlpha: 1 });
            intro.from(
              split.words,
              { yPercent: 115, autoAlpha: 0, duration: 0.9, stagger: 0.06 },
              i === 0 ? 0 : "-=0.55"
            );
          } else {
            intro.from(
              line,
              { y: 26, autoAlpha: 0, duration: 0.8 },
              i === 0 ? 0 : "-=0.5"
            );
          }
        });
      }

      // ---- Section reveals: enhance an already-visible default ----
      const reveals = gsap.utils.toArray("[data-reveal]");
      reveals.forEach((el) => {
        gsap.from(el, {
          y: 28,
          autoAlpha: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });

      // ---- Parallax flora (desktop only; small, transform-only drift) ----
      if (wide) {
        gsap.utils.toArray("[data-parallax]").forEach((el) => {
          const depth = parseFloat(el.dataset.depth || "0.2");
          gsap.fromTo(
            el,
            { yPercent: depth * 22 },
            {
              yPercent: -depth * 22,
              ease: "none",
              scrollTrigger: {
                trigger: el.closest(".section") || el,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            }
          );
        });
      }

      // ---- The sky drains from day to dusk across the whole scroll ----
      // GSAP can't smoothly interpolate hex values held in CSS custom
      // properties, so a single progress value is scrubbed and the three
      // colour stops are mixed by hand each frame (day → afternoon → dusk).
      const interp = gsap.utils.interpolate;
      const applySky = (p) => {
        let a, b, veil;
        if (p < 0.62) {
          const t = p / 0.62;
          a = interp(SKY.day.a, SKY.afternoon.a, t);
          b = interp(SKY.day.b, SKY.afternoon.b, t);
          veil = interp(SKY.day.veil, SKY.afternoon.veil, t);
        } else {
          const t = (p - 0.62) / 0.38;
          a = interp(SKY.afternoon.a, SKY.dusk.a, t);
          b = interp(SKY.afternoon.b, SKY.dusk.b, t);
          veil = interp(SKY.afternoon.veil, SKY.dusk.veil, t);
        }
        root.style.setProperty("--sky-a", a);
        root.style.setProperty("--sky-b", b);
        root.style.setProperty("--veil", String(veil));
      };
      const skyProxy = { p: 0 };
      const skyTween = gsap.to(skyProxy, {
        p: 1,
        ease: "none",
        onUpdate: () => applySky(skyProxy.p),
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
        },
      });

      // ---- Switch display ink to light at the dusk crossover ----
      // A discrete toggle where all remaining text is large (≥3:1 either way),
      // rather than tweening two colors past a failing midpoint.
      const duskMark = document.querySelector("[data-dusk]");
      let duskTrigger;
      if (duskMark) {
        duskTrigger = ScrollTrigger.create({
          trigger: duskMark,
          start: "top 62%",
          onEnter: () => {
            document.body.classList.add("is-dusk");
            gsap.to(root, {
              "--display-ink": "#f2fbfb",
              "--ink": "#eaf4f4",
              "--ink-soft": "#b7cad0",
              duration: 0.5,
            });
          },
          onLeaveBack: () => {
            document.body.classList.remove("is-dusk");
            gsap.to(root, {
              "--display-ink": "#3f2b28",
              "--ink": "#3f2b28",
              "--ink-soft": "#6a534e",
              duration: 0.5,
            });
          },
        });
      }

      // ---- Finale zoom: sticky stage, scrubbed scale (no GSAP pin) ----
      const finale = document.querySelector("[data-finale]");
      if (finale) {
        const snail = finale.querySelector("[data-finale-snail]");
        const title = finale.querySelector("[data-finale-title]");
        const coda = finale.querySelector("[data-finale-coda]");
        gsap.set([title, coda], { autoAlpha: 0, y: 24 });
        gsap.set(snail, { transformOrigin: "58% 46%" });

        const zoom = gsap.timeline({
          scrollTrigger: {
            trigger: finale,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.5,
          },
        });
        zoom
          .fromTo(
            snail,
            { scale: 0.16, rotate: -3, autoAlpha: 0.75 },
            { scale: 1.28, rotate: 0, autoAlpha: 1, ease: "power1.in", duration: 1 },
            0
          )
          .to(title, { autoAlpha: 1, y: 0, duration: 0.28 }, 0.62)
          .to(coda, { autoAlpha: 1, y: 0, duration: 0.28 }, 0.78);
      }

      // ---- The companion: a snail trailing just behind the cursor ----
      if (fine) {
        const companion = document.querySelector("[data-companion]");
        const floatEl = document.querySelector("[data-companion-float]");
        if (companion && floatEl) {
          const w = companion.offsetWidth || 80;
          gsap.set(companion, { xPercent: 0, yPercent: 0, autoAlpha: 0 });
          const xTo = gsap.quickTo(companion, "x", { duration: 0.7, ease: "power3" });
          const yTo = gsap.quickTo(companion, "y", { duration: 0.7, ease: "power3" });
          let seen = false;
          const onMove = (e) => {
            if (!seen) {
              seen = true;
              gsap.to(companion, { autoAlpha: 1, duration: 0.6 });
            }
            // trail a little behind and below the pointer
            xTo(e.clientX - w * 0.5 - 26);
            yTo(e.clientY - w * 0.5 + 18);
          };
          window.addEventListener("pointermove", onMove, { passive: true });

          const wobble = gsap.to(floatEl, {
            yPercent: -9,
            rotation: 3,
            duration: 2.6,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });

          // It very slowly looms larger as you near the end.
          const loom = gsap.fromTo(
            floatEl,
            { scale: 1 },
            {
              scale: 1.4,
              ease: "none",
              scrollTrigger: {
                trigger: document.body,
                start: "top top",
                end: "bottom bottom",
                scrub: true,
              },
            }
          );

          cleanups.push(() => {
            window.removeEventListener("pointermove", onMove);
            wobble.kill();
            loom.kill();
            gsap.set(companion, { clearProps: "all" });
          });
        }
      }

      // ---- A shared, occasional blink across every snail on the page ----
      // They are all the same creature, so they blink as one.
      const eyes = gsap.utils.toArray(".snail__eye");
      let blink;
      if (eyes.length) {
        gsap.set(eyes, { transformOrigin: "50% 50%" });
        blink = gsap.timeline({ repeat: -1, repeatDelay: 4.5 });
        blink
          .to(eyes, { scaleY: 0.1, duration: 0.08, ease: "power1.in" })
          .to(eyes, { scaleY: 1, duration: 0.12, ease: "power1.out" }, ">0.05");
      }

      ScrollTrigger.refresh();

      return () => {
        splits.forEach((s) => s.revert());
        if (duskTrigger) duskTrigger.kill();
        if (blink) blink.kill();
        document.body.classList.remove("is-dusk");
        root.style.removeProperty("--sky-a");
        root.style.removeProperty("--sky-b");
        root.style.removeProperty("--veil");
        cleanups.forEach((fn) => fn());
      };
    }
  );
}

function start() {
  // Build after fonts settle so line breaks and pin heights are final.
  const fontsReady = document.fonts && document.fonts.ready
    ? document.fonts.ready
    : Promise.resolve();
  const safety = new Promise((res) => setTimeout(res, 1500));
  Promise.race([fontsReady, safety]).then(() => {
    build();
    // A second refresh after the very last layout settles (images, etc.).
    window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  });
}

start();
