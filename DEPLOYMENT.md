# Deployment Guide

This Flask application can be deployed to various platforms. Choose the option that best fits your needs.

## Prerequisites

Before deploying, ensure you have:
- A `.env` file with the following environment variables:
  - `SECRET_KEY` - Flask secret key for sessions
  - `SUPABASE_URL` - Your Supabase project URL
  - `SUPABASE_ANON_KEY` - Your Supabase anonymous key
  - `GEMINI_API_KEY` - Google Gemini API key (optional, for AI chat feature)
  - `COOKIE_SECURE` - Set to `1` for HTTPS, `0` for HTTP (default: `0`)

## Option 1: Heroku (Recommended - Already Configured)

Your app already has a `Procfile` configured for Heroku deployment.

### Steps:

1. **Install Heroku CLI** (if not already installed)
   - Download from: https://devcenter.heroku.com/articles/heroku-cli

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create a new Heroku app**
   ```bash
   heroku create your-app-name
   ```

4. **Set environment variables**
   ```bash
   heroku config:set SECRET_KEY=your-secret-key-here
   heroku config:set SUPABASE_URL=your-supabase-url
   heroku config:set SUPABASE_ANON_KEY=your-supabase-anon-key
   heroku config:set GEMINI_API_KEY=your-gemini-api-key
   heroku config:set COOKIE_SECURE=1
   ```

5. **Add Python buildpack** (if not automatically detected)
   ```bash
   heroku buildpacks:set heroku/python
   ```

6. **Deploy**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```
   (If your default branch is `master`, use `git push heroku master`)

7. **Open your app**
   ```bash
   heroku open
   ```

### Important Notes for Heroku:
- Heroku has a 500MB slug size limit. TensorFlow models can be large, so you may need to:
  - Use Heroku's larger dyno types
  - Consider storing the model externally (S3, etc.) and loading it at runtime
- Free dynos are no longer available. You'll need a paid plan.
- The model file (`models/oldModel.h5`) will be included in deployment.

---

## Option 2: Render

Render is a modern alternative to Heroku with a free tier.

### Steps:

1. **Create a Render account** at https://render.com

2. **Create a new Web Service**
   - Connect your GitHub repository
   - Or use Render CLI

3. **Configure the service:**
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
   - **Environment:** Python 3

4. **Set environment variables** in the Render dashboard:
   - `SECRET_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `COOKIE_SECURE=1`

5. **Deploy** - Render will automatically deploy on git push

### Render Notes:
- Free tier has limitations (spins down after inactivity)
- Model size may be an issue on free tier
- Consider upgrading to paid plan for production

---

## Option 3: Railway

Railway is another modern platform with good Python support.

### Steps:

1. **Create a Railway account** at https://railway.app

2. **Create a new project** and connect your repository

3. **Railway will auto-detect Python** and use your `Procfile`

4. **Set environment variables** in Railway dashboard

5. **Deploy** - Railway auto-deploys on git push

---

## Option 4: DigitalOcean App Platform

### Steps:

1. **Create a DigitalOcean account**

2. **Create a new App** and connect your repository

3. **Configure:**
   - **Type:** Web Service
   - **Build Command:** `pip install -r requirements.txt`
   - **Run Command:** `gunicorn app:app --bind 0.0.0.0:8080`
   - **Environment Variables:** Add all required variables

4. **Deploy**

---

## Option 5: VPS Deployment (Ubuntu/Debian)

For full control, deploy to a VPS (DigitalOcean, AWS EC2, Linode, etc.).

### Steps:

1. **SSH into your server**
   ```bash
   ssh user@your-server-ip
   ```

2. **Install dependencies**
   ```bash
   sudo apt update
   sudo apt install python3 python3-pip python3-venv nginx
   ```

3. **Clone your repository**
   ```bash
   git clone your-repo-url
   cd util
   ```

4. **Create virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

5. **Create systemd service** (`/etc/systemd/system/pneumonia-app.service`):
   ```ini
   [Unit]
   Description=Pneumonia Detection Flask App
   After=network.target

   [Service]
   User=www-data
   WorkingDirectory=/path/to/your/app
   Environment="PATH=/path/to/your/app/venv/bin"
   ExecStart=/path/to/your/app/venv/bin/gunicorn app:app --bind 0.0.0.0:5000 --workers 4
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

6. **Create `.env` file** in your app directory with all environment variables

7. **Start the service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl start pneumonia-app
   sudo systemctl enable pneumonia-app
   ```

8. **Configure Nginx** (`/etc/nginx/sites-available/pneumonia-app`):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /static {
           alias /path/to/your/app/static;
       }
   }
   ```

9. **Enable Nginx site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/pneumonia-app /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

10. **Set up SSL with Let's Encrypt**
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

---

## Option 6: Docker Deployment

Create a `Dockerfile` for containerized deployment:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:5000"]
```

Then deploy to:
- **Docker Hub** + Any container hosting
- **AWS ECS/Fargate**
- **Google Cloud Run**
- **Azure Container Instances**

---

## Post-Deployment Checklist

- [ ] All environment variables are set correctly
- [ ] HTTPS is enabled (set `COOKIE_SECURE=1`)
- [ ] Model file is accessible
- [ ] Static files are being served correctly
- [ ] Database/authentication (Supabase) is working
- [ ] API keys are valid
- [ ] Error logging is configured
- [ ] Domain name is configured (if using custom domain)

---

## Troubleshooting

### Model Loading Issues
- Ensure `models/oldModel.h5` is included in deployment
- Check file paths are correct
- Verify TensorFlow version compatibility

### Memory Issues
- TensorFlow models can be memory-intensive
- Consider using larger instance types
- Monitor memory usage in production

### Static Files Not Loading
- Check static file paths in templates
- Verify Nginx/static file server configuration
- Ensure `static/` directory is included in deployment

### Authentication Issues
- Verify Supabase credentials
- Check CORS settings in Supabase dashboard
- Ensure cookies are working (check `COOKIE_SECURE` setting)

---

## Quick Start (Heroku)

If you want to deploy to Heroku right now:

```bash
# 1. Install Heroku CLI and login
heroku login

# 2. Create app
heroku create your-app-name

# 3. Set environment variables
heroku config:set SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
heroku config:set SUPABASE_URL=your-url
heroku config:set SUPABASE_ANON_KEY=your-key
heroku config:set GEMINI_API_KEY=your-key
heroku config:set COOKIE_SECURE=1

# 4. Deploy
git init
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

---

For more help, check the platform-specific documentation or open an issue.

