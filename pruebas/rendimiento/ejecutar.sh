#!/usr/bin/env bash
# Ejecuta los 4 escenarios de k6 en secuencia y guarda salida + JSON en resultados/.
# Uso (Git Bash, desde la raíz): bash pruebas/rendimiento/ejecutar.sh [escenarios...]
# VUS=8 SUFIJO=_8vus cambia los VUs de los checkouts y el nombre de los archivos de salida.
# Requiere: Docker, backend en :3000 y datos de npm run db:poblar.
cd "$(dirname "$0")" || exit 1
RUTA="$(pwd -W 2>/dev/null || pwd)"
ESCENARIOS=("$@")
[ ${#ESCENARIOS[@]} -eq 0 ] && ESCENARIOS=(a_catalogo b_login c1_checkout_distribuido c2_checkout_contencion)

sql() { docker exec ecommerce_db psql -U postgres -d ecommerce -c "$1"; }

instantanea() {
  {
    echo "=== $1 ($(date '+%Y-%m-%d %H:%M:%S')) ==="
    sql "SELECT p.nombre, p.stock,
           coalesce((SELECT sum(i.cantidad) FROM orden_items i JOIN ordenes o ON o.id = i.orden_id
                     WHERE i.producto_id = p.id AND o.estado = 'PAGADA'), 0) AS vendidas_pagadas,
           100000 - p.stock AS descontado
         FROM productos p WHERE p.nombre LIKE 'Producto carga%' ORDER BY p.id"
  } >> resultados/integridad.txt
}

for e in "${ESCENARIOS[@]}"; do
  echo ">>> $e ($(date '+%H:%M:%S'))"
  case "$e" in c*) instantanea "Antes de $e$SUFIJO" ;; esac
  MSYS_NO_PATHCONV=1 docker run --rm --add-host=host.docker.internal:host-gateway -e VUS="$VUS" \
    -v "$RUTA:/scripts" grafana/k6 run --quiet --no-color \
    --summary-export="/scripts/resultados/$e$SUFIJO.json" "/scripts/$e.js" 2>&1 | tee "resultados/$e$SUFIJO.txt" | tail -4
  case "$e" in c*) instantanea "Después de $e$SUFIJO" ;; esac
  sleep 15 # deja recuperar el backend entre escenarios
done
echo ">>> FIN ($(date '+%H:%M:%S'))"
