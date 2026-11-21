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
- 5 Strecken mit Höhen, Sprungrampen, Boost-Feldern, Hindernissen und Abgründen: Sonnenhügel, Krabbenstrand, Gletscherpass, Mondburg und die Sternenbahn im Weltall (Regenbogen-Fahrbahn ohne Geländer).
- Grasstreifen sind sichtbar und befahrbar (bremsen), mit Boost lassen sich Kurven abkürzen. Wände stehen sichtbar am Rand. Wer abstürzt, wird von der Rettungsdrohne zurückgebracht.
- Im Rennen wechselt das Handy in den Lenkrad-Modus: quer halten, neigen zum Lenken. Tasten: GAS, BREMSE, DRIFT (halten in der Kurve, drei Turbo-Stufen; in der Luft nach einer Rampe = Trick), ITEM.
- Tastatur: Spieler 1 Pfeile, Shift = Drift, Enter = Item. Spieler 2 WASD, F = Drift, E = Item.
- 17 Items: Raketenbooster, Dreifach-Booster, Goldbooster, Ölfleck, Kristall-Attrappe, Prallball, Dreifach-Prallball, Suchdrohne, Dreifach-Drohne, Kometenjäger, Knallkugel, Schutzblase, Schrumpfwelle, Tintenwolke, Goldrausch, Autopilot-Rakete, Gewitterwolke.

## Insel-Party

- Brettspiel auf einer Insel mit rund 270 Feldern auf mehreren Ebenen (Vulkanspirale, Baumwipfelpfad, Rutsche, Holzstege) für 1 bis 4 Spieler, fehlende Plätze übernehmen Computer. Jedes Handy wird über den QR-Code gekoppelt (Spieler 1 bis 4).
- 10, 15 oder 20 Runden. Würfeln durch Schütteln des Handys (oder Taste). Münzen sammeln, Sterne für 20 Münzen kaufen.
- Felder: Plus, Minus, Ereignis, Glück, Pech, Laden, Duell. Gegenstände: Doppelwürfel, Dreifachwürfel, Klauhand, Kompassmuschel, Tauschmuschel, Fallennetz.
- Nach jeder Runde ein Minispiel (jeder gegen jeden, 2 gegen 2 oder 1 gegen 3, je nach Feldfarben). 14 Minispiele, davon 2 mit Allgemeinwissen.
- Die letzten 5 Runden sind der Endspurt, am Ende gibt es 3 Bonus-Sterne.

## Casino-Kanal

- Sonnen-Slots: Spielautomat mit 3 Walzen und 5 Gewinnlinien. Einsatz am Handy mit + und −, drehen durch Schütteln oder Tippen.
- Blackjack für 1 bis 4 Spieler gegen die Bank: Karte, Halten, Verdoppeln, Teilen. Blackjack zahlt 3 zu 2, die Bank steht ab 17.
- Gespielt wird nur mit Spielchips ohne echten Wert. Jedes Handy hat ein eigenes Chip-Konto, das im Browser gespeichert wird.

## Horror-Kanal (FOSSIL – Ebene -3)

- Ego-Perspektive, keine Waffen. Ein Forschungslabor tief unter der Erde, rund 80 mal 58 Meter: Gänge mit Rohren und Notbeleuchtung, Labore mit Brutbehältern, Serverraum, Umkleide, Sicherheitsbüro, Kantine, Lager, Generatorraum, ein Wartungsschacht und ein Biodom hinter Panzerglas.
- Zwei Raubsaurier streifen durch das Labor. Sie sehen dich im Licht, hören Rennen und Türen und öffnen normale Türen selbst. Direkt in die Augen geleuchtet erstarren sie kurz. Im Biodom lebt etwas viel Größeres.
- Verstecken in Spinden. Steht ein Tier davor, Benutzen gedrückt halten, um die Luft anzuhalten.
- Ablauf: Sicherheitskarte holen, Ersatzsicherung aus dem Lager, Generator starten, dann zum Notausgang. Fluchtpläne an den Wänden zeigen die Karte. Der Fortschritt wird gespeichert.
- Handy: wie eine Taschenlampe halten, drehen zum Umsehen, Kreis zum Laufen. Laptop: W A S D, Maus, E Benutzen (halten im Spind), F Lampe, Umschalt Rennen, C Ducken, Q Spind verlassen.
- `check.html` prüft, ob ein Browser WebRTC und WebGL 2 kann.
