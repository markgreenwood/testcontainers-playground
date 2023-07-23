stop-dependencies:
	docker compose -f docker/docker-compose-dependencies.yml down

run-dependencies: stop-dependencies
	docker compose -f docker/docker-compose-dependencies.yml up -d
