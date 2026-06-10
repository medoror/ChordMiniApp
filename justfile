set dotenv-filename := ".env.docker"

# Verify prerequisites before starting
preflight:
    #!/bin/bash
    set -e
    ok=true
    if ! command -v docker &>/dev/null; then
        echo "ERROR: docker not found — install Docker Desktop or Docker Engine first"
        ok=false
    fi
    if ! docker compose version &>/dev/null 2>&1; then
        echo "ERROR: 'docker compose' (v2 plugin) not found — upgrade Docker or install the Compose plugin"
        ok=false
    fi
    if [ ! -f .env.docker ]; then
        echo "ERROR: .env.docker not found — run: cp .env.docker.example .env.docker and fill in the required keys"
        ok=false
    fi
    if [ "$ok" = false ]; then exit 1; fi
    echo "Preflight OK"

# Start the app
up *args: preflight
    docker compose -f docker/docker-compose.dev.yml --env-file .env.docker up -d {{args}}
    @echo "App running at http://localhost:3000"

# Stop the app (use -f to also wipe the database)
down *flags:
    #!/bin/bash
    if echo "{{flags}}" | grep -q "\-f"; then
        docker compose -f docker/docker-compose.dev.yml down -v
    else
        docker compose -f docker/docker-compose.dev.yml down
    fi
