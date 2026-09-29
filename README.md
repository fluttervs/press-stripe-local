# press-stripe-local

Local mirror of [press.stripe.com/poor-charlies-almanack](https://press.stripe.com/poor-charlies-almanack) with a Python dev server.

## Run locally

```bash
python server.py
```

Then open: **http://localhost:8080/poor-charlies-almanack**

## How it works

`server.py` serves the mirrored site files locally by:
- Rewriting all CDN URLs (`b.stripecdn.com`, `images.ctfassets.net`, etc.) to `localhost:8080`
- Rewriting URLs inside JS and CSS files (not just HTML)
- Patching the module-import domain whitelist so local dynamic imports work
- Stripping image query params (`?w=1920`) when looking up local files
- Logging all 404s to `server.log`
