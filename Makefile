.PHONY: setup run check format docker-build docker-up docker-down logs clean

setup:
	npm install

run:
	npm run dev -- --host 0.0.0.0

check:
	npm run build
	node --check backend_scraper/index.js
	node --check backend_scraper/playwright_worker.js

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
