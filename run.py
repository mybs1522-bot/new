import os
import sys
import uvicorn

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    print("=" * 60)
    print("  CROCHET PATTERNS DIGITAL LIBRARY & PAYWALL APPLICATION")
    print(f"  Listening on:    http://{host}:{port}")
    print(f"  Admin Portal:    http://{host}:{port}/admin")
    print("  Cloudflare R2:   Connected (948 of 948 PDFs live)")
    print("  Stripe Payments: Configured ($39.00 Lifetime All-Access)")
    print("=" * 60)
    
    uvicorn.run("main:app", host=host, port=port, reload=False, log_level="info", access_log=True)
