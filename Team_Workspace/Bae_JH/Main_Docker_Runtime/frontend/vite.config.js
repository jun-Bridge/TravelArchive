import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  envDir: resolve(__dirname, '../setting'), 
  
  root: resolve(__dirname, 'src'), 
  
  build: {
    outDir: resolve(__dirname, 'dist'), 
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // root가 src로 지정되었으므로 경로 탐색이 더 깔끔해집니다.
        main: resolve(__dirname, 'src/html/index.html'),
        map: resolve(__dirname, 'src/html/map.html')
      }
    }
  }
});