# Guía de Demo de Martin-Coder

Esta guía explica cómo configurar y ejecutar la demo de Martin-Coder para mostrar sus funcionalidades.

## Inicio Rápido

### Demo con Un Solo Comando

```bash
# Ejecutar configuración de demo e iniciar
./scripts/start-demo.sh
```

Esto hará:
1. Configurar el entorno de demo
2. Crear proyectos y datos de ejemplo
3. Iniciar el backend y frontend
4. Abrir la demo en tu navegador

### Configuración Manual

```bash
# 1. Ejecutar el script de configuración
python scripts/setup-demo.py

# 2. Iniciar el backend
cd apps/api
uvicorn app.main:app --reload --port 8000

# 3. Iniciar el frontend (nueva terminal)
cd apps/web
npm run dev
```

## Credenciales de Demo

| Campo | Valor |
|-------|-------|
| Email | demo@martin-coder.com |
| Contraseña | demo123 |

## Funcionalidades de Demo

### 1. Interfaz de Chat con IA

La interfaz de chat demuestra:

- **Respuestas de IA en tiempo real** con texto en streaming
- **Generación de código** con resaltado de sintaxis
- **Conversaciones multi-turno** con conciencia de contexto
- **Integración de herramientas** para operaciones de archivos

**Escenarios de Demo:**
- Pregunta "Crea una API REST para gestión de usuarios"
- Pregunta "Explica cómo funciona la autenticación"
- Pregunta "Arregla el bug en mi código"
- Pregunta "Optimiza esta consulta de base de datos"

### 2. Gestión de Proyectos

Proyectos de demo precargados:

| Proyecto | Descripción | Lenguaje |
|----------|-------------|----------|
| fastapi-demo | API REST con operaciones CRUD | Python |
| react-dashboard | Dashboard de estadísticas | TypeScript |
| cli-tool | Herramienta de línea de comandos con UI Rich | Python |

**Funcionalidades a demostrar:**
- Explorar archivos del proyecto
- Analizar estructura del proyecto
- Buscar dentro del código
- Ver dependencias

### 3. Soporte Multi-LLM

Mostrar cambio de proveedor:

1. Clic en el selector de proveedor en el header
2. Elegir entre:
   - Claude (Anthropic)
   - OpenAI (GPT-4)
   - LM Studio (Local)
   - Ollama (Local)
3. El modo demo funciona sin claves API

### 4. Integración con Google Drive

Demostrar funcionalidades de almacenamiento en la nube:

1. Navegar a **Integraciones > Google Drive**
2. Mostrar flujo de conexión
3. Explorar archivos y carpetas
4. Capacidades de descarga/sincronización

### 5. Integración con GitHub

Mostrar funcionalidades de control de versiones:

1. Flujo de conexión OAuth
2. Exploración de repositorios
3. Historial de commits
4. Creación de pull requests

### 6. Internacionalización

Demostrar cambio de idioma:

1. Clic en el selector de idioma (icono de bandera)
2. Cambiar entre Inglés y Español
3. Todos los elementos de UI se actualizan inmediatamente
4. La preferencia se guarda automáticamente

## Script de Presentación de Demo

### Introducción (2 min)

> "Martin-Coder es una plataforma de generación de código potenciada por IA que combina múltiples proveedores de LLM con poderosas herramientas de desarrollo."

**Puntos Clave:**
- Soporte multi-LLM (Claude, OpenAI, modelos locales)
- Interfaz web completa
- CLI para usuarios de terminal
- Búsqueda de código potenciada por RAG
- Extensibilidad mediante plugins

### Demo de Funcionalidades (10 min)

#### Demo de Chat (3 min)

1. Crear un nuevo chat
2. Escribir: "Crea un endpoint FastAPI para autenticación de usuarios con JWT"
3. Mostrar respuesta en streaming
4. Resaltar calidad de generación de código
5. Mostrar uso de herramientas (lectura/escritura de archivos)

#### Demo de Proyectos (3 min)

1. Abrir el proyecto fastapi-demo
2. Mostrar navegación del árbol de archivos
3. Clic en main.py para ver el código
4. Mostrar análisis del proyecto
5. Demostrar búsqueda de código

#### Demo de Integraciones (2 min)

1. Mostrar panel de Google Drive
2. Mostrar integración con GitHub
3. Explicar flujo OAuth

#### Demo de Configuración (2 min)

1. Mostrar cambio de idioma
2. Mostrar configuración de proveedores
3. Mostrar opciones de tema

### Preparación para Preguntas y Respuestas

**Preguntas Comunes:**

P: "¿Funciona sin conexión?"
R: "¡Sí! Con LM Studio u Ollama, puedes ejecutar completamente offline con modelos locales."

P: "¿Qué modelos de IA soporta?"
R: "Claude 3.5 Sonnet, GPT-4, GPT-4 Turbo, más cualquier modelo local compatible con OpenAI."

P: "¿Cómo funciona el sistema RAG?"
R: "Usamos ChromaDB para indexar tu código, permitiendo búsqueda semántica en todos los archivos."

P: "¿Es seguro?"
R: "El código nunca sale de tu máquina con modelos locales. Las llamadas a API en la nube están encriptadas."

P: "¿Puedo agregar herramientas personalizadas?"
R: "¡Sí! El sistema de plugins permite herramientas, proveedores y hooks personalizados."

## Solución de Problemas de Demo

### El backend no inicia

```bash
# Verificar versión de Python
python --version  # Debe ser 3.11+

# Instalar dependencias
cd apps/api
pip install -r requirements.txt
```

### El frontend no inicia

```bash
# Verificar versión de Node
node --version  # Debe ser 20+

# Reinstalar dependencias
cd apps/web
rm -rf node_modules
npm install
```

### Faltan datos de demo

```bash
# Re-ejecutar configuración
python scripts/setup-demo.py
```

### Conflictos de puertos

```bash
# Cambiar puerto del backend
uvicorn app.main:app --port 8001

# Cambiar puerto del frontend
npm run dev -- --port 3001
```

## Entorno de Demo

### Archivos Creados

```
demo_data/
├── martin_coder_demo.db    # Base de datos SQLite
├── projects/               # Proyectos de ejemplo
│   ├── fastapi-demo/
│   ├── react-dashboard/
│   └── cli-tool/
├── demo_chats.json         # Historial de chat de ejemplo
└── uploads/                # Almacenamiento de archivos subidos
```

### Variables de Entorno

```env
DEMO_MODE=true              # Habilita funcionalidades de demo
DEBUG=true                  # Logging detallado
DATABASE_URL=sqlite:///./demo_data/martin_coder_demo.db
DEFAULT_AI_PROVIDER=demo    # Usa respuestas de IA simuladas
```

## Grabación de Video de Demo

### Configuración Recomendada

- Resolución: 1920x1080
- Navegador: Chrome (modo oscuro)
- Terminal: Terminal integrada de VS Code
- Tamaño de fuente: 16px mínimo

### Estructura del Video

1. **Intro** (30s) - Logo, eslogan
2. **Vista General** (1m) - Tour del dashboard
3. **Demo de Chat** (3m) - Interacción con IA
4. **Proyectos** (2m) - Gestión de archivos
5. **Integraciones** (1m) - Google Drive, GitHub
6. **CLI** (1m) - Uso en terminal
7. **Cierre** (30s) - Llamada a la acción

## Lista de Verificación para Demo en Vivo

- [ ] Entorno de demo configurado
- [ ] Todos los servicios ejecutándose
- [ ] Credenciales de demo listas
- [ ] Proyectos de ejemplo cargados
- [ ] Conexión de red estable
- [ ] Diapositivas de respaldo preparadas
- [ ] Respuestas de Q&A revisadas
