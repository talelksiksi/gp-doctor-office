# Translations

The app is written in French. `strings.py` holds the English and Arabic for
every screen, dialog and piece of sample data; run

    python3 mkdict.py i18n/strings.py app/i18n-strings.js

(the generator lives with the site, in PortfolioApp/scripts/mkdict.py) to
rebuild `app/i18n-strings.js`, which the shared cictna-i18n.js served by
cictnardc.net applies in the browser. Printed documents and their previews
are never translated: they keep their own French or Arabic choice.
