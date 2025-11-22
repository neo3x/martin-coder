# Manual de Usuario

Guía completa para usar Martin-Coder en la generación de código asistida por IA.

## Tabla de Contenidos

- [Primeros Pasos](#primeros-pasos)
- [Vista General del Panel](#vista-general-del-panel)
- [Interfaz de Chat](#interfaz-de-chat)
- [Gestión de Proyectos](#gestión-de-proyectos)
- [Proveedores de IA](#proveedores-de-ia)
- [Integración con Google Drive](#integración-con-google-drive)
- [Integración con GitHub](#integración-con-github)
- [Plantillas](#plantillas)
- [Plugins](#plugins)
- [Uso del CLI](#uso-del-cli)
- [Atajos de Teclado](#atajos-de-teclado)

---

## Primeros Pasos

### Primer Inicio de Sesión

1. Navega a `http://localhost:3000` en tu navegador
2. Haz clic en "Registrarse" para crear una nueva cuenta
3. Ingresa tu email, nombre de usuario y contraseña
4. Serás redirigido al panel principal

### Inicio Rápido

1. **Crear un Proyecto**: Haz clic en "+ Abrir Proyecto" en la barra lateral
2. **Iniciar un Chat**: Haz clic en "Nuevo Chat" para comenzar una conversación con IA
3. **Hacer Preguntas**: Escribe tu pregunta o solicitud de código
4. **Revisar Código**: La IA generará código con explicaciones
5. **Aplicar Cambios**: Usa las herramientas proporcionadas para aplicar código a tu proyecto

---

## Vista General del Panel

### Barra Lateral

La barra lateral izquierda contiene:

- **Nuevo Chat**: Iniciar una nueva conversación con IA
- **Historial de Chats**: Lista de conversaciones anteriores
- **Proyectos**: Acceder a tus proyectos conectados
- **Integraciones**: Conexiones con Google Drive y GitHub

### Encabezado

El encabezado superior proporciona:

- **Búsqueda**: Búsqueda global en chats y proyectos
- **Notificaciones**: Alertas y actualizaciones del sistema
- **Configuración**: Acceso a preferencias de usuario
- **Perfil**: Gestión de cuenta

---

## Interfaz de Chat

### Iniciar una Conversación

1. Haz clic en "Nuevo Chat" o selecciona un chat existente
2. Escribe tu mensaje en el campo de entrada
3. Presiona Enter o haz clic en Enviar

### Tipos de Mensajes

- **Mensajes de Texto**: Conversación regular con la IA
- **Bloques de Código**: Fragmentos de código con resaltado de sintaxis
- **Llamadas de Herramientas**: Acciones ejecutadas por la IA (lectura/escritura de archivos, búsqueda, etc.)
- **Mensajes del Sistema**: Actualizaciones de estado y notificaciones

### Uso de Herramientas

La IA de Martin-Coder puede usar varias herramientas:

| Herramienta | Descripción | Ejemplo |
|-------------|-------------|---------|
| Leer Archivo | Leer contenido de archivos | "Lee el archivo main.py" |
| Escribir Archivo | Crear o actualizar archivos | "Crea un nuevo archivo de configuración" |
| Buscar Archivos | Buscar archivos | "Encuentra todos los archivos Python" |
| Buscar en Código | Buscar en el código | "Encuentra funciones llamadas 'process'" |
| Terminal | Ejecutar comandos | "Ejecuta las pruebas" |
| Búsqueda Web | Buscar en internet | "Encuentra documentación de FastAPI" |

### Conciencia del Contexto

La IA entiende el contexto de tu proyecto:

- **Árbol de Archivos**: Conoce la estructura de tu proyecto
- **Análisis de Código**: Entiende dependencias e imports
- **Historial Git**: Consciente de cambios recientes
- **Índice RAG**: Busca en tu código de forma semántica

### Mejores Prácticas

1. **Sé Específico**: "Agrega validación de entrada al formulario de login" es mejor que "arregla el formulario"
2. **Proporciona Contexto**: Menciona archivos o características relevantes
3. **Pide Explicaciones**: Solicita comentarios y documentación
4. **Revisa los Cambios**: Siempre revisa el código generado antes de aplicarlo
5. **Itera**: Refina las solicitudes si la primera respuesta no es perfecta

---

## Gestión de Proyectos

### Crear un Proyecto

1. Haz clic en "+ Abrir Proyecto" en la barra lateral
2. Elige un método:
   - **Ruta Local**: Selecciona una carpeta en tu computadora
   - **Clonar Git**: Ingresa una URL de repositorio
   - **Plantilla**: Comienza desde una plantilla de proyecto

### Acciones de Proyecto

| Acción | Descripción |
|--------|-------------|
| Analizar | Escanear estructura y dependencias del proyecto |
| Indexar | Crear índice RAG para búsqueda semántica |
| Sincronizar | Actualizar árbol de archivos y metadatos |
| Configuración | Configurar opciones específicas del proyecto |

### Configuración del Proyecto

- **Nombre**: Nombre visible del proyecto
- **Descripción**: Descripción del proyecto
- **Proveedor de IA**: Modelo de IA preferido para este proyecto
- **Auto-Indexar**: Actualizar automáticamente el índice de búsqueda
- **Patrones de Archivos**: Patrones de archivos a incluir/excluir

---

## Proveedores de IA

### Proveedores Disponibles

| Proveedor | Modelos | Mejor Para |
|-----------|---------|------------|
| Anthropic (Claude) | Claude 3.5 Sonnet, Claude 3 Opus | Razonamiento complejo, contexto largo |
| OpenAI | GPT-4, GPT-4 Turbo, GPT-3.5 | Tareas de código generales |
| LM Studio | Modelos locales | Privacidad, uso offline |
| Ollama | Modelos locales | Privacidad, uso offline |

### Configurar Proveedores

1. Ve a Configuración > Proveedores de IA
2. Ingresa tu clave API para proveedores en la nube
3. Para proveedores locales, asegúrate de que el servidor esté corriendo
4. Selecciona tu proveedor y modelo predeterminados

### Cambiar Proveedores

Puedes cambiar proveedores por chat:

1. Abre un chat
2. Haz clic en el selector de modelo en el encabezado
3. Elige un proveedor/modelo diferente
4. Los nuevos mensajes usarán el modelo seleccionado

### Consideraciones de Costo

- **Proveedores en la Nube**: Cobran por token (entrada + salida)
- **Modelos Locales**: Gratis pero requieren recursos de hardware
- **Recomendación**: Usa modelos locales para exploración, nube para tareas complejas

---

## Integración con Google Drive

### Conectar tu Drive

1. Navega a la sección Drive en la barra lateral
2. Haz clic en "Conectar Google Drive"
3. Inicia sesión con tu cuenta de Google
4. Otorga los permisos solicitados

### Características

- **Explorar Archivos**: Navega las carpetas de tu Drive
- **Búsqueda**: Encuentra archivos por nombre o contenido
- **Descargar**: Descarga archivos a tu proyecto
- **Sincronizar**: Mantén carpetas sincronizadas

### Casos de Uso

- **Respaldo de Proyectos**: Sincroniza tu código con Drive
- **Colaboración**: Accede a archivos compartidos
- **Documentación**: Importa especificaciones y requisitos
- **Recursos**: Gestiona imágenes y recursos

### Seguridad

- Solo se usan los permisos solicitados
- Los tokens se encriptan en reposo
- Puedes revocar el acceso en cualquier momento desde la configuración de Google

---

## Integración con GitHub

### Conectar GitHub

1. Ve a Configuración > Integraciones
2. Haz clic en "Conectar GitHub"
3. Autoriza Martin-Coder
4. Selecciona los repositorios a acceder

### Características

- **Clonar Repositorios**: Importa proyectos desde GitHub
- **Push de Cambios**: Commit y push desde la UI
- **Pull Requests**: Crea y revisa PRs
- **Issues**: Ve y gestiona issues
- **Actions**: Monitorea el estado de workflows

### Permisos OAuth

Martin-Coder solicita:

- `repo`: Acceso completo a repositorios
- `read:user`: Leer perfil de usuario
- `user:email`: Acceder a direcciones de email

---

## Plantillas

### Usar Plantillas

1. Haz clic en "Nuevo Proyecto" > "Desde Plantilla"
2. Explora las plantillas disponibles
3. Selecciona una plantilla y personaliza
4. Haz clic en "Crear Proyecto"

### Plantillas Disponibles

| Plantilla | Descripción |
|-----------|-------------|
| FastAPI Backend | API REST Python con autenticación |
| Next.js App | Frontend React con App Router |
| Full Stack | Frontend y backend combinados |
| CLI Tool | Aplicación de línea de comandos Python |
| MCP Server | Servidor Model Context Protocol |

### Crear Plantillas Personalizadas

1. Crea una carpeta `templates/` en tu configuración
2. Agrega un manifiesto `template.json`:

```json
{
  "name": "Mi Plantilla",
  "description": "Plantilla de proyecto personalizada",
  "variables": {
    "project_name": "string",
    "author": "string"
  }
}
```

3. Agrega archivos de plantilla con marcadores Jinja2

---

## Plugins

### Sistema de Plugins

Martin-Coder soporta plugins que extienden la funcionalidad:

- **Herramientas**: Agregar nuevas herramientas de IA
- **Proveedores**: Agregar integraciones de proveedores de IA
- **Hooks**: Ejecutar código en eventos
- **Comandos**: Agregar comandos CLI

### Instalar Plugins

```bash
# Vía CLI
martin-coder plugin install <nombre-plugin>

# Vía API
POST /api/v1/plugins/install
```

### Gestionar Plugins

1. Ve a Configuración > Plugins
2. Ve los plugins instalados
3. Habilita/deshabilita según necesites
4. Configura los ajustes del plugin

---

## Uso del CLI

### Comandos Básicos

```bash
# Iniciar una sesión de chat
martin-coder chat

# Abrir un proyecto
martin-coder project open /ruta/al/proyecto

# Enviar un mensaje
martin-coder chat send "Explica este código"

# Listar chats
martin-coder chat list

# Obtener respuesta de IA
martin-coder ask "¿Cómo implemento autenticación?"
```

### Modo Interactivo

```bash
# Iniciar sesión interactiva
martin-coder

# En modo interactivo:
> /help          # Mostrar ayuda
> /project       # Comandos de proyecto
> /chat          # Comandos de chat
> /settings      # Configuración
> /exit          # Salir
```

### Configuración

```bash
# Establecer clave API
martin-coder config set ANTHROPIC_API_KEY sk-ant-...

# Establecer modelo predeterminado
martin-coder config set DEFAULT_MODEL claude-3-5-sonnet

# Ver configuración
martin-coder config show
```

---

## Atajos de Teclado

### Globales

| Atajo | Acción |
|-------|--------|
| `Ctrl+K` | Abrir paleta de comandos |
| `Ctrl+/` | Alternar barra lateral |
| `Ctrl+N` | Nuevo chat |
| `Ctrl+P` | Cambio rápido de proyecto |
| `Ctrl+,` | Abrir configuración |

### Chat

| Atajo | Acción |
|-------|--------|
| `Enter` | Enviar mensaje |
| `Shift+Enter` | Nueva línea en mensaje |
| `Ctrl+Shift+C` | Copiar última respuesta |
| `Ctrl+Z` | Deshacer última acción |
| `Escape` | Cancelar acción actual |

### Editor

| Atajo | Acción |
|-------|--------|
| `Ctrl+S` | Guardar archivo |
| `Ctrl+F` | Buscar en archivo |
| `Ctrl+Shift+F` | Buscar en proyecto |
| `Ctrl+G` | Ir a línea |
| `Ctrl+D` | Seleccionar siguiente ocurrencia |

---

## Consejos y Trucos

### Prompts Efectivos

1. **Comienza con Contexto**: "En mi proyecto FastAPI con SQLAlchemy..."
2. **Sé Específico**: "Agrega paginación al endpoint GET /users"
3. **Solicita Formato**: "Responde solo con el código, sin explicaciones"
4. **Pide Tests**: "Incluye pruebas unitarias para esta función"

### Rendimiento

1. **Indexa tu Proyecto**: Búsqueda semántica más rápida
2. **Usa Modelos Locales**: Para código sensible
3. **Operaciones por Lotes**: Agrupa cambios relacionados
4. **Limpia Chats Antiguos**: Reduce el tamaño del contexto

### Seguridad

1. **Revisa el Código Generado**: Nunca apliques cambios a ciegas
2. **Verifica Dependencias**: Verifica los paquetes sugeridos
3. **Protege Secretos**: Nunca pegues claves API en el chat
4. **Usa .gitignore**: Excluye archivos sensibles
