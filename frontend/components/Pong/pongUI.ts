import { Control, AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";
import { Scene } from "@babylonjs/core";
import { animateAttribute } from "./pongAnimations";
import { FPS } from "./pong";

const BLINKING_TIME = 750;
const FADING_TIME = 1000;

// Welcoming Game message
const WELCOME = [
  "WELCOME", // Name
  "Welcome Warlock", // Text
  "white", // Color
  "20%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-40%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Game start prompt
const START = [
  "START", // Name
  "(Press space when ready)", // Text
  "white", // Color
  "10%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "15%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Round Won message
const YOU_WON = [
  "YOU_WON", // Name
  "You Won!", // Text
  "white", // Color
  "20%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-20%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Round Won message
const PLAYER_1_WIN = [
  "PLAYER_1_WIN", // Name
  "Player 1 Wins!", // Text
  "white", // Color
  "20%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-20%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Round Lost message
const YOU_LOST = [
  "YOU_LOST", // Name
  "You Lost!", // Text
  "white", // Color
  "20%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-20%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Round Won message
const PLAYER_2_WIN = [
  "PLAYER_2_WIN", // Name
  "Player 2 Wins!", // Text
  "white", // Color
  "20%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-20%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: Player 1 label
const PLAYER_1 = [
  "PLAYER_1", // Name
  "Player 1", // Text
  "white", // Color
  "15%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-20%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: Player 2 label
const PLAYER_2 = [
  "PLAYER_2", // Name
  "Player 2", // Text
  "white", // Color
  "15%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-20%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: Waiting for opponent
const WAITING = [
  "WAITING", // Name
  "Waiting for opponent...", // Text
  "white", // Color
  "10%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "15%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: Game ready
const READY = [
  "READY", // Name
  "Get Ready!", // Text
  "white", // Color
  "20%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-20%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: Fight message
const FIGHT = [
  "FIGHT", // Name
  "FIGHT!", // Text
  "white", // Color
  "20%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-20%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: Opponent disconnected
const OPPONENT_LEFT = [
  "OPPONENT_LEFT", // Name
  "Opponent Disconnected", // Text
  "white", // Color
  "15%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-20%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: You disconnected
const DISCONNECTED = [
  "DISCONNECTED", // Name
  "Disconnected from Server", // Text
  "white", // Color
  "15%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-20%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: Player 2 connected
const PLAYER_2_CONNECTED = [
  "PLAYER_2_CONNECTED", // Name
  "Player 2 Connected", // Text
  "white", // Color
  "15%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-20%", // Vertical deviation from center (vertical screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

class UIElement extends TextBlock {
  blinking = false;
  private lastUpdate = 0;
  private fadeOutTimer?: NodeJS.Timeout;

  constructor() {
    super();
  }

  // Function callBack to start and stop animations
  onBeforeRender = () => {
    const now = performance.now();
    if (now - this.lastUpdate >= BLINKING_TIME) {
      this.lastUpdate = now;
      this.isVisible = !this.isVisible;
    }
  };

  // Clear any pending fade-out timer
  clearFadeOutTimer() {
    if (this.fadeOutTimer) {
      clearTimeout(this.fadeOutTimer);
      this.fadeOutTimer = undefined;
    }
  }

  // Schedule automatic fade-out after duration
  scheduleAutoFadeOut(duration: number) {
    this.clearFadeOutTimer();
    this.fadeOutTimer = setTimeout(() => {
      animateAttribute(this, 0, "alpha", FADING_TIME, FPS);
    }, duration);
  }
}

export class GUI {
  GUI: AdvancedDynamicTexture;
  textBlocks: Map<string, UIElement>; // Text Blocks Map
  online: boolean = false;

  constructor() {
    this.GUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    this.textBlocks = new Map();

    this.createNewText(WELCOME);
    this.createNewText(START);
    this.createNewText(YOU_WON);
    this.createNewText(YOU_LOST);
    this.createNewText(PLAYER_1_WIN);
    this.createNewText(PLAYER_2_WIN);
    this.createNewText(PLAYER_1);
    this.createNewText(PLAYER_2);
    this.createNewText(WAITING);
    this.createNewText(READY);
    this.createNewText(FIGHT);
    this.createNewText(OPPONENT_LEFT);
    this.createNewText(DISCONNECTED);
    this.createNewText(PLAYER_2_CONNECTED);
  }

  createNewText(attributes: any) {
    // Creating a Text Block
    const textBlock = new UIElement();
    textBlock.text = attributes[1];
    textBlock.color = attributes[2];
    textBlock.fontSize = attributes[3];
    textBlock.fontFamily = attributes[4];
    textBlock.outlineWidth = attributes[5];
    textBlock.outlineColor = attributes[6];
    textBlock.top = attributes[7];
    textBlock.textHorizontalAlignment = attributes[8];
    textBlock.textVerticalAlignment = attributes[9];
    textBlock.isVisible = false;
    textBlock.alpha = 0;

    // Adding the Text Block to the interface and map
    this.GUI.addControl(textBlock);
    this.textBlocks.set(attributes[0], textBlock);
  }

  // Resets all texts to an hidden state
  resetTexts() {
    this.textBlocks.forEach((text) => {
      text.isVisible = false;
      text.blinking = false;
      text.alpha = 0;
      text.clearFadeOutTimer();
    });
  }

  // Displays a Winning Screen
  roudWon(online: boolean) {
    if (online) {
    } else {
    }
  }

  // Initial Texts Configuration
  setUpTextBlocks(scene: Scene, online: boolean = false) {
    this.textBlocks.get("START")!.alpha = 1;
    this.online = online;
    if (!online) {
      this.toggleTextBlink(scene, "START");
    }
    this.textFadeIn("WELCOME", 2000);
  }

  textFadeIn(name: string, duration?: number) {
    let text = this.textBlocks.get(name);
    if (!text) return;

    text.clearFadeOutTimer();

    if (text.alpha >= 1) {
      if (duration) {
        text.scheduleAutoFadeOut(duration);
      }
      return;
    }

    text.isVisible = true;
    animateAttribute(text, 1, "alpha", FADING_TIME, FPS);

    if (duration) {
      text.scheduleAutoFadeOut(duration + FADING_TIME);
    }
  }

  textFadeOut(name: string) {
    let text = this.textBlocks.get(name);
    if (!text) return;

    text.clearFadeOutTimer();
    if (text.alpha <= 0) return;

    animateAttribute(text, 0, "alpha", FADING_TIME, FPS);
    if (name === "READY") {
      text.isVisible = false;
      text.alpha = 0;
    }
  }

  // Blink a Text Block
  toggleTextBlink(scene: Scene, name: string) {
    let text = this.textBlocks.get(name);
    if (!text) return;

    text.blinking = !text.blinking;
    if (text.blinking) {
      scene.registerBeforeRender(text.onBeforeRender);
    } else {
      text.isVisible = false;
      text.alpha = 0;
      scene.unregisterBeforeRender(text.onBeforeRender);
    }
  }
}
