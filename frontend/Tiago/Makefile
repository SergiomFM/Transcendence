all:  install scripts build up

install:
	npm install

scripts:
	npm run build --workspace frontend

volume:
	# mkdir -p ~/data
	
build: 
	docker-compose -f docker-compose.yml build

stop:
	docker-compose -f docker-compose.yml stop
	
down:
	docker-compose -f  docker-compose.yml down --rmi all -v

start:
	docker-compose -f docker-compose.yml start
	
up:
	docker-compose -f docker-compose.yml up -d
	
logs:
	@echo API:
	docker logs API
	@echo "/////////////////////////"
	@echo Test:
	docker logs test
	@echo "/////////////////////////"
	@echo Auth:
	docker logs auth
	@echo "/////////////////////////"
	@echo Pong:
	docker logs pong
	@echo "/////////////////////////"

clean: stop down
	
	
fclean: clean
	rm -fr public/*
	rm -fr node_modules/
	rm -fr 

status:
	docker-compose -f docker-compose.yml ps

re: fclean all