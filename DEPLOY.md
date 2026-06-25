# คู่มือรัน & ดีพลอยขึ้น Cloud — Qi World

เกมนี้เป็น **เว็บ static ล้วน** (frontend อย่างเดียว) — ไม่มี backend, ไม่มีฐานข้อมูล, ไม่ต้องตั้งค่า environment variable ใด ๆ
ความคืบหน้าของผู้เล่นเก็บไว้ใน `localStorage` ของเบราว์เซอร์แต่ละเครื่อง

> สรุปสั้น ๆ สำหรับคนรีบ: build ด้วย `npm run build` → เอาโฟลเดอร์ `dist/` ไปวางบน static hosting ที่ไหนก็ได้ จบ

---

## 1. สิ่งที่ต้องมี

- **Node.js เวอร์ชัน 18 ขึ้นไป** (แนะนำ 20 LTS) — เช็คด้วย `node --version`
- npm (ติดมากับ Node อยู่แล้ว)
- ถ้าจะ deploy แบบเชื่อม GitHub: บัญชี GitHub (repo อยู่ที่ https://github.com/surasak-rit/qi-world)

---

## 2. ดึงโค้ดมาที่เครื่อง / เซิร์ฟเวอร์

```bash
git clone https://github.com/surasak-rit/qi-world.git
cd qi-world
npm install
```

---

## 3. รันบนเครื่องตัวเอง (ทดสอบก่อนขึ้น cloud)

```bash
# โหมดพัฒนา (hot reload) — เปิดที่ URL ที่ขึ้นมา เช่น http://localhost:5173
npm run dev

# สร้างไฟล์ production ลงโฟลเดอร์ dist/
npm run build

# ลองเปิดไฟล์ที่ build แล้ว เสมือนอยู่บน production
npm run preview
```

---

## 4. ดีพลอยขึ้น Cloud — เลือกวิธีที่ถนัด (เรียงจากง่ายสุด)

### วิธี A — Vercel (ง่ายสุด, ฟรี, แนะนำ)

1. ไปที่ https://vercel.com → Sign in ด้วย GitHub
2. กด **Add New… → Project** แล้วเลือก repo `qi-world`
3. Vercel จะตรวจเจอ Vite อัตโนมัติ ตั้งค่าให้เป็น:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. กด **Deploy** — เสร็จแล้วได้ URL ใช้งานทันที
5. ทุกครั้งที่ `git push` ขึ้น GitHub มันจะ build + deploy ใหม่ให้เอง

### วิธี B — Netlify (ฟรี, ง่ายพอกัน)

1. https://app.netlify.com → **Add new site → Import an existing project** → เลือก GitHub repo
2. ตั้งค่า:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. กด Deploy

### วิธี C — Cloudflare Pages (ฟรี, เร็ว)

1. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**
2. เลือก repo, ตั้งค่า:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Deploy

### วิธี D — GitHub Pages (ฟรี แต่ต้องตั้ง base path)

GitHub Pages แบบ project site จะเสิร์ฟที่ `https://surasak-rit.github.io/qi-world/`
ต้อง build ด้วย **base path** ให้ตรง ไม่งั้นไฟล์ asset จะ 404:

```bash
VITE_BASE=/qi-world/ npm run build
```

แล้วเอา `dist/` ไปขึ้น branch `gh-pages` (ทำมือ หรือใช้ GitHub Actions)
ตัวอย่าง Actions: สร้างไฟล์ `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages
on:
  push: { branches: [master] }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: VITE_BASE=/qi-world/ npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/deploy-pages@v4
```

จากนั้นไปที่ repo → Settings → Pages → Source = GitHub Actions

### วิธี E — เครื่อง Cloud ของตัวเอง (VPS / VM เช่น AWS EC2, DigitalOcean)

build แล้วเสิร์ฟ `dist/` ด้วย web server อะไรก็ได้:

```bash
npm run build

# วิธีเร็วที่สุด เสิร์ฟชั่วคราว
npx serve dist -l 8080

# หรือใช้ nginx: ก็อป dist/ ไป /var/www/qi-world แล้วชี้ root ไปที่นั่น
```

ตัวอย่าง nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/qi-world;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
```

### วิธี F — Docker (สำหรับ container / Kubernetes)

สร้างไฟล์ `Dockerfile`:
```dockerfile
# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- serve ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```
```bash
docker build -t qi-world .
docker run -p 8080:80 qi-world
# เปิด http://localhost:8080
```

---

## 5. เรื่องที่ควรรู้

- **ไม่ต้องมี backend/ฐานข้อมูล/.env** — เป็นไฟล์ static ทั้งหมด เอาขึ้น CDN หรือ object storage (S3 + CloudFront ฯลฯ) ก็ได้
- **เซฟเกมอยู่ในเบราว์เซอร์** (`localStorage`) — แยกตามเครื่อง/เบราว์เซอร์ ล้าง cache ของไซต์แล้วเซฟหาย (ยังไม่มีระบบบัญชี/cloud save)
- **ตอนนี้ดึง `three` จาก CDN ผ่าน import map ด้วย** เผื่อเปิดแบบ static server ตรง ๆ — แต่เวลา `npm run build`, Vite จะ bundle `three` เข้าไฟล์เองอยู่แล้ว จึงทำงานได้แม้เครื่องผู้เล่นต่อ CDN ไม่ได้
- ไฟล์ JS ก้อนเดียว ~512KB (gzip ~133KB) เพราะรวม Three.js — ปกติสำหรับเกม 3D บนเว็บ

---

## 6. แก้ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|------|----------------|
| หน้าจอขาว เปิดมาไม่เห็นอะไร | เปิด DevTools (F12) ดู Console — มักเป็นเรื่อง path ของ asset |
| asset 404 (เช่นบน GitHub Pages) | ลืม build ด้วย `VITE_BASE=/qi-world/` ให้ตรง subpath |
| `node: command not found` บนเซิร์ฟเวอร์ | ยังไม่ได้ติดตั้ง Node 18+ (ใช้ nvm หรือ package ของ distro) |
| build error เรื่อง memory บน VM เล็ก | ใช้ VM ที่ RAM ≥ 1GB หรือ build บนเครื่องอื่นแล้วอัป `dist/` ไปแทน |
| กดปุ่มในเกมไม่ทำงานหลัง deploy | ลอง hard refresh (Ctrl/Cmd+Shift+R) เคลียร์ cache เก่า |

---

## 7. คำสั่งสรุป (cheat sheet)

```bash
git clone https://github.com/surasak-rit/qi-world.git && cd qi-world
npm install
npm run dev        # พัฒนา
npm run build      # ได้ dist/ เอาไปขึ้น cloud
npm run preview    # ลองดู production บนเครื่อง
```
