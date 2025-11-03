# GEMINI Project Context

## Project Overview

This project contains a master migration script (`migrate-all.js`) for a social media application. The script migrates data from JSON/JSONL files to a SQLite database, including user data, media, and reports. It also handles data verification and backups.

## Building and Running

To run the migration, execute the following command in your terminal:

```bash
node migrate-all.js
```

## Development Conventions

*   The script is written in JavaScript (Node.js).
*   It uses `require` for module imports.
*   The script is organized into a series of sequential steps, each with its own function.
*   Error handling is included, and the script is designed to be resumable.
