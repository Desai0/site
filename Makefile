.PHONY: setup run check test build release-check format docker-build docker-up docker-down logs clean

setup:
	npm install

run:
	npm run dev -- --host 0.0.0.0

check:
	npm run check

test:
	npm run test:security

build:
	npm run build

release-check:
	npm run release:check

format:
	npx prettier --write "**/*.{html,css,js,ts,md,json}"

docker-build:
	docker compose build

docker-up:
	docker compose up --build

docker-down:
	docker compose down

logs:
	docker compose logs -f

clean:
	@echo "Clean is intentionally manual to avoid deleting user data."
