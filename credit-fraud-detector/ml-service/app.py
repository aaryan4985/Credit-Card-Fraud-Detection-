from flask import Flask, request, jsonify
from flask_cors import CORS
from train import start_training, get_status
import joblib
import pandas as pd
import numpy as np
import os
from tensorflow.keras.models import load_model

app = Flask(__name__)
CORS(app)

models_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models'))

def load_best_model():
    """Load the best trained model or fall back to available models"""
    try:
        # Try to load best model name first
        if os.path.exists(os.path.join(models_path, 'best_model_name.pkl')):
            best_name = joblib.load(os.path.join(models_path, 'best_model_name.pkl'))
            model_file = best_name.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('/', '_') + '.pkl'
            if os.path.exists(os.path.join(models_path, model_file)):
                return joblib.load(os.path.join(models_path, model_file)), best_name
        
        # Fallback to available models in order of preference
        model_preferences = [
            ('ensemble.pkl', 'Ensemble (Voting)'),
            ('xgboost.pkl', 'XGBoost'),
            ('lightgbm.pkl', 'LightGBM'),
            ('gradient_boosting.pkl', 'Gradient Boosting'),
            ('random_forest.pkl', 'Random Forest'),
            ('logistic_regression.pkl', 'Logistic Regression'),
            ('svm.pkl', 'SVM'),
            ('knn.pkl', 'KNN'),
        ]
        
        for filename, name in model_preferences:
            if os.path.exists(os.path.join(models_path, filename)):
                return joblib.load(os.path.join(models_path, filename)), name
        
        # Try ANN
        if os.path.exists(os.path.join(models_path, 'ann_model.h5')):
            return load_model(os.path.join(models_path, 'ann_model.h5')), 'Deep Learning (ANN)'
    except Exception as e:
        print(f"Error loading model: {e}")
    return None, None

def preprocess_features(features):
    """Preprocess features with engineering for prediction"""
    # Load feature columns and scaler
    feature_cols_path = os.path.join(models_path, 'feature_columns.pkl')
    scaler_path = os.path.join(models_path, 'scaler.pkl')
    
    if os.path.exists(feature_cols_path):
        feature_cols = joblib.load(feature_cols_path)
    else:
        # Default columns
        feature_cols = ['Time'] + [f'V{i}' for i in range(1, 29)] + ['Amount']
    
    # Create DataFrame
    if len(features) == 30:
        columns = ['Time'] + [f'V{i}' for i in range(1, 29)] + ['Amount']
    else:
        columns = feature_cols[:len(features)]
    
    df = pd.DataFrame([features], columns=columns)
    
    # Feature engineering
    if 'Amount' in df.columns:
        df['log_amount'] = np.log1p(df['Amount'])
        df['amount_squared'] = df['Amount'] ** 2
    
    if 'Time' in df.columns:
        df['time_hour'] = (df['Time'] % 86400) / 3600
        df['time_is_night'] = ((df['Time'] % 86400) < 21600).astype(int)
    
    # Scale features
    if os.path.exists(scaler_path):
        scaler = joblib.load(scaler_path)
        if 'Amount' in df.columns:
            df['normAmount'] = scaler.transform(df['Amount'].values.reshape(-1, 1))
        if 'Time' in df.columns:
            df['normTime'] = scaler.transform(df['Time'].values.reshape(-1, 1))
        if 'log_amount' in df.columns:
            df['normLogAmount'] = scaler.transform(df['log_amount'].values.reshape(-1, 1))
    
    # Select only the features the model was trained on
    available_cols = [col for col in feature_cols if col in df.columns]
    df = df[available_cols]
    
    return df

@app.route('/train', methods=['POST'])
def train_api():
    result = start_training()
    return jsonify(result)

@app.route('/model-status', methods=['GET'])
def model_status_api():
    return jsonify(get_status())

@app.route('/models', methods=['GET'])
def list_models_api():
    """List all available trained models"""
    available_models = []
    try:
        if os.path.exists(os.path.join(models_path, 'best_model_name.pkl')):
            best_name = joblib.load(os.path.join(models_path, 'best_model_name.pkl'))
            available_models.append({'name': best_name, 'is_best': True})
        
        model_files = [
            ('ensemble.pkl', 'Ensemble (Voting)'),
            ('xgboost.pkl', 'XGBoost'),
            ('lightgbm.pkl', 'LightGBM'),
            ('gradient_boosting.pkl', 'Gradient Boosting'),
            ('random_forest.pkl', 'Random Forest'),
            ('logistic_regression.pkl', 'Logistic Regression'),
            ('svm.pkl', 'SVM'),
            ('knn.pkl', 'KNN'),
            ('ann_model.h5', 'Deep Learning (ANN)'),
        ]
        
        for filename, name in model_files:
            if os.path.exists(os.path.join(models_path, filename)):
                if name not in [m['name'] for m in available_models]:
                    available_models.append({'name': name, 'is_best': False})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    return jsonify({'models': available_models})

@app.route('/metrics', methods=['GET'])
def metrics_api():
    """Get comprehensive metrics for all models"""
    status = get_status()
    return jsonify({
        'metrics': status.get('metrics', {}),
        'cross_validation_scores': status.get('cross_validation_scores', {}),
        'feature_importance': status.get('feature_importance', {}),
        'training_history': status.get('training_history', {}),
        'best_params': status.get('best_params', {})
    })

@app.route('/feature-importance', methods=['GET'])
def feature_importance_api():
    """Get feature importance from tree-based models"""
    status = get_status()
    return jsonify(status.get('feature_importance', {}))

@app.route('/training-history', methods=['GET'])
def training_history_api():
    """Get ANN training history"""
    status = get_status()
    return jsonify(status.get('training_history', {}))

import time

@app.route('/predict', methods=['POST'])
def predict_api():
    # Add 1-2 second delay for realistic processing time
    time.sleep(1.5)
    
    data = request.json
    model, model_name = load_best_model()

    if not model:
        return jsonify({"error": "No trained model found. Please train the model first."}), 400

    try:
        features = data.get('features', [])
        
        # Support both 30 features (legacy) and variable length
        if len(features) < 28:
            return jsonify({"error": f"Expected at least 28 features, got {len(features)}"}), 400

        # Preprocess features
        df = preprocess_features(features)

        # Predict - get probability of fraud (class 1)
        if hasattr(model, 'predict_proba'):
            proba = model.predict_proba(df)[0]
            # proba[0] = probability of class 0 (Not Fraud), proba[1] = probability of class 1 (Fraud)
            fraud_probability = float(proba[1])
            # Use fraud probability directly - if > 0.5, predict fraud
            prediction = 1 if fraud_probability > 0.5 else 0
            confidence = fraud_probability if prediction == 1 else float(proba[0])
        else:
            # For ANN/Keras models
            pred_prob = model.predict(df, verbose=0)[0][0]
            prediction = 1 if pred_prob > 0.5 else 0
            confidence = float(pred_prob if prediction == 1 else 1 - pred_prob)

        return jsonify({
            "prediction": "Fraud" if prediction == 1 else "Not Fraud",
            "confidence": confidence,
            "probability_percentage": round(confidence * 100, 2),
            "fraud_probability": fraud_probability if hasattr(model, 'predict_proba') else float(pred_prob),
            "model_used": model_name
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/predict-batch', methods=['POST'])
def predict_batch_api():
    """Predict multiple transactions at once"""
    data = request.json
    model, model_name = load_best_model()
    
    if not model:
        return jsonify({"error": "No trained model found. Please train the model first."}), 400
    
    try:
        transactions = data.get('transactions', [])
        if not transactions:
            return jsonify({"error": "No transactions provided"}), 400
        
        results = []
        for features in transactions:
            df = preprocess_features(features)
            
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba(df)[0]
                prediction = int(np.argmax(proba))
                confidence = float(max(proba))
            else:
                pred_prob = model.predict(df, verbose=0)[0][0]
                prediction = 1 if pred_prob > 0.5 else 0
                confidence = float(pred_prob if prediction == 1 else 1 - pred_prob)
            
            results.append({
                "prediction": "Fraud" if prediction == 1 else "Not Fraud",
                "confidence": confidence,
                "probability_percentage": round(confidence * 100, 2)
            })
        
        return jsonify({
            "results": results,
            "total": len(results),
            "fraud_count": sum(1 for r in results if r['prediction'] == 'Fraud'),
            "model_used": model_name
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
