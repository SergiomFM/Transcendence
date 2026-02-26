import { Control, AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";
import { Scene } from "@babylonjs/core";
import { animateAttribute } from "./pongAnimations";
import { FPS } from "./pong";
import { GAME_CONSTANTS } from "@/shared/constants";
import { sfxCountdown, sfxFight } from "./pongAudio";

export interface PongTranslations {
  welcomeWarlock: string;
  pressSpaceReady: string;
  pressAReady: string;
  pressReadyTouch: string;
  pressPlayClaimSeat: string;
  pressClaimSeat: string;
  pressBClaimSeat: string;
  youWon: string;
  player1Wins: string;
  youLost: string;
  player2Wins: string;
  matchWon: string;
  matchLost: string;
  waitingForOpponent: string;
  getReady: string;
  fight: string;
  opponentDisconnected: string;
  disconnectedFromServer: string;
  opponentConnected: string;
  waitingForOpponentReady: string;
  spectating: string;
  otherPlayerReady: string;
  labelYou: string;
  labelOpponent: string;
}

const BLINKING_TIME = 750;
const FADING_TIME = 500;

function buildTextConfig(t: PongTranslations) {
  return {
    WELCOME: [
      "WELCOME", t.welcomeWarlock, "white", "20%", "pongFont1", 2, "black", "-40%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    PRESS_READY: [
      "PRESS_READY", t.pressSpaceReady, "white", "10%", "pongFont1", 2, "black", "35%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    YOU_WON: [
      "YOU_WON", t.youWon, "white", "20%", "pongFont1", 2, "black", "-20%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    PLAYER_1_WIN: [
      "PLAYER_1_WIN", t.player1Wins, "white", "20%", "pongFont1", 2, "black", "-20%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    YOU_LOST: [
      "YOU_LOST", t.youLost, "white", "20%", "pongFont1", 2, "black", "-20%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    PLAYER_2_WIN: [
      "PLAYER_2_WIN", t.player2Wins, "white", "20%", "pongFont1", 2, "black", "-20%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    MATCH_WON: [
      "MATCH_WON", t.matchWon, "white", "20%", "pongFont1", 2, "black", "-20%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    MATCH_LOST: [
      "MATCH_LOST", t.matchLost, "white", "20%", "pongFont1", 2, "black", "-20%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    WAITING: [
      "WAITING", t.waitingForOpponent, "white", "10%", "pongFont1", 2, "black", "15%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    GET_READY: [
      "GET_READY", t.getReady, "white", "20%", "pongFont1", 2, "black", "-20%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    FIGHT: [
      "FIGHT", t.fight, "white", "20%", "pongFont1", 2, "black", "-20%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    OPPONENT_LEFT: [
      "OPPONENT_LEFT", t.opponentDisconnected, "white", "15%", "pongFont1", 2, "black", "-20%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    DISCONNECTED: [
      "DISCONNECTED", t.disconnectedFromServer, "white", "15%", "pongFont1", 2, "black", "-20%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    OPPONENT_CONNECTED: [
      "OPPONENT_CONNECTED", t.opponentConnected, "white", "15%", "pongFont1", 2, "black", "-20%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    WAITING_FOR_READY: [
      "WAITING_FOR_READY", t.waitingForOpponentReady, "white", "10%", "pongFont1", 2, "black", "35%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    SPECTATING: [
      "SPECTATING", t.spectating, "white", "15%", "pongFont1", 2, "black", "35%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    SPECTATOR_SEAT_PROMPT: [
      "SPECTATOR_SEAT_PROMPT", t.pressClaimSeat, "white", "10%", "pongFont1", 2, "black", "15%", "0%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    OTHER_PLAYER_READY: [
      "OTHER_PLAYER_READY", t.otherPlayerReady, "white", "6%", "pongFont1", 2, "black", "18%", "5%",
      Control.HORIZONTAL_ALIGNMENT_LEFT, Control.VERTICAL_ALIGNMENT_TOP,
    ],
    PLAYER_1_SCORE: [
      "PLAYER_1_SCORE", "0", "white", "15%", "pongFont1", 2, "black", "0%", "-20%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    PLAYER_1_SCORE_DESCRIPTION: [
      "PLAYER_1_SCORE_DESCRIPTION", t.labelYou, "white", "6%", "pongFont1", 2, "black", "10%", "-20%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    PLAYER_2_SCORE: [
      "PLAYER_2_SCORE", "0", "white", "15%", "pongFont1", 2, "black", "0%", "20%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    PLAYER_2_SCORE_DESCRIPTION: [
      "PLAYER_2_SCORE_DESCRIPTION", t.labelOpponent, "white", "6%", "pongFont1", 2, "black", "10%", "20%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    SPECTATOR_PLAYER1_NAME: [
      "SPECTATOR_PLAYER1_NAME", "", "white", "4%", "pongFont1", 2, "black", "0%", "-38%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
    SPECTATOR_PLAYER2_NAME: [
      "SPECTATOR_PLAYER2_NAME", "", "white", "4%", "pongFont1", 2, "black", "0%", "38%",
      Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_CENTER,
    ],
  };
}
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
  translations: PongTranslations;

  constructor(translations: PongTranslations) {
    this.GUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    this.textBlocks = new Map();
    this.translations = translations;

    const configs = buildTextConfig(translations);
    this.createNewText(configs.WELCOME);
    this.createNewText(configs.PRESS_READY);
    this.createNewText(configs.YOU_WON);
    this.createNewText(configs.YOU_LOST);
    this.createNewText(configs.PLAYER_1_WIN);
    this.createNewText(configs.PLAYER_2_WIN);
    this.createNewText(configs.MATCH_WON);
    this.createNewText(configs.MATCH_LOST);
    this.createNewText(configs.WAITING);
    this.createNewText(configs.GET_READY);
    this.createNewText(configs.PRESS_READY);
    this.createNewText(configs.FIGHT);
    this.createNewText(configs.OPPONENT_LEFT);
    this.createNewText(configs.DISCONNECTED);
    this.createNewText(configs.OPPONENT_CONNECTED);
    this.createNewText(configs.WAITING_FOR_READY);
    this.createNewText(configs.SPECTATING);
    this.createNewText(configs.SPECTATOR_SEAT_PROMPT);
    this.createNewText(configs.OTHER_PLAYER_READY);
    this.createNewText(configs.PLAYER_1_SCORE);
    this.createNewText(configs.PLAYER_1_SCORE_DESCRIPTION);
    this.createNewText(configs.PLAYER_2_SCORE);
    this.createNewText(configs.PLAYER_2_SCORE_DESCRIPTION);
    this.createNewText(configs.SPECTATOR_PLAYER1_NAME);
    this.createNewText(configs.SPECTATOR_PLAYER2_NAME);
  }

  // Swap text based on input mode: keyboard, gamepad, or touch
  setInputMode(mode: "keyboard" | "gamepad" | "touch") {
    const t = this.translations;
    const readyText = this.textBlocks.get("PRESS_READY");
    if (readyText) {
      if (mode === "touch") {
        readyText.text = t.pressReadyTouch;
      } else if (mode === "gamepad") {
        readyText.text = t.pressAReady;
      } else {
        readyText.text = t.pressSpaceReady;
      }
    }
    const seatText = this.textBlocks.get("SPECTATOR_SEAT_PROMPT");
    if (seatText) {
      if (mode === "touch") {
        seatText.text = t.pressPlayClaimSeat;
      } else if (mode === "gamepad") {
        seatText.text = t.pressBClaimSeat;
      } else {
        seatText.text = t.pressClaimSeat;
      }
    }
  }

  createNewText(attributes: (string | number)[]) {
    // Creating a Text Block
    const textBlock = new UIElement();
    textBlock.text = attributes[1] as string;
    textBlock.color = attributes[2] as string;
    textBlock.fontSize = attributes[3] as number;
    textBlock.fontFamily = attributes[4] as string;
    textBlock.outlineWidth = attributes[5] as number;
    textBlock.outlineColor = attributes[6] as string;
    textBlock.top = attributes[7] as number;
    textBlock.left = attributes[8] as number;
    textBlock.textHorizontalAlignment = attributes[9] as number;
    textBlock.textVerticalAlignment = attributes[10] as number;
    textBlock.isVisible = false;
    textBlock.alpha = 0;

    // Adding the Text Block to the interface and map
    this.GUI.addControl(textBlock);
    this.textBlocks.set(attributes[0] as string, textBlock);
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
    const text = this.textBlocks.get(name);
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
    const text = this.textBlocks.get(name);
    if (!text) {
      return;
    }

    text.clearFadeOutTimer();
    text.cancelOngoingAnimation();
    text.cancelAnimation = animateAttribute(text, 0, "alpha", FADING_TIME, FPS);
  }

  // Blink a Text Block
  toggleTextBlink(scene: Scene, name: string) {
    const text = this.textBlocks.get(name);
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

  // Displays a Match Won screen (final victory - no PRESS_READY)
  matchWonUI(score1: number, score2: number) {
    this.resetTexts(this.GUI.getScene()!);
    this.showScores(true, score1, score2);
    this.textFadeIn("MATCH_WON");
    this.textFadeIn("PRESS_READY");
    this.toggleTextBlink(this.GUI.getScene()!, "PRESS_READY");
  }

  // Displays a Match Lost screen (loser becomes spectator - no PRESS_READY)
  matchLostUI(score1: number, score2: number) {
    this.resetTexts(this.GUI.getScene()!);
    this.showScores(true, score1, score2);
    this.textFadeIn("MATCH_LOST");
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
    sfxCountdown();
    setTimeout(() => {
      this.textBlocks.get("FIGHT")!.alpha = 1;
      this.textBlocks.get("FIGHT")!.isVisible = true;
      this.textFadeOut("FIGHT");
      sfxFight();
    }, GAME_CONSTANTS.ROUND_START_DELAY);
  }

  opponentLeftUI() {
    this.resetTexts(this.GUI.getScene()!);
    this.textFadeIn("OPPONENT_LEFT", 2000);
    this.textFadeIn("WAITING");
    this.toggleTextBlink(this.GUI.getScene()!, "WAITING");
  }

  showDisconnectedUI() {
    this.resetTexts(this.GUI.getScene()!);
    this.textFadeIn("DISCONNECTED");
    this.toggleTextBlink(this.GUI.getScene()!, "DISCONNECTED");
  }

  spectatorModeUI(seatsAvailable: number) {
    this.resetTexts(this.GUI.getScene()!);
    this.textFadeIn("SPECTATING");
    this.toggleTextBlink(this.GUI.getScene()!, "SPECTATING");
    this.textFadeIn("PLAYER_1_SCORE");
    this.textFadeIn("PLAYER_2_SCORE");
    this.showSpectatorNames();
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
    const MAX_NAME_LENGTH = 14;
    const truncate = (name: string) =>
      name.length > MAX_NAME_LENGTH ? name.slice(0, MAX_NAME_LENGTH - 1) + "…" : name;

    const player1Label = this.textBlocks.get("PLAYER_1_SCORE_DESCRIPTION");
    const player2Label = this.textBlocks.get("PLAYER_2_SCORE_DESCRIPTION");
    if (player1Label) {
      const name = player1Name ? player1Name : this.translations.labelYou;
      player1Label.text = truncate(name);
    }
    if (player2Label) {
      const name = player2Name ? player2Name : this.translations.labelOpponent;
      player2Label.text = truncate(name);
    }

    // Also update spectator paddle name labels
    this.updateSpectatorNames(player1Name, player2Name);
  }

  updateSpectatorNames(player1Name?: string | null, player2Name?: string | null) {
    const MAX_NAME_LENGTH = 14;
    const truncate = (name: string) =>
      name.length > MAX_NAME_LENGTH ? name.slice(0, MAX_NAME_LENGTH - 1) + "…" : name;

    const spec1 = this.textBlocks.get("SPECTATOR_PLAYER1_NAME");
    const spec2 = this.textBlocks.get("SPECTATOR_PLAYER2_NAME");
    if (spec1) {
      spec1.text = player1Name ? truncate(player1Name) : "";
    }
    if (spec2) {
      spec2.text = player2Name ? truncate(player2Name) : "";
    }
  }

  showSpectatorNames() {
    const spec1 = this.textBlocks.get("SPECTATOR_PLAYER1_NAME");
    const spec2 = this.textBlocks.get("SPECTATOR_PLAYER2_NAME");
    if (spec1 && spec1.text) {
      this.textFadeIn("SPECTATOR_PLAYER1_NAME");
    }
    if (spec2 && spec2.text) {
      this.textFadeIn("SPECTATOR_PLAYER2_NAME");
    }
  }
}
