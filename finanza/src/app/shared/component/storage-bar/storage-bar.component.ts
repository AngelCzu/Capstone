import { Component, OnInit, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Utils } from 'src/app/services/utils';
import { HttpClient } from '@angular/common/http';
import { UserApi } from 'src/app/services/apis/user.api';


@Component({
  selector: 'app-storage-bar',
  templateUrl: './storage-bar.component.html',
  styleUrls: ['./storage-bar.component.scss'],
  standalone: false
})
export class StorageBarComponent implements OnInit {
  auth = inject(Auth);
  utilsSvc = inject(Utils);
  http = inject(HttpClient);
  userApi = inject(UserApi);

  ingresos = 0;
  gastos = 0;
  deudas = 0;
  restante = 0;
  porcentajeGastos = 0;
  porcentajeDeudas = 0;
  porcentajeOcupado = 0;

  categorias: { nombre: string; monto: number; color: string }[] = [];
  categoriasUsuario: any[] = [];

  async ngOnInit() {
    await this.cargarDatosFinancieros();
  }

async cargarDatosFinancieros() {
  const user = this.auth.currentUser;
  if (!user) return;

  try {
    console.log('✅ Sesión activa, obteniendo resumen financiero...');
    // 1️⃣ Traer resumen mensual desde backend Flask
    const resumen: any = await this.http.get('/api/v1/users/me/resumen').toPromise();
    console.log(resumen);
    
    // 2️⃣ Obtener categorías del usuario (ya guardadas en Firestore)
    const catMovs = await this.userApi.obtenerCategorias('movimiento').toPromise();
    this.categoriasUsuario = catMovs?.categorias || [];

    // 3️⃣ Calcular totales generales
    this.ingresos = resumen.ingresos || 0;
    this.gastos = resumen.gastos || 0;
    this.deudas = resumen.deudas || 0; // ahora es el total de las cuotas mensuales
    this.restante = resumen.restante || 0;
    this.categorias = resumen.porCategoria || [];

    const total = this.ingresos || 1;
    const ocupados = this.gastos + this.deudas;

    this.porcentajeGastos = (this.gastos / total) * 100;
    this.porcentajeDeudas = (this.deudas / total) * 100;
    this.porcentajeOcupado = (ocupados / total) * 100;

    // 4️⃣ Generar array de categorías con color
    this.categorias = Object.entries(resumen.porCategoria || {}).map(([nombre, monto]) => {
      const cleanName = nombre.trim().toLowerCase();
      const catColor =
        this.categoriasUsuario.find(
          c => c.nombre.trim().toLowerCase() === cleanName
        )?.color || '#888';
      return { nombre, monto: Number(monto), color: catColor };
    });

    console.log('📊 Categorías encontradas:', this.categorias);

    // 5️⃣ Crear gradiente dinámico según proporción de gasto
    this.aplicarGradienteCategorias();

  } catch (error) {
    console.error('❌ Error al cargar resumen:', error);
    this.utilsSvc.presentToast({
      message: 'Error al cargar tus datos financieros',
      duration: 3000,
      color: 'danger'
    });
  }
}

// 🎨 Generar gradiente dinámico para la barra según las categorías
aplicarGradienteCategorias() {
  const totalGastos = this.categorias.reduce((sum, c) => sum + c.monto, 0);
  const totalDeudas = this.deudas || 0; // 💰 Total de deudas
  const totalIngresos = this.ingresos || 1;

  // Total combinado para el porcentaje de ocupación
  const totalConsumido = totalGastos + totalDeudas;
  const porcentajeOcupado = (totalConsumido / totalIngresos) * 100;

  // 🟢 Generar gradiente de colores de las categorías
  let gradienteCategorias = '';
  if (totalGastos > 0 || totalDeudas > 0) {
    let acumulado = 0;
    const stops: string[] = [];

    // 🔹 Ordenamos las categorías por monto (de menor a mayor)
    const categoriasOrdenadas = [...this.categorias].sort((a, b) => a.monto - b.monto);

    // 🔹 Construimos el gradiente en proporción al total de gastos
    categoriasOrdenadas.forEach(cat => {
      const porcentajeCategoria = (cat.monto / totalConsumido) * 100;
      const inicio = acumulado;
      const fin = acumulado + porcentajeCategoria;
      stops.push(`${cat.color} ${inicio}%`, `${cat.color} ${fin}%`);
      acumulado = fin;
    });

    // 🔹 Si hay deudas, añadimos un bloque al final (gris rojizo)
    if (totalDeudas > 0) {
      const porcentajeDeudas = (totalDeudas / totalConsumido) * 100;
      const inicio = acumulado;
      const fin = acumulado + porcentajeDeudas;
      stops.push(`#7e3d3d ${inicio}%`, `#7e3d3d ${fin}%`);
      acumulado = fin;
    }

    gradienteCategorias = `linear-gradient(to top, ${stops.join(', ')})`;
  } else {
    gradienteCategorias = 'linear-gradient(to top, #333 0%, #1c1c1c 100%)';
  }

  // 🎯 Combinar capas: colores debajo + saldo encima desde el punto ocupado
  const barra = document.querySelector('.storage-bar') as HTMLElement;
  if (barra) {
    const alturaOcupada = Math.min(porcentajeOcupado, 100);

    barra.style.backgroundColor = '#1c1c1c';
    barra.style.backgroundRepeat = 'no-repeat';
    barra.style.backgroundPosition = 'bottom';
    barra.style.boxShadow =
      'inset 0 0 12px rgba(255, 255, 255, 0.08), 0 4px 15px rgba(0, 0, 0, 0.5)';

    // 🟢 Inicialmente vacía
    barra.style.backgroundSize = '100% 0%';
    barra.style.backgroundImage = gradienteCategorias;

    // 🎬 Activar animación de llenado (de abajo hacia arriba)
    setTimeout(() => {
      barra.style.transition = 'background-size 1.2s ease-out';
      barra.style.backgroundSize = `100% ${alturaOcupada}%`;
    }, 100);
  }
}



verDetalleCategoria(nombreCategoria: string) {
  if (!nombreCategoria) return;

  // ✅ Construimos la URL con query param
  const url = `/main/detalle-categoria?cat=${encodeURIComponent(nombreCategoria)}`;

  // ✅ Navegamos usando tu helper de Utils
  this.utilsSvc.routerLink(url);
}



}
