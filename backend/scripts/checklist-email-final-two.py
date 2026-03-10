import json
import os
import re
import ssl
import time
import urllib.error
import urllib.request
import imaplib
import email
from email.header import decode_header
from pathlib import Path

BASE_URL = os.environ.get("TEST_BASE_URL", "http://localhost:5000")
ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
RUN_ID = str(int(time.time()))

results = []


def record(test_id, passed, note=""):
    results.append({"id": test_id, "pass": passed, "note": note})
    mark = "✅" if passed else "❌"
    suffix = f" - {note}" if note else ""
    print(f"{mark} #{test_id}{suffix}")


def decode_mime_header(raw):
    if not raw:
        return ""
    parts = decode_header(raw)
    out = []
    for value, enc in parts:
        if isinstance(value, bytes):
            out.append(value.decode(enc or "utf-8", errors="ignore"))
        else:
            out.append(value)
    return "".join(out)


def load_mail_credentials():
    if not ENV_FILE.exists():
        raise RuntimeError("backend/.env not found")

    text = ENV_FILE.read_text(encoding="utf-8", errors="ignore")

    def pull(pattern):
        match = re.search(pattern, text, flags=re.MULTILINE)
        return match.group(1).strip() if match else ""

    user = os.environ.get("EMAIL_USER", "").strip() or pull(r"^#?EMAIL_USER=(.*)$")
    password = os.environ.get("EMAIL_PASS", "").strip() or pull(r"^#?EMAIL_PASS=(.*)$")

    if not user or not password:
        raise RuntimeError("EMAIL_USER/EMAIL_PASS not available")
    return user, password


def http_json(method, path, body=None, headers=None, timeout=30):
    url = f"{BASE_URL}{path}"
    payload = None
    final_headers = {"Content-Type": "application/json"}
    if headers:
        final_headers.update(headers)
    if body is not None:
        payload = json.dumps(body).encode("utf-8")

    request = urllib.request.Request(url=url, data=payload, method=method, headers=final_headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="ignore")
            data = json.loads(raw) if raw else {}
            return response.status, data, dict(response.headers)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="ignore")
        try:
            data = json.loads(raw) if raw else {}
        except Exception:
            data = {"raw": raw}
        return exc.code, data, dict(exc.headers)


def http_raw(method, path, headers=None, timeout=30):
    url = f"{BASE_URL}{path}"
    final_headers = headers or {}
    request = urllib.request.Request(url=url, method=method, headers=final_headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="ignore")
            return response.status, raw, dict(response.headers)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="ignore")
        return exc.code, raw, dict(exc.headers)


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def http_raw_no_redirect(method, path, headers=None, timeout=30):
    url = f"{BASE_URL}{path}"
    final_headers = headers or {}
    request = urllib.request.Request(url=url, method=method, headers=final_headers)
    opener = urllib.request.build_opener(_NoRedirect)
    try:
        with opener.open(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="ignore")
            return response.status, raw, dict(response.headers)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="ignore")
        return exc.code, raw, dict(exc.headers)


def message_text(msg):
    chunks = []
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition") or "")
            if "attachment" in disposition.lower():
                continue
            if content_type in ("text/plain", "text/html"):
                payload = part.get_payload(decode=True)
                if payload is None:
                    continue
                charset = part.get_content_charset() or "utf-8"
                chunks.append(payload.decode(charset, errors="ignore"))
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            chunks.append(payload.decode(charset, errors="ignore"))
    return "\n".join(chunks)


def find_email(user, password, *, to_address, subject_contains, body_contains=None, timeout_seconds=120):
    deadline = time.time() + timeout_seconds
    to_address_lower = to_address.lower()
    subject_contains_lower = subject_contains.lower()
    body_contains_lower = (body_contains or "").lower()

    while time.time() < deadline:
        mail = None
        try:
            mail = imaplib.IMAP4_SSL("imap.gmail.com", 993, ssl_context=ssl.create_default_context())
            mail.login(user, password)
            mail.select("INBOX")
            status, data = mail.search(None, "ALL")
            if status != "OK":
                time.sleep(3)
                continue

            ids = data[0].split()[-80:]
            for msg_id in reversed(ids):
                status_fetch, msg_data = mail.fetch(msg_id, "(RFC822)")
                if status_fetch != "OK" or not msg_data:
                    continue

                raw = None
                for part in msg_data:
                    if isinstance(part, tuple) and len(part) > 1:
                        raw = part[1]
                        break
                if raw is None:
                    continue

                msg = email.message_from_bytes(raw)
                subject = decode_mime_header(msg.get("Subject", ""))
                to_header = decode_mime_header(msg.get("To", ""))
                body = message_text(msg)

                if subject_contains_lower not in subject.lower():
                    continue
                if to_address_lower not in to_header.lower() and to_address_lower not in body.lower():
                    continue
                if body_contains_lower and body_contains_lower not in body.lower():
                    continue

                return {
                    "subject": subject,
                    "to": to_header,
                    "body": body
                }
        except Exception:
            pass
        finally:
            try:
                if mail is not None:
                    mail.logout()
            except Exception:
                pass

        time.sleep(4)

    return None


def extract_token(text):
    match = re.search(r"token=([a-fA-F0-9]{20,})", text)
    return match.group(1) if match else ""


def main():
    should_fail = False

    email_user, email_pass = load_mail_credentials()
    local_part, domain = email_user.split("@", 1)
    inbox_alias = f"{local_part}+eudyaan-check-{RUN_ID}@{domain}"
    signup_password = "EmailCheck@123"

    status_signup, data_signup, _ = http_json(
        "POST",
        "/api/auth/signup",
        body={
            "name": f"Email Check {RUN_ID}",
            "email": inbox_alias,
            "password": signup_password
        },
        headers={"x-forwarded-for": "10.88.10.11"}
    )

    signup_ok = status_signup == 200 and bool(data_signup.get("success"))
    print(f"SIGNUP_STATUS={status_signup} SUCCESS={data_signup.get('success')}")

    initial_mail = find_email(
        email_user,
        email_pass,
        to_address=inbox_alias,
        subject_contains="Verify your eUdyaan account",
        body_contains="verify"
    )

    initial_token = extract_token(initial_mail["body"]) if initial_mail else ""

    status_resend, data_resend, _ = http_json(
        "POST",
        "/api/auth/resend-verification",
        body={"email": inbox_alias},
        headers={"x-forwarded-for": "10.88.10.12"}
    )

    resend_api_ok = status_resend == 200 and bool(data_resend.get("success"))

    resent_mail = find_email(
        email_user,
        email_pass,
        to_address=inbox_alias,
        subject_contains="Verify your eUdyaan account (resent)",
        body_contains="new verification link"
    )

    resent_token = extract_token(resent_mail["body"]) if resent_mail else ""

    old_status, old_text, _ = http_raw_no_redirect("GET", f"/api/auth/verify-email?token={initial_token}") if initial_token else (0, "", {})
    new_status, _, new_headers = http_raw_no_redirect("GET", f"/api/auth/verify-email?token={resent_token}") if resent_token else (0, "", {})

    old_invalid = ("invalid" in old_text.lower()) or ("expired" in old_text.lower())
    new_redirect_ok = 300 <= new_status < 400 and "/login.html?verified=1" in str(new_headers.get("Location", ""))

    pass_9 = all([
        signup_ok,
        resend_api_ok,
        initial_mail is not None,
        resent_mail is not None,
        bool(initial_token),
        bool(resent_token),
        initial_token != resent_token,
        old_invalid,
        new_redirect_ok
    ])

    record(9, pass_9, f"signup={signup_ok}, resend={resend_api_ok}, old={old_status}, new={new_status}")

    status_login, data_login, _ = http_json(
        "POST",
        "/api/auth/login",
        body={"email": inbox_alias, "password": signup_password},
        headers={"x-forwarded-for": "10.88.10.13"}
    )

    session_token = str(data_login.get("sessionToken", ""))
    marker = f"risk-alert-email-check-{RUN_ID}"

    status_ai, data_ai, _ = http_json(
        "POST",
        "/api/ai/support",
        body={"message": f"I want to die {marker}", "preferredLanguage": "english"},
        headers={
            "Authorization": f"Bearer {session_token}",
            "x-forwarded-for": "10.88.10.14"
        }
    )

    ai_ok = status_ai == 200 and bool(data_ai.get("serious"))

    alert_mail = find_email(
        email_user,
        email_pass,
        to_address=email_user,
        subject_contains="[eUdyaan] Risk Alert Triggered",
        body_contains=marker,
        timeout_seconds=150
    )

    pass_42 = status_login == 200 and bool(session_token) and ai_ok and (alert_mail is not None)
    record(42, pass_42, f"login={status_login}, ai={status_ai}, serious={data_ai.get('serious')}")

    failed = [item for item in results if not item["pass"]]
    print("\nEMAIL_FINAL_TWO_SUMMARY")
    print(json.dumps({
        "total": len(results),
        "passed": len(results) - len(failed),
        "failed": len(failed)
    }, indent=2))

    if failed:
        print("FAILED_IDS:", ",".join(str(item["id"]) for item in failed))
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
