# Documentación del Sistema de Autenticación

Este documento detalla la estructura y el funcionamiento del sistema de registro y login implementado en el proyecto. El sistema se divide en un microservicio de backend (`users`) y una aplicación de frontend (`webapp`).

## 1. Estructura del Proyecto

El proyecto sigue una arquitectura de microservicios, organizada de la siguiente manera:

```text
yovi_es4d/
├── users/                # Microservicio de Usuarios (Node.js + Express)
│   ├── config/           # Configuración de base de datos
│   ├── controllers/      # Lógica de negocio (authController.js)
│   ├── models/           # Modelos de datos (User.js - Mongoose)
│   ├── routes/           # Definición de rutas (authRoutes.js)
│   ├── monitoring/       # Configuración de Prometheus y Grafana
│   ├── openapi.yaml      # Documentación API (Swagger/OpenAPI)
│   ├── users-service.js  # Punto de entrada del servicio
│   └── Dockerfile        # Configuración Docker del microservicio
├── webapp/               # Aplicación Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/   # Componentes reutilizables (LoginForm, RegisterForm)
│   │   ├── pages/        # Páginas de la aplicación (LoginPage, RegisterPage)
│   │   ├── services/     # Servicios de comunicación con la API (api.ts, userService.ts)
│   │   ├── App.tsx       # Enrutamiento y estructura principal
│   │   └── App.css       # Estilos globales y de formularios
│   └── Dockerfile        # Configuración Docker del frontend
└── docker-compose.yml    # Orquestación de contenedores (App + DB + Monitoreo)
```

---

## 2. Backend (Microservicio `users`)

El backend proporciona una API RESTful para la gestión de identidades.

### Tecnologías Clave:
- **Express**: Framework web.
- **MongoDB & Mongoose**: Base de datos NoSQL y ODM.
- **Bcryptjs**: Encriptación de contraseñas mediante hashing (salt 10).
- **JSON Web Token (JWT)**: Generación de tokens para sesiones seguras.
- **CORS**: Habilitado para permitir peticiones desde la `webapp`.

### Endpoints Principales:
- `POST /api/users/register`: Crea un nuevo usuario.
  - Body: `{ "username", "email", "password" }`
- `POST /api/users/login`: Autentica al usuario.
  - Soporta el inicio de sesión tanto por **nombre de usuario** como por **email** en el mismo campo.
  - Body: `{ "username", "password" }`
  - Respuesta: Devuelve un objeto con datos del usuario y un `token` JWT.

### Seguridad:
- Las contraseñas se encriptan automáticamente en el modelo `User` antes de guardarse en la base de datos.
- Se ha desactivado el buffering de comandos en Mongoose para fallar rápidamente si la base de datos no está conectada.

---

## 3. Frontend (`webapp`)

Desarrollado con React y TypeScript, enfocado en la mantenibilidad.

### Componentes y Lógica:
- **`api.ts`**: Centraliza las llamadas `fetch`. Maneja errores de conexión (como el "Failed to fetch") con mensajes amigables.
- **`userService.ts`**: Abstracción de las llamadas de autenticación.
- **`RegisterForm.tsx`**: Formulario con validaciones básicas y gestión de estados (loading, error, success).
- **`LoginForm.tsx`**: Formulario versátil que acepta usuario o email.

### Navegación:
- Utiliza `react-router-dom` para gestionar las rutas `/login` y `/register`.
- La ruta raíz (`/`) redirige automáticamente al login.

---

## 4. Infraestructura y Docker

El sistema está preparado para ejecutarse en entornos aislados mediante contenedores.

### Docker Compose:
Levanta tres servicios principales para la funcionalidad de autenticación:
1. **`mongodb`**: Base de datos persistente (volumen `mongo-data`).
2. **`users`**: Expuesto en el puerto `3000`.
3. **`webapp`**: Servido mediante Nginx en el puerto `80`.

### Variables de Entorno:
- `MONGODB_URI`: Dirección de la base de datos.
- `JWT_SECRET`: Clave para firmar los tokens.
- `VITE_API_URL`: (En el build del frontend) URL a la que apunta la `webapp`.

---



