# ShopKart Microservices — Makefile

up:
	docker-compose up --build -d

down:
	docker-compose down

logs:
	docker-compose logs -f

seed:
	docker exec shopkart-auth node src/seed/index.js
	docker exec shopkart-product node src/seed/index.js

restart:
	docker-compose restart

clean:
	docker-compose down -v --remove-orphans

status:
	docker-compose ps

kafka-ui:
	open http://localhost:8080

rabbitmq-ui:
	open http://localhost:15672
