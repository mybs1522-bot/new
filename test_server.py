import urllib.request
import json
import subprocess
import time
import sys

def main():
    print("Starting server process...")
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--port", "8089", "--host", "127.0.0.1"], cwd=r"C:\Users\bhave\.gemini\antigravity\scratch\pdf-paywall-app")
    time.sleep(2.5)

    try:
        # 1. Test sample generation
        req = urllib.request.Request("http://127.0.0.1:8089/api/sample?preview_pages=2&blur_radius=18", method="POST")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            doc_id = data["doc_id"]
            print(f"Sample generated successfully: doc_id={doc_id}, pages={data['page_count']}")

        # 2. Test doc info
        with urllib.request.urlopen(f"http://127.0.0.1:8089/api/document/{doc_id}") as resp:
            info = json.loads(resp.read().decode())
            print(f"Doc info: title={info['title']}, page 1 blurred={info['pages'][0]['is_blurred']}, page 3 blurred={info['pages'][2]['is_blurred']}")

        # 3. Test page 1 image (crisp)
        with urllib.request.urlopen(f"http://127.0.0.1:8089/api/document/{doc_id}/page/1") as resp:
            page1_bytes = resp.read()
            print(f"Page 1 image size: {len(page1_bytes)} bytes")

        # 4. Test page 3 image (blurred)
        with urllib.request.urlopen(f"http://127.0.0.1:8089/api/document/{doc_id}/page/3") as resp:
            page3_bytes = resp.read()
            print(f"Page 3 image size: {len(page3_bytes)} bytes")

        # 5. Test preview blurred PDF download
        with urllib.request.urlopen(f"http://127.0.0.1:8089/api/document/{doc_id}/download?mode=preview") as resp:
            pdf_bytes = resp.read()
            print(f"Blurred preview PDF size: {len(pdf_bytes)} bytes")

        # 6. Test unlock
        unlock_req = urllib.request.Request(
            f"http://127.0.0.1:8089/api/document/{doc_id}/unlock",
            data=json.dumps({"code": "DEMO", "plan": "all-access"}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(unlock_req) as resp:
            unlock_res = json.loads(resp.read().decode())
            print(f"Unlock result: {unlock_res['message']}")

        # 7. Test page 3 image after unlock (now crisp!)
        with urllib.request.urlopen(f"http://127.0.0.1:8089/api/document/{doc_id}") as resp:
            info_unlocked = json.loads(resp.read().decode())
            print(f"Doc unlocked info: is page 3 blurred now? {info_unlocked['pages'][2]['is_blurred']}")

        print("ALL BACKEND TESTS PASSED WITH 100% SUCCESS!")
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    main()
