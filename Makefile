all: prod

# Dev
dev: dev-up

dev-up:
	docker compose --profile dev up -d

dev-down:
	docker compose --profile dev down

dev-stop:
	docker compose --profile dev stop

dev-start:
	docker compose --profile dev start

dev-restart:
	docker compose --profile dev restart

dev-logs:
	docker compose --profile dev logs -f

# Single dev
frontend-dev:
	docker compose --profile dev up -d frontend-dev

users-dev:
	docker compose --profile dev up -d users-dev

game-dev:
	docker compose --profile dev up -d game-dev

# Prod
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

prod-logs:
	docker compose --profile prod logs -f

# Single prod
frontend-prod:
	docker compose --profile prod up -d --build frontend

users-prod:
	docker compose --profile prod up -d --build users

game-prod:
	docker compose --profile prod up -d --build game

# Logs for individual services
logs-frontend:
	docker compose logs -f frontend-dev frontend

logs-users:
	docker compose logs -f users-dev users

logs-game:
	docker compose logs -f game-dev game

logs-minio:
	docker compose logs -f minio

# Status
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