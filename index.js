import { config } from "dotenv"
import { initServer } from "./configs/server.js"

config()
initServer().catch(() => { console.error('No se pudo iniciar la API; revisá configuración y replica set'); process.exitCode = 1 })
