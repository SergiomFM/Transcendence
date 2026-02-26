/**
 * Detects if the device is a mobile phone or tablet (not just touch-capable).
 * 
 * This function distinguishes between:
 * - Mobile devices (phones/tablets): returns true
 * - Desktop/laptop with touchscreen or gamepad (Steam Deck, Surface, etc.): returns false
 * 
 * Uses multiple heuristics:
 * 1. User agent detection for mobile/tablet OS
 * 2. Screen size (mobile devices typically < 1024px width)
 * 3. Pointer coarseness (mobile touch is coarse, stylus/mouse is fine)
 */
export function isMobileDevice(): boolean {
  // Server-side rendering: assume not mobile
  if (typeof window === "undefined") return false;

  // Check 1: User agent for mobile OS
  const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || "";
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  const hasMobileUA = mobileRegex.test(userAgent.toLowerCase());

  // Check 2: Screen size heuristic (mobile devices are typically smaller)
  // Steam Deck: 1280x800, most phones/tablets: < 1024px width in portrait
  const hasSmallScreen = window.innerWidth < 1024 || window.screen.width < 1024;

  // Check 3: CSS media query for coarse pointer (touch on mobile vs. mouse/stylus)
  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

  // Check 4: Orientation support (mobile devices support orientation changes)
  const supportsOrientation = typeof window.orientation !== "undefined" || 
                              (screen.orientation && "angle" in screen.orientation);

  // Combine heuristics:
  // - If user agent says mobile => definitely mobile
  // - If has coarse pointer AND small screen => likely mobile
  // - If has coarse pointer AND supports orientation => likely mobile
  if (hasMobileUA) return true;
  if (hasCoarsePointer && hasSmallScreen) return true;
  if (hasCoarsePointer && supportsOrientation) return true;

  // Otherwise: probably desktop with touchscreen (Steam Deck, Surface, etc.)
  return false;
}

/**
 * Detects if the device has touch capability (any touch-enabled device).
 * This includes mobile, tablets, Steam Deck, and desktop touchscreens.
 */
export function hasTouchCapability(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}


