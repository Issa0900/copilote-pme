import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Aligné sur MAX_IMPORT_FILE_SIZE côté backend (backend/app/routers/imports.py) :
      // le backend accepte jusqu'à 10 Mo pour un import, la limite par défaut des
      // Server Actions Next.js (1 Mo) était donc plus stricte que ce que l'API supporte.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
