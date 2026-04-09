import os
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from imblearn.over_sampling import SMOTE
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
import threading

status = {
    "is_training": False,
    "progress": 0,
    "message": "Idle",
    "metrics": {}
}

def generate_dummy_data(path):
    print("Generating dummy data since creditcard.csv is missing...")
    np.random.seed(42)
    n_samples = 5000
    times = np.random.uniform(0, 172792, n_samples)
    amounts = np.random.exponential(100, n_samples)
    v_features = np.random.randn(n_samples, 28)
    # create target: 1% fraud
    classes = np.random.choice([0, 1], size=n_samples, p=[0.99, 0.01])
    
    data = pd.DataFrame(v_features, columns=[f'V{i}' for i in range(1, 29)])
    data.insert(0, 'Time', times)
    data.insert(len(data.columns), 'Amount', amounts)
    data.insert(len(data.columns), 'Class', classes)
    
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data.to_csv(path, index=False)
    print("Dummy data generated.")

def build_ann(input_dim):
    model = Sequential([
        Dense(32, activation='relu', input_dim=input_dim),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dropout(0.2),
        Dense(1, activation='sigmoid')
    ])
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model

def train_models_task():
    global status
    status["is_training"] = True
    status["progress"] = 10
    status["message"] = "Loading dataset..."
    
    dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dataset', 'creditcard.csv'))
    models_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models'))
    os.makedirs(models_path, exist_ok=True)
    
    try:
        if not os.path.exists(dataset_path):
            generate_dummy_data(dataset_path)
            
        df = pd.read_csv(dataset_path)
        status["progress"] = 20
        status["message"] = "Preprocessing data..."
        
        # Normalize Time and Amount
        scaler = StandardScaler()
        df['normAmount'] = scaler.fit_transform(df['Amount'].values.reshape(-1, 1))
        df['normTime'] = scaler.fit_transform(df['Time'].values.reshape(-1, 1))
        df = df.drop(['Time', 'Amount'], axis=1)
        
        X = df.drop('Class', axis=1)
        y = df['Class']
        
        joblib.dump(scaler, os.path.join(models_path, 'scaler.pkl'))
        
        status["progress"] = 30
        status["message"] = "Handling class imbalance..."
        
        # Train test split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        
        # SMOTE
        sm = SMOTE(random_state=42)
        X_train_res, y_train_res = sm.fit_resample(X_train, y_train)
        
        metrics = {}
        
        # Train Logistic Regression
        status["progress"] = 40
        status["message"] = "Training Logistic Regression..."
        lr = LogisticRegression(max_iter=1000)
        lr.fit(X_train_res, y_train_res)
        y_pred_lr = lr.predict(X_test)
        
        metrics['Logistic Regression'] = {
            'accuracy': accuracy_score(y_test, y_pred_lr),
            'precision': precision_score(y_test, y_pred_lr, zero_division=0),
            'recall': recall_score(y_test, y_pred_lr, zero_division=0),
            'f1': f1_score(y_test, y_pred_lr, zero_division=0),
            'roc_auc': roc_auc_score(y_test, y_pred_lr),
            'confusion_matrix': confusion_matrix(y_test, y_pred_lr).tolist()
        }
        joblib.dump(lr, os.path.join(models_path, 'logistic_regression.pkl'))
        
        # Train Random Forest
        status["progress"] = 60
        status["message"] = "Training Random Forest..."
        rf = RandomForestClassifier(n_estimators=50, random_state=42) # reduced for speed
        rf.fit(X_train_res, y_train_res)
        y_pred_rf = rf.predict(X_test)
        
        metrics['Random Forest'] = {
            'accuracy': accuracy_score(y_test, y_pred_rf),
            'precision': precision_score(y_test, y_pred_rf, zero_division=0),
            'recall': recall_score(y_test, y_pred_rf, zero_division=0),
            'f1': f1_score(y_test, y_pred_rf, zero_division=0),
            'roc_auc': roc_auc_score(y_test, y_pred_rf),
            'confusion_matrix': confusion_matrix(y_test, y_pred_rf).tolist()
        }
        joblib.dump(rf, os.path.join(models_path, 'random_forest.pkl'))
        
        # Train Deep Learning
        status["progress"] = 80
        status["message"] = "Training Deep Learning Model..."
        ann = build_ann(X_train_res.shape[1])
        ann.fit(X_train_res, y_train_res, epochs=5, batch_size=64, verbose=0)
        y_pred_prob_ann = ann.predict(X_test)
        y_pred_ann = (y_pred_prob_ann > 0.5).astype(int)
        
        metrics['Deep Learning (ANN)'] = {
            'accuracy': accuracy_score(y_test, y_pred_ann),
            'precision': precision_score(y_test, y_pred_ann, zero_division=0),
            'recall': recall_score(y_test, y_pred_ann, zero_division=0),
            'f1': f1_score(y_test, y_pred_ann, zero_division=0),
            'roc_auc': roc_auc_score(y_test, y_pred_prob_ann),
            'confusion_matrix': confusion_matrix(y_test, y_pred_ann).tolist()
        }
        ann.save(os.path.join(models_path, 'ann_model.h5'))
        
        status["progress"] = 100
        status["message"] = "Training completed successfully."
        status["metrics"] = metrics
        status["is_training"] = False
        
    except Exception as e:
        status["is_training"] = False
        status["message"] = f"Training failed: {str(e)}"
        print(f"Error: {e}")

def start_training():
    if not status["is_training"]:
        thread = threading.Thread(target=train_models_task)
        thread.start()
        return {"message": "Training started"}
    return {"message": "Training already in progress"}

def get_status():
    return status
