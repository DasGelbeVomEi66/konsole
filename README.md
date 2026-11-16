# Konsole mit Handy-Fernbedienung

Kanal-Menü im Stil einer Wohnzimmer-Konsole, ein Obstschneide-Spiel und eine Handy-Fernbedienung, alles im Browser.

- `index.html` öffnest du am Laptop (Edge oder Chrome).
- `remote.html` öffnet das iPhone über den QR-Code auf der Konsole.

## Auf GitHub Pages stellen

1. Auf github.com ein neues öffentliches Repository anlegen, z. B. `konsole`.
2. „uploading an existing file“ wählen und den gesamten Inhalt dieses Ordners hochladen (Ordner `css`, `js`, `lib` mitnehmen).
3. Settings > Pages > Source: „Deploy from a branch“, Branch `main`, Ordner `/ (root)`, Save.
4. Nach etwa einer Minute läuft die Seite unter `https://DEINNAME.github.io/konsole/`.

## Spielen

1. Seite am Laptop öffnen, auf den Einschaltknopf klicken (mit der Maus, sonst bleibt der Ton stumm).
2. QR-Code mit der iPhone-Kamera scannen, „Bewegung erlauben & verbinden“ tippen, im Dialog „Erlauben“.
3. Handy hochkant halten, Oberseite zum Bildschirm. A wählt aus, B geht zurück, HOME öffnet das HOME-Menü.
4. Driftet der Cursor weg: „Cursor zentrieren“. Läuft er falsch herum: auf dem Handy „Optionen“.

Laptop und Handy brauchen Internet. Die Verbindung wird über den öffentlichen PeerJS-Server vermittelt, danach laufen die Daten direkt zwischen den Geräten.

Tastatur am Laptop: Esc = HOME, Leertaste = A, Rücktaste = B, Pfeile bewegen den Cursor.
