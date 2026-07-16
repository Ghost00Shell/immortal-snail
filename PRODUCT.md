# Product

## Register

brand

## Users

Hackathon judges and internet-savvy visitors who know (or are about to learn) the "Immortal Snail" thought experiment. They arrive on desktop or phone, expecting a throwaway meme page, and should instead get a scroll experience crafted well enough to feel like a real studio made it as a joke on purpose. Their job-to-be-done: be delighted, unsettled, and compelled to scroll all the way to the bottom.

## Product Purpose

A single static landing page (Astro + GSAP, deployed static) dramatizing the Immortal Snail meme: you get $10,000,000 and immortality, but an immortal snail chases you forever and killing-touches you if it reaches you. The page walks the visitor through the premise, then a series of escalating "what would you do?" escape plans, each quietly futile, ending in the snail catching up. Success = the visitor scrolls to the end, laughs, and remembers it.

## Brand Personality

Deadpan. Adorable. Doomed. The voice states existential horror in the calm, matter-of-fact tone of a children's picture book. Never winks too hard, never uses horror-movie theatrics — the comedy is in the gap between the cute pastel world and the inevitability of the copy. Three words: cozy, ominous, funny.

## Anti-references

- Horror-movie tropes: blood, jump-scares, dripping fonts, black-and-red gore. The dread is cozy, not gothic.
- Generic meme-page energy: Comic Sans, clip-art, chaotic emoji spam, loud gradients.
- The AI landing-page scaffold: tiny tracked uppercase eyebrows over every section, 01/02/03 numbered markers, identical icon-card grids, hero-metric templates, gradient text.
- Over-animation: everything bouncing/spinning at once. Motion here is subtle, slow, and deliberate — a world drifting, not a carnival.

## Design Principles

- **The cuteness is the threat.** Lean into the kawaii art; let the horror live entirely in the words and the inevitability, never in the visuals turning ugly.
- **Deadpan over theatrics.** State the horror plainly. Restraint is funnier and more unsettling than shouting.
- **The scroll is the story.** Every beat earns its place in a downward journey toward doom; the world subtly drains from bright day to dusk as you descend.
- **Subtle, always-present motion.** One continuous companion (the snail trailing the cursor) and slow ambient drift, not a reflexive identical reveal on every section.
- **Ship it like it's real.** Treat a joke page with the craft of a flagship marketing site: accessible, responsive, fast, reduced-motion safe.

## Accessibility & Inclusion

- Target WCAG AA: body text ≥ 4.5:1, large display text ≥ 3:1 against its (shifting) background. Verify at each scroll color stage, not just the top.
- Full `prefers-reduced-motion` path: cursor-follower becomes a calm ambient/static presence, scroll-scrubbed color and zoom become simple crossfades or static end-states, SplitText reveals become instant. Content is never gated behind an animation that could fail to fire.
- Keyboard reachable, semantic landmarks and headings, meaningful alt/aria for the decorative vs. meaningful art (decorative flora is `aria-hidden`; the snail and key statements are real text).
- Respect that this runs on phones: no hover-only meaning, generous touch targets, the cursor-follower degrades to an ambient drift where there is no pointer.
