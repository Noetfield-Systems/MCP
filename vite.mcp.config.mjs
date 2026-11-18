import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';
import path from 'node:path';
export default defineConfig({
  root:path.resolve('apps'),
  plugins:[viteSingleFile()],
  base:'./',
  build:{
    outDir:path.resolve('dist'),
    emptyOutDir:true,
    rollupOptions:{input:path.resolve('apps/index.html')},
    cssCodeSplit:false,minify:true
  }
});
