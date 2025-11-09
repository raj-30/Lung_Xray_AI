# Pneumonia Detection — Flask Web App (Chest X‑Ray CNN)

[![Python](https://img.shields.io/badge/python-3.10%2B-blue.svg)]()
[![Flask](https://img.shields.io/badge/Flask-%3E%3D1.1-brightgreen.svg)]()
[![Keras](https://img.shields.io/badge/Keras-2.3.1-red.svg)]()
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-important.svg)]()

A simple Flask web application that performs pneumonia detection from chest X‑ray images using a CNN model. This README provides setup, run, and troubleshooting steps formatted for GitHub.

Quick links

- Project root: app.py, util.py, templates/, static/, models/oldModel.h5
- Dashboard: /dashboard (requires authentication)
- Prediction endpoint: POST /predict (expects base64 image payload)

1 — System requirements

- OS: Windows 10/11, macOS, or Ubuntu
- Python: 3.10 or 3.11 recommended
- RAM: ≥ 8 GB (TensorFlow can be memory hungry)
- Disk: ≥ 2 GB free
- GPU: optional (NVIDIA + CUDA for faster TF inference)

2 — Clone the repository

```bash
git clone https://github.com/<your-org>/<your-repo>.git
cd <your-repo>
```

3 — Create an isolated Python environment
Using conda (recommended):

```bash
conda create -n pneumonia-ai python=3.10 -y
conda activate pneumonia-ai
```

Or using venv:

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

4 — Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

5 — Configure environment variables
Create a `.env` file in the project root (same folder as `app.py`) with the following values:

```
SECRET_KEY=super-secret-key
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-google-gemini-api-key
COOKIE_SECURE=0
```

Do not commit `.env` to public repos.

6 — Place your trained model
Put your Keras/TensorFlow .h5 model at:

```
models/oldModel.h5
```

Note: model input size must match the code (the app uses target size 64×64 by default). Adjust `app.py` preprocessing if your model requires a different size.

7 — Run the Flask app (development)

```bash
python app.py
```

Expected output (example):

```
 * Running on http://127.0.0.1:5002/
```

Open: http://127.0.0.1:5002/

8 — Using the app

- Visit the home page and sign in (Supabase/Google flow).
- Go to Dashboard.
- Upload an X‑ray image (JPG/PNG). The UI sends a base64 image to `/predict`.
- The server returns JSON: e.g. `{ "result": "PNEUMONIA" }`.

9 — Production & deployment snippets
Gunicorn (example):

```bash
# Simple run
gunicorn -b 0.0.0.0:5000 app:app

# With gevent
gunicorn -k gevent -w 1 app:app -b 0.0.0.0:5000
```

Docker (simple Dockerfile example):

```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:5000"]
```

10 — Troubleshooting & common fixes

- tensorflow not found
  - pip install tensorflow==2.12.0
- Error loading model
  - Confirm `models/oldModel.h5` exists and matches Keras/TensorFlow versions
- ModuleNotFoundError: dotenv
  - pip install python-dotenv
- Static files not loading
  - Confirm the `static/` and `templates/` directories are in the application root
- Memory issues (TF)
  - Increase instance memory or use smaller model; consider loading model lazily or using an external inference service

11 — Optional: environment.yml (Conda one‑command setup)
Save as `environment.yml` and share with your team:

```yaml
name: pneumonia-ai
channels:
  - defaults
dependencies:
  - python=3.10.9
  - pip
  - pip:
      - flask==3.0.3
      - gevent==24.2.1
      - gunicorn==22.0.0
      - requests==2.32.3
      - python-dotenv==1.0.1
      - tensorflow==2.12.0
      - keras==2.12.0
      - numpy==1.23.5
      - h5py==3.8.0
      - pillow==10.3.0
```

12 — Notes

- The app may lazy-load the model (recommended) to reduce startup memory usage — check `app.py` for model-loading logic.
- Never commit private API keys or secrets to a public repository.

Credits

- Original authors and contributors
- Designed by Raj Gajjar & Sadhu Dhwanika


