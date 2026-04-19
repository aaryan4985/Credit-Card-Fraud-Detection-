import os
import pandas as pd
import numpy as np
import joblib
import json
import time
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV, StratifiedKFold
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score, 
                             roc_auc_score, confusion_matrix, matthews_corrcoef)
from imblearn.over_sampling import SMOTE, BorderlineSMOTE, ADASYN
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
import threading
import warnings
warnings.filterwarnings('ignore')

# Try to import optional libraries
try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("XGBoost not available, skipping...")

try:
    from lightgbm import LGBMClassifier
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    print("LightGBM not available, skipping...")

status = {
    "is_training": False,
    "progress": 0,
    "message": "Idle",
    "metrics": {},
    "feature_importance": {},
    "training_history": [],
    "cross_validation_scores": {},
    "best_params": {}
}

def generate_realistic_data(path):
    """Generate more realistic credit card transaction data"""
    print("Generating realistic synthetic data...")
    np.random.seed(42)
    n_samples = 10000
    
    times = np.random.uniform(0, 172792, n_samples)
    amounts = np.random.lognormal(mean=4.5, sigma=1.2, size=n_samples)
    amounts = np.clip(amounts, 1, 10000)
    
    v_features = np.random.randn(n_samples, 28)
    for i in range(5):
        v_features[:, i] += 0.3 * v_features[:, (i+1) % 5]
    
    fraud_prob = (
        0.001 + 
        0.002 * (v_features[:, 0] > 1.5).astype(float) +
        0.003 * (v_features[:, 1] < -1).astype(float) +
        0.002 * (amounts > 500).astype(float) +
        0.001 * (v_features[:, 2] > 2).astype(float)
    )
    fraud_prob = np.clip(fraud_prob, 0.001, 0.02)
    classes = np.random.binomial(1, fraud_prob)
    
    data = pd.DataFrame(v_features, columns=[f'V{i}' for i in range(1, 29)])
    data.insert(0, 'Time', times)
    data.insert(len(data.columns), 'Amount', amounts)
    data.insert(len(data.columns), 'Class', classes)
    
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data.to_csv(path, index=False)
    print(f"Generated {len(data)} samples with {classes.sum()} fraud cases ({100*classes.sum()/len(classes):.2f}%)")

def build_advanced_ann(input_dim):
    """Build a more sophisticated ANN architecture"""
    model = Sequential([
        Dense(128, activation='relu', input_dim=input_dim, kernel_initializer='he_normal'),
        BatchNormalization(),
        Dropout(0.3),
        Dense(64, activation='relu', kernel_initializer='he_normal'),
        BatchNormalization(),
        Dropout(0.3),
        Dense(32, activation='relu', kernel_initializer='he_normal'),
        BatchNormalization(),
        Dropout(0.2),
        Dense(16, activation='relu', kernel_initializer='he_normal'),
        Dropout(0.2),
        Dense(1, activation='sigmoid')
    ])
    
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]
    )
    return model

def calculate_comprehensive_metrics(y_true, y_pred, y_pred_proba=None):
    """Calculate comprehensive evaluation metrics"""
    cm = confusion_matrix(y_true, y_pred)
    
    metrics = {
        'accuracy': float(accuracy_score(y_true, y_pred)),
        'precision': float(precision_score(y_true, y_pred, zero_division=0)),
        'recall': float(recall_score(y_true, y_pred, zero_division=0)),
        'f1': float(f1_score(y_true, y_pred, zero_division=0)),
        'roc_auc': float(roc_auc_score(y_true, y_pred_proba)) if y_pred_proba is not None else 0,
        'mcc': float(matthews_corrcoef(y_true, y_pred)),
        'confusion_matrix': cm.tolist(),
        'tn': int(cm[0][0]),
        'fp': int(cm[0][1]),
        'fn': int(cm[1][0]),
        'tp': int(cm[1][1]),
        'specificity': float(cm[0][0] / (cm[0][0] + cm[0][1])) if (cm[0][0] + cm[0][1]) > 0 else 0,
    }
    return metrics

def train_models_task():
    global status
    status["is_training"] = True
    status["progress"] = 0
    status["message"] = "Initializing training pipeline..."
    status["metrics"] = {}
    status["feature_importance"] = {}
    status["cross_validation_scores"] = {}
    status["best_params"] = {}
    status["training_history"] = []
    
    start_time = time.time()
    
    dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dataset', 'creditcard.csv'))
    models_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models'))
    os.makedirs(models_path, exist_ok=True)
    
    try:
        # Step 1: Load or generate data
        status["progress"] = 5
        status["message"] = "Loading dataset..."
        
        if not os.path.exists(dataset_path):
            generate_realistic_data(dataset_path)
            
        df = pd.read_csv(dataset_path)
        print(f"Loaded dataset with {len(df)} transactions")
        
        # Step 2: Advanced preprocessing
        status["progress"] = 10
        status["message"] = "Preprocessing data..."
        
        scaler = RobustScaler()
        
        # Feature engineering
        df['log_amount'] = np.log1p(df['Amount'])
        df['amount_squared'] = df['Amount'] ** 2
        df['time_hour'] = (df['Time'] % 86400) / 3600
        df['time_is_night'] = ((df['Time'] % 86400) < 21600).astype(int)
        
        df['normAmount'] = scaler.fit_transform(df['Amount'].values.reshape(-1, 1))
        df['normTime'] = scaler.fit_transform(df['Time'].values.reshape(-1, 1))
        df['normLogAmount'] = scaler.fit_transform(df['log_amount'].values.reshape(-1, 1))
        
        feature_cols = [col for col in df.columns if col not in ['Class', 'Time', 'Amount']]
        X = df[feature_cols]
        y = df['Class']
        
        joblib.dump(scaler, os.path.join(models_path, 'scaler.pkl'))
        joblib.dump(feature_cols, os.path.join(models_path, 'feature_columns.pkl'))
        
        print(f"Features: {len(feature_cols)}")
        
        # Step 3: Train-test split
        status["progress"] = 15
        status["message"] = "Splitting data..."
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Step 4: Handle class imbalance
        status["progress"] = 20
        status["message"] = "Handling class imbalance with SMOTE..."
        
        smote = SMOTE(random_state=42)
        X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
        print(f"After SMOTE: {len(X_train_res)} samples, {y_train_res.sum()} fraud cases")
        
        # Step 5: Train multiple models
        models = {}
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        
        # Model 1: Logistic Regression with tuning
        status["progress"] = 25
        status["message"] = "Training Logistic Regression with hyperparameter tuning..."
        
        lr_params = {'C': [0.01, 0.1, 1, 10]}
        lr = LogisticRegression(max_iter=1000, solver='lbfgs')
        lr_grid = GridSearchCV(lr, lr_params, cv=cv, scoring='roc_auc', n_jobs=-1)
        lr_grid.fit(X_train_res, y_train_res)
        
        lr_best = lr_grid.best_estimator_
        y_pred_lr = lr_best.predict(X_test)
        y_proba_lr = lr_best.predict_proba(X_test)[:, 1]
        
        models['Logistic Regression'] = {
            'model': lr_best,
            'metrics': calculate_comprehensive_metrics(y_test, y_pred_lr, y_proba_lr),
            'cv_score': float(lr_grid.best_score_)
        }
        status["best_params"]['Logistic Regression'] = lr_grid.best_params_
        joblib.dump(lr_best, os.path.join(models_path, 'logistic_regression.pkl'))
        
        # Model 2: Random Forest with tuning
        status["progress"] = 35
        status["message"] = "Training Random Forest with hyperparameter tuning..."
        
        rf_params = {'n_estimators': [100, 200], 'max_depth': [10, 20, None], 'min_samples_split': [2, 5]}
        rf = RandomForestClassifier(random_state=42, n_jobs=-1)
        rf_grid = GridSearchCV(rf, rf_params, cv=cv, scoring='roc_auc', n_jobs=-1)
        rf_grid.fit(X_train_res, y_train_res)
        
        rf_best = rf_grid.best_estimator_
        y_pred_rf = rf_best.predict(X_test)
        y_proba_rf = rf_best.predict_proba(X_test)[:, 1]
        
        models['Random Forest'] = {
            'model': rf_best,
            'metrics': calculate_comprehensive_metrics(y_test, y_pred_rf, y_proba_rf),
            'cv_score': float(rf_grid.best_score_)
        }
        status["best_params"]['Random Forest'] = rf_grid.best_params_
        status["feature_importance"]['Random Forest'] = dict(zip(feature_cols, rf_best.feature_importances_.tolist()))
        joblib.dump(rf_best, os.path.join(models_path, 'random_forest.pkl'))
        
        # Model 3: Gradient Boosting
        status["progress"] = 45
        status["message"] = "Training Gradient Boosting..."
        
        gb = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
        gb.fit(X_train_res, y_train_res)
        y_pred_gb = gb.predict(X_test)
        y_proba_gb = gb.predict_proba(X_test)[:, 1]
        
        models['Gradient Boosting'] = {
            'model': gb,
            'metrics': calculate_comprehensive_metrics(y_test, y_pred_gb, y_proba_gb),
            'cv_score': float(cross_val_score(gb, X_train_res, y_train_res, cv=cv, scoring='roc_auc').mean())
        }
        status["feature_importance"]['Gradient Boosting'] = dict(zip(feature_cols, gb.feature_importances_.tolist()))
        joblib.dump(gb, os.path.join(models_path, 'gradient_boosting.pkl'))
        
        # Model 4: XGBoost
        if HAS_XGBOOST:
            status["progress"] = 52
            status["message"] = "Training XGBoost..."
            
            xgb = XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, eval_metric='auc', verbosity=0)
            xgb.fit(X_train_res, y_train_res)
            y_pred_xgb = xgb.predict(X_test)
            y_proba_xgb = xgb.predict_proba(X_test)[:, 1]
            
            models['XGBoost'] = {
                'model': xgb,
                'metrics': calculate_comprehensive_metrics(y_test, y_pred_xgb, y_proba_xgb),
                'cv_score': float(cross_val_score(xgb, X_train_res, y_train_res, cv=cv, scoring='roc_auc').mean())
            }
            status["feature_importance"]['XGBoost'] = dict(zip(feature_cols, xgb.feature_importances_.tolist()))
            joblib.dump(xgb, os.path.join(models_path, 'xgboost.pkl'))
        
        # Model 5: LightGBM
        if HAS_LIGHTGBM:
            status["progress"] = 58
            status["message"] = "Training LightGBM..."
            
            lgbm = LGBMClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, verbose=-1)
            lgbm.fit(X_train_res, y_train_res)
            y_pred_lgbm = lgbm.predict(X_test)
            y_proba_lgbm = lgbm.predict_proba(X_test)[:, 1]
            
            models['LightGBM'] = {
                'model': lgbm,
                'metrics': calculate_comprehensive_metrics(y_test, y_pred_lgbm, y_proba_lgbm),
                'cv_score': float(cross_val_score(lgbm, X_train_res, y_train_res, cv=cv, scoring='roc_auc').mean())
            }
            status["feature_importance"]['LightGBM'] = dict(zip(feature_cols, lgbm.feature_importances_.tolist()))
            joblib.dump(lgbm, os.path.join(models_path, 'lightgbm.pkl'))
        
        # Model 6: SVM
        status["progress"] = 65
        status["message"] = "Training SVM..."
        
        svm = SVC(kernel='rbf', probability=True, random_state=42)
        svm.fit(X_train_res, y_train_res)
        y_pred_svm = svm.predict(X_test)
        y_proba_svm = svm.predict_proba(X_test)[:, 1]
        
        models['SVM'] = {
            'model': svm,
            'metrics': calculate_comprehensive_metrics(y_test, y_pred_svm, y_proba_svm),
            'cv_score': float(cross_val_score(svm, X_train_res, y_train_res, cv=cv, scoring='roc_auc').mean())
        }
        joblib.dump(svm, os.path.join(models_path, 'svm.pkl'))
        
        # Model 7: KNN
        status["progress"] = 70
        status["message"] = "Training KNN..."
        
        knn = KNeighborsClassifier(n_neighbors=5, n_jobs=-1)
        knn.fit(X_train_res, y_train_res)
        y_pred_knn = knn.predict(X_test)
        y_proba_knn = knn.predict_proba(X_test)[:, 1]
        
        models['KNN'] = {
            'model': knn,
            'metrics': calculate_comprehensive_metrics(y_test, y_pred_knn, y_proba_knn),
            'cv_score': float(cross_val_score(knn, X_train_res, y_train_res, cv=cv, scoring='roc_auc').mean())
        }
        joblib.dump(knn, os.path.join(models_path, 'knn.pkl'))
        
        # Model 8: Deep Learning (ANN)
        status["progress"] = 75
        status["message"] = "Training Deep Learning Model (ANN)..."
        
        early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True, verbose=0)
        reduce_lr = ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=0.0001, verbose=0)
        
        ann = build_advanced_ann(X_train_res.shape[1])
        history = ann.fit(
            X_train_res, y_train_res,
            epochs=50, batch_size=128,
            validation_split=0.2,
            callbacks=[early_stop, reduce_lr],
            verbose=0
        )
        
        y_pred_prob_ann = ann.predict(X_test, verbose=0)
        y_pred_ann = (y_pred_prob_ann > 0.5).astype(int).flatten()
        
        models['Deep Learning (ANN)'] = {
            'model': ann,
            'metrics': calculate_comprehensive_metrics(y_test, y_pred_ann, y_pred_prob_ann),
            'cv_score': None
        }
        
        status["training_history"] = {
            'loss': [float(x) for x in history.history['loss']],
            'val_loss': [float(x) for x in history.history['val_loss']],
            'accuracy': [float(x) for x in history.history['accuracy']],
            'val_accuracy': [float(x) for x in history.history['val_accuracy']],
            'auc': [float(x) for x in history.history['auc']],
            'val_auc': [float(x) for x in history.history['val_auc']]
        }
        ann.save(os.path.join(models_path, 'ann_model.h5'))
        
        # Step 6: Ensemble Model
        status["progress"] = 85
        status["message"] = "Creating Ensemble Model (Voting Classifier)..."
        
        estimators = [('rf', rf_best), ('gb', gb), ('lr', lr_best)]
        if HAS_XGBOOST:
            estimators.append(('xgb', xgb))
        if HAS_LIGHTGBM:
            estimators.append(('lgbm', lgbm))
        
        ensemble = VotingClassifier(estimators=estimators, voting='soft', n_jobs=-1)
        ensemble.fit(X_train_res, y_train_res)
        y_pred_ens = ensemble.predict(X_test)
        y_proba_ens = ensemble.predict_proba(X_test)[:, 1]
        
        models['Ensemble (Voting)'] = {
            'model': ensemble,
            'metrics': calculate_comprehensive_metrics(y_test, y_pred_ens, y_proba_ens),
            'cv_score': float(cross_val_score(ensemble, X_train_res, y_train_res, cv=cv, scoring='roc_auc').mean())
        }
        joblib.dump(ensemble, os.path.join(models_path, 'ensemble.pkl'))
        
        # Step 7: Compile results
        status["progress"] = 90
        status["message"] = "Compiling results..."
        
        final_metrics = {}
        for name, data in models.items():
            final_metrics[name] = {**data['metrics'], 'cv_score': data['cv_score']}
        
        best_model_name = max(final_metrics, key=lambda x: final_metrics[x]['roc_auc'])
        
        joblib.dump(best_model_name, os.path.join(models_path, 'best_model_name.pkl'))
        
        status["metrics"] = final_metrics
        status["cross_validation_scores"] = {name: data['cv_score'] for name, data in models.items() if data['cv_score'] is not None}
        
        elapsed_time = time.time() - start_time
        status["metrics"]['training_time_seconds'] = float(elapsed_time)
        status["metrics"]['total_samples'] = int(len(df))
        status["metrics"]['fraud_samples'] = int(df['Class'].sum())
        status["metrics"]['non_fraud_samples'] = int(len(df) - df['Class'].sum())
        
        status["progress"] = 100
        status["message"] = f"Training completed in {elapsed_time:.2f}s | Best: {best_model_name} (ROC-AUC: {final_metrics[best_model_name]['roc_auc']:.4f})"
        status["is_training"] = False
        
        print(f"\n=== TRAINING COMPLETE ===")
        print(f"Time: {elapsed_time:.2f} seconds")
        print(f"Best Model: {best_model_name}")
        print(f"ROC-AUC: {final_metrics[best_model_name]['roc_auc']:.4f}")
        
    except Exception as e:
        status["message"] = f"Error: {str(e)}"
        status["is_training"] = False
        print(f"Training error: {e}")
        import traceback
        traceback.print_exc()

def start_training():
    if status["is_training"]:
        return {"status": "error", "message": "Training already in progress"}
    thread = threading.Thread(target=train_models_task)
    thread.daemon = True
    thread.start()
    return {"status": "success", "message": "Training started"}

def get_status():
    return {
        "is_training": status["is_training"],
        "progress": status["progress"],
        "message": status["message"],
        "metrics": status.get("metrics", {}),
        "feature_importance": status.get("feature_importance", {}),
        "training_history": status.get("training_history", {}),
        "cross_validation_scores": status.get("cross_validation_scores", {}),
        "best_params": status.get("best_params", {})
    }
