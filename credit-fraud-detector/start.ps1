Start-Process powershell -ArgumentList "-NoExit -Command `"cd client; npm run dev`""
Start-Process powershell -ArgumentList "-NoExit -Command `"cd server; npm run dev`""
Start-Process powershell -ArgumentList "-NoExit -Command `"cd ml-service; .\venv\Scripts\activate; python app.py`""
