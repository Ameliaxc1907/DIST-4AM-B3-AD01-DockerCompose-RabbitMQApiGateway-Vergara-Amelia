-- Inicialización para Azure SQL Database.
-- Ejecute este script conectado directamente a la base VehiculosDB.
-- No crea bases, logins ni usuarios de servidor.
-- Los caracteres acentuados de los seeds se generan con NCHAR para evitar
-- corrupción por la página de códigos del cliente (por ejemplo, sqlcmd).

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.Categorias', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categorias (
        IdCategoria INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Nombre NVARCHAR(100) NOT NULL,
        Descripcion NVARCHAR(250) NULL
    );
END;
GO

IF OBJECT_ID(N'dbo.Vehiculos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Vehiculos (
        IdVehiculo INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        IdCategoria INT NOT NULL,
        Marca NVARCHAR(100) NOT NULL,
        Modelo NVARCHAR(100) NOT NULL,
        Precio DECIMAL(10,2) NOT NULL,
        Stock INT NOT NULL,
        Estado BIT NOT NULL
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Categorias)
BEGIN
    INSERT INTO dbo.Categorias (Nombre, Descripcion)
    VALUES
        (N'SUV', N'Veh' + NCHAR(237) + N'culos utilitarios deportivos espaciosos y vers' + NCHAR(225) + N'tiles'),
        (N'Sedan', N'Veh' + NCHAR(237) + N'culos tipo sed' + NCHAR(225) + N'n compactos y elegantes'),
        (N'Camioneta', N'Veh' + NCHAR(237) + N'culos de carga ligera y trabajo pesado');
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Vehiculos)
BEGIN
    INSERT INTO dbo.Vehiculos (IdCategoria, Marca, Modelo, Precio, Stock, Estado)
    VALUES
        (1, N'Toyota', N'RAV4', 32000.00, 10, 1),
        (2, N'Hyundai', N'Elantra', 21500.00, 5, 1),
        (3, N'Ford', N'F-150', 48000.00, 3, 1);
END;
GO
