# Thought Vault

Thought Vault is a smart notes hub designed to reduce the effort required to organize and retrieve notes.

Users can add notes without manually deciding where they belong. Thought Vault uses text embeddings and machine-learning-based organization to support semantic "vibe search" and an automatically generated topic hierarchy for browsing notes by subject.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite

### Backend
- Node.js
- Express
- TypeScript

### Machine Learning
- Python
- Sentence Transformers
- scikit-learn
- Hugging Face
- PyTorch

### Database
- PostgreSQL

### Development Infrastructure
- Docker
- Docker Compose
- GitHub Actions
- ESLint

## Repository Structure

```text
thought-vault/
├── frontend/           React + TypeScript frontend
├── backend/            Node.js + Express API
├── ml-service/         Python machine-learning service
├── .github/
│   └── workflows/        GitHub Actions CI workflows
├── docker-compose.yaml   Local Docker development environment
└── README.md
```

Database schema and migrations will be maintained through the backend rather than a separate application directory.

## Architecture

```text
                    Browser
                   /       \
                  ↓         ↓
             Frontend    Backend API
                           /      \
                          ↓        ↓
                    PostgreSQL   ML Service
```

The frontend communicates with the Node/Express backend.

The backend acts as the primary application API and communicates with both PostgreSQL and the Python ML service.

The Python service is responsible for machine-learning functionality such as text embeddings, semantic similarity, search, and clustering.

## Local Development

### Environment Files

Create local environment files from the provided examples.

Frontend:

```bash
cp frontend/.env.example frontend/.env
```

Backend:

```bash
cp backend/.env.example backend/.env
```

Local `.env` files must not be committed.

## Running with Docker

The recommended way to start the complete local development stack is:

```bash
docker compose up --build
```

This starts:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- ML service: `http://localhost:8000`
- PostgreSQL: `localhost:5433`

PostgreSQL uses port `5433` on the host while continuing to use its standard port `5432` inside Docker.

To stop the stack:

```bash
docker compose down
```

To also delete the local PostgreSQL development volume:

```bash
docker compose down -v
```

## Running Services Individually

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### ML Service

Create and activate a Python virtual environment:

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the service:

```bash
uvicorn app.main:app --reload --port 8000
```

## Code Quality

Run frontend linting:

```bash
cd frontend
npm run lint
```

Run backend linting:

```bash
cd backend
npm run lint
```

Build the frontend:

```bash
cd frontend
npm run build
```

Build the backend:

```bash
cd backend
npm run build
```

## Continuous Integration

GitHub Actions runs automatically on pull requests targeting `main` and on pushes to `main`.

The CI workflow currently checks:

- Frontend linting
- Frontend TypeScript/Vite build
- Backend linting
- Backend TypeScript build
- Python dependency installation
- Python syntax compilation

Database integration testing will be added once database functionality and migrations are implemented.

## Development Workflow

Development should be associated with a GitHub issue.

Typical workflow:

```text
Issue
  ↓
Create branch from main
  ↓
Implement changes
  ↓
Run lint/build checks locally
  ↓
Push branch
  ↓
Open pull request
  ↓
GitHub Actions CI
  ↓
Code review
  ↓
Merge into main
```

Avoid developing directly on `main`.

## Current Project Status

Thought Vault is currently in initial MVP development.

The MVP will focus on establishing the core application architecture, note storage, semantic search, and initial machine-learning-based note organization.