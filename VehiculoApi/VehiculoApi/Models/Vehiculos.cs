using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VehiculoApi.Models
{
    [Table("Vehiculos")]
    public class Vehiculos
    {
        [Key]
        [Column("IdVehiculo")]
        public int IdVehiculo { get; set; }

        [Column("IdCategoria")]
        public int IdCategoria { get; set; }

        [Required]
        [StringLength(100)]
        [Column("Marca")]
        public string Marca { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        [Column("Modelo")]
        public string Modelo { get; set; } = string.Empty;

        [Column("Precio", TypeName = "decimal(10,2)")]
        public decimal Precio { get; set; }

        [Column("Stock")]
        public int Stock { get; set; }

        [Column("Estado")]
        public bool Estado { get; set; }
    }
}
