# Configuration

This document centralizes runtime configuration for Martin-Coder.

## Environment files

- Copy `.env.example` to `.env`.
- Fill provider keys only for services you plan to use.

## Core variables

- `DATABASE_URL`: database connection string for API.
- `SECRET_KEY`: token signing secret.
- `NEXT_PUBLIC_API_URL`: optional frontend override for API host.

## AI providers

Configure only the providers you need:

- Claude (Anthropic)
- OpenAI
- LM Studio
- Ollama

## OAuth integrations

- GitHub OAuth credentials
- Google OAuth credentials (including Drive)

## Notes

For local development through Docker Compose, defaults from `.env.example` are usually enough to start core services.
