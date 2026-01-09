DOCKER_ENGINE= docker-compose

all:  launch


launch:  volume build up


volume:
	mkdir -p -m 755  /home/$(USER)/transcendence_db_volume

build: 
	$(DOCKER_ENGINE) -f docker-compose.yml build

stop:
	$(DOCKER_ENGINE) -f docker-compose.yml stop

down:
	$(DOCKER_ENGINE) -f  docker-compose.yml down --rmi all -v

start:
	$(DOCKER_ENGINE) -f docker-compose.yml start

up:
	$(DOCKER_ENGINE) -f docker-compose.yml up -d


logs:
	@echo users:
	docker logs users
	@echo "/////////////////////////"


clean: stop down 
	
	
fclean: clean
	rm -fr node_modules/ 
	rm -fr  /home/$(USER)/transcendence_db_volume

status:
	$(DOCKER_ENGINE) -f docker-compose.yml ps

re: fclean all

NODE_VERSION=22.18.0

node:
	. $$HOME/.nvm/nvm.sh && nvm install $(NODE_VERSION)
	. $$HOME/.nvm/nvm.sh && nvm use $(NODE_VERSION)
	. $$HOME/.nvm/nvm.sh && nvm alias default $(NODE_VERSION)
	node -v