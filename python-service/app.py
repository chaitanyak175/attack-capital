from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import torch
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
import librosa
import numpy as np
import io
import logging
import os
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AMD HuggingFace Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and feature extractor
model = None
feature_extractor = None

def load_model():
    """Load the HuggingFace model and feature extractor"""
    global model, feature_extractor
    
    try:
        model_path = os.getenv("HF_MODEL_PATH", "jakeBland/wav2vec-vm-finetune")
        cache_dir = os.getenv("HF_CACHE_DIR", "./models")
        
        logger.info(f"Loading model from {model_path}")
        
        # Load feature extractor and model
        feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(
            model_path,
            cache_dir=cache_dir
        )
        
        model = Wav2Vec2ForSequenceClassification.from_pretrained(
            model_path,
            cache_dir=cache_dir
        )
        
        # Set model to evaluation mode
        model.eval()
        
        logger.info("Model loaded successfully")
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise e

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    load_model()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "feature_extractor_loaded": feature_extractor is not None
    }

@app.post("/predict")
async def predict_amd(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Predict if audio contains human speech or voicemail/machine
    
    Args:
        file: Audio file (WAV format preferred)
        
    Returns:
        Dict containing prediction results
    """
    if model is None or feature_extractor is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Read audio file
        audio_bytes = await file.read()
        
        # Load audio with librosa
        audio_data, sample_rate = librosa.load(
            io.BytesIO(audio_bytes),
            sr=16000,  # Wav2Vec2 expects 16kHz
            mono=True
        )
        
        # Ensure minimum length (pad if too short)
        min_length = 16000  # 1 second at 16kHz
        if len(audio_data) < min_length:
            audio_data = np.pad(audio_data, (0, min_length - len(audio_data)))
        
        # Truncate if too long (max 30 seconds for efficiency)
        max_length = 16000 * 30
        if len(audio_data) > max_length:
            audio_data = audio_data[:max_length]
        
        # Extract features
        inputs = feature_extractor(
            audio_data,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True
        )
        
        # Make prediction
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            
            # Apply softmax to get probabilities
            probabilities = torch.nn.functional.softmax(logits, dim=-1)
            
            # Get predicted class (0: machine/voicemail, 1: human)
            predicted_class = torch.argmax(probabilities, dim=-1).item()
            confidence = probabilities[0][predicted_class].item()
            
            # Map class to label
            label = "human" if predicted_class == 1 else "voicemail"
            
            logger.info(f"Prediction: {label} (confidence: {confidence:.3f})")
            
            return {
                "label": label,
                "confidence": float(confidence),
                "probabilities": {
                    "voicemail": float(probabilities[0][0]),
                    "human": float(probabilities[0][1])
                },
                "audio_duration": len(audio_data) / 16000,
                "sample_rate": 16000
            }
            
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/predict-raw")
async def predict_raw_audio(audio_data: bytes) -> Dict[str, Any]:
    """
    Predict from raw audio bytes (for streaming applications)
    
    Args:
        audio_data: Raw audio bytes
        
    Returns:
        Dict containing prediction results
    """
    if model is None or feature_extractor is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Convert bytes to numpy array (assuming 16-bit PCM, 16kHz)
        audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32)
        audio_array = audio_array / 32768.0  # Normalize to [-1, 1]
        
        # Ensure minimum length
        min_length = 16000  # 1 second
        if len(audio_array) < min_length:
            audio_array = np.pad(audio_array, (0, min_length - len(audio_array)))
        
        # Extract features
        inputs = feature_extractor(
            audio_array,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True
        )
        
        # Make prediction
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probabilities = torch.nn.functional.softmax(logits, dim=-1)
            
            predicted_class = torch.argmax(probabilities, dim=-1).item()
            confidence = probabilities[0][predicted_class].item()
            
            label = "human" if predicted_class == 1 else "voicemail"
            
            return {
                "label": label,
                "confidence": float(confidence),
                "probabilities": {
                    "voicemail": float(probabilities[0][0]),
                    "human": float(probabilities[0][1])
                },
                "audio_duration": len(audio_array) / 16000
            }
            
    except Exception as e:
        logger.error(f"Raw prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/model-info")
async def get_model_info():
    """Get information about the loaded model"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "model_name": os.getenv("HF_MODEL_PATH", "jakeBland/wav2vec-vm-finetune"),
        "model_type": "Wav2Vec2ForSequenceClassification",
        "expected_sample_rate": 16000,
        "num_labels": model.config.num_labels if hasattr(model.config, 'num_labels') else 2,
        "labels": ["voicemail/machine", "human"]
    }

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
