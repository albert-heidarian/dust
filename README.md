# Dust Backend Server

A simple Node.js/Express backend server that serves the static Dust website and provides API endpoints with offline data support.

## Features

- Serves static files from the `dust.tt` directory
- Automatic image downloading from live dust.tt site for missing files
- CORS enabled for cross-origin requests
- Basic API endpoints for data management
- Offline data support with JSON file storage

## Installation

```bash
npm install
```

## Usage

Start the development server:
```bash
npm run dev
```

The server will run on `http://localhost:3005`

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/data` - Sample data endpoint
- `GET /api/offline-data` - Reads data from `offline-data.json`
- `POST /api/data` - Saves data to the offline data file
- `GET /_next/image` - Handles Next.js image optimization requests

## Offline Data

The server uses `offline-data.json` for offline data storage. You can modify this file to add your own data structure.

## GitHub Actions

The project includes a GitHub Actions workflow that:
- Checks out the code
- Sets up Node.js environment
- Installs dependencies
- Runs the server in background
- Performs health checks
- Stops the server after testing

## Development

To modify the server behavior, edit `server.js`. The server automatically downloads missing images from the live dust.tt website and caches them locally.