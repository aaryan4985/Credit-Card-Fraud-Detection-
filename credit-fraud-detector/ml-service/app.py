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
    # Attempt to load Random Forest by default if available
    try:
        if os.path.exists(os.path.join(models_path, 'random_forest.pkl')):
            return joblib.load(os.path.join(models_path, 'random_forest.pkl'))
        elif os.path.exists(os.path.join(models_path, 'logistic_regression.pkl')):
            return joblib.load(os.path.join(models_path, 'logistic_regression.pkl'))
        elif os.path.exists(os.path.join(models_path, 'ann_model.h5')):
            return load_model(os.path.join(models_path, 'ann_model.h5'))
    except Exception as e:
        print(f"Error loading model: {e}")
    return None

@app.route('/train', methods=['POST'])
def train_api():
    result = start_training()
    return jsonify(result)

@app.route('/model-status', methods=['GET'])
def model_status_api():
    return jsonify(get_status())

@app.route('/predict', methods=['POST'])
def predict_api():
    data = request.json
    model = load_best_model()

    if not model:
        return jsonify({"error": "No trained model found. Please train the model first."}), 400

    try:
        # Expected input features
        features = data.get('features', [])
        if len(features) != 30: # 1 Time + 28 V_features + 1 Amount
            return jsonify({"error": f"Expected 30 features, got {len(features)}"}), 400

        # Create DataFrame
        columns = ['Time'] + [f'V{i}' for i in range(1, 29)] + ['Amount']
        df = pd.DataFrame([features], columns=columns)

        # Scale Time and Amount if scaler exists
        if os.path.exists(os.path.join(models_path, 'scaler.pkl')):
            scaler = joblib.load(os.path.join(models_path, 'scaler.pkl'))
            df['normAmount'] = scaler.transform(df['Amount'].values.reshape(-1, 1))
            df['normTime'] = scaler.transform(df['Time'].values.reshape(-1, 1))
            df = df.drop(['Time', 'Amount'], axis=1)
        else:
            df['normAmount'] = df['Amount']
            df['normTime'] = df['Time']
            df = df.drop(['Time', 'Amount'], axis=1)

        # Predict
        if hasattr(model, 'predict_proba'): # Sklearn models
            proba = model.predict_proba(df)[0]
            prediction = int(np.argmax(proba))
            confidence = float(proba[1] if prediction == 1 else proba[0])
        else: # Keras model
            pred_prob = model.predict(df)[0][0]
            prediction = 1 if pred_prob > 0.5 else 0
            confidence = float(pred_prob if prediction == 1 else 1 - pred_prob)

        return jsonify({
            "prediction": "Fraud" if prediction == 1 else "Not Fraud",
            "confidence": confidence,
            "probability_percentage": round(confidence * 100, 2)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
