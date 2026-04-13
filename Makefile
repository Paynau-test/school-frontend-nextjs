# ============================================
# school-frontend-nextjs · Makefile
# ============================================

REGION      := us-east-1
APP_NAME    := school-frontend-nextjs
BRANCH      := main
GH_ORG      := Paynau-test

.PHONY: dev stop logs deploy deploy-setup deploy-info destroy push help

# ── Local Development ───────────────────────

dev:
	@docker compose down 2>/dev/null || true
	@docker compose up -d --build web
	@echo ""
	@echo "Frontend running at http://localhost:3001"
	@echo "  make logs → ver logs"
	@echo "  make stop → detener"

stop:
	@docker compose down
	@echo "Stopped."

logs:
	@docker compose logs -f web

# ── Deploy to AWS Amplify ───────────────────

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
	GH_TOKEN=$$(gh auth token) && \
	APP_ID=$$(aws amplify create-app \
		--name $(APP_NAME) \
		--repository https://github.com/$(GH_ORG)/$(APP_NAME) \
		--region $(REGION) \
		--platform WEB_COMPUTE \
		--oauth-token "$$GH_TOKEN" \
		--environment-variables NEXT_PUBLIC_API_URL=$$API_URL \
		--build-spec "$$(cat amplify.yml)" \
		--query 'app.appId' --output text) && \
	aws amplify create-branch \
		--app-id $$APP_ID \
		--branch-name $(BRANCH) \
		--region $(REGION) > /dev/null && \
	echo "App created: $$APP_ID" && \
	echo "Deploying..."  && \
	aws amplify start-job \
		--app-id $$APP_ID \
		--branch-name $(BRANCH) \
		--job-type RELEASE \
		--region $(REGION) > /dev/null && \
	echo "Deploy triggered. Check: make deploy-info"

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
	git push origin $(BRANCH) 2>/dev/null || true && \
	aws amplify start-job \
		--app-id $$APP_ID \
		--branch-name $(BRANCH) \
		--job-type RELEASE \
		--region $(REGION) > /dev/null && \
	echo "Deploy triggered. Check: make deploy-info"

deploy-info:
	@APP_ID=$$(aws amplify list-apps --region $(REGION) \
		--query "apps[?name=='$(APP_NAME)'].appId" --output text) && \
	if [ -z "$$APP_ID" ] || [ "$$APP_ID" = "None" ]; then \
		echo "No Amplify app found."; exit 1; \
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

# ── GitHub ──────────────────────────────────

push:
	@git push origin $(BRANCH)

# ── Help ────────────────────────────────────

help:
	@echo ""
	@echo "school-frontend-nextjs commands:"
	@echo ""
	@echo "  make dev          Run in Docker (port 3001)"
	@echo "  make stop         Stop container"
	@echo "  make logs         Tail container logs"
	@echo ""
	@echo "  make deploy-setup First-time: create Amplify app"
	@echo "  make deploy       Push + trigger Amplify build"
	@echo "  make deploy-info  Show URL and deploy status"
	@echo "  make destroy      Delete Amplify app"
	@echo "  make push         Push to GitHub"
	@echo ""
