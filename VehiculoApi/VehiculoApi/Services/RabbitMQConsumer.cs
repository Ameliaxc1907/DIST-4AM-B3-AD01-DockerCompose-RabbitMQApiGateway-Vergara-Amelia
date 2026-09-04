using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;
using VehiculoApi.Data;
using VehiculoApi.Events;
using VehiculoApi.Models;

namespace VehiculoApi.Services
{
    public class RabbitMQConsumer : BackgroundService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<RabbitMQConsumer> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        private IConnection? _connection;
        private IChannel? _channel;

        public RabbitMQConsumer(
            IConfiguration configuration,
            ILogger<RabbitMQConsumer> logger,
            IServiceScopeFactory scopeFactory)
        {
            _configuration = configuration;
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var factory = new ConnectionFactory
            {
                HostName = _configuration["RabbitMQ:HostName"] ?? "localhost",
                Port = int.Parse(_configuration["RabbitMQ:Port"] ?? "5672"),
                UserName = _configuration["RabbitMQ:UserName"]
                    ?? throw new InvalidOperationException("RabbitMQ:UserName es obligatorio."),
                Password = _configuration["RabbitMQ:Password"]
                    ?? throw new InvalidOperationException("RabbitMQ:Password es obligatorio.")
            };

            // Intentar conectar con RabbitMQ
            int retryCount = 0;
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _connection = await factory.CreateConnectionAsync(stoppingToken);
                    _channel = await _connection.CreateChannelAsync(cancellationToken: stoppingToken);
                    break;
                }
                catch (Exception ex)
                {
                    retryCount++;
                    _logger.LogWarning("Esperando a RabbitMQ... Intento {RetryCount}. Error: {Message}", retryCount, ex.Message);
                    await Task.Delay(3000, stoppingToken);
                }
            }

            if (_channel == null) return;

            var queueName = _configuration["RabbitMQ:QueueName"] ?? "categoria_creada";

            await _channel.QueueDeclareAsync(
                queue: queueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null,
                cancellationToken: stoppingToken
            );

            var consumer = new AsyncEventingBasicConsumer(_channel);

            consumer.ReceivedAsync += async (sender, ea) =>
            {
                try
                {
                    var body = ea.Body.ToArray();
                    var mensaje = Encoding.UTF8.GetString(body);
                    var evento = JsonSerializer.Deserialize<CategoriaCreadaEvento>(mensaje);

                    if (evento != null)
                    {
                        _logger.LogInformation(
                            "Categoría creada recibida desde RabbitMQ. IdCategoria: {IdCategoria}, Nombre: {Nombre}",
                            evento.IdCategoria,
                            evento.Nombre
                        );

                        using var scope = _scopeFactory.CreateScope();
                        var dbContext = scope.ServiceProvider.GetRequiredService<VehiculosDBContext>();

                        var existe = await dbContext.Vehiculos
                            .AnyAsync(v => v.IdCategoria == evento.IdCategoria, stoppingToken);

                        if (!existe)
                        {
                            var vehiculo = new Vehiculos
                            {
                                IdCategoria = evento.IdCategoria,
                                Marca = "Sin asignar",
                                Modelo = "Sin asignar",
                                Precio = 0,
                                Stock = 0,
                                Estado = true
                            };

                            dbContext.Vehiculos.Add(vehiculo);
                            await dbContext.SaveChangesAsync(stoppingToken);

                            _logger.LogInformation(
                                "Vehículo inicial creado automáticamente para IdCategoria: {IdCategoria}",
                                evento.IdCategoria
                            );
                        }
                    }

                    await _channel.BasicAckAsync(
                        deliveryTag: ea.DeliveryTag,
                        multiple: false,
                        cancellationToken: stoppingToken
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error al procesar mensaje de RabbitMQ");
                }
            };

            await _channel.BasicConsumeAsync(
                queue: queueName,
                autoAck: false,
                consumer: consumer,
                cancellationToken: stoppingToken
            );

            await Task.Delay(Timeout.Infinite, stoppingToken);
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            if (_channel != null)
                await _channel.CloseAsync(cancellationToken);
            if (_connection != null)
                await _connection.CloseAsync(cancellationToken);

            await base.StopAsync(cancellationToken);
        }
    }
}
