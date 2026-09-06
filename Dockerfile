FROM python:3.10-slim

# System dependencies for OpenCV, PyTorch CPU, and Media processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip
RUN python -m pip install --no-cache-dir --upgrade pip "setuptools>=62.3.0,<75.9" wheel

# Install PyTorch CPU version
RUN python -m pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy project files
COPY . /app

# Install project python dependencies
RUN python -m pip install --no-cache-dir opencv-python-headless pillow numpy hydra-core omegaconf huggingface_hub

# Install SAM 2 and Grounding DINO packages in editable mode
RUN python -m pip install --no-cache-dir -e .
RUN python -m pip install --no-cache-dir --no-build-isolation -e grounding_dino || true

# Pre-download SAM 2.1 and Grounding DINO checkpoints during Docker build
RUN mkdir -p gdino_checkpoints && \
    curl -L -o sam2.1_hiera_tiny.pt https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt && \
    curl -L -o gdino_checkpoints/groundingdino_swint_ogc.pth https://github.com/IDEA-Research/GroundingDINO/releases/download/v0.1.0-alpha/groundingdino_swint_ogc.pth

# Set environment for Hugging Face Spaces (Default Port 7860)
ENV PORT=7860
EXPOSE 7860

# Run AI Backend Server on Port 7860
CMD ["python", "ai_server.py", "--port", "7860"]
