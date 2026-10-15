@echo off
echo ========================================================
echo   PDF Paywall Viewer & Generator
echo ========================================================
echo Starting local web server on http://localhost:8000 ...
python -m uvicorn main:app --reload --port 8000 --host 127.0.0.1
pause
