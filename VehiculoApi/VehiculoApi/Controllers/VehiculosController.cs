using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VehiculoApi.Data;
using VehiculoApi.Models;

namespace VehiculoApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VehiculosController : ControllerBase
    {
        private readonly VehiculosDBContext _dbContext;

        public VehiculosController(VehiculosDBContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Vehiculos>>> GetVehiculos()
        {
            var vehiculos = await _dbContext.Vehiculos
                .AsNoTracking()
                .ToListAsync();

            return Ok(vehiculos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Vehiculos>> GetVehiculo(int id)
        {
            var vehiculo = await _dbContext.Vehiculos
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.IdVehiculo == id);

            if (vehiculo == null)
                return NotFound();

            return Ok(vehiculo);
        }

        [HttpGet("categoria/{idCategoria}")]
        public async Task<ActionResult<IEnumerable<Vehiculos>>> GetVehiculosPorCategoria(int idCategoria)
        {
            var vehiculos = await _dbContext.Vehiculos
                .AsNoTracking()
                .Where(v => v.IdCategoria == idCategoria)
                .ToListAsync();

            return Ok(vehiculos);
        }

        [HttpPost]
        public async Task<ActionResult<Vehiculos>> CrearVehiculo(Vehiculos vehiculo)
        {
            _dbContext.Vehiculos.Add(vehiculo);
            await _dbContext.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetVehiculo),
                new { id = vehiculo.IdVehiculo },
                vehiculo);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> ActualizarVehiculo(int id, Vehiculos vehiculo)
        {
            if (id != vehiculo.IdVehiculo)
                return BadRequest();

            _dbContext.Entry(vehiculo).State = EntityState.Modified;
            await _dbContext.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarVehiculo(int id)
        {
            var vehiculo = await _dbContext.Vehiculos.FindAsync(id);

            if (vehiculo == null)
                return NotFound();

            _dbContext.Vehiculos.Remove(vehiculo);
            await _dbContext.SaveChangesAsync();

            return NoContent();
        }
    }
}
