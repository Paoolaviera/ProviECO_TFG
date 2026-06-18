import { Routes } from '@angular/router';
// Importamos tus componentes
import { Inicio } from './inicio/inicio';
import { Catalogo } from './catalogo/catalogo';
import { Contacto } from './contacto/contacto';
import { Detalle } from './detalle/detalle';
import { LoginComponent } from './login/login';
import { Productores } from './productores/productores';
import { RegistroComponent } from './registro/registro';
import { Perfil } from './perfil/perfil';
import { PanelProductor } from './panel-productor/panel-productor';
import { ConfirmarPedidoComponent } from './confirmar-pedido/confirmar-pedido';
import { PagoPedidoComponent } from './pago-pedido/pago-pedido';
import { PanelAdmin } from './panel-admin/panel-admin';
import { adminGuard } from './guards/admin.guard';
import { PerfilProductor } from './perfil-productor/perfil-productor';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'catalogo', component: Catalogo },
  { path: 'contacto', component: Contacto },
  { path: 'detalle', component: Detalle },
  { path: 'login', component: LoginComponent },
  { path: 'productores', component: Productores },
  { path: 'productor/:id', component: PerfilProductor },
  { path: 'registro', component: RegistroComponent },
  { path: 'perfil', component: Perfil },
  { path: 'panel-productor', component: PanelProductor },
  { path: 'admin', component: PanelAdmin, canActivate: [adminGuard] },
  { path: 'confirmar-pedido', component: ConfirmarPedidoComponent },
  { path: 'pago-pedido/:id', component: PagoPedidoComponent },
  {
    path: 'restauracion',
    loadComponent: () => import('./restauracion/restauracion').then((m) => m.RestauracionComponent),
  },
  {
    path: 'trazabilidad/:id',
    loadComponent: () => import('./trazabilidad/trazabilidad').then((m) => m.TrazabilidadComponent),
  },
  {
    path: 'pedido-planificado/:id',
    loadComponent: () => import('./pedido-planificado-detalle/pedido-planificado-detalle').then((m) => m.PedidoPlanificadoDetalleComponent),
  },
];
