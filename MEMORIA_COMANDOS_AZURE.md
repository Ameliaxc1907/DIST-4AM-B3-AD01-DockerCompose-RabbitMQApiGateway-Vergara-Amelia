# Memoria sanitizada de comandos Azure

Registro reproducible del despliegue final de la práctica. Los nombres de recursos y URLs públicas no son secretos. Todos los valores sensibles fueron sustituidos por placeholders `<...>`.

## 1. Variables de trabajo

```powershell
$subscription = "<AZURE_SUBSCRIPTION_ID>"
$resourceGroup = "rg-practica-vehiculos"
$location = "centralus"
$acrName = "acrvehiculosame2026"
$acrServer = "acrvehiculosame2026.azurecr.io"
$sqlServer = "sql-vehiculos-ame2026-central"
$sqlDatabase = "VehiculosDB"
$containerEnvironment = "env-practica-vehiculos"
$gatewayUrl = "https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io"
$frontendUrl = "https://frontend-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io"
```

## 2. Sesión, proveedores y extensión

```powershell
az login
az account set --subscription $subscription
az account show
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
az extension add --name containerapp --upgrade
```

## 3. Resource Group y Azure Container Registry

```powershell
az group create `
  --name $resourceGroup `
  --location $location

az acr create `
  --resource-group $resourceGroup `
  --name $acrName `
  --sku Basic

az acr login --name $acrName
```

## 4. Construcción y publicación de imágenes

Ejecutados desde la raíz del proyecto:

```powershell
docker build -t "$acrServer/oauthjwt:latest" .\OAuthJWT\OAuthJWT
docker push "$acrServer/oauthjwt:latest"

docker build -t "$acrServer/categoria:latest" .\CategoriaApi\CategoriaApi
docker push "$acrServer/categoria:latest"

docker build -t "$acrServer/vehiculo:latest" .\VehiculoApi\VehiculoApi
docker push "$acrServer/vehiculo:latest"

docker build -t "$acrServer/apigateway:latest" .\ApiGateway\ApiGateway
docker push "$acrServer/apigateway:latest"

docker build `
  --build-arg "VITE_API_URL=$gatewayUrl" `
  -t "$acrServer/frontend:latest" `
  .\Frontend

docker push "$acrServer/frontend:latest"
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

## 6. Container Apps Environment

```powershell
az containerapp env create `
  --name $containerEnvironment `
  --resource-group $resourceGroup `
  --location $location
```

Variables sanitizadas empleadas en los comandos siguientes:

```powershell
$acrUsername = "<ACR_USERNAME>"
$acrPassword = "<ACR_PASSWORD>"
$sqlConnection = "Server=tcp:sql-vehiculos-ame2026-central.database.windows.net,1433;Initial Catalog=VehiculosDB;User ID=<AZURE_SQL_USER>;Password=<AZURE_SQL_PASSWORD>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
```

## 7. RabbitMQ

```powershell
az containerapp create `
  --name "rabbitmq-vehiculos" `
  --resource-group $resourceGroup `
  --environment $containerEnvironment `
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

## 8. OAuthJWT

```powershell
az containerapp create `
  --name "oauthjwt-vehiculos" `
  --resource-group $resourceGroup `
  --environment $containerEnvironment `
  --image "$acrServer/oauthjwt:latest" `
  --registry-server $acrServer `
  --registry-username $acrUsername `
  --registry-password $acrPassword `
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

## 9. CategoriaApi

```powershell
az containerapp create `
  --name "categoria-vehiculos" `
  --resource-group $resourceGroup `
  --environment $containerEnvironment `
  --image "$acrServer/categoria:latest" `
  --registry-server $acrServer `
  --registry-username $acrUsername `
  --registry-password $acrPassword `
  --ingress internal `
  --target-port 8080 `
  --secrets `
    "sql-connection=$sqlConnection" `
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

## 10. VehiculoApi

```powershell
az containerapp create `
  --name "vehiculo-vehiculos" `
  --resource-group $resourceGroup `
  --environment $containerEnvironment `
  --image "$acrServer/vehiculo:latest" `
  --registry-server $acrServer `
  --registry-username $acrUsername `
  --registry-password $acrPassword `
  --ingress internal `
  --target-port 8080 `
  --min-replicas 1 `
  --secrets `
    "sql-connection=$sqlConnection" `
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

## 11. API Gateway

```powershell
az containerapp create `
  --name "gateway-vehiculos" `
  --resource-group $resourceGroup `
  --environment $containerEnvironment `
  --image "$acrServer/apigateway:latest" `
  --registry-server $acrServer `
  --registry-username $acrUsername `
  --registry-password $acrPassword `
  --ingress external `
  --target-port 8080 `
  --env-vars `
    "ASPNETCORE_ENVIRONMENT=Production" `
    "ASPNETCORE_URLS=http://+:8080" `
    "ReverseProxy__Clusters__oauthJwtCluster__Destinations__oauthJwtDestination__Address=http://oauthjwt-vehiculos/" `
    "ReverseProxy__Clusters__categoriasCluster__Destinations__categoriasDestination__Address=http://categoria-vehiculos/" `
    "ReverseProxy__Clusters__vehiculosCluster__Destinations__vehiculosDestination__Address=http://vehiculo-vehiculos/" `
    "Cors__AllowedOrigins__0=$frontendUrl" `
    "Cors__AllowedOrigins__1=$frontendUrl"
```

## 12. Frontend

```powershell
az containerapp create `
  --name "frontend-vehiculos" `
  --resource-group $resourceGroup `
  --environment $containerEnvironment `
  --image "$acrServer/frontend:latest" `
  --registry-server $acrServer `
  --registry-username $acrUsername `
  --registry-password $acrPassword `
  --ingress external `
  --target-port 80
```

Después de conocer el FQDN público del frontend, se confirmó CORS en el Gateway:

```powershell
az containerapp update `
  --name "gateway-vehiculos" `
  --resource-group $resourceGroup `
  --set-env-vars `
    "Cors__AllowedOrigins__0=$frontendUrl" `
    "Cors__AllowedOrigins__1=$frontendUrl"
```

## 13. Comprobaciones finales

```powershell
$loginBody = @{
  usuario = "admin"
  password = "<AUTH_ADMIN_PASSWORD>"
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Uri "$gatewayUrl/api/Auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body $loginBody

$headers = @{ Authorization = "Bearer $($login.token)" }

Invoke-RestMethod -Uri "$gatewayUrl/api/Categorias" -Headers $headers
Invoke-RestMethod -Uri "$gatewayUrl/api/Vehiculos" -Headers $headers

$categoria = @{
  nombre = "Prueba RabbitMQ"
  descripcion = "Categoría creada para comprobar productor y consumidor"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "$gatewayUrl/api/Categorias" `
  -Method Post `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $categoria

az containerapp list `
  --resource-group $resourceGroup `
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

No se incluyen comandos de eliminación porque no formaron parte del despliegue.
