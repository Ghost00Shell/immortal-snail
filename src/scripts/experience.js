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
          const hasItalicStress = !!line.querySelector(".hero__stress");
          if (isOffer && !hasItalicStress) {
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
        // The dark irises redden while the white catch-lights stay bright, so
        // the whites remain visible as the mood turns hostile.
        const finaleIris = finale.querySelectorAll(".snail__iris");
        const finaleWhites = finale.querySelectorAll(".snail__eye:not(.snail__iris)");

        gsap.set([title, coda], { autoAlpha: 0, y: 24 });
        // The snail is already full size in the finale; the scroll slides it up
        // rather than growing it, so the constant scale never fights the travel.
        // The scale pivots on the snail's own eyes (their position in the flipped
        // artwork, nudged left of centre so the head lands slightly right of the
        // viewport) so the zoom crops in on the face without dragging the eyes
        // off the head — they scale as one rigid unit with it.
        gsap.set(snail, { transformOrigin: "-4% 35.7%", scale: 3.1 });

        // Function-based pixel translation: the scaled snail overflows the
        // riser box, so viewport-relative pixels (not the riser's unscaled
        // layout height) reliably carry it from below the fold up until only
        // the head fills the frame.
        const startY = () => window.innerHeight * 1.15;
        const endY = () => window.innerHeight * 0.05;

        const zoom = gsap.timeline({
          scrollTrigger: {
            trigger: finale,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });
        zoom
          .fromTo(
            riser,
            { y: startY, autoAlpha: 0.92 },
            { y: endY, autoAlpha: 1, ease: "power1.out", duration: 1 },
            0
          )
          .to(
            finaleIris,
            { fill: "#c81818", ease: "power2.in", duration: 0.55 },
            0.48
          )
          .to(title, { autoAlpha: 1, y: 0, duration: 0.26 }, 0.6)
          .to(coda, { autoAlpha: 1, y: 0, duration: 0.26 }, 0.76);

        // The white eye highlights twitch rapidly while the finale is on screen.
        let whitesWiggle;
        let whitesWiggleTrigger;
        if (finaleWhites.length) {
          gsap.set(finaleWhites, { transformOrigin: "50% 50%" });
          whitesWiggle = gsap.to(finaleWhites, {
            keyframes: [
              { x: -1.1, y: 0.7, rotation: -2.2, duration: 0.045 },
              { x: 1.1, y: -0.8, rotation: 2.2, duration: 0.045 },
            ],
            repeat: -1,
            yoyo: true,
            ease: "none",
            paused: true,
          });
          whitesWiggleTrigger = ScrollTrigger.create({
            trigger: finale,
            start: "top 92%",
            end: "bottom top",
            onEnter: () => whitesWiggle.play(),
            onEnterBack: () => whitesWiggle.play(),
            onLeave: () => whitesWiggle.pause(0),
            onLeaveBack: () => whitesWiggle.pause(0),
          });
          cleanups.push(() => {
            whitesWiggle.kill();
            whitesWiggleTrigger.kill();
            gsap.set(finaleWhites, { clearProps: "all" });
          });
        }
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
      const deathOverlay = document.querySelector("[data-death-overlay]");
      const deathText = document.querySelector("[data-death-text]");
      const deathRetry = document.querySelector("[data-death-retry]");

      // Only intercept when the page loaded armed (i.e. not deep-linked
      // straight to the condition), so a shared #the-condition URL stays legible.
      const armed = root.classList.contains("deal-armed");

      if (armed && conditionEl) {
        // Own the hidden state inline so GSAP animates from a known start.
        // It waits off to the right and slides back in when the deal is struck.
        gsap.set(conditionEl, { autoAlpha: 0, x: 96 });
        if (cueEl) gsap.set(cueEl, { autoAlpha: 0 });

        let activated = false;
        let fallback;
        // Set once the companion has taken its final leave, so a late
        // activation can never restart roaming through the finale.
        let departRoam = null;
        let departureReached = false;
        let conditionRevealed = false;

        // The withheld catch slides in from the right, timed to land as the
        // snail begins to roam so the reveal and the hand-off read as one beat.
        const revealCondition = () => {
          if (conditionRevealed) return;
          conditionRevealed = true;
          gsap.to(conditionEl, {
            autoAlpha: 1,
            x: 0,
            duration: 0.9,
            ease: "power3.out",
            onStart: () => conditionEl.focus({ preventScroll: true }),
          });
          if (cueEl) gsap.to(cueEl, { autoAlpha: 1, duration: 0.6, delay: 0.5 });
        };

        // Returns true only when the companion actually starts roaming, so the
        // caller knows whether it still owes the condition its own reveal.
        const startRoam = () => {
          if (!(fine && companion && floatEl)) return false;
          if (departureReached) return false;
          const snailEl = companion.querySelector(".companion__snail");
          const w = companion.offsetWidth || 80;
          const h = companion.offsetHeight || 80;
          const pad = Math.max(w, h) + 60; // distance past an edge that reads as "gone"
          const roamTweens = [];
          let alive = true;
          let deathTriggered = false;
          let wobble = null;
          let loom = null;
          let collisionFrame = 0;
          const pointer = { x: Number.NaN, y: Number.NaN };

          const vw = () => window.innerWidth;
          const vh = () => window.innerHeight;
          // The companion is fixed at 0,0, so a translate equals the desired
          // centre minus half the snail's size.
          const toXY = (cx, cy) => ({ x: cx - w / 2, y: cy - h / 2 });
          const stopRoamMotion = () => {
            roamTweens.forEach((t) => t.kill());
            roamTweens.length = 0;
            if (wobble) wobble.kill();
            if (loom) loom.kill();
            gsap.killTweensOf(companion);
            gsap.killTweensOf(snailEl);
          };

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
          // Start facing left (scaleX -1) to match the hero snail's orientation,
          // so the hand-off doesn't visibly flip. JS now owns which way it faces.
          gsap.set(snailEl, { scaleX: -1 });

          const speed = 130; // px/sec — an unhurried, inevitable drift
          let facing = -1;
          // The art faces right at scaleX(1), left at scaleX(-1); flip it to
          // match travel, but only on decisive horizontal movement so it
          // doesn't jitter.
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

          const onPointerMove = (event) => {
            pointer.x = event.clientX;
            pointer.y = event.clientY;
          };

          const triggerDeath = () => {
            if (!alive || deathTriggered) return;
            deathTriggered = true;
            alive = false;
            departureReached = true;
            stopRoamMotion();
            document.body.classList.add("is-dead");

            const deathTl = gsap.timeline();
            deathTl
              .to(
                snailEl,
                {
                  keyframes: [
                    { rotation: -14, duration: 0.06 },
                    { rotation: 14, duration: 0.06 },
                    { rotation: -10, duration: 0.06 },
                    { rotation: 10, duration: 0.06 },
                    { rotation: 0, duration: 0.05 },
                  ],
                  transformOrigin: "50% 58%",
                  ease: "power1.inOut",
                },
                0
              )
              .to(
                snailEl,
                {
                  filter: "hue-rotate(-160deg) saturate(320%) brightness(0.8)",
                  duration: 0.18,
                  ease: "power2.in",
                },
                0.1
              )
              .to(
                snailEl,
                {
                  scale: 1.95,
                  autoAlpha: 0,
                  duration: 0.24,
                  ease: "power3.in",
                },
                0.24
              );

            if (deathOverlay && deathText) {
              deathTl
                .to(
                  deathOverlay,
                  {
                    autoAlpha: 1,
                    duration: 0.7,
                    ease: "power2.in",
                  },
                  0.2
                )
                .to(
                  deathText,
                  {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.4,
                    ease: "power2.out",
                  },
                  0.62
                );
              if (deathRetry) {
                deathTl.to(
                  deathRetry,
                  {
                    autoAlpha: 1,
                    ease: "none",
                    keyframes: [
                      { y: 30, rotation: -1.2, duration: 0.9, ease: "sine.inOut" },
                      { y: 24, rotation: 1.3, duration: 0.9, ease: "sine.inOut" },
                      { y: 17, rotation: -1, duration: 0.9, ease: "sine.inOut" },
                      { y: 11, rotation: 1.1, duration: 0.9, ease: "sine.inOut" },
                      { y: 5, rotation: -0.7, duration: 0.8, ease: "sine.inOut" },
                      { y: 0, rotation: 0, duration: 0.6, ease: "power2.out" },
                    ],
                    onStart: () => gsap.set(deathRetry, { pointerEvents: "auto" }),
                  },
                  0.92
                );
              }
            }
          };

          const checkCollision = () => {
            if (!alive || deathTriggered) return;
            if (Number.isFinite(pointer.x) && Number.isFinite(pointer.y)) {
              const visible = Number(gsap.getProperty(companion, "opacity")) > 0.05;
              if (!visible) {
                collisionFrame = window.requestAnimationFrame(checkCollision);
                return;
              }
              const rect = companion.getBoundingClientRect();
              const hit =
                pointer.x >= rect.left &&
                pointer.x <= rect.right &&
                pointer.y >= rect.top &&
                pointer.y <= rect.bottom;
              if (hit) {
                triggerDeath();
                return;
              }
            }
            collisionFrame = window.requestAnimationFrame(checkCollision);
          };

          // On deal acceptance, the hero snail visibly shrinks to companion size
          // before motion begins so the handoff reads as one continuous creature.
          if (onScreen && heroSnail && r) {
            const shrinkTo = gsap.utils.clamp(0.16, 1, w / r.width);
            // The wrapper carries no mirror (the inner artwork does), so a plain
            // uniform positive scale can never be read as a rotation or flip.
            gsap.set(heroSnail, { transformOrigin: "50% 50%", scale: 1 });
            roamTweens.push(
              gsap.to(heroSnail, {
                scale: shrinkTo,
                duration: 0.58,
                ease: "power2.inOut",
                onComplete: () => {
                  if (!alive) return;
                  gsap.set(heroSnail, { autoAlpha: 0 });
                  gsap.set(companion, { autoAlpha: 1 });
                  revealCondition();
                  wander();
                },
              })
            );
          } else {
            gsap.set(companion, { autoAlpha: 1 });
            if (heroSnail) gsap.set(heroSnail, { autoAlpha: 0 });
            revealCondition();
            wander();
          }

          wobble = gsap.to(floatEl, {
            yPercent: -9,
            rotation: 3,
            duration: 2.6,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });

          // It very slowly looms larger as you near the end.
          loom = gsap.fromTo(
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

          // The companion takes its leave for good once the page resigns
          // itself to the inevitable, gliding straight off the bottom so the
          // finale snail is the only one left. It reads its live rendered
          // position first so the exit never jumps.
          let departing = false;
          const depart = () => {
            if (!alive || departing) return;
            departing = true;
            stopRoamMotion();
            const curX = Number(gsap.getProperty(companion, "x")) || 0;
            const curY = Number(gsap.getProperty(companion, "y")) || 0;
            center = { x: curX + w / 2, y: curY + h / 2 };
            glideTo(edgePoint("bottom"), "power2.in", () => {
              gsap.set(companion, { autoAlpha: 0 });
              alive = false;
            });
          };
          departRoam = depart;

          window.addEventListener("pointermove", onPointerMove, { passive: true });
          collisionFrame = window.requestAnimationFrame(checkCollision);

          cleanups.push(() => {
            alive = false;
            stopRoamMotion();
            window.removeEventListener("pointermove", onPointerMove);
            if (collisionFrame) window.cancelAnimationFrame(collisionFrame);
            document.body.classList.remove("is-dead");
            if (heroSnail) gsap.set(heroSnail, { clearProps: "all" });
            gsap.set(companion, { clearProps: "all" });
            gsap.set(snailEl, { clearProps: "all" });
            if (deathOverlay) gsap.set(deathOverlay, { clearProps: "all" });
            if (deathText) gsap.set(deathText, { clearProps: "all" });
            if (deathRetry) gsap.set(deathRetry, { clearProps: "all" });
          });

          return true;
        };

        const activate = () => {
          if (activated) return;
          activated = true;
          if (dealBtn) dealBtn.removeEventListener("click", onDealClick);
          if (fallback) fallback.kill();

          // Fade the button out, moving keyboard/SR focus onto the condition
          // (inside revealCondition) so focus is never stranded on it.
          if (dealBtn) {
            gsap.to(dealBtn, {
              autoAlpha: 0,
              scale: 0.94,
              duration: 0.5,
              ease: "power2.in",
              onComplete: () => gsap.set(dealBtn, { pointerEvents: "none" }),
            });
          }

          // The catch is revealed by the roam hand-off once the snail starts
          // moving. If roaming can't happen (coarse pointer, already departed),
          // reveal it here so the condition is never left withheld.
          if (!startRoam()) revealCondition();
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

        // Once the escalation resigns itself to the inevitable, the companion
        // leaves for good and hands the stage to the finale snail.
        const exitCue = document.querySelector("[data-companion-exit]");
        const finaleSection = document.querySelector("[data-finale]");
        let exitTrigger;
        let finaleExitTrigger;
        if (exitCue) {
          exitTrigger = ScrollTrigger.create({
            trigger: exitCue,
            start: "top 75%",
            once: true,
            onEnter: () => {
              departureReached = true;
              if (departRoam) departRoam();
            },
          });
        }
        if (finaleSection) {
          finaleExitTrigger = ScrollTrigger.create({
            trigger: finaleSection,
            start: "top 85%",
            onEnter: () => {
              departureReached = true;
              if (departRoam) {
                departRoam();
              }
            },
            onEnterBack: () => {
              departureReached = true;
              if (departRoam) {
                departRoam();
              }
            },
          });
        }

        cleanups.push(() => {
          if (dealBtn) dealBtn.removeEventListener("click", onDealClick);
          if (fallback) fallback.kill();
          if (exitTrigger) exitTrigger.kill();
          if (finaleExitTrigger) finaleExitTrigger.kill();
        });
      }

      if (deathRetry) {
        const onRetry = () => window.location.reload();
        deathRetry.addEventListener("click", onRetry);
        cleanups.push(() => deathRetry.removeEventListener("click", onRetry));
      }

      // ---- A shared, occasional blink across every snail on the page ----
      // They are all the same creature, so they blink as one. The finale snail
      // is excluded — its eyes redden and swell instead of blinking.
      const eyes = gsap.utils
        .toArray(".snail__eye")
        .filter((el) => !el.closest("[data-finale]"));
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
