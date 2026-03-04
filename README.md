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

ft_transcendence is a comprehensive web application that brings the classic Pong game into the modern era with 3D graphics, real-time multiplayer capabilities, and a complete social platform. Users can play against each other in real-time, chat with friends, and track their statistics.

## Features

### Core Features

- **3D Multiplayer Pong Game**
  - Real-time gameplay using WebSocket connections
  - 3D graphics powered by Babylon.js
  - Spell system with offensive and counter abilities
  - Spectator mode for watching live matches
  - Room-based multiplayer with in-game chat

- **User Management**
  - Username or email/password authentication with secure Argon2id hashing
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
  - Match history tracking

### Additional Features

- Responsive design (mobile, tablet, desktop)
- Multi-language support (internationalization)
- Dark/light theme support

## Architecture

The application follows a **microservices architecture** with four main services:

```
                         Port 3000 (HTTPS)
                                    |
                             +------v------+
                             |    NGINX    |
                             |   (HTTPS)   |
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
              | :3000  | | :3000  | |  :3000  | |  :3000    |
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
   - Spell system (6 spells in offensive/counter categories)
   - Spectator mode
   - Match result reporting

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
- **Database**: SQLite (Users: raw `bun:sqlite`, Chat: Prisma ORM)
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
- **SSL/TLS**: Self-signed certificates (nginx) + Cloudflare (production)

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

#### Frontend (`frontend/.env`)

**Optional** - Defaults work for development:

```bash
cp frontend/.env.example frontend/.env
# Edit if needed
```

**Note**: Chat and Game service environment variables are configured inline in `docker-compose.yml`. The Makefile will automatically create `users/.env` with placeholder values if it doesn't exist when running production mode.

### 3. Start the Application

#### Development Mode

```bash
make dev
```

Or without Make:

```bash
docker compose --profile dev up -d
```

The application will be available at `https://localhost:3000`

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

- Frontend: https://localhost:3000
- Users API: https://localhost:3001
- Game API: https://localhost:3002
- Chat API: https://localhost:3003

### Hot Reload

Development mode includes hot reload for all services:

- Frontend: Next.js development server with Fast Refresh
- Backend services: Fastify with file watching
- Volumes are mounted for live code updates

## Production Deployment

### HTTPS Configuration

The application uses **HTTPS everywhere** -- both in development and production. Nginx serves all traffic over HTTPS using a self-signed certificate generated at build time.

- **Development**: Nginx terminates TLS with a self-signed certificate. Browsers will show a certificate warning on first access.
- **Production**: A Cloudflare Tunnel connects to the local Nginx over HTTPS (`noTLSVerify: true` in the tunnel config), providing:
  - Valid SSL/TLS certificates for the public domain
  - DDoS protection
  - CDN capabilities
  - Web Application Firewall (WAF)

All inter-service communication in production is routed through the HTTPS Nginx proxy (e.g., `https://proxy:443/api/users`) rather than direct container-to-container HTTP. Services use `NODE_TLS_REJECT_UNAUTHORIZED=0` to accept the self-signed certificate.

### Building for Production

```bash
make prod-build       # Build all production images locally
make prod-buildx      # Build multi-platform images and push to registry
```

### Environment Configuration

The application dynamically derives URLs from request headers (e.g., the `Host` header), so there is no need to configure domain-specific environment variables for OAuth callbacks or frontend URLs. The only required environment variables are:

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `users/.env`

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

### Database Security

- Parameterized queries preventing SQL injection (prepared statements in Users service, Prisma ORM in Chat service)
- Database credentials stored in environment variables
- Separate databases for different concerns (users, chat)

### HTTPS Everywhere

- All traffic (dev and prod) served over HTTPS via Nginx with self-signed certificates
- Production traffic additionally secured via Cloudflare Tunnel with valid public certificates
- HTTP-only cookies for session management
- Secure headers configured in Nginx

### Privacy & Compliance

- **Privacy Policy**: Available at `/privacy-policy`
- **Terms of Service**: Available at `/terms-of-service`
- User data handling complies with GDPR principles

## Team

This project was developed by a team of 5 contributors:

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
