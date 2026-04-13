# ============================================
# school-frontend-nextjs · Makefile
# ============================================

REGION      := us-east-1
APP_NAME    := school-frontend-nextjs
BRANCH      := main
PID_FILE    := .dev.pid
LOG_FILE    := .dev.log

.PHONY: install dev stop restart status logs logs-tail build start \
        deploy deploy-info destroy help

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
# Builds locally and uploads to Amplify. No GitHub connection needed.
# Same pattern as SAM deploy: build + push from your machine.

deploy:
	@echo "Reading API URL from school-api-node stack..."
	@API_URL=$$(aws cloudformation describe-stacks \
		--stack-name school-api-node --region $(REGION) \
		--query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
		--output text) && \
	echo "API URL: $$API_URL" && \
	echo "" && \
	echo "Building Next.js..." && \
	NEXT_PUBLIC_API_URL=$$API_URL npx next build && \
	echo "" && \
	APP_ID=$$(aws amplify list-apps --region $(REGION) \
		--query "apps[?name=='$(APP_NAME)'].appId" --output text 2>/dev/null) && \
	if [ -z "$$APP_ID" ] || [ "$$APP_ID" = "None" ]; then \
		echo "Creating Amplify app..." && \
		APP_ID=$$(aws amplify create-app \
			--name $(APP_NAME) \
			--region $(REGION) \
			--platform WEB_COMPUTE \
			--environment-variables NEXT_PUBLIC_API_URL=$$API_URL \
			--query 'app.appId' --output text) && \
		aws amplify create-branch \
			--app-id $$APP_ID \
			--branch-name $(BRANCH) \
			--region $(REGION) \
			--stage PRODUCTION > /dev/null && \
		echo "App created: $$APP_ID"; \
	else \
		echo "App exists: $$APP_ID" && \
		aws amplify update-app \
			--app-id $$APP_ID \
			--region $(REGION) \
			--environment-variables NEXT_PUBLIC_API_URL=$$API_URL > /dev/null; \
	fi && \
	echo "Uploading build..." && \
	cd .next && zip -r /tmp/amplify-deploy.zip . -q && cd .. && \
	DEPLOY_RESULT=$$(aws amplify create-deployment \
		--app-id $$APP_ID \
		--branch-name $(BRANCH) \
		--region $(REGION) \
		--output json) && \
	UPLOAD_URL=$$(echo "$$DEPLOY_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['zipUploadUrl'])") && \
	JOB_ID=$$(echo "$$DEPLOY_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['jobId'])") && \
	curl -s -T /tmp/amplify-deploy.zip "$$UPLOAD_URL" > /dev/null && \
	aws amplify start-deployment \
		--app-id $$APP_ID \
		--branch-name $(BRANCH) \
		--job-id $$JOB_ID \
		--region $(REGION) > /dev/null && \
	DOMAIN=$$(aws amplify get-app --app-id $$APP_ID --region $(REGION) \
		--query 'app.defaultDomain' --output text) && \
	echo "" && \
	echo "Deploy started." && \
	echo "URL: https://$(BRANCH).$$DOMAIN" && \
	echo "Status: make deploy-info"

deploy-info:
	@APP_ID=$$(aws amplify list-apps --region $(REGION) \
		--query "apps[?name=='$(APP_NAME)'].appId" --output text) && \
	if [ -z "$$APP_ID" ] || [ "$$APP_ID" = "None" ]; then \
		echo "No Amplify app found. Run: make deploy"; \
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
	@echo "  make dev          Start dev server in background (port 3001)"
	@echo "  make stop         Stop the dev server"
	@echo "  make restart      Stop + start"
	@echo "  make status       Check if dev server is running"
	@echo ""
	@echo "  make logs         Last 50 lines of output"
	@echo "  make logs-tail    Follow logs in real-time (Ctrl+C to exit)"
	@echo ""
	@echo "  make install      Install dependencies"
	@echo "  make build        Production build"
	@echo "  make start        Start production server (port 3001)"
	@echo ""
	@echo "  make deploy       Build and deploy to AWS Amplify"
	@echo "  make deploy-info  Show app URL and recent deploy status"
	@echo "  make destroy      Delete Amplify app"
	@echo ""
