// Prepara certs/ca-extra.pem antes de npm run deploy.
// Ese archivo es un certificado raíz ADICIONAL, opcional y propio de cada máquina (no se versiona), para que
// los contenedores confíen en un antivirus o proxy que inspecciona HTTPS (en el equipo de pruebas, Avast
// Web/Mail Shield). Docker Compose lo exige como secreto de build y como volumen de la API: si no existe,
// se crea vacío y Node lo ignora (verificación TLS normal, sin certificados extra).
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ARCHIVO = join(dirname(fileURLToPath(import.meta.url)), "..", "certs", "ca-extra.pem");
mkdirSync(dirname(ARCHIVO), { recursive: true });
if (!existsSync(ARCHIVO)) {
  writeFileSync(ARCHIVO, "");
  console.log("certs/ca-extra.pem no existía: se creó vacío (sin certificados extra).");
} else {
  console.log(`certs/ca-extra.pem: ${statSync(ARCHIVO).size ? "con un certificado raíz adicional" : "vacío"}.`);
}
