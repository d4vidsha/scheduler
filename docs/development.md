# Development

Here you can find the general development instructions for all new contributors. This guide serves as your first proper introduction into this project. Later in the guide, you can find more specific instructions for the frontend or backend development. Lastly, make sure you have read [CONTRIBUTING.md](../CONTRIBUTING.md) before coming here.

## Contents

- [Development](#development)
  - [Contents](#contents)
  - [Docker Compose](#docker-compose)
  - [Local development](#local-development)
  - [Docker Compose in `localhost.davidsha.me`](#docker-compose-in-localhostdavidshame)
  - [Docker Compose files and env vars](#docker-compose-files-and-env-vars)
  - [The .env file](#the-env-file)
  - [Pre-commits and code linting](#pre-commits-and-code-linting)
    - [Install pre-commit to run automatically](#install-pre-commit-to-run-automatically)
    - [Running pre-commit hooks manually](#running-pre-commit-hooks-manually)
  - [URLs](#urls)
    - [Development URLs](#development-urls)
    - [Development URLs with `localhost.davidsha.me` Configured](#development-urls-with-localhostdavidshame-configured)
  - [Next steps](#next-steps)

## Docker Compose

1. Start the local stack with Docker Compose:

    ```bash
    docker compose watch
    ```

2. Now you can open your browser and interact with these URLs:

    - Frontend, built with Docker, with routes handled based on the path: <http://localhost:5173>

    - Backend, JSON based web API based on OpenAPI: <http://localhost:8000>

    - Automatic interactive documentation with Swagger UI (from the OpenAPI backend): <http://localhost:8000/docs>

    - Adminer, database web administration: <http://localhost:8080>

    - Traefik UI, to see how the routes are being handled by the proxy: <http://localhost:8090>

> [!NOTE]
> The first time you start your stack, it might take a minute for it to be ready. While the backend waits for the database to be ready and configures everything. You can check the logs to monitor it.

To check the logs, run (in another terminal):

```bash
docker compose logs
```

To check the logs of a specific service, add the name of the service, e.g.:

```bash
docker compose logs backend
```

## Local development

The Docker Compose files are configured so that each of the services is available in a different port in `localhost`.

For the backend and frontend, they use the same port that would be used by their local development server, so, the backend is at `http://localhost:8000` and the frontend at `http://localhost:5173`.

This way, you could turn off a Docker Compose service and start its local development service, and everything would keep working, because it all uses the same ports.

For example, you can stop that `frontend` service in the Docker Compose, in another terminal, run:

```bash
docker compose stop frontend
```

And then start the local frontend development server:

> [!TIP]
> If you are reading this guide for the first time, you might not have the frontend or backend dependencies installed yet. As such, the below commands may fail. Don't worry, you can always come back to this section later as reference. For now, just know that this functionality exists.

```bash
cd frontend
npm run dev
```

Or you could stop the `backend` Docker Compose service:

```bash
docker compose stop backend
```

And then you can run the local development server for the backend:

```bash
cd backend
fastapi dev app/main.py
```

## Docker Compose in `localhost.davidsha.me`

When you start the Docker Compose stack, it uses `localhost` by default, with different ports for each service (backend, frontend, adminer, etc).

When you deploy it to production (or staging), it will deploy each service in a different subdomain, like `api.example.com` for the backend and `dashboard.example.com` for the frontend.

In the guide about [deployment](deployment.md) you can read about Traefik, the configured proxy. That's the component in charge of transmitting traffic to each service based on the subdomain.

If you want to test that it's all working locally, you can edit the local `.env` file, and change:

```dotenv
DOMAIN=localhost.davidsha.me
```

That will be used by the Docker Compose files to configure the base domain for the services.

Traefik will use this to transmit traffic at `api-localhost.davidsha.me` to the backend, and traffic at `localhost.davidsha.me` to the frontend.

The domain `localhost.davidsha.me` is a special domain that is configured (with all its subdomains) to point to `127.0.0.1`. This way you can use that for your local development.

After you update it, run again:

```bash
docker compose watch
```

When deploying, for example in production, the main Traefik is configured outside of the Docker Compose files. For local development, there's an included Traefik in `docker-compose.override.yml`, just to let you test that the domains work as expected, for example with `api.localhost.davidsha.me` and `dashboard.localhost.davidsha.me`.

## Docker Compose files and env vars

There is a main `docker-compose.yml` file with all the configurations that apply to the whole stack, it is used automatically by `docker compose`.

And there's also a `docker-compose.override.yml` with overrides for development, for example to mount the source code as a volume. It is used automatically by `docker compose` to apply overrides on top of `docker-compose.yml`.

These Docker Compose files use the `.env` file containing configurations to be injected as environment variables in the containers.

They also use some additional configurations taken from environment variables set in the scripts before calling the `docker compose` command.

After changing variables, make sure you restart the stack:

```bash
docker compose watch
```

## The .env file

The `.env` file is the one that contains all your configurations, generated keys and passwords, etc.

Depending on your workflow, you could want to exclude it from Git, for example if your project is public. In that case, you would have to make sure to set up a way for your CI tools to obtain it while building or deploying your project.

One way to do it could be to add each environment variable to your CI/CD system, and updating the `docker-compose.yml` file to read that specific env var instead of reading the `.env` file.

## Pre-commits and code linting

We are using a tool called [pre-commit](https://pre-commit.com/) for code linting and formatting.

When you install it, it runs right before making a commit in git. This way it ensures that the code is consistent and formatted even before it is committed.

You can find a file `.pre-commit-config.yaml` with configurations at the root of the project.

### Install pre-commit to run automatically

`pre-commit` is already part of the dependencies of the project, but you could also install it globally if you prefer to, following [the official pre-commit docs](https://pre-commit.com/).

After having the `pre-commit` tool installed and available, you need to "install" it in the local repository, so that it runs automatically before each commit.

> [!TIP]
> If this is your first time going through this guide, you might not have [`uv`](https://docs.astral.sh/uv/) installed yet. Go there and install it.

Using `uv`, you could do it with:

```bash
❯ uv run pre-commit install
pre-commit installed at .git/hooks/pre-commit
```

Now whenever you try to commit, e.g. with:

```bash
git commit
```

...pre-commit will run and check and format the code you are about to commit, and will ask you to add that code (stage it) with git again before committing.

Then you can `git add` the modified/fixed files again and now you can commit.

### Running pre-commit hooks manually

you can also run `pre-commit` manually on all the files, you can do it using `uv` with:

```bash
❯ uv run pre-commit run --all-files
check for added large files..............................................Passed
check toml...............................................................Passed
check yaml...............................................................Passed
ruff.....................................................................Passed
ruff-format..............................................................Passed
eslint...................................................................Passed
prettier.................................................................Passed
```

## URLs

The production or staging URLs would use these same paths, but with your own domain.

### Development URLs

Development URLs, for local development.

Frontend: <http://localhost:5173>

Backend: <http://localhost:8000>

Automatic Interactive Docs (Swagger UI): <http://localhost:8000/docs>

Automatic Alternative Docs (ReDoc): <http://localhost:8000/redoc>

Adminer: <http://localhost:8080>

Traefik UI: <http://localhost:8090>

MailCatcher: <http://localhost:1080>

### Development URLs with `localhost.davidsha.me` Configured

Development URLs, for local development.

Frontend: <http://localhost.davidsha.me>

Backend: <http://api-localhost.davidsha.me>

Automatic Interactive Docs (Swagger UI): <http://api-localhost.davidsha.me/docs>

Automatic Alternative Docs (ReDoc): <http://api-localhost.davidsha.me/redoc>

Adminer: <http://localhost.davidsha.me:8080>

Traefik UI: <http://localhost.davidsha.me:8090>

MailCatcher: <http://localhost.davidsha.me:1080>

## Next steps

Now that you are familiar with the general development tips, you can pick and choose to learn more about frontend development, backend development or both!

- Go to [frontend development guide](../frontend/README.md).
- Go to [backend development guide](../backend/README.md).
