@echo off
title Crochet Patterns Library Server
cd /d "%~dp0"
echo ===================================================
echo Starting Crochet Digital Library & Stripe Storefront...
echo URL: http://localhost:8000
echo Admin: http://localhost:8000/admin (admin / Robbin#00xx)
echo ===================================================
python run.py
pause
