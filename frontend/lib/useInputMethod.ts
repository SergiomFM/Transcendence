import { useState, useEffect } from "react";
import { isMobileDevice } from "./device-detection";

export type InputMethod = "keyboard" | "gamepad" | "touch";

/**
 * Hook that tracks the currently active input method based on user activity.
 * 
 * Returns:
 * - "touch" on mobile devices in fullscreen
 * - "gamepad" when gamepad buttons are pressed
 * - "keyboard" when keyboard keys or mouse is used (default)
 * 
 * The input method switches dynamically based on the last input detected.
 */
export function useInputMethod(isFullscreen: boolean = false): InputMethod {
  const [inputMethod, setInputMethod] = useState<InputMethod>("keyboard");
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device once on mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    // Mobile devices in fullscreen always use touch
    if (isMobile && isFullscreen) {
      setInputMethod("touch");
      return;
    }

    // Desktop/laptop: detect keyboard vs gamepad based on activity
    let lastGamepadActivity = 0;
    let lastKeyboardActivity = 0;

    // Track keyboard activity
    const handleKeyDown = () => {
      lastKeyboardActivity = Date.now();
      setInputMethod("keyboard");
    };

    // Track mouse activity (also counts as keyboard input)
    const handleMouseMove = () => {
      lastKeyboardActivity = Date.now();
      if (inputMethod === "gamepad") {
        setInputMethod("keyboard");
      }
    };

    const handleMouseClick = () => {
      lastKeyboardActivity = Date.now();
      setInputMethod("keyboard");
    };

    // Poll gamepad activity
    const checkGamepadActivity = () => {
      if (!navigator.getGamepads) return;
      
      const gamepads = navigator.getGamepads();
      let hasGamepadActivity = false;

      for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (!gamepad?.connected) continue;

        // Check if any button is pressed
        for (let j = 0; j < gamepad.buttons.length; j++) {
          const button = gamepad.buttons[j];
          if (button.pressed || button.value > 0.5) {
            hasGamepadActivity = true;
            break;
          }
        }

        // Check if any axis is moved beyond deadzone
        if (!hasGamepadActivity) {
          for (let j = 0; j < gamepad.axes.length; j++) {
            if (Math.abs(gamepad.axes[j]) > 0.25) {
              hasGamepadActivity = true;
              break;
            }
          }
        }

        if (hasGamepadActivity) break;
      }

      if (hasGamepadActivity) {
        const now = Date.now();
        // Only switch to gamepad if keyboard hasn't been used very recently (within 100ms)
        // This prevents flicker when both inputs are used simultaneously
        if (now - lastKeyboardActivity > 100) {
          lastGamepadActivity = now;
          setInputMethod("gamepad");
        }
      }
    };

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseClick);

    // Poll gamepad state at 30 FPS (every ~33ms)
    const gamepadInterval = setInterval(checkGamepadActivity, 33);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseClick);
      clearInterval(gamepadInterval);
    };
  }, [isMobile, isFullscreen, inputMethod]);

  return inputMethod;
}
