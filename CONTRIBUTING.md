# Contributing

It's great that you want to contribute to this project! 🎉

## Contents

- [Contributing](#contributing)
  - [Contents](#contents)
  - [Technology stack](#technology-stack)
  - [Development setup](#development-setup)

## Technology stack

> [!TIP]
> The below is a high level overview of this project's architecture.

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

## Development setup

1. Fork this repository and then clone your fork.

2. Create your `.env` files. These new environment files store all the default environment variables. You can leave the defaults as is for now.

    ```bash
    cp .env.example .env
    cp frontend/.env.example frontend/.env
    ```

3. You can now read on to the [development guide](docs/development.md).
