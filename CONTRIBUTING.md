# Contributing

- [Contributing](#contributing)
  - [Technology stack and features](#technology-stack-and-features)
  - [Development](#development)
    - [Backend development](#backend-development)
    - [Frontend development](#frontend-development)
    - [Deployment](#deployment)

## Technology stack and features

- [FastAPI](https://fastapi.tiangolo.com/) for the Python backend API.
  - [SQLModel](https://sqlmodel.tiangolo.com) for the Python SQL database interactions (ORM).
  - [Pydantic](https://docs.pydantic.dev), used by FastAPI, for the data validation and settings management.
  - [PostgreSQL](https://www.postgresql.org) as the SQL database.
- [React](https://react.dev) for the frontend.
  - Using TypeScript, hooks, Vite, and other parts of a modern frontend stack.
  - [shadcn/ui](https://ui.shadcn.com/docs) for frontend components.
  - An automatically generated frontend client.
  - [Playwright](https://playwright.dev) for End-to-End testing.
  - Dark mode support.
- [Docker Compose](https://www.docker.com) for development and production.
- Secure password hashing by default.
- JWT (JSON Web Token) authentication.
- Email based password recovery.
- Tests with [Pytest](https://pytest.org).
- [Traefik](https://traefik.io) as a reverse proxy / load balancer.
- CI (continuous integration) and CD (continuous deployment) based on GitHub Actions.

## Development

Start by reading the [development guide](docs/development.md).

### Backend development

Read more at [backend/README.md](backend/README.md).

### Frontend development

Read more at [frontend/README.md](frontend/README.md).

### Deployment

Read more at [docs/deployment.md](docs/deployment.md).
