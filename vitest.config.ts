import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: [],
    // 🔴 Escopo em `src/` — @qa, Story 12.B4.
    //
    // Sem isto o vitest varria `.aiox-core/` e coletava 9 arquivos de teste do FRAMEWORK,
    // escritos para Jest e com dependências que este repo não instala (`js-yaml`, `execa`,
    // `describe`/`jest` globais). Resultado: `npx vitest run` sempre saiu com 9 arquivos
    // vermelhos, e nenhum deles era do projeto.
    //
    // O problema não é estético. Uma suíte que já nasce vermelha ensina quem a roda a
    // ignorar vermelho — e é embaixo desse ruído que uma falha de verdade passa. O
    // `.aiox-core/` é framework (L1/L2), não se modifica; escopar a config é a correção
    // do lado certo.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
