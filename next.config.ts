import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Esconde o indicador de dev do Next (a "bolinha" flutuante no canto).
  // Erros de compilação/runtime continuam aparecendo normalmente.
  devIndicators: false,
};

export default nextConfig;
