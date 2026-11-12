#!/usr/bin/env bash
# Escaneos de OWASP ZAP. Uso (Git Bash, desde la raíz): bash pruebas/seguridad/ejecutar-zap.sh
# Requiere: backend en :3000, vite preview en :4173 (--host 0.0.0.0) y datos de npm run db:poblar.
# Durante el escaneo conviene CHAT_PROVEEDOR=reglas para no consumir la cuota de Groq.
cd "$(dirname "$0")/reportes" || exit 1
RUTA="$(pwd -W 2>/dev/null || pwd)"
API=http://localhost:3000/api

zap() { MSYS_NO_PATHCONV=1 docker run --rm --add-host=host.docker.internal:host-gateway -v "$RUTA:/zap/wrk:rw" zaproxy/zap-stable "$@"; }

token() {
  curl -s -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"$2\"}" "$API/auth/login" |
    node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).token))"
}

# Regla replacer de ZAP: agrega el header Authorization a todas las peticiones.
propiedades() {
  cat > zap-auth.prop <<EOF
replacer.full_list(0).description=auth
replacer.full_list(0).enabled=true
replacer.full_list(0).matchtype=REQ_HEADER
replacer.full_list(0).matchstr=Authorization
replacer.full_list(0).regex=false
replacer.full_list(0).replacement=Bearer $1
scanner.maxScanDurationInMins=15
scanner.threadPerHost=2
EOF
}

# La especificación apunta a localhost; desde el contenedor el backend es host.docker.internal.
sed 's#http://localhost:3000/api#http://host.docker.internal:3000/api#' ../../../docs/openapi.yaml > openapi-zap.yaml

echo ">>> baseline frontend ($(date '+%H:%M:%S'))"
zap zap-baseline.py -t http://host.docker.internal:4173 -I -r baseline-frontend.html -J baseline-frontend.json 2>&1 | tail -6

echo ">>> API con token de cliente ($(date '+%H:%M:%S'))"
propiedades "$(token cliente@tienda.com Cliente123)"
zap zap-api-scan.py -t /zap/wrk/openapi-zap.yaml -f openapi -I -r api-cliente.html -J api-cliente.json \
  -z "-configfile /zap/wrk/zap-auth.prop" 2>&1 | tail -6

echo ">>> API con token de admin ($(date '+%H:%M:%S'))"
propiedades "$(token admin@tienda.com Admin12345)"
zap zap-api-scan.py -t /zap/wrk/openapi-zap.yaml -f openapi -I -r api-admin.html -J api-admin.json \
  -z "-configfile /zap/wrk/zap-auth.prop" 2>&1 | tail -6

rm -f zap-auth.prop openapi-zap.yaml zap.yaml
echo ">>> FIN ($(date '+%H:%M:%S'))"
