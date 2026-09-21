import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import leadsHandler from './api/leads.js'

function sheetsApi() {
  const install = (server) => {
    server.middlewares.use((req, res, next) => {
      if (req.url?.split('?')[0] === '/api/leads') return leadsHandler(req, res)
      next()
    })
  }
  return { name: 'sheets-api', configureServer: install, configurePreviewServer: install }
}

export default defineConfig({ plugins: [react(), sheetsApi()] })
