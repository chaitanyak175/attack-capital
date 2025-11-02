#!/usr/bin/env python3

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import torch
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
import librosa
import numpy as np
import io
import logging
from typing import Dict, Any
import os
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AMD HuggingFace Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
feature_extractor = None
device = None

class PredictionResponse(BaseModel):
    label: str
    confidence: float
    processing_time_ms: float
    model_info: Dict[str, Any]

@app.on_event("startup")
async def load_model():
    """Load the HuggingFace model on startup"""
    global model, feature_extractor, device
    
    try:
        logger.info("Loading HuggingFace model: jakeBland/wav2vec-vm-finetune")
        
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {device}")
        
        model_name = "jakeBland/wav2vec-vm-finetune"
        model = Wav2Vec2ForSequenceClassification.from_pretrained(model_name)
        feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_name)
        
        model.to(device)
        model.eval()
        
        logger.info("Model loaded successfully")
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise e

def preprocess_audio(audio_data: bytes, target_sr: int = 16000) -> np.ndarray:
    """Preprocess audio data for the model"""
    try:
        audio_buffer = io.BytesIO(audio_data)
        audio, sr = librosa.load(audio_buffer, sr=target_sr)
        
        min_length = target_sr * 2
        if len(audio) < min_length:
            audio = np.pad(audio, (0, min_length - len(audio)), mode='constant')
        
        max_length = target_sr * 5
        if len(audio) > max_length:
            audio = audio[:max_length]
        
        return audio
        
    except Exception as e:
        logger.error(f"Audio preprocessing failed: {e}")
        raise HTTPException(status_code=400, detail=f"Audio preprocessing failed: {e}")

@app.post("/predict", response_model=PredictionResponse)
async def predict_amd(file: UploadFile = File(...)):
    """
    Predict AMD result from audio file
    Returns: {'label': 'human'|'voicemail', 'confidence': 0.95}
    """
    import time
    start_time = time.time()
    
    try:
        if model is None or feature_extractor is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        audio_data = await file.read()
        logger.info(f"Received audio file: {len(audio_data)} bytes")
        
        audio = preprocess_audio(audio_data)
        
        inputs = feature_extractor(
            audio, 
            sampling_rate=16000, 
            return_tensors="pt", 
            padding=True
        )
        
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            
        probabilities = torch.nn.functional.softmax(logits, dim=-1)
        predicted_class = torch.argmax(probabilities, dim=-1).item()
        confidence = probabilities[0][predicted_class].item()
        
        label = "human" if predicted_class == 1 else "voicemail"
        
        processing_time = (time.time() - start_time) * 1000
        
        logger.info(f"Prediction: {label} (confidence: {confidence:.3f}, time: {processing_time:.1f}ms)")
        
        return PredictionResponse(
            label=label,
            confidence=confidence,
            processing_time_ms=processing_time,
            model_info={
                "model_name": "jakeBland/wav2vec-vm-finetune",
                "device": str(device),
                "audio_length_seconds": len(audio) / 16000
            }
        )
        
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

@app.post("/predict-stream")
async def predict_stream_chunk(file: UploadFile = File(...)):
    """
    Process streaming audio chunk (2-5s buffer)
    Optimized for real-time processing
    """
    return await predict_amd(file)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "device": str(device) if device else None,
        "service": "HuggingFace AMD Service"
    }

@app.get("/model-info")
async def model_info():
    """Get model information"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "model_name": "jakeBland/wav2vec-vm-finetune",
        "device": str(device),
        "model_parameters": sum(p.numel() for p in model.parameters()),
        "model_size_mb": sum(p.numel() * p.element_size() for p in model.parameters()) / 1024 / 1024
    }

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting HuggingFace AMD Service on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
