import path from 'node:path'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Senza questo, Turbopack risale la cartella dei Documenti in cerca di un lockfile
  // e sceglie la radice sbagliata.
  turbopack: { root: path.resolve(__dirname) },
}

export default nextConfig
