#!/usr/bin/env python3
"""
subserver.py — 사이트를 로컬에서 띄우면서 유튜브 자막을 자동으로 뽑아주는 작은 서버.

    cd <이 저장소 폴더>
    python3 subserver.py            # → http://localhost:8787

브라우저에서 http://localhost:8787/#/english 로 들어가서 유튜브 URL 만 넣으면
자막이 자동으로 붙습니다. 드래그할 필요 없습니다.

동작:
    GET /api/subs?v=<videoId>
        200 + VTT 본문   자막을 찾음
        204              영어 자막이 없는 영상
        503              yt-dlp 미설치

주의:
  * 127.0.0.1 에만 바인딩합니다. 외부에서 접근할 수 없습니다.
  * 받은 자막은 .subcache/ 에 저장되며, 두 번째부터는 즉시 응답합니다.
  * .subcache/ 는 개인 학습용입니다. 공개 저장소에 커밋하지 마세요.
"""

import functools
import http.server
import os
import re
import shutil
import socketserver
import subprocess
import sys
import urllib.parse

PORT = int(os.environ.get("PORT", 8787))
ROOT = os.path.abspath(os.path.dirname(__file__))
CACHE = os.path.join(ROOT, ".subcache")

VID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")   # 영상 ID 형식을 엄격히 검사


def fetch_subs(vid):
    """자막 VTT 텍스트를 돌려줍니다. 영어 자막이 없으면 None."""
    os.makedirs(CACHE, exist_ok=True)
    dest = os.path.join(CACHE, vid + ".vtt")

    if os.path.exists(dest):
        with open(dest, encoding="utf-8") as f:
            return f.read()

    url = "https://www.youtube.com/watch?v=" + vid
    base = os.path.join(CACHE, vid)

    # 사람이 만든 자막 먼저, 없으면 자동 생성(ASR) 자막
    for mode in ("--write-sub", "--write-auto-sub"):
        try:
            subprocess.run(
                ["yt-dlp", "--skip-download", mode,
                 "--sub-langs", "en.*,en", "--convert-subs", "vtt",
                 "-o", base + ".%(ext)s", url],
                capture_output=True, timeout=180, check=False,
            )
        except subprocess.TimeoutExpired:
            continue

        found = sorted(f for f in os.listdir(CACHE)
                       if f.startswith(vid) and f.endswith(".vtt"))
        if found:
            src = os.path.join(CACHE, found[0])
            if src != dest:
                os.replace(src, dest)
            for extra in found[1:]:
                try:
                    os.remove(os.path.join(CACHE, extra))
                except OSError:
                    pass
            with open(dest, encoding="utf-8") as f:
                return f.read()

    return None


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        if "/api/subs" in (self.path or ""):
            sys.stderr.write("  %s\n" % (fmt % args))

    def _send(self, code, body=b"", ctype="text/plain; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/api/subs":
            return super().do_GET()

        vid = (urllib.parse.parse_qs(parsed.query).get("v") or [""])[0]
        if not VID_RE.match(vid):
            return self._send(400, b"bad video id")

        if not shutil.which("yt-dlp"):
            return self._send(503, b"yt-dlp not installed")

        print("  자막 추출: %s ..." % vid, flush=True)
        try:
            text = fetch_subs(vid)
        except Exception as exc:                       # noqa: BLE001
            print("  실패: %s" % exc, flush=True)
            return self._send(500, str(exc).encode())

        if not text:
            print("  영어 자막 없음", flush=True)
            return self._send(204)

        print("  완료 (%d줄)" % text.count("-->"), flush=True)
        self._send(200, text.encode("utf-8"), "text/vtt; charset=utf-8")


def main():
    os.chdir(ROOT)
    if not shutil.which("yt-dlp"):
        print("⚠️  yt-dlp 가 없습니다. 자동 추출은 동작하지 않습니다.")
        print("   brew install yt-dlp\n")

    handler = functools.partial(Handler, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("127.0.0.1", PORT), handler) as httpd:
            print("Shadowing Studio 로컬 서버")
            print("  http://localhost:%d/#/english" % PORT)
            print("  (종료: Ctrl+C)\n")
            httpd.serve_forever()
    except OSError as exc:
        print("포트 %d 를 열 수 없습니다: %s" % (PORT, exc))
        print("다른 포트로:  PORT=9000 python3 subserver.py")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n종료했습니다.")


if __name__ == "__main__":
    main()
