all:  launch

launch: install volume prisma_setup run

run:
	bun run index

install:
	bun install

volume:
	mkdir -p  /home/$(USER)/transcendence_db_volume

prisma_setup:
	export DATABASE_URL="file:./data/dev.db"
	bun run prisma generate
	bun run prisma migrate dev --name init


clean:
	
	
fclean: clean
	rm -fr  /home/$(USER)/transcendence_chat_volume



re: fclean all


.PHONY: all launch run install volume clean fclean re
