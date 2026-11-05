"""Acceptance of the Android container, using only a local HTML fixture (not the real API)."""
import re
import subprocess
import sys
import time
from xml.etree import ElementTree as ET

PACKAGE = "com.canopyos.app"
def adb(*args):
    return subprocess.check_output(["adb", *args], timeout=90).decode().strip()
def shell(*args):
    return adb("shell", *args)
def find(pattern, attempts=10):
    for _ in range(attempts):
        try:
            shell("uiautomator", "dump", "/sdcard/canopy-ui.xml")
            nodes = ET.fromstring(adb("exec-out", "cat", "/sdcard/canopy-ui.xml")).iter("node")
            for n in nodes:
                if any(re.search(pattern, n.get(k, ""), re.I) for k in ("text", "content-desc")):
                    return n
        except (subprocess.SubprocessError, ET.ParseError):
            pass
        time.sleep(1)
    raise AssertionError("UI element missing: " + pattern)
def tap(pattern):
    n = find(pattern)
    x1, y1, x2, y2 = map(int, re.findall(r"\d+", n.get("bounds")))
    shell("input", "tap", str((x1+x2)//2), str((y1+y2)//2))
def launch():
    result = shell("am", "start", "-W", "-n", PACKAGE + "/.MainActivity")
    assert "Status: ok" in result, result
def enter(url):
    tap("Adresse du serveur")
    shell("input", "text", url)
    shell("input", "keyevent", "KEYCODE_BACK")
    tap("Ouvrir CanopyOS")

assert adb("install", "-r", sys.argv[1]).endswith("Success")
shell("pm", "clear", PACKAGE)
launch()
find("Connecter votre instance")
enter("http://example.invalid")
find("Adresse HTTPS valide requise")
print("PASS: remote cleartext address rejected", flush=True)
shell("pm", "clear", PACKAGE)
adb("reverse", "tcp:8765", "tcp:8765")
launch()
enter("http://localhost:8765")
find("CanopyOS Android test")
print("PASS: bundled container opens the configured local fixture", flush=True)
tap("Choisir une photo")
find("Recent|Images|Photos|Browse|Open from|Downloads")
shell("input", "keyevent", "KEYCODE_BACK")
find("CanopyOS Android test")
print("PASS: system file chooser opens and cancellation returns to the page", flush=True)
shell("am", "force-stop", PACKAGE)
launch()
find("CanopyOS Android test")
tap("Changer de serveur")
find("Connecter votre instance")
find("http://localhost:8765")
print("PASS: server address persists after force-stop and can be changed", flush=True)
print("ANDROID CONTAINER ACCEPTANCE PASSED (local fixture; hosted CanopyOS not tested)", flush=True)
