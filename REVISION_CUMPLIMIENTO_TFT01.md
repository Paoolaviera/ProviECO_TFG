# Revisión de Cumplimiento del TFT01 - ProviECO (ProviECO_TFG)

Este documento detalla el cumplimiento de los requisitos establecidos en el plan de Trabajo de Fin de Grado (TFT01) titulado: **“Diseño y desarrollo de una aplicación web y móvil para la planificación y gestión del suministro de productos agrícolas locales orientada a restauración colectiva”**.
*(Nota: En la implementación final, el concepto se amplía a productos agroalimentarios locales y de proximidad, incluyendo frutas, verduras, huevos, miel, lácteos y otros productos suministrados por productores locales).*

---

## Matriz de Cumplimiento de Requisitos

| Requisito del TFT01 | Funcionalidad Implementada | Archivos Relacionados | Estado | Observaciones |
| :--- | :--- | :--- | :---: | :--- |
| **Restauración colectiva como eje principal** | Panel profesional `/restauracion` con gestión de EcoBoxes, visualización de pedidos planificados y estadísticas. | [restauracion.ts](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/frontend/src/app/restauracion/restauracion.ts)<br>[restauracion.html](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/frontend/src/app/restauracion/restauracion.html) | **CUMPLE** | El sistema centraliza la operativa en comedores escolares, residencias y hospitales, relegando el mercado general a segundo plano. |
| **Planificación de pedidos con antelación** | Los centros pueden registrar pedidos programados con una fecha de entrega futura deseada. | [views.py (orders)](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/backend/orders/views.py)<br>[models.py (orders)](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/backend/orders/models.py) | **CUMPLE** | Se validan fechas en el backend para impedir planificaciones en el pasado. |
| **Gestión de cantidades** | Ajuste dinámico de volúmenes de pedido adaptados a comensales y necesidades del centro. | [models.py (orders)](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/backend/orders/models.py)<br>[views.py (orders)](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/backend/orders/views.py) | **CUMPLE** | Validadas en backend (cantidad > 0) y frontend en tiempo real. |
| **Disponibilidad de productos** | Control estricto de existencias, filtrando productos sin stock y bloqueando compras directas insuficientes. | [views.py (orders)](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/backend/orders/views.py) | **CUMPLE** | Asegura la coherencia de suministro en tiempo real. |
| **Reserva de producción futura** | Atributo `permite_reserva_futura` en productos que habilita compras planificadas superando el stock físico inmediato. | [models.py (products)](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/backend/products/models.py) | **CUMPLE** | Permite a los productores locales sembrar sabiendo la demanda asegurada de los colegios. |
| **Gestión por lotes** | Campos `lote`, `fecha_cosecha` y `finca_origen` en el producto editables por el productor local. | [panel-productor.ts](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/frontend/src/app/panel-productor/panel-productor.ts) | **CUMPLE** | Asegura el control físico de la producción agroalimentaria local. |
| **Seguimiento del estado del suministro** | Línea temporal interactiva en el detalle del pedido planificado y la trazabilidad del lote. | [pedido-planificado-detalle.html](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/frontend/src/app/pedido-planificado-detalle/pedido-planificado-detalle.html)<br>[trazabilidad.html](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/frontend/src/app/trazabilidad/trazabilidad.html) | **CUMPLE** | Visualización clara de los hitos: *Planificado, Aceptado, Preparación, En reparto, Entregado*. |
| **Roles de acceso (Multi-rol)** | Cuatro roles estricto: CLIENTE, RESTAURACION, PRODUCTOR, y ADMIN (Staff). | [models.py (users)](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/backend/users/models.py) | **CUMPLE** | Separación limpia de vistas y endpoints REST mediante permisos de DRF. |
| **Validaciones documentales** | Carga de certificado ecológico (obligatorio para venta) y documento del centro escolar/médico (para poder comprar). | [views.py (users)](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/backend/users/views.py)<br>[views.py (products)](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/backend/products/views.py) | **CUMPLE** | Verificación asíncrona manual por parte del Administrador del sistema. |
| **Web responsive / adaptable a móvil** | Diseño CSS adaptado a terminales móviles mediante Media Queries adaptativas. | [styles.css](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/frontend/src/styles.css) | **CUMPLE** | La interfaz se apila y acomoda en pantallas de cualquier tamaño de manera fluida. |
| **Aplicación móvil (Ionic / Firebase)** | Prevista inicialmente en el plan, fue sustituida por una Web App Adaptable y PWA nativa básica. | [manifest.webmanifest](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/frontend/src/manifest.webmanifest) | **PARCIAL** | Satisface los objetivos funcionales principales del TFG mediante una web responsive y una PWA básica. |
| **Documentación técnica** | Pruebas guiadas, resumen de base de datos y matriz de correspondencia. | [PRUEBAS_TFG.md](file:///Users/paolavierasuarez/WebstormProjects/ProviECO_TFG/PRUEBAS_TFG.md) | **CUMPLE** | Redacción detallada de escenarios de testing y credenciales de demostración. |

---

## Decisiones Técnicas Finales

Aunque la propuesta inicial del TFT01 contemplaba el uso de **Ionic** y **Firebase** para la vertiente móvil del sistema:

1. **Continuidad del Prototipo:** El proyecto original estaba construido en Angular (Frontend) y Django REST Framework + base de datos relacional SQLite en desarrollo (Backend). Migrar el backend a Firebase implicaría desechar todo el código estructurado en Python, las relaciones complejas de los modelos de base de datos relacional y las vistas del panel de administración nativo de Django.
2. **Estabilidad y Seguridad:** Django ofrece un ORM maduro que permite implementar validaciones de negocio transaccionales robustas (como la comprobación cruzada de certificados ecológicos antes de aceptar compras directas o planificadas), algo complejo y propenso a inconsistencias en bases de datos NoSQL como Firebase.
3. **Web Adaptable y PWA Nativa:** Se ha dotado a la aplicación Angular de un archivo `manifest.webmanifest` de aplicación web progresiva y estilos CSS completamente fluidos. Esto permite que el sistema sea accesible desde cualquier navegador móvil y sea instalable como App nativa (Add to Home Screen) sin los inconvenientes de mantenimiento de dos repositorios separados o el empaquetado de Ionic.

> [!NOTE]
> Aunque el TFT01 mencionaba Ionic/Firebase como tecnología prevista, la implementación final se mantiene en Angular + Django por continuidad del prototipo, reutilización del sistema existente y estabilidad del desarrollo. La solución satisface los objetivos funcionales principales del TFG mediante una web responsive y una PWA básica.

