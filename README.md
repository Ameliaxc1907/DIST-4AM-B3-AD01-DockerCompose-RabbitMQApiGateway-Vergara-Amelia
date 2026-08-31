# Práctica de Sistemas Distribuidos: Microservicios de Categorías y Vehículos con RabbitMQ y Docker Compose

Este proyecto implementa una arquitectura distribuida basada en microservicios utilizando **.NET 8**, **RabbitMQ** como bus de mensajería asíncrona, **YARP** como API Gateway, **Entity Framework Core** y **Docker Compose**.

---

## 🏗️ Arquitectura del Sistema

El sistema consta de 3 microservicios y RabbitMQ:

1. **`CategoriaApi` (Puerto 5001)**:
   - Administra el catálogo de categorías (`CategoriaDB`).
   - Al registrar una categoría (`POST /api/Categorias`), publica de forma asíncrona el evento en la cola `categoria_creada` de RabbitMQ.
2. **`VehiculoApi` (Puerto 5002)**:
   - Administra el inventario de vehículos (`VehiculoDB`).
   - Posee un servicio en segundo plano (`RabbitMQConsumer`) que escucha la cola `categoria_creada`. Al recibir una nueva categoría, crea automáticamente un registro inicial de vehículo por defecto si aún no existe.
3. **`ApiGateway` (Puerto 5000)**:
   - Puerta de enlace unificada basada en YARP Reverse Proxy.
   - Enruta el tráfico hacia `CategoriaApi` y `VehiculoApi`.
4. **`RabbitMQ` (Puertos 5672 y 15672)**:
   - Broker de mensajería para desacoplamiento y comunicación asíncrona entre microservicios.

---

## 🗄️ Bases de Datos (Separadas)

Las bases de datos están desacopladas:
- **`CategoriaDB`**: Tabla `dbo.Categorias`
- **`VehiculoDB`**: Tabla `dbo.Vehiculos`

### Estructura de Tablas:

#### Tabla `Categorias` (`CategoriaDB`)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `IdCategoria` | `INT IDENTITY(1,1)` | Clave Primaria |
| `Nombre` | `NVARCHAR(100)` | Nombre de la categoría |
| `Descripcion` | `NVARCHAR(250)` | Descripción de la categoría |

#### Tabla `Vehiculos` (`VehiculoDB`)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `IdVehiculo` | `INT IDENTITY(1,1)` | Clave Primaria |
| `IdCategoria` | `INT` | Referencia a la categoría |
| `Marca` | `NVARCHAR(100)` | Marca del vehículo |
| `Modelo` | `NVARCHAR(100)` | Modelo del vehículo |
| `Precio` | `DECIMAL(10,2)` | Precio de venta |
| `Stock` | `INT` | Cantidad en stock |
| `Estado` | `BIT` | Estado activo/inactivo (1 o 0) |

> 💡 *Puedes ejecutar el script `init_databases.sql` en SQL Server Management Studio para crear automáticamente ambas bases de datos con sus tablas y datos de prueba.*

---

## 🐰 Credenciales y Acceso a RabbitMQ

- **URL Panel Web de RabbitMQ**: [http://localhost:15672](http://localhost:15672)
- **Usuario**: `admin`
- **Contraseña**: `admin123`
- **Puerto AMQP (conexión de servicios)**: `5672`
- **Nombre de Cola**: `categoria_creada`

---

## 🚀 Despliegue con Docker Compose

Para construir y levantar todos los servicios en contenedores:

```bash
# 1. Ubicarse en el directorio del proyecto
cd D:\DESCARGAS\DISTRIBUIDAS\practica-vehiculos

# 2. Levantar los contenedores
docker compose up --build -d
```

Para detener los contenedores:
```bash
docker compose down
```

---

## 🌐 URLs de Acceso y Swagger

### A través del ApiGateway (Recomendado):
- **Listar Categorías**: `GET http://localhost:5000/api/Categorias`
- **Crear Categoría**: `POST http://localhost:5000/api/Categorias`
- **Listar Vehículos**: `GET http://localhost:5000/api/Vehiculos`
- **Crear Vehículo**: `POST http://localhost:5000/api/Vehiculos`
- **Vehículos por Categoría**: `GET http://localhost:5000/api/Vehiculos/categoria/{idCategoria}`

### Swagger Directo (Desarrollo / Local):
- **CategoriaApi Swagger**: `http://localhost:5001/swagger`
- **VehiculoApi Swagger**: `http://localhost:5002/swagger`
- **RabbitMQ Management**: `http://localhost:15672`

---

## 📝 Ejemplos de Peticiones (JSON)

### Crear Categoría (`POST /api/Categorias`)
```json
{
  "nombre": "Eléctricos",
  "descripcion": "Vehículos impulsados por energía 100% eléctrica"
}
```
*(Al ejecutar este POST, `CategoriaApi` publicará el evento en RabbitMQ y `VehiculoApi` registrará un vehículo inicial automáticamente).*

### Crear Vehículo (`POST /api/Vehiculos`)
```json
{
  "idCategoria": 1,
  "marca": "Tesla",
  "modelo": "Model 3",
  "precio": 45000.00,
  "stock": 8,
  "estado": true
}
```
