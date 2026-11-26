# 🐙 Octopus

Redact secrets and personal data from a web page before you share a screenshot.
100% on-device. Nothing leaves your browser.

## What it does
Press Alt+Shift+S on any web page. Octopus scans the visible text, highlights
what it finds, lets you review and toggle each box, then copies a screenshot
with the selected items blacked out.

## What it detects
- Secrets: AWS keys, Stripe keys, GitHub tokens, JWTs, private keys,
  connection strings, Bearer tokens, KEY/SECRET/TOKEN/PASSWORD values
- Personal data: emails, card numbers (Luhn-checked), IP addresses,
  internal/localhost URLs, phone numbers (off by default)

## Install (developer mode)
1. Download or clone this repo
2. Open chrome://extensions or edge://extensions
3. Turn on Developer mode, click Load unpacked, select this folder
4. Press Alt+Shift+S on any page

## Privacy
No network calls, no accounts, no tracking. Check the code or open the
browser's Network tab. All detection rules are in content.js.

## Known limits
- Does not read text inside Google Docs, Figma or other canvas apps
- Does not scan images, iframes or text inside input fields yet
- Scans only what is visible on screen
- Always review the boxes: it can miss things

## Roadmap
Input fields, allowlist, image OCR, custom patterns.

MIT License