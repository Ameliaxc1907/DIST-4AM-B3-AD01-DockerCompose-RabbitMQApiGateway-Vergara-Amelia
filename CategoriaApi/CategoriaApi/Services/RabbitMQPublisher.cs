using CategoriaApi.Models;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace CategoriaApi.Services
{
    public class RabbitMQPublisher
    {
        private readonly IConfiguration _configuration;

        public RabbitMQPublisher(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task PublicarCategoriaCreadaAsync(Categorias categoria)
        {
            var factory = new ConnectionFactory
            {
                HostName = _configuration["RabbitMQ:HostName"],
                Port = int.Parse(_configuration["RabbitMQ:Port"] ?? "5672"),
                UserName = _configuration["RabbitMQ:UserName"],
                Password = _configuration["RabbitMQ:Password"]
            };

            using var connection = await factory.CreateConnectionAsync();
            using var channel = await connection.CreateChannelAsync();

            var queueName = _configuration["RabbitMQ:QueueName"] ?? "categoria_creada";

            await channel.QueueDeclareAsync(
                queue: queueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null
            );

            var mensaje = JsonSerializer.Serialize(categoria);
            var body = Encoding.UTF8.GetBytes(mensaje);

            await channel.BasicPublishAsync(
                exchange: "",
                routingKey: queueName,
                body: body
            );
        }
    }
}
