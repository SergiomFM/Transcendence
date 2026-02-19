import { Control, AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";
import { Scene } from "@babylonjs/core";
import { animateAttribute } from "./pongAnimations";
import { FPS } from "./pong";
import { GAME_CONSTANTS } from "@/shared/constants";
import { text } from "stream/consumers";

const BLINKING_TIME = 750;
const FADING_TIME = 500;

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
  "0%", // Horizontal deviation from center (horizontal screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Game start prompt
const PRESS_READY = [
  "PRESS_READY", // Name
  "(Press space when ready)", // Text
  "white", // Color
  "10%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "35%", // Vertical deviation from center (vertical screen %)
  "0%", // Horizontal deviation from center (horizontal screen %)
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
  "0%", // Horizontal deviation from center (horizontal screen %)
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
  "0%", // Horizontal deviation from center (horizontal screen %)
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
  "0%", // Horizontal deviation from center (horizontal screen %)
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
  "0%", // Horizontal deviation from center (horizontal screen %)
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
  "0%", // Horizontal deviation from center (horizontal screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: Game ready
const GET_READY = [
  "GET_READY", // Name
  "Get Ready...", // Text
  "white", // Color
  "20%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-20%", // Vertical deviation from center (vertical screen %)
  "0%", // Horizontal deviation from center (horizontal screen %)
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
  "0%", // Horizontal deviation from center (horizontal screen %)
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
  "0%", // Horizontal deviation from center (horizontal screen %)
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
  "0%", // Horizontal deviation from center (horizontal screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: Opponent connected
const OPPONENT_CONNECTED = [
  "OPPONENT_CONNECTED", // Name
  "Opponent connected", // Text
  "white", // Color
  "15%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "-20%", // Vertical deviation from center (vertical screen %)
  "0%", // Horizontal deviation from center (horizontal screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: Waiting for opponent ready
const WAITING_FOR_READY = [
  "WAITING_FOR_READY", // Name
  "Waiting for opponent ready", // Text
  "white", // Color
  "10%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "35%", // Vertical deviation from center (vertical screen %)
  "0%", // Horizontal deviation from center (horizontal screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: Spectator mode
const SPECTATING = [
  "SPECTATING", // Name
  "Spectating", // Text
  "white", // Color
  "15%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "35%", // Vertical deviation from center (vertical screen %)
  "0%", // Horizontal deviation from center (horizontal screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: Spectator seat prompt
const SPECTATOR_SEAT_PROMPT = [
  "SPECTATOR_SEAT_PROMPT", // Name
  "Press C to claim a seat", // Text
  "white", // Color
  "10%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "15%", // Vertical deviation from center (vertical screen %)
  "0%", // Horizontal deviation from center (horizontal screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Multiplayer: Other player ready
const OTHER_PLAYER_READY = [
  "OTHER_PLAYER_READY", // Name
  "Other player ready", // Text
  "white", // Color
  "6%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "10%", // Vertical deviation from center (vertical screen %)
  "5%", // Horizontal deviation from center (horizontal screen %)
  Control.HORIZONTAL_ALIGNMENT_LEFT, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_TOP, // Vertical alignment type
];

// Player 1 Score
const PLAYER_1_SCORE = [
  "PLAYER_1_SCORE", // Name
  "0", // Text
  "white", // Color
  "15%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "0%", // Vertical deviation from center (vertical screen %)
  "-20%", // Horizontal deviation from center (horizontal screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Player 1 Score description
const PLAYER_1_SCORE_DESCRIPTION = [
  "PLAYER_1_SCORE_DESCRIPTION", // Name
  "(YOU)", // Text
  "white", // Color
  "15%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "10%", // Vertical deviation from center (vertical screen %)
  "-20%", // Horizontal deviation from center (horizontal screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];


// Player 2 Score
const PLAYER_2_SCORE = [
  "PLAYER_2_SCORE", // Name
  "0", // Text
  "white", // Color
  "15%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "0%", // Vertical deviation from center (vertical screen %)
  "20%", // Horizontal deviation from center (horizontal screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];

// Player 2 Score description
const PLAYER_2_SCORE_DESCRIPTION = [
  "PLAYER_2_SCORE_DESCRIPTION", // Name
  "(HIM)", // Text
  "white", // Color
  "15%", // Size (vertical screen %)
  "pongFont1", // Font
  2, // Outline
  "black", // Outline Color
  "10%", // Vertical deviation from center (vertical screen %)
  "20%", // Horizontal deviation from center (horizontal screen %)
  Control.HORIZONTAL_ALIGNMENT_CENTER, // Horizontal alignment type
  Control.VERTICAL_ALIGNMENT_CENTER, // Vertical alignment type
];
class UIElement extends TextBlock {
  blinking = false;
  private lastUpdate = 0;
  private fadeOutTimer?: NodeJS.Timeout;
  cancelAnimation?: () => void;

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

  // Cancel any ongoing animation
  cancelOngoingAnimation() {
    if (this.cancelAnimation) {
      this.cancelAnimation();
      this.cancelAnimation = undefined;
    }
  }

  // Schedule automatic fade-out after duration
  scheduleAutoFadeOut(duration: number) {
    this.clearFadeOutTimer();
    this.fadeOutTimer = setTimeout(() => {
      this.cancelAnimation = animateAttribute(this, 0, "alpha", FADING_TIME, FPS);
    }, duration);
  }
}

export class GUI {
  GUI: AdvancedDynamicTexture;
  textBlocks: Map<string, UIElement>; // Text Blocks Map

  constructor() {
    this.GUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    this.textBlocks = new Map();

    this.createNewText(WELCOME);
    this.createNewText(PRESS_READY);
    this.createNewText(YOU_WON);
    this.createNewText(YOU_LOST);
    this.createNewText(PLAYER_1_WIN);
    this.createNewText(PLAYER_2_WIN);
    this.createNewText(WAITING);
    this.createNewText(GET_READY);
    this.createNewText(PRESS_READY);
    this.createNewText(FIGHT);
    this.createNewText(OPPONENT_LEFT);
    this.createNewText(DISCONNECTED);
    this.createNewText(OPPONENT_CONNECTED);
    this.createNewText(WAITING_FOR_READY);
    this.createNewText(SPECTATING);
    this.createNewText(SPECTATOR_SEAT_PROMPT);
    this.createNewText(OTHER_PLAYER_READY);
    this.createNewText(PLAYER_1_SCORE);
    this.createNewText(PLAYER_1_SCORE_DESCRIPTION);
    this.createNewText(PLAYER_2_SCORE);
    this.createNewText(PLAYER_2_SCORE_DESCRIPTION);
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
    textBlock.left = attributes[8];
    textBlock.textHorizontalAlignment = attributes[9];
    textBlock.textVerticalAlignment = attributes[10];
    textBlock.isVisible = false;
    textBlock.alpha = 0;

    // Adding the Text Block to the interface and map
    this.GUI.addControl(textBlock);
    this.textBlocks.set(attributes[0], textBlock);
  }

  // Resets all texts to an hidden state and deactivates all UI effects
  resetTexts(scene: Scene) {
    this.textBlocks.forEach((text) => {
      if (text.blinking) {
        text.blinking = false;
        scene.unregisterBeforeRender(text.onBeforeRender);
      }
      text.clearFadeOutTimer();
      text.cancelOngoingAnimation();
      text.isVisible = false;
      text.alpha = 0;
    });
  }

  textFadeIn(name: string, duration?: number) {
    let text = this.textBlocks.get(name);
    if (!text) {
      return;
    }

    text.clearFadeOutTimer();
    text.cancelOngoingAnimation();
    text.isVisible = true;
    text.cancelAnimation = animateAttribute(text, 1, "alpha", FADING_TIME, FPS);

    if (duration) {
      text.scheduleAutoFadeOut(duration + FADING_TIME);
    }
  }

  textFadeOut(name: string) {
    let text = this.textBlocks.get(name);
    if (!text) {
      return;
    }

    text.clearFadeOutTimer();
    text.cancelOngoingAnimation();
    text.cancelAnimation = animateAttribute(text, 0, "alpha", FADING_TIME, FPS);
  }

  // Blink a Text Block
  toggleTextBlink(scene: Scene, name: string) {
    let text = this.textBlocks.get(name);
    if (!text) {
      return;
    }

    text.blinking = !text.blinking;
    if (text.blinking) {
      scene.registerBeforeRender(text.onBeforeRender);
    } else {
      scene.unregisterBeforeRender(text.onBeforeRender);
    }
  }

  // Displays a Winning Screen for player 1
  roundWonUI(online: boolean, score1: number, score2: number) {
    this.resetTexts(this.GUI.getScene()!);
    this.showScores(online, score1, score2);
    if (online) {
      this.textFadeIn("YOU_WON");
    } else {
      this.textFadeIn("PLAYER_1_WIN");
    }
    this.textFadeIn("PRESS_READY");
    this.toggleTextBlink(this.GUI.getScene()!, "PRESS_READY");
  }

  // Displays a Winning Screen for player 2
  roundLostUI(online: boolean, score1: number, score2: number) {
    this.resetTexts(this.GUI.getScene()!);
    this.showScores(online, score1, score2);
    if (online) {
      this.textFadeIn("YOU_LOST");
    } else {
      this.textFadeIn("PLAYER_2_WIN");
    }
    this.textFadeIn("PRESS_READY");
    this.toggleTextBlink(this.GUI.getScene()!, "PRESS_READY");
  }

  // Initial Texts Configuration
  waitingForPlayersUI() {
    this.resetTexts(this.GUI.getScene()!);
    this.textFadeIn("WAITING");
    this.toggleTextBlink(this.GUI.getScene()!, "WAITING");
  }

  pressReadyUI() {
    this.resetTexts(this.GUI.getScene()!);
    this.textFadeIn("PRESS_READY");
    this.toggleTextBlink(this.GUI.getScene()!, "PRESS_READY");
  }

  showReadyPrompt() {
    const scene = this.GUI.getScene()!;
    const text = this.textBlocks.get("PRESS_READY");
    if (!text) {
      return;
    }
    const waitingText = this.textBlocks.get("WAITING");
    if (waitingText?.blinking) {
      this.toggleTextBlink(scene, "WAITING");
    }
    this.textFadeOut("WAITING");
    this.textFadeIn("OPPONENT_CONNECTED", 2000);
    this.textFadeIn("PRESS_READY");
    if (!text.blinking) {
      this.toggleTextBlink(scene, "PRESS_READY");
    }
  }

  waitingForOpponentReadyUI() {
    const scene = this.GUI.getScene()!;
    const readyText = this.textBlocks.get("PRESS_READY");
    if (readyText?.blinking) {
      this.toggleTextBlink(scene, "PRESS_READY");
    }
    this.textFadeOut("PRESS_READY");
    this.textFadeIn("WAITING_FOR_READY");
  }

  showOtherPlayerReady() {
    this.textFadeIn("OTHER_PLAYER_READY");
    this.toggleTextBlink(this.GUI.getScene()!, "OTHER_PLAYER_READY");
  }

  hideOtherPlayerReady() {
    const scene = this.GUI.getScene()!;
    const text = this.textBlocks.get("OTHER_PLAYER_READY");
    if (text?.blinking) {
      this.toggleTextBlink(scene, "OTHER_PLAYER_READY");
    }
    this.textFadeOut("OTHER_PLAYER_READY");
  }

  startRoundUI() {
    this.resetTexts(this.GUI.getScene()!);
    this.textFadeIn("GET_READY", GAME_CONSTANTS.ROUND_START_DELAY / 2);
    setTimeout(() => {
      this.textBlocks.get("FIGHT")!.alpha = 1;
      this.textBlocks.get("FIGHT")!.isVisible = true;
      this.textFadeOut("FIGHT");
    }, GAME_CONSTANTS.ROUND_START_DELAY);
  }

  opponentLeftUI() {
    this.resetTexts(this.GUI.getScene()!);
    this.textFadeIn("OPPONENT_LEFT", 2000);
    this.textFadeIn("WAITING");
    this.toggleTextBlink(this.GUI.getScene()!, "WAITING");
  }

  spectatorModeUI(seatsAvailable: number) {
    this.resetTexts(this.GUI.getScene()!);
    this.textFadeIn("SPECTATING");
    this.toggleTextBlink(this.GUI.getScene()!, "SPECTATING");
    this.textFadeIn("PLAYER_1_SCORE");
    this.textFadeIn("PLAYER_2_SCORE");
    if (seatsAvailable > 0) {
      this.textFadeIn("SPECTATOR_SEAT_PROMPT");
      this.toggleTextBlink(this.GUI.getScene()!, "SPECTATOR_SEAT_PROMPT");
    }
  }

  showScores(online: boolean, score1: number, score2: number) {
    this.textBlocks.get("PLAYER_1_SCORE")!.text = score1.toString();
    this.textBlocks.get("PLAYER_2_SCORE")!.text = score2.toString();
    this.textFadeIn("PLAYER_1_SCORE");
    this.textFadeIn("PLAYER_2_SCORE");
    if (online) {
      this.textFadeIn("PLAYER_1_SCORE_DESCRIPTION");
      this.textFadeIn("PLAYER_2_SCORE_DESCRIPTION");
    }
  }

  updateScores(score1: number, score2: number) {
    const player1Score = this.textBlocks.get("PLAYER_1_SCORE");
    const player2Score = this.textBlocks.get("PLAYER_2_SCORE");
    if (player1Score) {
      player1Score.text = score1.toString();
    }
    if (player2Score) {
      player2Score.text = score2.toString();
    }
  }

  updatePlayerLabels(player1Name?: string | null, player2Name?: string | null) {
    const player1Label = this.textBlocks.get("PLAYER_1_SCORE_DESCRIPTION");
    const player2Label = this.textBlocks.get("PLAYER_2_SCORE_DESCRIPTION");
    if (player1Label) {
      player1Label.text = player1Name ? player1Name : "(YOU)";
    }
    if (player2Label) {
      player2Label.text = player2Name ? player2Name : "(HIM)";
    }
  }
}
