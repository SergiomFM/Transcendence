
all:  launch

fe-dev:
	docker compose -f docker-compose.dev.yml up -d frontend

fe-prod:
	docker compose up -d --build frontend

fe-logs:
	docker compose logs -f frontend

fe-stop:
	docker compose stop frontend

fix:
	systemctl --user enable --now podman.socket

launch: install volume scripts build up

dev: install volume  dev_build dev_up

install:
	npm install

scripts:
	npm run build

volume:
	mkdir -p  /home/$(USER)/transcendance_volume

build: 
	docker compose -f docker/docker-compose.yml build

stop:
	docker compose -f docker/docker-compose.yml stop

down:
	docker compose -f  docker/docker-compose.yml down --rmi all -v

start:
	docker compose -f docker/docker-compose.yml start

up:
	docker compose -f docker/docker-compose.yml up -d

dev_build: 
	docker compose -f docker/docker-compose_dev.yml build

dev_stop:
	docker compose -f docker/docker-compose_dev.yml stop

dev_down:
	docker compose -f  docker/docker-compose_dev.yml down --rmi all -v

dev_start:
	docker compose -f docker/docker-compose_dev.yml start

dev_up:
	docker compose -f docker/docker-compose_dev.yml up -d

logs:
	@echo Api:
	docker logs api
	@echo "/////////////////////////"
	@echo DataBase:
	docker logs dataBase
	@echo "/////////////////////////"
	@echo Auth:
	docker logs auth
	@echo "/////////////////////////"
	@echo Game:
	docker logs game
	@echo "/////////////////////////"
	@echo Frontend:
	docker logs frontend
	@echo "/////////////////////////"


clean: stop down dev_stop dev_down
	
	
fclean: clean
	rm -fr public/vendor/*
	rm -fr public/vendor
	rm -fr public/scripts/*
	rm -fr node_modules/ 
	rm -fr  /home/$(USER)/transcendance_volume

status:
# 	docker-compose -f docker/docker-compose_dev.yml ps
	docker compose -f docker/docker-compose.yml ps

re: fclean all

NODE_VERSION=22.18.0

node:
	. $$HOME/.nvm/nvm.sh && nvm install $(NODE_VERSION)
	. $$HOME/.nvm/nvm.sh && nvm use $(NODE_VERSION)
	. $$HOME/.nvm/nvm.sh && nvm alias default $(NODE_VERSION)
	node -v