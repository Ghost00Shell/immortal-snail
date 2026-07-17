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

      // ---- Finale: the snail rises from below and zooms to just its eyes ----
      // The rise (translate) and the zoom (scale about the eyes) live on two
      // separate elements so an origin-based scale never fights the translate:
      // the riser controls where the eyes land, the inner scale controls how
      // much of the snail is cropped away until only the eyes remain.
      const finale = document.querySelector("[data-finale]");
      if (finale) {
        const riser = finale.querySelector("[data-finale-riser]");
        const snail = finale.querySelector("[data-finale-snail]");
        const title = finale.querySelector("[data-finale-title]");
        const coda = finale.querySelector("[data-finale-coda]");
        gsap.set([title, coda], { autoAlpha: 0, y: 24 });
        gsap.set(snail, { transformOrigin: "33% 33%" });

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
            riser,
            { yPercent: 70, xPercent: 0 },
            { yPercent: -4, xPercent: 9, ease: "power1.out", duration: 1 },
            0
          )
          .fromTo(
            snail,
            { scale: 0.55, autoAlpha: 0.92 },
            { scale: 3.1, autoAlpha: 1, ease: "power2.in", duration: 1 },
            0
          )
          .to(title, { autoAlpha: 1, y: 0, duration: 0.26 }, 0.6)
          .to(coda, { autoAlpha: 1, y: 0, duration: 0.26 }, 0.76);
      }

      // ---- The Deal gate: the offer's condition is withheld until accepted ----
      // Clicking "Deal?" (or simply scrolling past the hero) slides in the
      // catch and releases the snail to roam the page of its own accord —
      // drifting off one edge and wandering back in from another, forever.
      const dealBtn = document.querySelector("[data-deal]");
      const conditionEl = document.querySelector("[data-condition]");
      const cueEl = document.querySelector("[data-scroll-cue]");
      const heroSnail = document.querySelector("[data-hero-snail]");
      const companion = document.querySelector("[data-companion]");
      const floatEl = document.querySelector("[data-companion-float]");

      // Only intercept when the page loaded armed (i.e. not deep-linked
      // straight to the condition), so a shared #the-condition URL stays legible.
      const armed = root.classList.contains("deal-armed");

      if (armed && conditionEl) {
        // Own the hidden state inline so GSAP animates from a known start.
        gsap.set(conditionEl, { autoAlpha: 0, x: 48 });
        if (cueEl) gsap.set(cueEl, { autoAlpha: 0 });

        let activated = false;
        let fallback;

        const startRoam = () => {
          if (!(fine && companion && floatEl)) return;
          const snailEl = companion.querySelector(".companion__snail");
          const w = companion.offsetWidth || 80;
          const h = companion.offsetHeight || 80;
          const pad = Math.max(w, h) + 60; // distance past an edge that reads as "gone"
          const roamTweens = [];
          let alive = true;

          const vw = () => window.innerWidth;
          const vh = () => window.innerHeight;
          // The companion is fixed at 0,0, so a translate equals the desired
          // centre minus half the snail's size.
          const toXY = (cx, cy) => ({ x: cx - w / 2, y: cy - h / 2 });

          // Begin at the hero snail's spot if it's still on screen so the
          // hand-off is seamless; otherwise ease in from just above the fold.
          let center;
          const r = heroSnail ? heroSnail.getBoundingClientRect() : null;
          const onScreen =
            r && r.bottom > 0 && r.top < vh() && r.right > 0 && r.left < vw();
          center = onScreen
            ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
            : { x: vw() * 0.5, y: -pad };
          gsap.set(companion, { ...toXY(center.x, center.y), autoAlpha: 0 });
          gsap.set(snailEl, { scaleX: 1 }); // JS now owns which way it faces

          gsap.to(companion, { autoAlpha: 1, duration: 1, delay: 0.15 });
          if (heroSnail) gsap.to(heroSnail, { autoAlpha: 0, duration: 0.6 });

          const speed = 130; // px/sec — an unhurried, inevitable drift
          let facing = 1;
          // The art faces right at scaleX(1); flip it to match travel, but
          // only on decisive horizontal movement so it doesn't jitter.
          const face = (dx) => {
            if (Math.abs(dx) < 12) return;
            const dir = dx > 0 ? 1 : -1;
            if (dir === facing) return;
            facing = dir;
            roamTweens.push(
              gsap.to(snailEl, { scaleX: dir, duration: 0.5, ease: "power2.out" })
            );
          };

          const edgePoint = (edge) => {
            if (edge === "left") return { x: -pad, y: gsap.utils.random(0, vh()) };
            if (edge === "right") return { x: vw() + pad, y: gsap.utils.random(0, vh()) };
            if (edge === "top") return { x: gsap.utils.random(0, vw()), y: -pad };
            return { x: gsap.utils.random(0, vw()), y: vh() + pad };
          };
          const insidePoint = () => ({
            x: gsap.utils.random(vw() * 0.12, vw() * 0.88),
            y: gsap.utils.random(vh() * 0.14, vh() * 0.86),
          });

          const glideTo = (target, ease, onDone) => {
            const dist = Math.hypot(target.x - center.x, target.y - center.y) || 1;
            face(target.x - center.x);
            roamTweens.push(
              gsap.to(companion, {
                ...toXY(target.x, target.y),
                duration: gsap.utils.clamp(1.6, 7, dist / speed),
                ease,
                onComplete: () => {
                  if (!alive) return;
                  center = target;
                  onDone();
                },
              })
            );
          };

          const wander = () => {
            if (!alive) return;
            // Now and then it slips off one edge and reappears from another.
            if (Math.random() < 0.4) {
              const edges = ["left", "right", "top", "bottom"];
              const exit = gsap.utils.random(edges);
              glideTo(edgePoint(exit), "power1.in", () => {
                const enter = gsap.utils.random(edges.filter((e) => e !== exit));
                center = edgePoint(enter);
                gsap.set(companion, toXY(center.x, center.y));
                glideTo(insidePoint(), "power1.out", wander);
              });
            } else {
              glideTo(insidePoint(), "sine.inOut", wander);
            }
          };
          wander();

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
            alive = false;
            roamTweens.forEach((t) => t.kill());
            wobble.kill();
            loom.kill();
            gsap.killTweensOf(companion);
            gsap.killTweensOf(snailEl);
            gsap.set(companion, { clearProps: "all" });
            gsap.set(snailEl, { clearProps: "all" });
          });
        };

        const activate = () => {
          if (activated) return;
          activated = true;
          if (dealBtn) dealBtn.removeEventListener("click", onDealClick);
          if (fallback) fallback.kill();

          // Slide the condition in, then hand keyboard/SR focus to it before
          // fading the button so focus is never stranded on a hidden element.
          gsap.to(conditionEl, {
            autoAlpha: 1,
            x: 0,
            duration: 0.9,
            ease: "power3.out",
            onStart: () => conditionEl.focus({ preventScroll: true }),
          });
          if (cueEl) gsap.to(cueEl, { autoAlpha: 1, duration: 0.6, delay: 0.5 });
          if (dealBtn) {
            gsap.to(dealBtn, {
              autoAlpha: 0,
              scale: 0.94,
              duration: 0.5,
              ease: "power2.in",
              onComplete: () => gsap.set(dealBtn, { pointerEvents: "none" }),
            });
          }

          startRoam();
        };

        const onDealClick = (e) => {
          e.preventDefault();
          activate();
        };
        if (dealBtn) dealBtn.addEventListener("click", onDealClick);

        // Scroll-past fallback: if they never click, reveal the catch anyway.
        const heroSection = conditionEl.closest("section") || conditionEl;
        fallback = ScrollTrigger.create({
          trigger: heroSection,
          start: "bottom 60%",
          onEnter: activate,
        });

        cleanups.push(() => {
          if (dealBtn) dealBtn.removeEventListener("click", onDealClick);
          if (fallback) fallback.kill();
        });
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
