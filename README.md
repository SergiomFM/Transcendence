# ft_transcendence

A modern web application featuring real-time multiplayer 3D Pong, chat system, and social features built with a microservices architecture.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Security](#security)
- [Team](#team)
- [License](#license)

## Project Overview

ft_transcendence is a comprehensive web application that brings the classic Pong game into the modern era with 3D graphics, real-time multiplayer capabilities, and a complete social platform. Users can play against each other in real-time, chat with friends, customize their game experience, and track their statistics.

## Features

### Core Features

- **3D Multiplayer Pong Game**
  - Real-time gameplay using WebSocket connections
  - 3D graphics powered by Babylon.js
  - Customizable paddles, balls, and environments
  - Spectator mode for watching live matches
  - Tournament system with matchmaking

- **User Management**
  - Email/password authentication with secure Argon2id hashing
  - Google OAuth integration
  - Two-Factor Authentication (2FA) support
  - User profiles with avatars and statistics
  - Friend system

- **Real-time Chat**
  - Direct messaging between users
  - Game invitations through chat
  - Server-Sent Events (SSE) for real-time updates
  - Message read receipts

- **Social Features**
  - Friend requests and management
  - User profiles with game statistics
  - Leaderboards
  - Activity tracking

### Additional Features

- Responsive design (mobile, tablet, desktop)
- Multi-language support (internationalization)
- Dark/light theme support
- Accessibility features

## Architecture

The application follows a **microservices architecture** with four main services:

```
                         Port 3000 (HTTPS via Cloudflare)
                                    |
                             +------v------+
                             |    NGINX    |
                             +------+------+
                                    |
                   +--------+-------+-------+--------+
                   |        |               |        |
             /api/users/  /api/game/   /api/chat/    /
                          /ws/pong     (SSE)       (catch-all)
                          /ws/lobby
                   |        |               |        |
              +----v---+ +--v-----+ +------v--+ +---v-------+
              | Users  | |  Game  | |  Chat   | | Frontend  |
              | :3001  | | :3002  | |  :3003  | |  :3000    |
              +--------+ +--------+ +---------+ +-----------+
```

### Services

1. **Frontend** (Next.js 16 + React 19)
   - Server-side rendering
   - Client-side routing
   - UI components with Tailwind CSS
   - 3D game rendering with Babylon.js

2. **Users Service** (Fastify)
   - Authentication & authorization
   - User profile management
   - Friend system
   - Session management
   - OAuth integration

3. **Game Service** (Fastify)
   - WebSocket game server
   - Game room management
   - Matchmaking
   - Spectator mode
   - Game statistics

4. **Chat Service** (Fastify)
   - Direct messaging
   - Real-time updates via SSE
   - Game invitations
   - Message persistence

5. **Nginx Proxy**
   - Reverse proxy for all services
   - WebSocket support
   - Static file serving

## Technology Stack

### Backend

- **Runtime**: Bun
- **Framework**: Fastify 5
- **Database**: SQLite with Prisma ORM
- **Authentication**: @fastify/passport, @fastify/secure-session
- **Password Hashing**: Argon2id
- **2FA**: Speakeasy (TOTP)

### Frontend

- **Framework**: Next.js 16
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Components**: Radix UI (shadcn/ui)
- **3D Engine**: Babylon.js
- **Internationalization**: next-intl
- **HTTP Client**: Axios

### Infrastructure

- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **SSL/TLS**: Cloudflare (external)

## Prerequisites

- Docker and Docker Compose (or Podman)
- Make (optional, for convenience commands)
- Node.js/Bun (for local development without Docker)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd transcendence
```

### 2. Environment Variables

Each service has an `.env.example` file that you can copy to create your own `.env` file with custom configuration.

#### Users Service (`users/.env`)

**Required** - Create this file with your Google OAuth credentials:

```bash
cp users/.env.example users/.env
# Edit users/.env with your Google OAuth credentials
```

Required variables:

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

#### Chat Service (`chat/.env`)

**Optional** - Defaults work for development:

```bash
cp chat/.env.example chat/.env
# Edit if needed
```

#### Game Service (`game/.env`)

**Optional** - Defaults work for development:

```bash
cp game/.env.example game/.env
# Edit if needed
```

#### Frontend (`frontend/.env`)

**Optional** - Defaults work for development:

```bash
cp frontend/.env.example frontend/.env
# Edit if needed
```

**Note**: The Makefile will automatically create `users/.env` with placeholder values if it doesn't exist when running production mode.

### 3. Start the Application

#### Development Mode

```bash
make dev
```

Or without Make:

```bash
docker compose --profile dev up -d
```

The application will be available at `http://localhost:3000`

#### Production Mode

```bash
make prod
```

Or without Make:

```bash
docker compose --profile prod up -d
```

## Development

### Available Commands

```bash
# Development
make dev              # Start all services in development mode
make dev-down         # Stop all development services
make dev-logs         # View logs for all services
make dev-logs-frontend # View frontend logs only
make dev-logs-users   # View users service logs only
make dev-logs-chat    # View chat service logs only
make dev-logs-game    # View game service logs only

# Production
make prod             # Start all services in production mode
make prod-down        # Stop all production services
make prod-logs        # View production logs
make prod-restart     # Restart production services

# Utilities
make status           # Check status of all containers
make clean            # Stop and remove all containers
make fclean           # Clean everything including volumes and images
```

### Service Ports (Development)

- Frontend: http://localhost:3000
- Users API: http://localhost:3001
- Game API: http://localhost:3002
- Chat API: http://localhost:3003

### Hot Reload

Development mode includes hot reload for all services:

- Frontend: Next.js development server with Fast Refresh
- Backend services: Fastify with file watching
- Volumes are mounted for live code updates

## Production Deployment

### HTTPS Configuration

The application is designed to run behind an HTTPS-enabled reverse proxy. In production, **HTTPS is handled externally by Cloudflare**, which provides:

- SSL/TLS termination
- DDoS protection
- CDN capabilities
- Web Application Firewall (WAF)

The Nginx proxy receives traffic from Cloudflare over HTTP internally, but all external traffic is secured via HTTPS at the Cloudflare edge.

**Important**: If you're deploying without Cloudflare, you must configure SSL/TLS certificates in your Nginx configuration. Options include:

- Let's Encrypt with Certbot
- Self-signed certificates (for testing only)
- Commercial SSL certificates

### Building for Production

```bash
make prod-build       # Build all production images locally
make prod-buildx      # Build multi-platform images and push to registry
```

### Environment Configuration

Update the following environment variables in `docker-compose.yml` for production:

- `NEXT_PUBLIC_SITE_URL`: Your production domain
- `FRONTEND_URL`: Your production domain
- `GOOGLE_CALLBACK_URL`: OAuth callback URL

## Security

### Authentication & Authorization

- **Password Hashing**: Argon2id algorithm (industry standard)
- **Session Management**: Encrypted secure sessions
- **OAuth**: Google OAuth 2.0 integration
- **2FA**: Time-based One-Time Passwords (TOTP)

### Input Validation

All user inputs are validated on both frontend and backend:

- Email format validation
- Password strength requirements (min 8 chars, uppercase, lowercase, number, special char)
- Username validation (3-20 alphanumeric characters)
- Form sanitization

### Database Security

- Parameterized queries via Prisma ORM (SQL injection prevention)
- Database credentials stored in environment variables
- Separate databases for different concerns (users, chat)

### HTTPS Everywhere

- Production traffic secured via Cloudflare HTTPS
- HTTP-only cookies for session management
- Secure headers configured in Nginx

### Privacy & Compliance

- **Privacy Policy**: Available at `/privacy-policy`
- **Terms of Service**: Available at `/terms-of-service`
- User data handling complies with GDPR principles

## Team

This project was developed by a team of 6 contributors:

- **Paulo Victor Cordeiro** (pvcordeiro) - Infrastructure, Game Service
- **Lourenço Saraiva** - Authentication, 2FA, OAuth
- **Tiago Oliveira** (tjorge-d) - 3D Graphics, Game Customization and Development
- **Afonso Coutinho** (afonsopc) - Frontend Framework, UI Components
- **Sérgio Martins** (sergiomFM) - Users Service Database, Chat Service

## License

This project is part of the 42 School curriculum.

---

## Browser Compatibility

- Google Chrome (latest stable version) - Primary support
- Other modern browsers (Firefox, Safari, Edge) - Compatible but not primary testing target

## Known Limitations

- WebSocket connections may require specific firewall configurations
- Safari may have limited WebSocket support in some versions
- Mobile touch controls are optimized for portrait mode

## Support

For issues, questions, or contributions, please refer to the repository's issue tracker.
