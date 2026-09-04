# Memoria sanitizada de comandos Azure

Registro reproducible del despliegue final de la práctica. Los nombres de recursos y URLs públicas no son secretos. Todos los valores sensibles fueron sustituidos por placeholders `<...>`.

Los recursos deben permanecer disponibles, como mínimo, hasta el domingo 13/09/2026. El comando de eliminación del final es únicamente para después de la revisión.

## 1. Login y verificación

```powershell
az login
az account set --subscription "<AZURE_SUBSCRIPTION_ID>"
az account show
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
az extension add --name containerapp --upgrade
```

## 2. Resource Group

```powershell
az group create `
  --name "rg-practica-vehiculos" `
  --location "centralus"
```

## 3. Azure Container Registry

```powershell
az acr create `
  --resource-group "rg-practica-vehiculos" `
  --name "acrvehiculosame2026" `
  --sku Basic

az acr login --name "acrvehiculosame2026"
```

## 4. Imágenes

Ejecutados desde la raíz del proyecto:

```powershell
docker build -t "acrvehiculosame2026.azurecr.io/oauthjwt:latest" .\OAuthJWT\OAuthJWT
docker push "acrvehiculosame2026.azurecr.io/oauthjwt:latest"

docker build -t "acrvehiculosame2026.azurecr.io/categoria:latest" .\CategoriaApi\CategoriaApi
docker push "acrvehiculosame2026.azurecr.io/categoria:latest"

docker build -t "acrvehiculosame2026.azurecr.io/vehiculo:latest" .\VehiculoApi\VehiculoApi
docker push "acrvehiculosame2026.azurecr.io/vehiculo:latest"

docker build -t "acrvehiculosame2026.azurecr.io/apigateway:latest" .\ApiGateway\ApiGateway
docker push "acrvehiculosame2026.azurecr.io/apigateway:latest"

docker build `
  --build-arg "VITE_API_URL=https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io" `
  -t "acrvehiculosame2026.azurecr.io/frontend:latest" `
  .\Frontend

docker push "acrvehiculosame2026.azurecr.io/frontend:latest"
```

## 5. Azure SQL

La oferta gratuita y la configuración del servidor se seleccionaron al crear `VehiculosDB`. Los valores de autenticación se mantienen fuera de este archivo.

Inicialización del esquema desde Windows; `sqlcmd` solicita la contraseña porque no se incluye `-P`:

```powershell
sqlcmd `
  -S "tcp:sql-vehiculos-ame2026-central.database.windows.net,1433" `
  -d "VehiculosDB" `
  -U "<AZURE_SQL_USER>" `
  -N `
  -b `
  -i ".\init_databases.azure.sql"
```

Cadena utilizada como secreto de Container Apps:

```text
Server=tcp:sql-vehiculos-ame2026-central.database.windows.net,1433;Initial Catalog=VehiculosDB;User ID=<AZURE_SQL_USER>;Password=<AZURE_SQL_PASSWORD>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

## 6. Container Apps

### Environment

```powershell
az containerapp env create `
  --name "env-practica-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --location "centralus"
```

### RabbitMQ

```powershell
az containerapp create `
  --name "rabbitmq-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --environment "env-practica-vehiculos" `
  --image "rabbitmq:4-management" `
  --ingress internal `
  --transport tcp `
  --target-port 5672 `
  --exposed-port 5672 `
  --min-replicas 1 `
  --max-replicas 1 `
  --secrets "rabbitmq-password=<RABBITMQ_PASSWORD>" `
  --env-vars `
    "RABBITMQ_DEFAULT_USER=<RABBITMQ_USER>" `
    "RABBITMQ_DEFAULT_PASS=secretref:rabbitmq-password"
```

### OAuthJWT

```powershell
az containerapp create `
  --name "oauthjwt-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --environment "env-practica-vehiculos" `
  --image "acrvehiculosame2026.azurecr.io/oauthjwt:latest" `
  --registry-server "acrvehiculosame2026.azurecr.io" `
  --registry-username "<ACR_USERNAME>" `
  --registry-password "<ACR_PASSWORD>" `
  --ingress internal `
  --target-port 8080 `
  --secrets `
    "jwt-key=<JWT_KEY>" `
    "admin-password=<AUTH_ADMIN_PASSWORD>" `
    "user-password=<AUTH_USER_PASSWORD>" `
  --env-vars `
    "ASPNETCORE_ENVIRONMENT=Production" `
    "ASPNETCORE_URLS=http://+:8080" `
    "Jwt__Key=secretref:jwt-key" `
    "Jwt__Issuer=OAuthJWT" `
    "Jwt__Audience=PracticaVehiculosApis" `
    "Jwt__ExpireMinutes=60" `
    "Auth__AdminPassword=secretref:admin-password" `
    "Auth__UserPassword=secretref:user-password"
```

### CategoriaApi

```powershell
az containerapp create `
  --name "categoria-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --environment "env-practica-vehiculos" `
  --image "acrvehiculosame2026.azurecr.io/categoria:latest" `
  --registry-server "acrvehiculosame2026.azurecr.io" `
  --registry-username "<ACR_USERNAME>" `
  --registry-password "<ACR_PASSWORD>" `
  --ingress internal `
  --target-port 8080 `
  --secrets `
    "sql-connection=Server=tcp:sql-vehiculos-ame2026-central.database.windows.net,1433;Initial Catalog=VehiculosDB;User ID=<AZURE_SQL_USER>;Password=<AZURE_SQL_PASSWORD>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;" `
    "jwt-key=<JWT_KEY>" `
    "rabbitmq-password=<RABBITMQ_PASSWORD>" `
  --env-vars `
    "ASPNETCORE_ENVIRONMENT=Production" `
    "ASPNETCORE_URLS=http://+:8080" `
    "ConnectionStrings__CategoriasConnection=secretref:sql-connection" `
    "Jwt__Key=secretref:jwt-key" `
    "Jwt__Issuer=OAuthJWT" `
    "Jwt__Audience=PracticaVehiculosApis" `
    "RabbitMQ__HostName=rabbitmq-vehiculos" `
    "RabbitMQ__Port=5672" `
    "RabbitMQ__UserName=<RABBITMQ_USER>" `
    "RabbitMQ__Password=secretref:rabbitmq-password" `
    "RabbitMQ__QueueName=categoria_creada"
```

### VehiculoApi

```powershell
az containerapp create `
  --name "vehiculo-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --environment "env-practica-vehiculos" `
  --image "acrvehiculosame2026.azurecr.io/vehiculo:latest" `
  --registry-server "acrvehiculosame2026.azurecr.io" `
  --registry-username "<ACR_USERNAME>" `
  --registry-password "<ACR_PASSWORD>" `
  --ingress internal `
  --target-port 8080 `
  --min-replicas 1 `
  --secrets `
    "sql-connection=Server=tcp:sql-vehiculos-ame2026-central.database.windows.net,1433;Initial Catalog=VehiculosDB;User ID=<AZURE_SQL_USER>;Password=<AZURE_SQL_PASSWORD>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;" `
    "jwt-key=<JWT_KEY>" `
    "rabbitmq-password=<RABBITMQ_PASSWORD>" `
  --env-vars `
    "ASPNETCORE_ENVIRONMENT=Production" `
    "ASPNETCORE_URLS=http://+:8080" `
    "ConnectionStrings__VehiculosConnection=secretref:sql-connection" `
    "Jwt__Key=secretref:jwt-key" `
    "Jwt__Issuer=OAuthJWT" `
    "Jwt__Audience=PracticaVehiculosApis" `
    "RabbitMQ__HostName=rabbitmq-vehiculos" `
    "RabbitMQ__Port=5672" `
    "RabbitMQ__UserName=<RABBITMQ_USER>" `
    "RabbitMQ__Password=secretref:rabbitmq-password" `
    "RabbitMQ__QueueName=categoria_creada"
```

### API Gateway

```powershell
az containerapp create `
  --name "gateway-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --environment "env-practica-vehiculos" `
  --image "acrvehiculosame2026.azurecr.io/apigateway:latest" `
  --registry-server "acrvehiculosame2026.azurecr.io" `
  --registry-username "<ACR_USERNAME>" `
  --registry-password "<ACR_PASSWORD>" `
  --ingress external `
  --target-port 8080 `
  --env-vars `
    "ASPNETCORE_ENVIRONMENT=Production" `
    "ASPNETCORE_URLS=http://+:8080" `
    "ReverseProxy__Clusters__oauthJwtCluster__Destinations__oauthJwtDestination__Address=http://oauthjwt-vehiculos/" `
    "ReverseProxy__Clusters__categoriasCluster__Destinations__categoriasDestination__Address=http://categoria-vehiculos/" `
    "ReverseProxy__Clusters__vehiculosCluster__Destinations__vehiculosDestination__Address=http://vehiculo-vehiculos/" `
    "Cors__AllowedOrigins__0=https://frontend-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io" `
    "Cors__AllowedOrigins__1=https://frontend-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io"
```

### Frontend

```powershell
az containerapp create `
  --name "frontend-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --environment "env-practica-vehiculos" `
  --image "acrvehiculosame2026.azurecr.io/frontend:latest" `
  --registry-server "acrvehiculosame2026.azurecr.io" `
  --registry-username "<ACR_USERNAME>" `
  --registry-password "<ACR_PASSWORD>" `
  --ingress external `
  --target-port 80
```

Después de conocer el FQDN público del frontend, se confirmó CORS en el Gateway:

```powershell
az containerapp update `
  --name "gateway-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --set-env-vars `
    "Cors__AllowedOrigins__0=https://frontend-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io" `
    "Cors__AllowedOrigins__1=https://frontend-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io"
```

## 7. Variables y secretos

Las variables de entorno y los secretos quedaron configurados en los comandos `az containerapp create` anteriores mediante `--env-vars` y `--secrets`. Todos los valores sensibles de esta memoria usan placeholders: `<AZURE_SQL_USER>`, `<AZURE_SQL_PASSWORD>`, `<JWT_KEY>`, `<AUTH_ADMIN_PASSWORD>`, `<AUTH_USER_PASSWORD>`, `<RABBITMQ_USER>`, `<RABBITMQ_PASSWORD>`, `<ACR_USERNAME>` y `<ACR_PASSWORD>`.

Para verificar los nombres configurados sin mostrar sus valores:

```powershell
az containerapp show `
  --name "categoria-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "properties.template.containers[0].env[].name" `
  --output table
```

## 8. Pruebas

```powershell
$loginBody = @{
  usuario = "admin"
  password = "<AUTH_ADMIN_PASSWORD>"
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Uri "https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io/api/Auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body $loginBody

$headers = @{ Authorization = "Bearer $($login.token)" }

Invoke-RestMethod -Uri "https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io/api/Categorias" -Headers $headers
Invoke-RestMethod -Uri "https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io/api/Vehiculos" -Headers $headers

$categoria = @{
  nombre = "Prueba RabbitMQ"
  descripcion = "Categoría creada para comprobar productor y consumidor"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io/api/Categorias" `
  -Method Post `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $categoria

az containerapp list `
  --resource-group "rg-practica-vehiculos" `
  --query "[].{Nombre:name,Estado:properties.runningStatus,URL:properties.configuration.ingress.fqdn}" `
  --output table
```

Resultados comprobados:

- Login JWT: `200 OK`.
- Endpoint protegido sin token: `401 Unauthorized`.
- Endpoints con token: `200 OK`.
- Lectura y creación en Azure SQL.
- Publicación de `categoria_creada`.
- Consumo del evento y creación del vehículo `Sin asignar`.
- Frontend y API Gateway accesibles mediante sus URLs públicas.

## 9. Eliminación después de la revisión

**No ejecutar antes del domingo 13/09/2026 ni antes de que finalice la revisión.** Después de esa fecha y de la aprobación de la práctica, el Resource Group completo puede eliminarse con:

```powershell
az group delete `
    --name rg-practica-vehiculos `
    --yes `
    --no-wait
```
