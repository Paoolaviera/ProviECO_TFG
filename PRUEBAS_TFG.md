# Guión de Pruebas y Demostración del TFG

Este documento detalla los 20 pasos secuenciales para realizar la validación y demostración práctica del sistema **ProviECO** ante el tribunal de defensa del TFG.

---

### Paso 1: Registro de productor o uso de productor de prueba
*   **Acción**: Acceda a `/register` y cree una cuenta con rol **Productor** (o inicie sesión con `finca.sanlorenzo@provieco.com` / `password123`).
*   **Verificación**: Acceso concedido al panel del productor donde se visualizan sus productos propios, ventas y estado de certificados ecológicos.

### Paso 2: Creación de producto con certificado
*   **Acción**: En el Panel del Productor, pulse en **Añadir Producto**. Complete los campos (nombre: *Tomates de ensalada*, provincia: *Las Palmas*, finca: *Finca San Lorenzo*, etc.) y suba un archivo PDF en el selector **Certificado Ecológico**.
*   **Verificación**: El producto se guarda en estado `PENDIENTE` de verificación y muestra una insignia avisando que no será visible en el catálogo público hasta ser verificado.

### Paso 3: Validación del producto por el administrador
*   **Acción**: Inicie sesión como Administrador (`admin@provieco.com` / `password123`). Vaya al panel de control, pestaña **Verificaciones**.
*   **Verificación**: Localice el producto, visualice el certificado cargado, introduzca observaciones de aprobación y pulse **Aprobar**. El estado cambia a `VERIFICADO`.

### Paso 4: Registro de centro de restauración colectiva con documento
*   **Acción**: Vaya a `/register` y registre un nuevo usuario con rol **Restauración Colectiva**:
    *   **Email**: `colegio.sanlorenzo@provieco.com`
    *   **Nombre de Centro**: `CEIP San Lorenzo`
    *   **Tipo**: `COLEGIO`
    *   **Documentación**: Adjunte un archivo PDF acreditativo (ej. CIF o certificado del centro).
*   **Verificación**: Registro exitoso. Al iniciar sesión, aparece un banner informativo indicando que la cuenta está en proceso de validación.

### Paso 5: Validación del centro por el administrador
*   **Acción**: Inicie sesión como Administrador. Vaya a la pestaña **Centros de Restauración**, localice `CEIP San Lorenzo`, verifique su documento y pulse **Validar / Aprobar**.
*   **Verificación**: El centro pasa a estado `VALIDADO`.

### Paso 6: Login como restauración validada
*   **Acción**: Inicie sesión como `colegio.sanlorenzo@provieco.com` / `password123` (o la cuenta creada en el paso 4).
*   **Verificación**: Acceda al panel `/restauracion`. El banner de advertencia ha desaparecido, confirmando el estado operativo.

### Paso 7: Creación de EcoBox
*   **Acción**: Pulse en **Crear EcoBox** en el menú de restauración.
*   **Verificación**: Se abre el formulario interactivo para configurar la plantilla de pedido.

### Paso 8: Añadir productos verificados a EcoBox
*   **Acción**: Agregue el producto *Tomates de ensalada* (25 kg) y *Zanahorias* (15 kg) al listado de la EcoBox.
*   **Verificación**: El total se calcula automáticamente basado en los precios de los productores.

### Paso 9: Configurar frecuencia y número de comensales
*   **Acción**: Establezca el número de comensales en `150` y la frecuencia de entrega en `Semanal`. Guarde la plantilla.
*   **Verificación**: La EcoBox aparece listada en la sección **Mis EcoBoxes**.

### Paso 10: Crear pedido planificado
*   **Acción**: En el listado de EcoBoxes, pulse **Crear Pedido Planificado** sobre la plantilla recién guardada. Seleccione una fecha de entrega futura (mínimo mañana).
*   **Verificación**: El pedido planificado se registra en estado `PENDIENTE` en la base de datos.

### Paso 11: Productor recibe el pedido
*   **Acción**: Inicie sesión como el productor titular de los tomates (`finca.sanlorenzo@provieco.com` / `password123`).
*   **Verificación**: En la pestaña **Ventas de Suministro**, aparece el pedido planificado del `CEIP San Lorenzo`.

### Paso 12: Productor acepta y actualiza estado
*   **Acción**: Introduzca los datos de trazabilidad del lote físico (Lote: `LOT-TOM-SL01`, Recolección: fecha actual, Finca: `Finca San Lorenzo`).
*   **Verificación**: Pulse **Aceptar Suministro**.

### Paso 13: Productor añade mensaje o respuesta
*   **Acción**: Complete el campo opcional de comentarios (ej. *"Cosecha lista para envío"*) antes de aceptar el suministro.
*   **Verificación**: Los comentarios se graban de manera persistente en el registro de la orden.

### Paso 14: Consulta de trazabilidad por parte del centro
*   **Acción**: Inicie sesión como el centro de restauración. Acceda al detalle del pedido planificado y pulse **Ver Trazabilidad de Cosecha**.
*   **Verificación**: Se abre la ficha de trazabilidad que muestra de forma estructurada los datos del productor, origen (provincia), finca, lote físico y fecha de cosecha.

### Paso 15: Visualización de certificado ecológico
*   **Acción**: En la ficha técnica de trazabilidad, haga clic sobre el enlace del certificado ecológico del producto.
*   **Verificación**: El certificado oficial cargado por el productor local se abre en una pestaña nueva del navegador (`target="_blank"`).

### Paso 16: Prueba de producto no verificado (no aparece en catálogo)
*   **Acción**: Como productor, cree un producto sin adjuntar certificado ecológico (o déjelo sin aprobar por el admin). Cierre sesión y navegue al catálogo público como cliente anónimo o restauración.
*   **Verificación**: El producto no verificado **no** se muestra en el catálogo, filtros ni área de restauración.

### Paso 17: Prueba de centro no validado (no puede crear EcoBox ni pedidos)
*   **Acción**: Registre un centro de restauración nuevo y, sin aprobarlo con el administrador, intente acceder a la creación de una EcoBox o pedido planificado.
*   **Verificación**: El sistema le redirige o muestra un bloqueo explícito impidiendo el registro del pedido hasta que la documentación del centro sea autorizada.

### Paso 18: Prueba responsive / móvil
*   **Acción**: Reduzca el ancho del navegador a tamaño móvil (menor de `768px`) o use las herramientas de desarrollo del navegador en modo emulación.
*   **Verificación**: Las columnas de las tablas densas se adaptan con scroll horizontal, los botones y formularios se apilan correctamente y la barra de navegación lateral se oculta o adapta.

### Paso 19: Prueba de modo oscuro
*   **Acción**: Pulse el interruptor de modo oscuro en la barra superior de la aplicación.
*   **Verificación**: Los colores de fondo cambian a tonos oscuros coherentes y el contraste del texto se mantiene legible.

### Paso 20: Prueba de marketplace normal y pago simulado
*   **Acción**: Inicie sesión como cliente común (`cliente@provieco.com`). Agregue un producto verificado al carrito ordinario, vaya a la pasarela simulada, rellene datos de tarjeta y complete el pago.
*   **Verificación**: La orden de compra directa se procesa exitosamente y el stock del producto disminuye de inmediato.
