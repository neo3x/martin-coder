# Configuración

Este documento centraliza la configuración de ejecución de Martin-Coder.

## Archivos de entorno

- Copia `.env.example` a `.env`.
- Completa las claves sólo de los servicios que vayas a usar.

## Variables principales

- `DATABASE_URL`: cadena de conexión de base de datos para la API.
- `SECRET_KEY`: secreto de firmado de tokens.
- `NEXT_PUBLIC_API_URL`: override opcional del host de API para frontend.

## Proveedores de IA

Configura únicamente los proveedores necesarios:

- Claude (Anthropic)
- OpenAI
- LM Studio
- Ollama

## Integraciones OAuth

- Credenciales OAuth de GitHub
- Credenciales OAuth de Google (incluye Drive)

## Notas

Para desarrollo local con Docker Compose, los valores por defecto de `.env.example` suelen ser suficientes para iniciar los servicios principales.
