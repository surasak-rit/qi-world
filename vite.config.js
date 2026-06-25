import { defineConfig } from 'vite';

// base = path ที่เว็บจะถูกเสิร์ฟ
//  - โฮสต์ที่ root domain (Vercel/Netlify/Cloudflare Pages/โดเมนของตัวเอง) ใช้ '/' (ค่าเริ่มต้น)
//  - GitHub Pages แบบ project site (https://user.github.io/qi-world/) ต้องตั้งเป็น '/qi-world/'
//    สั่งตอน build ได้ด้วย:  VITE_BASE=/qi-world/ npm run build
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
