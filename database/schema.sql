CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (rol IN ('admin','cliente')),
  creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  precio NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  imagen_url VARCHAR(500),
  categoria VARCHAR(80),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ordenes (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  estado VARCHAR(20) NOT NULL CHECK (estado IN ('PAGADA','RECHAZADA')),
  creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orden_items (
  id SERIAL PRIMARY KEY,
  orden_id INT NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  producto_id INT NOT NULL REFERENCES productos(id),
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL
);

CREATE TABLE pagos (
  id SERIAL PRIMARY KEY,
  orden_id INT UNIQUE NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) NOT NULL,
  ultimos4 CHAR(4) NOT NULL,
  estado VARCHAR(20) NOT NULL CHECK (estado IN ('APROBADO','RECHAZADO')),
  referencia VARCHAR(50) NOT NULL,
  creado_en TIMESTAMP DEFAULT NOW()
);
