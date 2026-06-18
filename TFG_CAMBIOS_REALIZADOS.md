# ProviECO - Planificación y Gestión del Suministro Agroalimentario Local

Este documento detalla los cambios realizados en el proyecto **ProviECO** para adaptarlo al Trabajo de Fin de Grado (TFG):
*“Diseño y desarrollo de una aplicación web y móvil para la planificación y gestión del suministro de productos agrícolas locales orientada a restauración colectiva”*.
*(Nota: En la implementación final, el concepto se amplía a productos agroalimentarios locales y de proximidad, incluyendo frutas, verduras, huevos, miel, lácteos y otros productos suministrados por productores locales).*

> [!IMPORTANT]
> La **restauración colectiva como parte principal del TFG** ha sido el eje central de este desarrollo, extendiendo el marketplace para dar soporte profesional a comedores escolares, hospitales y residencias.

---

## 1. Arquitectura y Roles de Usuario

Se ha ampliado el sistema de usuarios (`CustomUser` en `backend/users/models.py`) para dar cabida a la restauración colectiva.

### Campos en `CustomUser` (y serializers):
*   `rol`: Se añade la opción `RESTAURACION` (Restauración Colectiva).
*   `nombre_centro`: Nombre identificativo de la institución.
*   `tipo_centro`: Opciones de tipo alineadas con la normativa (`COLEGIO`, `HOSPITAL`, `RESIDENCIA`, `COMEDOR`, `OTRO`).
*   `persona_responsable`: Gestor del centro.
*   `telefono`: Teléfono de contacto opcional.
*   `direccion`: Dirección de entrega opcional.
*   `provincia`: Provincia opcional.
*   `observaciones_centro`: Especificaciones logísticas opcionales.

*Las migraciones correspondientes han sido aplicadas en la base de datos.*

---

## 2. Gestión de Disponibilidad y Reserva de Producción Futura

Se ha ampliado el modelo `Producto` (`backend/products/models.py`) para permitir a los productores publicar cosechas programadas y la **reserva de producción futura** (reserva sin stock físico inmediato).

### Nuevos Campos:
*   `categoria`: Clasificación del producto (`Frutas`, `Verduras`, etc.).
*   `temporada`: Estacionalidad del cultivo (`Primavera`, `Verano`, `Otoño`, `Invierno`, `Cualquiera`).
*   `fecha_disponible_desde` / `fecha_disponible_hasta`: Rango temporal que indica la **disponibilidad de productos**.
*   `permite_reserva_futura` (Boolean): Habilita la reserva anticipada para colectividades.
*   `activo` (Boolean): Habilita o deshabilita la visibilidad en el catálogo.

---

## 3. Planificación de Pedidos con Antelación y Gestión de Cantidades

Se implementó el flujo completo para la **planificación de pedidos con antelación** orientados a restauración colectiva.

### Campos de Pedido en `Order`:
*   `tipo_pedido`: Diferencia entre `COMPRA_DIRECTA` (compra retail) y `PEDIDO_PLANIFICADO` (colectividades).
*   `centro_nombre` / `tipo_centro`: Almacena la metadata del centro comprador.
*   `fecha_entrega_deseada`: Programación temporal del suministro.
*   `estado_suministro`: Permite el **seguimiento del estado del suministro** (`PENDIENTE`, `ACEPTADO`, `EN_PREPARACION`, `EN_REPARTO`, `ENTREGADO`, `CANCELADO`).
*   `observaciones`: Requisitos especiales del centro.

### Lógica de Negocio y Gestión de Cantidades:
*   El endpoint `POST /api/orders/planned/` gestiona el cesto de planificación y permite la **gestión de cantidades** en lotes voluminosos.
*   El endpoint `PATCH /api/orders/<id>/estado-suministro/` permite actualizar el estado del suministro. Al cambiar a `ACEPTADO`, descuenta atómicamente el stock físico del producto.

---

## 4. Gestión por Lotes y Trazabilidad Básica

Para garantizar la seguridad alimentaria en comedores públicos, se ha implementado un sistema de **trazabilidad básica** y **gestión por lotes**.

### Elementos de Trazabilidad:
*   Cada producto cosechado cuenta con número de lote (`lote`), fecha de recolección (`fecha_cosecha`), finca de procedencia (`finca_origen`), certificado ecológico digital PDF (`certificate`) y un código QR autogenerado (`qr_image`).
*   **Página Pública de Trazabilidad:** Disponible en `/trazabilidad/:id`, muestra de forma pública toda la ficha técnica de la cosecha, posibilitando al comedor o consumidor escanear el QR y descargar el certificado oficial.

---

## 5. Aplicación Frontend (Angular Standalone)

Se desarrollaron las siguientes interfaces para dar soporte a estos flujos:
1.  **Registro:** Formularios adaptados con validación de datos del centro e información del responsable.
2.  **Portal de Restauración Colectiva (`/restauracion`):** Interfaz para la planificación de pedidos con antelación, filtrado estacional de productos, gestión de cantidades en cesto y consulta del estado de suministro en tiempo real.
3.  **Gestión de Ventas en Productor:** Interfaz para el seguimiento del estado del suministro de pedidos planificados y su aceptación.
4.  **Panel de Administración:** Gestión de usuarios de restauración, mostrando tipo de centro y nombre.

---

## 6. Datos de Prueba (Seed Data)

Se proveen los scripts `seed_users.py` y `seed_products.py` que cargan:
*   Un usuario con rol `RESTAURACION` (Comedor Escolar CEIP San Lorenzo, tipo `COLEGIO`, estado `VALIDADO`).
*   Tres perfiles de productores independientes de ámbito nacional dentro de España (*Finca San Lorenzo*, *Granja La Vega* y *EcoHuerta del Norte*).
*   Productos configurados para la restauración colectiva y compra directa, distribuidos en varias provincias españolas (Las Palmas, Madrid, Murcia, Cantabria, Valladolid, Granada y Lleida) con lotes, fincas de origen, certificado ecológico digital PDF y fechas de cosecha realistas.

---

## 7. Mejoras de la Fase 2 (Alineación y Robustez del TFG)

1.  **Tres Productores y Productos Variados:** Se diversificó la base de datos de prueba con tres productores distintos para simular un mercado local más realista, incluyendo productos de alto volumen para comedores.
2.  **Certificado Ecológico Centralizado:** Enlace interactivo "Ver certificado ecológico" integrado en el catálogo público, la vista de restauración, el modal de detalles y la trazabilidad.
3.  **Corrección CSS de Desplegables en Modo Oscuro:** Se resolvieron los problemas de visualización del selector en modo oscuro, garantizando la eliminación de flechas duplicadas o repetidas mediante estilos nativos y overrides limpios.
4.  **Flujo de Registro y Validación de Colectividades:**
    *   Los nuevos centros de restauración colectiva se registran con estado de validación `PENDIENTE` y deben adjuntar un justificante o documento acreditativo (PDF, CIF o autorización).
    *   Tienen restringido el uso del módulo operativo (no pueden registrar pedidos planificados ni crear EcoBoxes).
    *   Se diseñaron banners de alerta dinámicos para los estados `PENDIENTE` y `RECHAZADO` (mostrando observaciones del administrador).
    *   Los administradores disponen de una pestaña "Restauración" en su panel para descargar justificantes, registrar comentarios de validación y validar/rechazar solicitudes.

---

## 8. Mejoras de la Fase 3 (Certificados Obligatorios, Origen Nacional y Validación con Observaciones)

1.  **Certificado Ecológico Obligatorio para Visibilidad:** Un producto solo aparece en el catálogo público, filtros, área de restauración colectiva, compra directa, pedidos planificados y selección de EcoBoxes si tiene un certificado ecológico digital subido y su estado es `VERIFICADO` por la administración, y está activo.
    *   **Productor**: Puede ver y gestionar sus propios productos en su panel privado aunque no estén verificados aún.
    *   **Administrador**: Puede visualizar todos los productos de la plataforma en su panel de administración.
    *   **Clientes y Restauración Colectiva**: Únicamente pueden buscar, ver y comprar productos verificados y con certificado oficial.
2.  **Adaptación Geográfica Nacional (España):**
    *   La plataforma está orientada a productos locales y de proximidad en toda España. Se utiliza el campo `origin` exclusivamente como **Provincia de origen**, alimentada por la lista de las 52 provincias españolas.
    *   Se mantiene separada la **Provincia de origen** (`origin`) y la **Finca de origen** (`finca_origen`), mostrándose ambas de forma independiente en detalles del producto, trazabilidad y área de restauración.
    *   Los datos de prueba (`seed_products.py`) han sido diversificados para usar distintas provincias de origen (como Las Palmas, Madrid, Murcia, Cantabria, Valladolid, Granada y Lleida) de acuerdo con los productos.
3.  **Flujo de Validación de Productos con Observaciones:**
    *   El productor dispone de un panel con estados informativos contextuales para sus productos: `Pendiente de certificado`, `Pendiente de verificación`, `Rechazado` (con observaciones) o `Verificado y visible`.
    *   El administrador cuenta con una pestaña de verificaciones donde puede abrir y descargar los certificados, escribir observaciones personalizadas en una caja de texto y aprobar o rechazar productos con un solo clic.
    *   Al rechazar un producto, las observaciones se guardan en la base de datos y se muestran inmediatamente al productor para que pueda corregir los fallos.
4.  **Validación Documental del Centro de Restauración:**
    *   El centro se registra adjuntando su documento acreditativo y queda en estado `PENDIENTE`.
    *   El administrador revisa la documentación y la aprueba o rechaza registrando observaciones explicativas.
    *   Si está `PENDIENTE` o `RECHAZADO`, el centro puede iniciar sesión y ver su perfil o el banner con el estado y observaciones correspondientes, pero no tiene acceso a crear EcoBoxes ni pedidos planificados. Solo si está `VALIDADO` puede utilizar todas las funciones.

---

## 9. Iteración de Identidad Visual y Fotografías de Alimentos (ProviECO)

1.  **Transición Final de Marca a ProviECO:** Se renombró la aplicación a ProviECO en todas sus interfaces visuales (header, menú lateral, perfil, manifest.webmanifest e index.html), consolidando su identidad como gestor del suministro de proximidad.
2.  **Rediseño del Logotipo Oficial:** Se ha sustituido el logo original por un emblema circular de aspecto artesanal, rústico y cercano. Representa una cesta de mimbre con hortalizas frescas de huerto y hojas verdes bajo un sol naciente en una paleta de tonos verdes y tierra, reflejando perfectamente los pilares del suministro local y el suministro agroalimentario sostenible.
3.  **Fotografías Reales de Alimentos:** Se eliminaron las ilustraciones planas de tipo icono. En su lugar, se dotó al catálogo de 12 fotografías reales de alta calidad y fotorrealistas con iluminación natural suave y estética de mercado o cocina tradicional para los productos principales (tomates, lechuga, pepino, huevos, queso fresco, papas, zanahorias, calabacines, naranjas, miel y manzanas).
4.  **Asignación Inteligente de Recursos:** Se diseñó e implementó un método resolvedor dinámico `getImageForProduct` en `ProductService` (compartido e integrado en `CartService`, `Catalogo`, `Detalle` y `PerfilProductor`) que analiza el nombre y categoría de cualquier producto registrado para asociarle automáticamente su fotografía rústica correspondiente si no cuenta con una imagen subida.

---

## 10. Correcciones de la Imagen de Inicio, Categorías y Trazabilidad

1.  **Imagen del Hero de Inicio Libre de Marcas:** Se ha sustituido la portada de Inicio por una fotografía horizontal, profesional y 100% libre de textos, marcas o carteles incrustados. Muestra múltiples cajas y cestas rústicas de madera repletas de hortalizas frescas y coloridas de la huerta (cebollas, coles, zanahorias y brócoli) dispuestas ordenadamente en el campo bajo luz natural cálida, representando la provisión local y el suministro de proximidad.
2.  **Resolución Inteligente de Categorías en API:** Se modificó la semilla del producto (`seed_products.py`) para categorizar la miel como "Miel". Adicionalmente, se programaron resolvedores dinámicos preventivos en `ProductService` y `Catalogo` que analizan el nombre del producto y corrigen/infieren la categoría adecuada si el servidor entrega "Otros" o vacío.
3.  **Botón de Certificado Ecológico en Vistas y Modales de Detalle:** En las tarjetas/listado del catálogo se mantiene exclusivamente la etiqueta de verificación ("Certificado validado"). No obstante, en la vista detallada de producto (`/detalle?id=X`), en el modal de detalle del catálogo (`catalogo.html`) y en el modal de restauración colectiva, se muestra un botón interactivo y visible con el texto "Ver certificado ecológico" que abre el PDF oficial en una pestaña nueva si el producto tiene certificado disponible.
4.  **Trazabilidad Completa en Detalle de Producto:** Se enriqueció la interfaz detallada para incluir la categoría del producto, número de lote asignado y la fecha de cosecha.

---

## 11. Integración de Certificados de Prueba y Homogeneización de Dominios (ProviECO)

1.  **Certificado Ecológico Centralizado de Productos:**
    *   Se ha asociado por defecto el archivo `Certificado_Ecologico_ProviECO.pdf` a todos los productos verificados en el script `seed_products.py`.
    *   Se muestra de forma destacada e interactiva un botón "Ver certificado ecológico" en la vista de detalle de cada producto, abriendo el PDF oficial en una nueva pestaña del navegador. Se ha asegurado de que este botón no aparezca en las tarjetas o listados públicos del catálogo ordinario.
2.  **Documentación Acreditativa de Restauración Colectiva:**
    *   Se ha asociado por defecto el documento `Certificado_Restauracion_Colectiva_CEIP_San_Lorenzo_ProviECO.pdf` al perfil del centro CEIP San Lorenzo en el script `seed_users.py`.
    *   Se ha implementado una sección dedicada **"Documentación del centro"** dentro del perfil de usuario de tipo `RESTAURACION` que muestra de forma limpia el estado de validación, nombre del centro, tipo de centro, persona responsable, provincia, y un botón para abrir el PDF justificante en una nueva pestaña (o un mensaje descriptivo si no está disponible).
    *   Se ha incorporado esta misma visualización interactiva y estructurada con el botón correspondiente en el listado del panel del administrador.
3.  **Filtrado en el Historial del Administrador:**
    *   Se ha incorporado un selector de estado de validación (`TODOS`, `PENDIENTE`, `VALIDADO`, `RECHAZADO`) en la sección de restauración colectiva del Panel de Administración.
    *   El centro CEIP San Lorenzo (a pesar de estar VALIDADO) se mantiene permanentemente listado en el historial de solicitudes/centros para permitir auditorías, cambios o descargas de su acreditación.
4.  **Homogeneización a Dominios @provieco.com:**
    *   Se han actualizado todos los correos electrónicos de los usuarios de prueba en los seeders, en la documentación (`PRUEBAS_TFG.md`, `USUARIOS_Y_DATOS_PRUEBA.md`), y en todo el código del proyecto para emplear exclusivamente el dominio `@provieco.com` (ej. `admin@provieco.com`, `colegio.sanlorenzo@provieco.com`, `finca.sanlorenzo@provieco.com`, `granja.lavega@provieco.com`, `ecohuerta.norte@provieco.com` y `cliente@provieco.com`).
    *   Se ha simplificado `seed_users.py` para crear los usuarios semilla directamente bajo el dominio `@provieco.com`, eliminando la lógica y las referencias antiguas al dominio anterior.

---

## 12. Centralización y Configuración de la URL del Backend para Red Local (PWA/Móvil)

1.  **Creación y Centralización de Entorno:**
    *   Se ha creado el archivo `frontend/src/environments/environment.ts` como punto único de configuración de la URL del backend (`apiUrl: 'http://192.168.1.134:8000'`).
2.  **Modificación de Servicios y Componentes Angular:**
    *   Se han refactorizado todos los servicios (`product.service.ts`, `cart.service.ts`, `auth.service.ts`, `order.service.ts`, `admin.service.ts`, `profile.service.ts`, `review.service.ts`) y componentes (`restauracion.ts`, `contacto.ts`, `detalle.ts`, `perfil.ts`, `perfil-productor.ts`, `panel-admin.ts`) para eliminar URLs de localhost/127.0.0.1 hardcodeadas y heredar dinámicamente el valor de `environment.apiUrl`.
    *   Se han adaptado las funciones helper de reconstrucción de URLs multimedia (`fixMediaUrl` y `getDocumentUrl`) para soportar dinámicamente la IP configurada.
    *   Se ha actualizado el archivo de pruebas `contacto.spec.ts` para heredar del mismo environment y evitar fallos de comprobación.
3.  **Configuración de Django `ALLOWED_HOSTS`:**
    *   Se ha modificado `ALLOWED_HOSTS` a `['*']` en `backend/backend/settings.py` para permitir peticiones HTTP entrantes desde cualquier dispositivo y dirección IP de la red local sin ser bloqueadas por el framework de seguridad.


