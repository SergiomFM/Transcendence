export class Server extends WebSocket {
  constructor() {
    super("ws://localhost:1237");
  }
}

const socket = new WebSocket("ws://localhost:8080");

socket.onopen = function (event) {
  // Handle connection open
};

socket.onmessage = function (event) {
  // Handle received message
  const message = JSON.parse(event.data);
  switch (message.type) {
    case "PLAYER_INPUT":
      sendPlayerInput(message.data);
      break;
    case "GAME_CONSTANTS":
      updateGameConstants(message.data);
      break; 
    case "GAME_STATE":
      updateGameState(message.data);
      break;
  }
    // ETC...
};

socket.onclose = function (event) {
  // Handle connection close
};


function sendPlayerInput(input: any) {
}

function updateGameConstants(message: any) {
}

function updateGameState(message: any) {
  //Pong.gameState = message;
}

function triggerCollisionEffect(message: any) {
}

function triggerSpellActivation(message: any) {
}

