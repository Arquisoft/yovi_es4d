# YOVI_es4d - Game Y at UniOvi

[![Release — Test, Build, Publish, Deploy](https://github.com/arquisoft/yovi_es4d/actions/workflows/release-deploy.yml/badge.svg)](https://github.com/arquisoft/yovi_es4d/actions/workflows/release-deploy.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es4d&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es4d)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es4d&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es4d)
[![Open Issues](https://img.shields.io/github/issues/arquisoft/yovi_es4d)](https://github.com/arquisoft/yovi_es4d/issues)
[![Closed Issues](https://img.shields.io/github/issues-closed/arquisoft/yovi_es4d)](https://github.com/arquisoft/yovi_es4d/issues?q=is%3Aissue+is%3Aclosed)
[![Open Pull Requests](https://img.shields.io/github/issues-pr/arquisoft/yovi_es4d)](https://github.com/arquisoft/yovi_es4d/pulls)
[![Closed Pull Requests](https://img.shields.io/github/issues-pr-closed/arquisoft/yovi_es4d)](https://github.com/arquisoft/yovi_es4d/pulls?q=is%3Apr+is%3Aclosed)

[![CodeScene Average Code Health](https://codescene.io/projects/66324/status-badges/average-code-health)](https://codescene.io/projects/66324)
[![CodeScene Hotspot Code Health](https://codescene.io/projects/66324/status-badges/hotspot-code-health)](https://codescene.io/projects/66324)
[![CodeScene System Mastery](https://codescene.io/projects/66324/status-badges/system-mastery)](https://codescene.io/projects/66324)
[![CodeScene general](https://codescene.io/images/analyzed-by-codescene-badge.svg)](https://codescene.io/projects/66324)


YOVI is a web application for playing the Game Y, developed as part of the ASW course at the University of Oviedo.
## Contributors
| Name | GitHub Profile |
|--------------|--------|
| Sara Lamuño García 🐦‍🔥| <a href="https://github.com/Etihw32"><img src="https://img.shields.io/badge/UO283706-Sara%20Lamuño-blue"></a>|
| Andrea Acero Suárez :saluting_face: | <a href="https://github.com/AndreaAcero"><img src="https://img.shields.io/badge/UO287876-Andrea%20Acero-pink"></a>|
| Jorge Suárez Álvarez :ice_cube: | <a href="https://github.com/jorgesuar"><img src="https://img.shields.io/badge/UO296038-Jorge%20Suárez-orange">|
| Sergio Blanco García :white_medium_square: |  <a href="https://github.com/Sat00rii"><img src="https://img.shields.io/badge/UO293686-Sergio%20Blanco-green">|

## Project Structure

The project is divided into several components, each in its own directory:

- `webapp/`: A frontend application built with React, Vite, and TypeScript.
- `users/authservice/`: Authentication microservice handling login and JWT token issuance.
- `users/userservice/`: User management microservice for creating and querying user data.
- `gateway/`: API Gateway that routes requests to the appropriate microservice and handles JWT authorization.
- `game/`: Game service managing game sessions and state, built with Node.js and Express.
- `friends/`: Friends service managing friend requests and notifications.
- `gamey/`: A Rust game engine and bot service.
- `docs/`: Architecture documentation sources following Arc42 template

Each Node.js component has its own `package.json` file with the necessary scripts to run and test the application. The `gamey` component uses Cargo instead.

## Basic Features

- **User Registration**: Users can register with a username, email, and password.
- **User Authentication**: Registered users can log in and out securely using JWT-based authentication.
- **Game Management**: Users can start a new game choosing the board size, game mode (2D or 3D), victory condition (connection or not), turn time limit, and whether to play against another person or a bot (with selectable bot strategy).
- **Game History**: Users can consult their game history, view per-game details, see statistics charts, and sort games by date.
- **Friend System**: Users can send, accept, and reject friend requests and view their friends list.
- **Profile Management**: Users can update their personal information, username, password, and profile picture.
- **Notifications**: Users receive in-app notifications for pending friend requests and game invitations.
- **GameY Engine**: A Rust-based game engine that validates moves, enforces game rules, and provides bot strategies for different board configurations.

## Components

### Webapp

The `webapp` is a single-page application (SPA) created with [Vite](https://vitejs.dev/) and [React](https://reactjs.org/).

- `src/App.tsx`: Root component and routing setup.
- `src/pages/`: Page-level components (login, register, game history, friends, profile).
- `src/components/`: Reusable UI components (game board, sidebar, notifications, etc.).
- `src/services/`: API client functions for communicating with the gateway.
- `src/context/`: React context providers for global state.
- `package.json`: Contains scripts to run, build, and test the webapp.
- `vite.config.ts`: Configuration file for Vite.
- `Dockerfile`: Defines the Docker image for the webapp.

### Auth Service

The `users/authservice` is a REST API built with [Node.js](https://nodejs.org/) and [Express](https://expressjs.com/) that handles user authentication.

- `auth-service.js`: Main file. Defines endpoints for login and token generation using JWT and bcrypt for password hashing.
- `auth-model.js`: Mongoose model for user credentials.
- `package.json`: Contains scripts to start and test the service.
- `Dockerfile`: Defines the Docker image for the auth service.

### User Service

The `users/userservice` is a REST API built with [Node.js](https://nodejs.org/) and [Express](https://expressjs.com/) that manages user data.

- `user-service.js`: Main file. Defines endpoints for user creation and retrieval.
- `user-model.js`: Mongoose model for user profiles.
- `package.json`: Contains scripts to start and test the service.
- `Dockerfile`: Defines the Docker image for the user service.

### Gateway Service

The `gateway` is the single entry point for all client requests, built with [Node.js](https://nodejs.org/) and [Express](https://expressjs.com/).

- `gateway-service.js`: Main file. Routes incoming requests to the auth, user, and game microservices. Validates JWT tokens and enforces authorization.
- `openapi.yaml`: OpenAPI/Swagger specification for the gateway API.
- `monitoring/`: Prometheus and Grafana configuration for metrics.
- `package.json`: Contains scripts to start and test the service.
- `Dockerfile`: Defines the Docker image for the gateway service.

### Game Service

The `game` service is a REST API built with [Node.js](https://nodejs.org/) and [Express](https://expressjs.com/) that manages game sessions and state.

- `game-service.js`: Main file. Defines endpoints for creating and managing games.
- `gameModel.js`: Mongoose model for game data.
- `package.json`: Contains scripts to start and test the service.
- `Dockerfile`: Defines the Docker image for the game service.

### Friends Service

The `friends` service is a REST API built with [Node.js](https://nodejs.org/) and [Express](https://expressjs.com/) that manages friend relationships and notifications between users.

- `friend-service.js`: Main file. Defines endpoints for sending, accepting, and rejecting friend requests.
- `models/friendRequest.js`: Mongoose model for friend requests.
- `models/notification.js`: Mongoose model for user notifications.
- `middlewares/auth.js`: JWT authentication middleware.
- `package.json`: Contains scripts to start and test the service.
- `Dockerfile`: Defines the Docker image for the friends service.

### Gamey

The `gamey` component is a Rust-based game engine with bot support, built with [Rust](https://www.rust-lang.org/) and [Cargo](https://doc.rust-lang.org/cargo/).

- `src/main.rs`: Entry point for the application.
- `src/lib.rs`: Library exports for the gamey engine.
- `src/bot/`: Bot implementation and registry.
- `src/core/`: Core game logic including actions, coordinates, game state, and player management.
- `src/notation/`: Game notation support (YEN, YGN).
- `src/web/`: Web interface components.
- `Cargo.toml`: Project manifest with dependencies and metadata.
- `Dockerfile`: Defines the Docker image for the gamey service.

## Running the Project

You can run this project using Docker (recommended) or locally without Docker.

### With Docker

This is the easiest way to get the project running. You need to have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.

1. **Build and run the containers:**
    From the root directory of the project, run:

```bash
docker compose up --build
```

This command will build and start all services: webapp, gateway, authservice, userservice, game, gamey, friends, and MongoDB.

2.**Access the application (default compose):**
- Web application: `https://localhost` (self-signed cert)
- Gateway API: `https://localhost:8000`
- API Documentation (Swagger UI): `https://localhost:8000/api-doc/`

3. **Local ports + HTTP gateway (recommended for load tests):**

```bash
docker compose --env-file .env.local up --build
```

- Web application: `https://localhost:8443`
- Gateway API: `http://localhost:8000`
- API Documentation (Swagger UI): `http://localhost:8000/api-doc/`

Load testing (Gatling): see `webapp/load-tests/README.md`.
Monitoring (Prometheus + Grafana): see `gateway/monitoring/README.md`.

### Without Docker

To run the project locally without Docker, you will need to run each component in a separate terminal.

#### Quick start (Windows only)

On Windows, you can launch all microservices at once using the provided batch script from the root directory:

```bat
launch_services.bat
```

This opens a separate terminal window for each service (webapp, gateway, game, gamey, authservice, userservice, and friends) and installs dependencies automatically.


#### Prerequisites

* [Node.js](https://nodejs.org/) and npm installed.

#### 1. Running the User Service

Navigate to the `users/userservice` directory:

```bash
cd users/userservice
```

Install dependencies:

```bash
npm install
```

Run the service:

```bash
npm start
```

The user service will be available at `http://localhost:8001`.

#### 2. Running the Web Application

Navigate to the `webapp` directory:

```bash
cd webapp
```

Install dependencies:

```bash
npm install
```

Run the application:

```bash
npm run dev
```

The web application will be available at `http://localhost:5173`.

#### 3. Running the GameY application

Navigate to the `gamey` directory and run:

```bash
cd gamey
cargo run
```

The GameY engine will be available at `http://localhost:4000`.

## Available Scripts

Each component has its own set of scripts defined in its `package.json`. Here are some of the most important ones:

### Webapp (`webapp/package.json`)

- `npm run dev`: Starts the development server for the webapp.
- `npm test`: Runs the unit tests.
- `npm run test:e2e`: Runs the end-to-end tests.
- `npm run start:all`: A convenience script to start the webapp and all backend microservices concurrently.

### Auth Service (`users/authservice/package.json`)

- `npm start`: Starts the auth service.
- `npm test`: Runs the tests with coverage.

### User Service (`users/userservice/package.json`)

- `npm start`: Starts the user service.
- `npm test`: Runs the tests with coverage.

### Gateway (`gateway/package.json`)

- `npm start`: Starts the gateway service (HTTP).
- `npm run start:https`: Starts the gateway with HTTPS enabled.
- `npm test`: Runs the tests with coverage.

### Game Service (`game/package.json`)

- `npm start`: Starts the game service.
- `npm test`: Runs the tests.
- `npm run test:coverage`: Runs the tests with coverage report.

### Friends Service (`friends/package.json`)

- `npm start`: Starts the friends service.
- `npm test`: Runs the tests with coverage.

### Gamey (`gamey/Cargo.toml`)

- `cargo build`: Builds the gamey application.
- `cargo test`: Runs the unit tests.
- `cargo run`: Runs the gamey application.
- `cargo doc`: Generates documentation for the GameY engine application
- `cargo check`: Check that it compiles.
- `cargo add <list_of_dependencies>`: Add dependencies in <list_of_dependencies>.

### Rust
- `rustup docs`: Opens the Rust documentation in local.
