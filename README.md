# Konsole mit Handy-Fernbedienung

**Konsole starten: https://dasgelbevomei66.github.io/konsole/**

Fernbedienung direkt (iPhone, Safari): https://dasgelbevomei66.github.io/konsole/remote.html

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

## Kart-Kanal (Turbo-Flitzer)

- 1 Spieler gegen 7 Computerfahrer oder 2 Spieler mit geteiltem Bildschirm gegen 6. Das zweite Handy koppelt sich über den QR-Code im Kart-Menü.
- Im Rennen wechselt das Handy in den Lenkrad-Modus: quer halten, neigen zum Lenken. Tasten: GAS, BREMSE, DRIFT (halten in der Kurve, loslassen für Turbo), ITEM.
- Tastatur: Spieler 1 Pfeile, Shift = Drift, Enter = Item. Spieler 2 WASD, F = Drift, E = Item.
- Items: Turbo, Dreifach-Turbo, Ölfleck, Prallball, Suchdrohne, Schutzblase, Schrumpfwelle, Tintenwolke, Goldrausch.

## Insel-Party

- Brettspiel für 1 bis 4 Spieler, fehlende Plätze übernehmen Computer. Jedes Handy wird über den QR-Code gekoppelt (Spieler 1 bis 4).
- 10, 15 oder 20 Runden. Würfeln durch Schütteln des Handys (oder Taste). Münzen sammeln, Trophäen für 20 Münzen kaufen.
- Felder: Plus, Minus, Ereignis, Glück, Pech, Laden, Duell. Gegenstände: Doppelwürfel, Dreifachwürfel, Klauhand, Kompassmuschel, Tauschmuschel, Fallennetz.
- Nach jeder Runde ein Minispiel (jeder gegen jeden, 2 gegen 2 oder 1 gegen 3, je nach Feldfarben). 14 Minispiele, davon 2 mit Allgemeinwissen.
- Die letzten 5 Runden sind der Endspurt, am Ende gibt es 3 Bonus-Trophäen.
