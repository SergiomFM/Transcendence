all: prod

# Multiplayer dev test  (Tiago e Paulo)
pong-dev:
	docker compose --profile dev up frontend-dev game-dev

# ALL SERVICES DEV
dev:
	docker compose --profile dev up -d

dev-down:
	docker compose --profile dev down

dev-stop:
	docker compose --profile dev stop

dev-start:
	docker compose --profile dev start

dev-restart:
	docker compose --profile dev restart

# SINGLE SERVICE DEV
dev-frontend:
	docker compose --profile dev up frontend-dev

dev-users:
	docker compose --profile dev up users-dev

dev-chat:
	docker compose --profile dev up chat-dev

dev-game:
	docker compose --profile dev up game-dev

# LOGS FOR INDIVIDUAL DEV SERVICES
dev-logs:
	docker compose --profile dev logs -f

dev-logs-frontend:
	docker compose --profile dev logs -f frontend-dev

dev-logs-users:
	docker compose --profile dev logs -f users-dev

dev-logs-chat:
	docker compose --profile dev logs -f chat-dev

dev-logs-game:
	docker compose --profile dev logs -f game-dev

# ALL SERVICES PROD
prod: prod-build prod-up

prod-build:
	docker compose --profile prod build

prod-up:
	docker compose --profile prod up -d

prod-down:
	docker compose --profile prod down

prod-stop:
	docker compose --profile prod stop

prod-start:
	docker compose --profile prod start

prod-restart:
	docker compose --profile prod restart

# SINGLE SERVICE PROD
prod-frontend:
	docker compose --profile prod up -d --build frontend

prod-users:
	docker compose --profile prod up -d users

prod-chat:
	docker compose --profile prod up -d chat

prod-game:
	docker compose --profile prod up -d game

# LOGS INDIVIDUAL PROD SERVICES
prod-logs:
	docker compose --profile prod logs -f

prod-logs-frontend:
	docker compose --profile prod logs -f frontend

prod-logs-users:
	docker compose --profile prod logs -f users

prod-logs-chat:
	docker compose --profile prod logs -f chat

prod-logs-game:
	docker compose --profile prod logs -f game

# STATUS
status:
	docker compose ps -a

clean: dev-down prod-down

fclean: clean
	docker compose --profile dev down -v --rmi all
	docker compose --profile prod down -v --rmi all
	rm -fr node_modules/

re: fclean all
	. $$HOME/.nvm/nvm.sh && nvm alias default $(NODE_VERSION)
	node -v