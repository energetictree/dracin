# Docker Compose Setup for Dracin

This setup uses **volumes** to mount the source code into the container instead of copying files into the Docker image. This enables:

- **Hot reload** during development
- **No rebuild required** when code changes
- **Persistent dependencies** via named volumes

## Project Structure

```
dracin/
├── app/                    # React + Vite + TypeScript application
│   ├── src/               # Source code
│   ├── package.json       # Dependencies
│   └── ...
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Development image
├── Dockerfile.prod        # Production image
└── .dockerignore          # Files to exclude from Docker context
```

## Quick Start

### Development Mode (with Hot Reload)

```bash
# Start the development server
docker compose up dracin-app

# Or run in detached mode
docker compose up -d dracin-app
```

The app will be available at: **http://localhost:5173**

Any changes you make to the source code in `app/src/` will be immediately reflected in the browser.

### Production Mode

```bash
# Start the production build and preview
docker compose --profile prod up dracin-app-prod

# Or run in detached mode
docker compose --profile prod up -d dracin-app-prod
```

The app will be available at: **http://localhost:4173**

## How Volumes Work

### Development Service (`dracin-app`)

| Volume | Purpose |
|--------|---------|
| `./app:/app` | Mounts your local source code into the container |
| `node_modules:/app/node_modules` | Persists dependencies in a named volume |

### Production Service (`dracin-app-prod`)

| Volume | Purpose |
|--------|---------|
| `./app:/app` | Mounts source code for building |
| `node_modules_prod:/app/node_modules` | Separate dependency volume for production |

## Useful Commands

```bash
# Build/rebuild the images
docker compose build

# View logs
docker compose logs -f dracin-app

# Stop all services
docker compose down

# Stop and remove volumes (including node_modules)
docker compose down -v

# Execute commands inside the container
docker compose exec dracin-app sh

# Install new dependencies
docker compose exec dracin-app npm install <package-name>

# Run linting
docker compose exec dracin-app npm run lint

# Build for production manually
docker compose exec dracin-app npm run build
```

## Managing Dependencies

Since `node_modules` is stored in a named volume, it won't be affected by your local `node_modules`. To install/update dependencies:

```bash
# Install a new package
docker compose exec dracin-app npm install <package-name>

# Install all dependencies from package.json
docker compose exec dracin-app npm install

# Remove a package
docker compose exec dracin-app npm uninstall <package-name>
```

If you need to reset the node_modules volume:

```bash
docker compose down -v
docker compose up -d dracin-app
```

## Environment Variables

You can create a `.env` file in the project root to customize the setup:

```env
# Custom ports
DEV_PORT=3000
PROD_PORT=8080

# Node environment
NODE_ENV=development
```

Then update `docker-compose.yml` to use these variables if needed.

## Troubleshooting

### Port Already in Use

If port 5173 or 4173 is already in use, modify the `ports` mapping in `docker-compose.yml`:

```yaml
ports:
  - "3000:5173"  # Use port 3000 on your host instead
```

### File Changes Not Detected

The `CHOKIDAR_USEPOLLING=true` environment variable is already set for this purpose. If hot reload still doesn't work:

1. Check that your IDE isn't using "Safe Write"
2. Try increasing the polling interval in `vite.config.ts`:
   ```js
   server: {
     watch: {
       usePolling: true,
       interval: 1000
     }
   }
   ```

### Permission Issues

If you encounter permission issues with `node_modules`:

```bash
# Fix permissions inside the container
docker compose exec dracin-app chown -R node:node /app/node_modules
```

Or run the container as your user (add to docker-compose.yml):

```yaml
user: "${UID}:${GID}"
```

Then run with: `UID=$(id -u) GID=$(id -g) docker compose up`
