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
  "-20%", // Vertical deviation from center (vertical screen %)
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
const ROUND_WON = [
  "ROUND_WON", // Name
  "Round Won!", // Text
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
const ROUND_LOST = [
  "ROUND_LOST", // Name
  "Round Lost!", // Text
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

class UIElement extends TextBlock {
  blinking = false;
  private lastUpdate = 0;

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
}

export class GUI {
  GUI: AdvancedDynamicTexture;
  textBlocks: Map<string, UIElement>; // Text Blocks Map

  constructor() {
    this.GUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    this.textBlocks = new Map();

    this.createNewText(WELCOME);
    this.createNewText(START);
    this.createNewText(ROUND_WON);
    this.createNewText(ROUND_LOST);
    this.createNewText(PLAYER_1_WIN);
    this.createNewText(PLAYER_2_WIN);
  }

  createNewText(attributes) {
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
    });
  }

  // Displays a Winning Screen
  roudWon(online: boolean) {
    if (online) {
    } else {
    }
  }

  // Initial Texts Configuration
  setUpTextBlocks(scene: Scene) {
    this.textBlocks.get("START").alpha = 1;
    this.toggleTextBlink(scene, "START");

    this.textFadeIn("WELCOME");
  }

  textFadeIn(name: string) {
    let text = this.textBlocks.get(name);
    if (!text || text.alpha) return;

    text.isVisible = true;
    animateAttribute(text, 1, "alpha", FADING_TIME, FPS);
  }

  textFadeOut(name: string) {
    let text = this.textBlocks.get(name);
    if (!text || !text.alpha) return;

    animateAttribute(text, 0, "alpha", FADING_TIME, FPS);
  }

  // Blink a Text Block
  toggleTextBlink(scene: Scene, name: string) {
    let text = this.textBlocks.get(name);
    if (!text) return;

    text.blinking = !text.blinking;
    if (text.blinking) scene.registerBeforeRender(text.onBeforeRender);
    else {
      text.isVisible = false;
      scene.unregisterBeforeRender(text.onBeforeRender);
    }
  }
}
