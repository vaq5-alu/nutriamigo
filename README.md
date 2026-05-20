# NutrIAmigo

## Descripción del Proyecto
NutrIAmigo es una aplicación web progresiva de gestión nutricional basada en una arquitectura Cliente-Servidor (React + Node.js). Permite a los usuarios registrar sus comidas, llevar un seguimiento de su peso, generar menús y recibir recomendaciones personalizadas mediante Inteligencia Artificial conversacional.

Este proyecto ha sido desarrollado como parte de un Trabajo de Fin de Grado (TFG).

## Arquitectura del Sistema
El sistema sigue una arquitectura de componentes moderna:

- **Capa de Presentación (Frontend)**: Desarrollada en React (usando Vite). Se encarga de la interfaz de usuario, la navegación fluida y la comunicación asíncrona.
- **Capa de Lógica de Negocio (Backend)**: Desarrollada en Node.js con Express. Gestiona las peticiones de la API, la autenticación y la interacción con la Inteligencia Artificial.
- **Capa de Datos (Base de Datos)**: MySQL (gestionada localmente a través de XAMPP). Almacena de forma persistente y relacional la información de usuarios, historial y perfiles.

## Requisitos Previos
- Node.js (v18 o superior)
- XAMPP (u otra distribución que incluya servidor MySQL)
- Navegador web moderno

## Instalación y Configuración

### 1. Base de Datos
1. Inicia el módulo **MySQL** en XAMPP.
2. Abre phpMyAdmin (`http://localhost/phpmyadmin`) o tu cliente MySQL de preferencia.
3. Importa el archivo de estructura que se encuentra en `docs/database.sql` para crear la base de datos `nutriamigo` y sus tablas correspondientes.

### 2. Configuración de Entorno (.env)
Asegúrate de configurar correctamente los archivos `.env` (no incluidos en el repositorio por seguridad):
- **Raíz del proyecto (`/.env`)**: Claves del frontend (si aplica).
- **Backend (`/backend/.env`)**: Credenciales de tu base de datos local y clave de la API de Gemini:
  ```env
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=
  DB_PORT=3306
  DB_NAME=nutriamigo
  GEMINI_API_KEY=tu_clave_de_google_ai_studio
  ```

### 3. Instalación de Dependencias
Abre una terminal en la raíz del proyecto y ejecuta:
```bash
# Instalar dependencias globales y del frontend
npm install

# Instalar dependencias del backend
cd backend
npm install
```

## Ejecución del Proyecto en Local
El proyecto está configurado para levantar ambos servidores simultáneamente gracias a un script concurrente.

1. Asegúrate de tener **MySQL activo** en XAMPP.
2. Abre una terminal en la raíz del proyecto (fuera de la carpeta backend) y ejecuta:
```bash
npm run dev
```
3. La aplicación estará accesible desde tu navegador en **`http://localhost:5173`**.

## Tecnologías Utilizadas
- **Frontend**: React, Vite, TailwindCSS, Recharts.
- **Backend**: Node.js, Express.js.
- **Base de Datos**: MySQL.
- **Seguridad**: JWT (JSON Web Tokens), Bcryptjs.
- **Inteligencia Artificial**: Google Gemini API.
