DOCKER_ENGINE= docker
PORT = 3000
CONTAINER_NAME = users

all:  launch

launch: volume build run

install:
	npm install

volume:
	mkdir -p  /home/$(USER)/transcendence_db_volume

build: 
	$(DOCKER_ENGINE) build -t users_img  .

stop:
	$(DOCKER_ENGINE) stop $(CONTAINER_NAME)

down:
	$(DOCKER_ENGINE) rm $(CONTAINER_NAME)

run:
	$(DOCKER_ENGINE)  run -d --name $(CONTAINER_NAME) -p 127.0.0.1:3000:$(PORT) -v  /home/$(USER)/transcendence_db_volume:/app/data:Z --env-file .env users_img

up:
	$(DOCKER_ENGINE)  up -d .

logs:
	docker logs $(CONTAINER_NAME)


clean: stop down
	
	
fclean: clean
	rm -fr public/vendor/*
	rm -fr public/vendor
	rm -fr public/scripts/*
	rm -fr node_modules/ 
	rm -fr  /home/$(USER)/transcendance_volume

status:
	docker ps -a

re: fclean all

NODE_VERSION=22.18.0

node:
	. $$HOME/.nvm/nvm.sh && nvm install $(NODE_VERSION)
	. $$HOME/.nvm/nvm.sh && nvm use $(NODE_VERSION)
	. $$HOME/.nvm/nvm.sh && nvm alias default $(NODE_VERSION)
	node -v