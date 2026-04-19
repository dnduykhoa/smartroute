# SmartRoute Deployment Guide

Huong dan deploy full project SmartRoute (Backend + Frontend) theo cach don gian, on dinh va de mo rong.

## 1. Kien truc khuyen nghi

- Backend Node.js/Express: deploy tren Render, Railway, Fly.io, VPS (PM2 + Nginx) deu duoc.
- Frontend React/Vite: deploy tren Vercel hoac Netlify.
- MongoDB: MongoDB Atlas (cloud) hoac self-hosted.

## 2. Chuan bi truoc khi deploy

- Tao MongoDB production database.
- Tao 1 JWT secret dai, ngau nhien, kho doan.
- Tao mail app password (neu can forgot/reset password).
- Xac dinh domain:
- Frontend: vi du https://app.smartroute.com
- Backend: vi du https://api.smartroute.com

## 3. Deploy Backend (SmartRoute_backend)

### 3.1 Environment variables

Tao file `.env` tren platform deploy tu mau `.env.example`:

- NODE_ENV=production
- PORT=3000
- MONGODB_URL=<your_mongodb_connection_string>
- JWT_SECRET=<your_long_random_secret>
- CORS_ORIGINS=https://app.smartroute.com
- MAIL_USER=<your_email>
- MAIL_PASS=<your_gmail_app_password>

Neu co nhieu frontend origin, cach nhau boi dau phay:

- CORS_ORIGINS=https://app.smartroute.com,https://admin.smartroute.com

### 3.2 Build/Start command

- Build command: (de trong)
- Start command: `npm start`

### 3.3 Seed role mac dinh (quan trong)

Sau khi deploy backend lan dau, chay:

```bash
npm run seed:defaults
```

Canh bao: phai seed role truoc khi dang ky user moi.

### 3.4 Kiem tra nhanh

- `GET /` -> backend phan hoi.
- `POST /auth/login` -> login duoc.
- `POST /auth/forgot-password` -> gui mail (neu mail config dung).

## 4. Deploy Frontend (SmartRoute_frontend)

### 4.1 Environment variables

Tao `.env.production` (hoac config tren Vercel/Netlify):

- VITE_API_URL=https://api.smartroute.com

### 4.2 Build settings

- Build command: `npm run build`
- Output dir: `dist`

### 4.3 SPA routing rewrite (bat buoc)

Can rewrite tat ca route ve `index.html` de React Router hoat dong:

- Vercel: them `vercel.json` rewrite.
- Netlify: tao file `_redirects` voi noi dung: `/* /index.html 200`
- Nginx: `try_files $uri /index.html;`

## 5. Domain + HTTPS

- Gan custom domain cho frontend va backend.
- Bat HTTPS/TLS (da co san tren Vercel/Netlify/Render).
- Dam bao frontend goi API qua `https://`.

## 6. Production checklist

- Khong dung JWT_SECRET mac dinh.
- Khong de lo MAIL_PASS/JWT_SECRET tren git.
- CORS chi cho phep origin frontend that su dung.
- MongoDB chi mo IP can thiet (hoac private network neu duoc).
- Backup database dinh ky.
- Theo doi log loi backend.

## 7. Goi y stack de trien khai nhanh

Phuong an nhanh va de quan ly:

- Backend: Render Web Service
- Frontend: Vercel
- Database: MongoDB Atlas

## 7.1 Trien khai nhanh theo bo file da tao san

Workspace da co san:

- `render.yaml` cho backend
- `SmartRoute_frontend/vercel.json` cho frontend SPA rewrite
- `SmartRoute_backend/.env.example`
- `SmartRoute_frontend/.env.example`

Lam theo thu tu nay:

1. Day code len 1 GitHub repository (can cho ca Render va Vercel).
2. Render: New + Blueprint + chon repository chua `render.yaml`.
3. Dien env vars backend tren Render: MONGODB_URL, JWT_SECRET, CORS_ORIGINS, MAIL_USER, MAIL_PASS.
4. Deploy backend, lay URL backend vi du `https://smartroute-backend.onrender.com`.
5. Vercel: Import repository, root la `SmartRoute_frontend`.
6. Dien env var frontend: VITE_API_URL = URL backend vua deploy.
7. Redeploy frontend va test dang nhap, users, orders.

Phuong an toan quyen kiem soat:

- 1 VPS Ubuntu + Nginx
- Backend chay PM2
- Frontend build static va serve qua Nginx
- MongoDB Atlas hoac MongoDB rieng

## 8. Lenh local de test truoc khi len production

Backend:

```bash
cd SmartRoute_backend
npm install
npm run seed:defaults
npm start
```

Frontend:

```bash
cd SmartRoute_frontend
npm install
npm run build
npm run preview
```

Neu can, co the them Dockerfile + docker-compose cho ca frontend/backend trong buoc tiep theo.
