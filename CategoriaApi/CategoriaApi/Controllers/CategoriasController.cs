using CategoriaApi.Data;
using CategoriaApi.Models;
using CategoriaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CategoriaApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CategoriasController : ControllerBase
    {
        private readonly CategoriasDBContext _dbContext;
        private readonly RabbitMQPublisher _rabbitMQPublisher;

        public CategoriasController(
            CategoriasDBContext dbContext,
            RabbitMQPublisher rabbitMQPublisher)
        {
            _dbContext = dbContext;
            _rabbitMQPublisher = rabbitMQPublisher;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,User")]
        public async Task<ActionResult<IEnumerable<Categorias>>> GetCategorias()
        {
            var categorias = await _dbContext.Categorias
                .AsNoTracking()
                .ToListAsync();

            return Ok(categorias);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,User")]
        public async Task<ActionResult<Categorias>> GetCategoria(int id)
        {
            var categoria = await _dbContext.Categorias
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IdCategoria == id);

            if (categoria == null)
                return NotFound();

            return Ok(categoria);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Categorias>> CrearCategoria(Categorias categoria)
        {
            _dbContext.Categorias.Add(categoria);
            await _dbContext.SaveChangesAsync();

            await _rabbitMQPublisher.PublicarCategoriaCreadaAsync(categoria);

            return CreatedAtAction(
                nameof(GetCategoria),
                new { id = categoria.IdCategoria },
                categoria);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ActualizarCategoria(int id, Categorias categoria)
        {
            if (id != categoria.IdCategoria)
                return BadRequest();

            _dbContext.Entry(categoria).State = EntityState.Modified;
            await _dbContext.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> EliminarCategoria(int id)
        {
            var categoria = await _dbContext.Categorias.FindAsync(id);

            if (categoria == null)
                return NotFound();

            _dbContext.Categorias.Remove(categoria);
            await _dbContext.SaveChangesAsync();

            return NoContent();
        }
    }
}
