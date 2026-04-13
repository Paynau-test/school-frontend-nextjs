# school-frontend-nextjs

Web frontend for student management (Pedido 1) built with Next.js 15, React 19 and Tailwind CSS.

## Features

- Login with JWT authentication (via Node.js API)
- Student CRUD (create, read, update, soft delete)
- Search students by ID or name with debounce
- Filter by status (active, inactive, suspended)
- Role-based access: admin (full CRUD) vs teacher (read-only)
- Responsive design with Tailwind CSS

## Setup

```bash
# Run locally in Docker (port 3001)
make dev

# View logs
make logs

# Stop
make stop
```

## Architecture

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS 4
- **API**: Consumes school-api-node (Node.js/Lambda)
- **Deploy**: AWS Amplify (auto-deploy on push to main)
- **Auth**: JWT stored in localStorage with React Context

## Production

```bash
# First time setup
make deploy-setup

# Subsequent deploys (push + trigger build)
make deploy

# Check deploy status
make deploy-info
```
