import os
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, request, render_template, jsonify, redirect, make_response
from gevent.pywsgi import WSGIServer
import requests
import numpy as np
from util import base64_to_pil
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.imagenet_utils import preprocess_input

# -------------------------------------------------------------------
# Load environment variables
# -------------------------------------------------------------------
load_dotenv(dotenv_path=Path(__file__).resolve().parent / '.env')

# -------------------------------------------------------------------
# Flask app setup
# -------------------------------------------------------------------
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'super-secret-key')

app.jinja_env.globals['SUPABASE_URL'] = os.environ.get('SUPABASE_URL', '')
app.jinja_env.globals['SUPABASE_ANON_KEY'] = os.environ.get('SUPABASE_ANON_KEY', '')

# -------------------------------------------------------------------
# Load TensorFlow model (no graph/session required)
# -------------------------------------------------------------------
MODEL_PATH = 'models/oldModel.h5'
model = load_model(MODEL_PATH)
print('✅ Model loaded successfully (TF 2.x eager mode).')

# -------------------------------------------------------------------
# Helper functions
# -------------------------------------------------------------------
def model_predict(img):
    """Run prediction directly with TensorFlow 2 eager execution."""
    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x, mode='tf')
    preds = model.predict(x)
    return preds


def _is_authenticated(req):
    try:
        from flask import session as flask_session
        if flask_session.get('user'):
            return True
    except Exception:
        pass
    token = req.cookies.get('sb-access-token')
    return token is not None and len(token) > 0

# -------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------
@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')


@app.route('/auth', methods=['GET'])
def auth_page():
    if _is_authenticated(request):
        return redirect('/dashboard')
    return render_template('auth.html')


@app.route('/dashboard', methods=['GET'])
def dashboard():
    if not _is_authenticated(request):
        return redirect('/')
    return render_template('dashboard.html')


@app.route('/session', methods=['POST'])
def create_session():
    data = request.get_json(silent=True) or {}
    access_token = data.get('access_token')
    if not access_token:
        return jsonify(error='missing access_token'), 400

    try:
        from flask import session as flask_session
        flask_session['user'] = True
    except Exception:
        pass

    resp = make_response(jsonify(ok=True))
    resp.set_cookie(
        'sb-access-token',
        access_token,
        httponly=True,
        secure=bool(os.environ.get('COOKIE_SECURE', '0') == '1'),
        samesite='Lax',
        path='/',
        max_age=60 * 60 * 24 * 7
    )
    return resp


@app.route('/logout', methods=['POST', 'GET'])
def logout():
    try:
        from flask import session as flask_session
        flask_session.clear()
    except Exception:
        pass

    if request.method == 'GET':
        resp = make_response(redirect('/'))
    else:
        resp = make_response(jsonify(ok=True))

    resp.delete_cookie('sb-access-token', path='/')
    return resp


@app.route('/predict', methods=['POST'])
def predict():
    """Handle X-ray image upload and predict pneumonia."""
    if not _is_authenticated(request):
        return jsonify(error='unauthorized'), 401

    try:
        img = base64_to_pil(request.json)
        uploads_dir = Path(__file__).resolve().parent / 'uploads'
        uploads_dir.mkdir(exist_ok=True)

        img_path = uploads_dir / 'image.jpg'
        img.save(img_path)

        img = image.load_img(img_path, target_size=(64, 64))
        preds = model_predict(img)
        result = preds[0, 0]

        diagnosis = "PNEUMONIA" if result > 0.5 else "NORMAL"
        print(f"[INFO] Prediction result: {diagnosis} ({result})")

        return jsonify(result=diagnosis)
    except Exception as e:
        print(f"[ERROR] Prediction failed: {e}")
        return jsonify(error=str(e)), 500


@app.route('/gemini', methods=['POST'])
def gemini_proxy():
    """Proxy for Gemini API."""
    if not _is_authenticated(request):
        return jsonify(error='unauthorized'), 401

    payload = request.get_json(silent=True) or {}
    user_message = payload.get('message', '')
    model_name = payload.get('model', 'gemini-1.5-flash')

    if not user_message:
        return jsonify(error='message is required'), 400

    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return jsonify(error='server not configured: GEMINI_API_KEY missing'), 500

    try:
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent'
        headers = {
            'Content-Type': 'application/json',
            'X-goog-api-key': api_key
        }
        body = {'contents': [{'parts': [{'text': user_message}]}]}

        r = requests.post(url, headers=headers, json=body, timeout=30)
        
        # Check for HTTP errors
        if not r.ok:
            error_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else {}
            error_msg = error_data.get('error', {}).get('message', f'HTTP {r.status_code}: {r.text}')
            print(f'[Gemini API Error] Status: {r.status_code}, Response: {r.text}')
            return jsonify(error=error_msg, detail=error_data), 502
        
        data = r.json()

        text = ''
        try:
            text = data['candidates'][0]['content']['parts'][0]['text']
        except (KeyError, IndexError) as e:
            print(f'[Gemini API] Failed to extract text from response: {e}')
            print(f'[Gemini API] Response data: {data}')
            text = ''

        return jsonify(reply=text, raw=data)
    except requests.RequestException as e:
        print(f'[Gemini API] Request exception: {e}')
        return jsonify(error='gemini request failed', detail=str(e)), 502
    except Exception as e:
        print(f'[Gemini API] Unexpected error: {e}')
        return jsonify(error='unexpected error', detail=str(e)), 500


# -------------------------------------------------------------------
# Run Flask app
# -------------------------------------------------------------------
if __name__ == '__main__':
    app.run(port=5002, debug=True, threaded=True)
