 BALL_INITIAL_SPEED: 0.5,
  BALL_SPEED_INCREMENT: 0.1,
  BALL_RADIUS: 0.015,
  BALL_Y: null, // Will be set from GLB at startup
  BALL_INITIAL_ANGLE_DEG: 90,

  // Paddle properties
  PADDLE_MAX_SPEED: 1,
  PADDLE_DRAG: 7.5,
  PADDLE_MAX_DEVIATION_ANGLE: 60,

  // Dash properties
  DASH_COOLDOWN: 1000, // ms
  DASH_DURATION: 200, // ms
  DASH_POWER: 2,

  // Game physics
  TICK_RATE: 1000 / 480, // ms per tick

  // Player positions (from GLB - will be set dynamically at startup)
  PLAYER1_Z: null,
  PLAYER2_Z: null,

  // Game boundaries (from GLB - will be set dynamically at startup)
  HEIGHT_LIMIT: null, // X-axis limit (wall bounds)
  WIDTH_LIMIT: null, // Z-axis limit (goal line)
  PADDLE_SIZE: null, // Paddle half-width

  // Match settings
  MAX_ROUNDS: 5,