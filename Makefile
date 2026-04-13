# ============================================
# school-frontend-nextjs · Makefile
# ============================================

REGION      := us-east-1
APP_NAME    := school-frontend-nextjs
BRANCH      := main
PID_FILE    := .dev.pid
LOG_FILE    := .dev.log

.PHONY: install dev stop restart status logs logs-tail build start \
        deploy deploy-setup deploy-info destroy help

# ── Setup ───────────────────────────────────

install:
	@npm install

# ── Local Development ───────────────────────

dev:
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "Dev server already running (PID $$(cat $(PID_FILE))). Use: make restart"; \
	else \
		echo "Starting Next.js on http://localhost:3001 (background) ..."; \
		nohup npx next dev -p 3001 > $(LOG_FILE) 2>&1 & \
		echo $$! > $(PID_FILE); \
		sleep 2; \
		if kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
			echo "Dev server running (PID $$(cat $(PID_FILE)))"; \
			echo "  Logs:    make logs"; \
			echo "  Stop:    make stop"; \
		else \
			echo "Failed to start. Check: make logs"; \
			rm -f $(PID_FILE); \
		fi; \
	fi

stop:
	@if [ -f $(PID_FILE) ]; then \
		PID=$$(cat $(PID_FILE)); \
		if kill -0 $$PID 2>/dev/null; then \
			kill $$PID 2>/dev/null; \
			echo "Dev server stopped (PID $$PID)"; \
		else \
			echo "Process $$PID already dead, cleaning up"; \
		fi; \
		rm -f $(PID_FILE); \
	else \
		echo "No dev server running (no pid file)"; \
	fi

restart: stop
	@sleep 1
	@$(MAKE) dev

status:
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "Dev server is running (PID $$(cat $(PID_FILE)))"; \
	else \
		echo "Dev server is not running"; \
		rm -f $(PID_FILE) 2>/dev/null; \
	fi

# ── Logs ────────────────────────────────────

logs:
	@if [ -f $(LOG_FILE) ]; then \
		tail -50 $(LOG_FILE); \
	else \
		echo "No log file. Start first: make dev"; \
	fi

logs-tail:
	@if [ -f $(LOG_FILE) ]; then \
		tail -f $(LOG_FILE); \
	else \
		echo "No log file. Start first: make dev"; \
	fi

# ── Build ───────────────────────────────────

build:
	@npx next build

start:
	@npx next start -p 3001

# ── Deploy to AWS Amplify ───────────────────
# First time:  make deploy-setup  (creates app, prints console URL to connect GitHub)
# After setup: make deploy        (triggers a build on Amplify from latest push)
# Auto-deploy: every git push to main triggers build automatically

deploy-setup:
	@echo "Reading API URL from school-api-node stack..."
	@API_URL=$$(aws cloudformation describe-stacks \
		--stack-name school-api-node --region $(REGION) \
		--query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
		--output text) && \
	echo "API URL: $$API_URL" && \
	echo "" && \
	EXISTING=$$(aws amplify list-apps --region $(REGION) \
		--query "apps[?name=='$(APP_NAME)'].appId" --output text 2>/dev/null) && \
	if [ -n "$$EXISTING" ] && [ "$$EXISTING" != "None" ]; then \
		echo "App already exists: $$EXISTING" && \
		echo "Console: https://$(REGION).console.aws.amazon.com/amplify/apps/$$EXISTING" && \
		exit 0; \
	fi && \
	echo "Creating Amplify app..." && \
	APP_ID=$$(aws amplify create-app \
		--name $(APP_NAME) \
		--region $(REGION) \
		--platform WEB_COMPUTE \
		--environment-variables NEXT_PUBLIC_API_URL=$$API_URL \
		--build-spec "$$(cat amplify.yml)" \
		--query 'app.appId' --output text) && \
	echo "" && \
	echo "App created: $$APP_ID" && \
	echo "" && \
	echo ">>> Connect your GitHub repo in the Amplify Console:" && \
	echo "    https://$(REGION).console.aws.amazon.com/amplify/apps/$$APP_ID" && \
	echo "" && \
	echo "    1. Click 'Host web app'" && \
	echo "    2. Select GitHub → authorize → pick repo school-frontend-nextjs" && \
	echo "    3. Branch: main → Save and deploy" && \
	echo "" && \
	echo "After that, every 'git push' auto-deploys. Or use: make deploy"

deploy:
	@APP_ID=$$(aws amplify list-apps --region $(REGION) \
		--query "apps[?name=='$(APP_NAME)'].appId" --output text) && \
	if [ -z "$$APP_ID" ] || [ "$$APP_ID" = "None" ]; then \
		echo "No Amplify app found. Run: make deploy-setup"; \
		exit 1; \
	fi && \
	API_URL=$$(aws cloudformation describe-stacks \
		--stack-name school-api-node --region $(REGION) \
		--query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
		--output text) && \
	aws amplify update-app \
		--app-id $$APP_ID \
		--region $(REGION) \
		--environment-variables NEXT_PUBLIC_API_URL=$$API_URL > /dev/null && \
	aws amplify start-job \
		--app-id $$APP_ID \
		--branch-name $(BRANCH) \
		--job-type RELEASE \
		--region $(REGION) > /dev/null && \
	echo "Deploy triggered on Amplify (builds from GitHub)." && \
	echo "Check: make deploy-info"

deploy-info:
	@APP_ID=$$(aws amplify list-apps --region $(REGION) \
		--query "apps[?name=='$(APP_NAME)'].appId" --output text) && \
	if [ -z "$$APP_ID" ] || [ "$$APP_ID" = "None" ]; then \
		echo "No Amplify app found. Run: make deploy-setup"; \
		exit 1; \
	fi && \
	DOMAIN=$$(aws amplify get-app --app-id $$APP_ID --region $(REGION) \
		--query 'app.defaultDomain' --output text) && \
	echo "App ID:  $$APP_ID" && \
	echo "URL:     https://$(BRANCH).$$DOMAIN" && \
	echo "" && \
	aws amplify list-jobs --app-id $$APP_ID --branch-name $(BRANCH) \
		--region $(REGION) --max-results 3 \
		--query 'jobSummaries[].{Status:status,Started:startTime}' --output table

destroy:
	@APP_ID=$$(aws amplify list-apps --region $(REGION) \
		--query "apps[?name=='$(APP_NAME)'].appId" --output text) && \
	if [ -n "$$APP_ID" ] && [ "$$APP_ID" != "None" ]; then \
		aws amplify delete-app --app-id $$APP_ID --region $(REGION); \
		echo "Amplify app deleted."; \
	else \
		echo "No app to delete."; \
	fi

# ── Help ────────────────────────────────────

help:
	@echo ""
	@echo "school-frontend-nextjs commands:"
	@echo ""
	@echo "  make dev            Start dev server in background (port 3001)"
	@echo "  make stop           Stop the dev server"
	@echo "  make restart        Stop + start"
	@echo "  make status         Check if dev server is running"
	@echo ""
	@echo "  make logs           Last 50 lines of output"
	@echo "  make logs-tail      Follow logs in real-time (Ctrl+C to exit)"
	@echo ""
	@echo "  make install        Install dependencies"
	@echo "  make build          Production build"
	@echo "  make start          Start production server (port 3001)"
	@echo ""
	@echo "  make deploy-setup   First-time: create Amplify app + connect GitHub"
	@echo "  make deploy         Trigger build from latest push"
	@echo "  make deploy-info    Show URL and recent deploy status"
	@echo "  make destroy        Delete Amplify app"
	@echo ""
