// Central GSAP entry: imports gsap plus the only plugins this site uses and
// registers them once. Import from any client script:
//   import { gsap, ScrollTrigger, SplitText } from "../lib/gsap.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };
