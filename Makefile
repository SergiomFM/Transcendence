all: dev

dev:
	@mkdir -p users/database chat/data
	docker compose --profile dev up

dev-down:
	docker compose --profile dev down

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

prod: ensure-users-env
	@mkdir -p users/database chat/data
	docker compose --profile prod up -d --pull=always --no-build

ensure-users-env:
	@test -f users/.env || { mkdir -p users && printf "GOOGLE_CLIENT_ID=abc\nGOOGLE_CLIENT_SECRET=test\n" > users/.env; }

prod-build:
	docker compose --profile prod build

prod-buildx:
	docker buildx inspect transcendence-builder >/dev/null 2>&1 || docker buildx create --use --name transcendence-builder
	docker buildx build --platform linux/amd64,linux/arm64 -f frontend/Dockerfile -t ghcr.io/pvcordeiro/transcendence-frontend --push .
	docker buildx build --platform linux/amd64,linux/arm64 -f game/Dockerfile -t ghcr.io/pvcordeiro/transcendence-game --push .
	docker buildx build --platform linux/amd64,linux/arm64 -f users/Dockerfile -t ghcr.io/pvcordeiro/transcendence-users --push .
	docker buildx build --platform linux/amd64,linux/arm64 -f chat/Dockerfile -t ghcr.io/pvcordeiro/transcendence-chat --push .
	docker buildx build --platform linux/amd64,linux/arm64 -f nginx/Dockerfile -t ghcr.io/pvcordeiro/transcendence-proxy --push nginx

prod-down:
	docker compose --profile prod down

prod-stop:
	docker compose --profile prod stop

prod-start:
	docker compose --profile prod start

prod-restart:
	docker compose --profile prod restart

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

prod-logs-proxy:
	docker compose --profile prod logs -f proxy

# STATUS
status:
	docker compose ps -a

clean: dev-down prod-down

fclean: clean
	docker compose --profile dev down -v --rmi all
	docker compose --profile prod down -v --rmi all
	docker volume prune -f
	rm -fr node_modules/

re: fclean all
	. $$HOME/.nvm/nvm.sh && nvm alias default $(NODE_VERSION)
	node -v
