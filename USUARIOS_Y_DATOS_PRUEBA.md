# Compendio de Usuarios y Datos de Prueba — ProviECO

Este documento detalla las cuentas de usuario y los productos locales y de proximidad precargados en el entorno de desarrollo para facilitar la demostración de la aplicación.

---

## 1. Cuentas de Usuario de Prueba

Todas las cuentas se crean por defecto con la contraseña: `password123`.

### Administrador del Sistema (Staff)
*   **Email / Username**: `admin@provieco.com`
*   **Contraseña**: `password123`
*   **Rol**: `ADMIN` (Superusuario)
*   **Funciones**: Validar centros de restauración, auditar certificados de productos, gestionar usuarios y observaciones.

### Productores Locales
*   **Productor 1: Finca San Lorenzo**
    *   **Email / Username**: `finca.sanlorenzo@provieco.com`
    *   **Contraseña**: `password123`
    *   **Provincia**: `Las Palmas`
*   **Productor 2: Granja La Vega**
    *   **Email / Username**: `granja.lavega@provieco.com`
    *   **Contraseña**: `password123`
    *   **Provincia**: `Las Palmas`
*   **Productor 3: EcoHuerta del Norte**
    *   **Email / Username**: `ecohuerta.norte@provieco.com`
    *   **Contraseña**: `password123`
    *   **Provincia**: `Las Palmas`

### Centros de Restauración Colectiva (Clientes de Suministro)
*   **Email / Username**: `colegio.sanlorenzo@provieco.com`
*   **Contraseña**: `password123`
*   **Rol**: `RESTAURACION`
*   **Centro**: `CEIP San Lorenzo`
*   **Tipo**: `COLEGIO`
*   **Responsable**: `María Gómez`
*   **Teléfono**: `600 123 456`
*   **Dirección**: `Calle del Colegio, 10, 35000, Las Palmas de Gran Canaria`
*   **Provincia**: `Las Palmas`
*   **Observaciones**: `Menús escolares saludables y ecológicos`
*   **Documento acreditativo**: `Certificado_Restauracion_Colectiva_CEIP_San_Lorenzo_ProviECO.pdf`
*   **Estado de Validación**: `VALIDADO` (Aprobado por el Administrador)

### Cliente Final (Marketplace Normal)
*   **Email / Username**: `cliente@provieco.com`
*   **Contraseña**: `password123`
*   **Rol**: `CLIENTE`

---

## 2. Catálogo de Productos y Lotes de Prueba (Ámbito Nacional)

Los productos están distribuidos en distintas provincias españolas para reflejar la flexibilidad geográfica del sistema:

### Finca San Lorenzo
1.  **Tomates de ensalada**
    *   **Precio**: `2.20 EUR/kg`
    *   **Stock**: `250 kg`
    *   **Reserva Futura**: Permitido
    *   **Lote**: `LOT-TOM-SL01`
    *   **Provincia de Origen**: `Las Palmas`
2.  **Papas del país**
    *   **Precio**: `1.50 EUR/kg`
    *   **Stock**: `1000 kg`
    *   **Reserva Futura**: Permitido
    *   **Lote**: `LOT-PAP-SL02`
    *   **Provincia de Origen**: `Las Palmas`
3.  **Miel artesanal**
    *   **Precio**: `8.50 EUR/tarro 500g`
    *   **Stock**: `150 unidades`
    *   **Reserva Futura**: Permitido
    *   **Lote**: `LOT-MIE-SL03`
    *   **Provincia de Origen**: `Granada`

### Granja La Vega
4.  **Huevos camperos**
    *   **Precio**: `3.50 EUR/docena`
    *   **Stock**: `120 docenas`
    *   **Reserva Futura**: Permitido
    *   **Lote**: `LOT-HUE-LV01`
    *   **Provincia de Origen**: `Madrid`
5.  **Queso fresco local**
    *   **Precio**: `9.80 EUR/kg`
    *   **Stock**: `60 kg`
    *   **Reserva Futura**: Permitido
    *   **Lote**: `LOT-QUE-LV03`
    *   **Provincia de Origen**: `Cantabria`

### EcoHuerta del Norte
6.  **Lechuga romana**
    *   **Precio**: `1.20 EUR/unidad`
    *   **Stock**: `80 unidades`
    *   **Reserva Futura**: Permitido
    *   **Lote**: `LOT-LEC-EHN01`
    *   **Provincia de Origen**: `Murcia`
7.  **Zanahorias**
    *   **Precio**: `1.25 EUR/kg`
    *   **Stock**: `180 kg`
    *   **Reserva Futura**: Permitido
    *   **Lote**: `LOT-ZAN-EHN02`
    *   **Provincia de Origen**: `Valladolid`
8.  **Manzanas**
    *   **Precio**: `1.80 EUR/kg`
    *   **Stock**: `150 kg`
    *   **Reserva Futura**: Permitido
    *   **Lote**: `LOT-MAN-EHN03`
    *   **Provincia de Origen**: `Lleida`

---

## 3. Comandos Útiles de Inicialización

Si desea reiniciar la base de datos a su estado original con estos datos precargados, ejecute los siguientes comandos en la terminal de la carpeta `backend`:

```bash
# Eliminar la base de datos actual (si es SQLite)
rm db.sqlite3

# Crear las tablas e iniciar el esquema
python manage.py migrate

# Precargar los usuarios de prueba
python seed_users.py

# Precargar los productos y certificados ecológicos
python seed_products.py
```
