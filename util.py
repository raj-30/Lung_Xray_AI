"""Utilities for image conversion and processing."""
import re
import base64
import numpy as np
from PIL import Image
from io import BytesIO


def base64_to_pil(data):
    """
    Convert base64-encoded image data (string or JSON) to a PIL image.

    Accepts:
      - raw base64 string
      - JSON object like { "image": "<data>" }

    Returns:
      PIL.Image.Image
    """
    if isinstance(data, dict):
        # If the incoming JSON has an "image" key
        img_base64 = data.get("image", "")
    else:
        img_base64 = data or ""

    if not isinstance(img_base64, str) or not img_base64.strip():
        raise ValueError("Invalid base64 input: must be a non-empty string")

    # Remove the header (e.g. data:image/jpeg;base64,)
    image_data = re.sub(r'^data:image\/[a-zA-Z]+;base64,', '', img_base64)

    try:
        pil_image = Image.open(BytesIO(base64.b64decode(image_data))).convert("RGB")
    except Exception as e:
        raise ValueError(f"Failed to decode base64 image: {e}")

    return pil_image


def np_to_base64(img_np):
    """
    Convert numpy RGB image to base64-encoded PNG string.
    """
    if not isinstance(img_np, np.ndarray):
        raise TypeError("Expected numpy array")

    img = Image.fromarray(img_np.astype('uint8'), 'RGB')
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffered.getvalue()).decode("ascii")
