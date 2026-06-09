set dotenv-filename := ".env.docker"

# Start the app
up *args:
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
