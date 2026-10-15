# Dancing with SARS — CLPS Lunar Mission Browser v3.0

NASA Space Apps Challenge 2026 · Vorbereitungs-/Demoprojekt · Team `00000000A_LAGRANGE_NEXUS`

**Dieses Paket ist kein offizielles NASA-Produkt und kein wissenschaftlich validiertes Landungsplanungssystem.** Die vorhandenen Dateien wurden für die 2026-Challenge gezielt erweitert; bitte die offiziellen Regeln zur Projektarbeit vor dem Hackathon prüfen.

## Kurzstart

1. ZIP entpacken.
2. `index.html` doppelklicken. Die **Offline-Demo** zeigt sofort anschauliche, ausdrücklich als Modell gekennzeichnete Winkelverläufe.
3. **Empfohlen:** Lokalen Server starten, damit echte JSON-Dateien geladen werden können:
   - Windows: `START_WINDOWS.bat` doppelklicken (Python muss installiert sein).
   - macOS/Linux: Terminal im Projektverzeichnis öffnen, `./start_mac_linux.sh` ausführen.
   - Alternativ: `python -m http.server 8000`
4. Im Browser `http://localhost:8000` öffnen.

**Die Offline-Demo ist KEINE NASA-Ephemeride.** Bitte nicht als gemessene Sichtverhältnisse, Eisnachweis oder reale Missionsentscheidung darstellen.

## Echte NASA/JPL-Horizons-Daten erzeugen (Internet erforderlich)

Python 3.9+, keine zusätzlichen Pakete erforderlich. Im Projektverzeichnis ausführen:

```bash
python tools/fetch_horizons.py --start 2026-11-14 --days 7 --step-hours 1
```

Das Skript ruft für die drei im Katalog enthaltenen Beispielorte jeweils Sonne (`COMMAND=10`) und Erde (`COMMAND=399`) über die **offizielle NASA/JPL-Horizons-API** ab. Es speichert `data/horizons.json` **nur, wenn alle sechs Anfragen vollständig und plausibel beantwortet wurden**. Anschließend die Website über den lokalen Server neu laden. Im Kopf erscheint dann **JPL HORIZONS**. Alternativ kann dieselbe erzeugte Datei über **Horizons-JSON importieren** geladen werden.

Wenn der Onlineabruf scheitert, bleibt die Offline-Demo verfügbar; **es werden niemals Demo-Werte unter dem Label NASA angezeigt**. Die Umgebung, in der dieses Paket erzeugt wurde, konnte keine NASA-Daten direkt aus dem Internet beziehen. Daher liegt **noch keine** `data/horizons.json` im Paket.

### Analysieren und exportieren

- Startdatum/-uhrzeit und 24h / 3d / 7d auswählen.
- Bis zu drei Landeplätze vergleichen: Stundenanteil mit Sonne über 0°, Erde über 0°, beide über 0°.
- Auf Karte oder Vergleichskarte einen aktiven Standort wählen.
- Zeit-Schieberegler bewegen: Horizontansicht zeigt aktuelle Azimut-/Elevationswinkel.
- Stündliche geometrische Erd-Sichtfenster ansehen und Zeitreihen als CSV exportieren (mit Herkunftshinweis).
- Über das Mission Briefing die Grenzen und Quellen lesen.

## Methodik & wissenschaftliche Einordnung

**Im Horizons-Modus:** Quelle: NASA/JPL Horizons, Topocentric OBSERVER Ephemeris, Quantität 4 = apparent azimuth/elevation (airless), Geodetic Site auf Mondkörper 301, Höhe 0 km auf dem Referenzellipsoid. Zeitskala UTC; stündliche Abtastung (1h ist für die Webapp erforderlich). Die Kompassrichtungen beziehen sich auf das lokale Koordinatensystem des Mondstandorts. Auswahl/Abruf in `tools/fetch_horizons.py` dokumentiert.

**Im Modell-Modus:** Ein didaktisches Periodenmodell für Sub-Sonne und angenäherte Erd-Libration; seine Phase ist absichtlich **nicht kalibriert**. Es liefert **keine verlässlichen Zahlen für bestimmte reale Daten**. Der Browser kennzeichnet diesen Modus dauerhaft.

**Sichtbarkeitsregel:** Elevation > 0° gegen den *idealen lokalen geometrischen Horizont*. Keine lokale LOLA-Terrain-Horizontmaske, Bergabschattung, Landerhöhe, Antennencharakteristik, thermische Modellierung oder Energiebilanz. Beispiel: 65 % „SUN“ bedeutet „in 65 % der stündlichen Proben oberhalb 0°“, **nicht** „65 % Energieversorgung“. Genauso ist „EARTH“ ein geometrischer Proxy und keine garantierte Funkverbindung. Ohne vollständige Horizons-Zeitreihe erscheint `N/A`, nicht eine automatisch erfundene Fallback-Zahl.

**Standorte:** `data/sites.json` enthält drei **nicht offiziell bestätigte** Demo-Standorte bzw. Bezeichnungen aus den hochgeladenen Originaldateien. Hier sind keine aus NASA-Produktseiten verifizierten Landeplätze hinterlegt. Für eine valide NASA-Submission muss der Katalog nach Verfügbarkeit der offiziellen Daten aktualisiert werden. Die `FALLBACK_SITES` in `assets/app.js` dienen nur dazu, `file://`-Öffnungen auch offline zu erlauben; nach Änderungen am Katalog den eingebauten Fallback synchronisieren, sofern nötig.

**Radar und Eis:** Die ursprünglichen SAR/CPR-/Ice-Scores samt synthetischer Karte waren nicht durch eingelesene NASA-Rohdaten abgesichert. Die Werte werden nicht als Messdaten für neue Bewertungen verwendet; der ursprüngliche Prototyp ist unter `original/` vollständig beigelegt. Ein hoher CPR-Wert beweist für sich allein kein Wassereis.

## Projektstruktur

```text
index.html                Webapp (keine externen CDNs)
assets/style.css          Responsives Layout
assets/app.js             Interaktive Steuerung / SVG-Karte / Diagramme / CSV
assets/astro.js           Horizontgeometrie und Demo-Modell
 data/sites.json          Standortkatalog
 data/horizons.json       Optional, wird erst durch Abruf erstellt
 tools/fetch_horizons.py  JPL-Abfrage und strenge Plausibilitätsprüfung
 tests/                   Automatische Tests
 original/                Vier hochgeladene Originaldateien unverändert
START_WINDOWS.bat         Lokaler Server auf Windows
start_mac_linux.sh        Lokaler Server unter macOS/Linux
```

## Tests

```bash
python -m unittest discover -s tests -v
node tests/astro.test.js
node --check assets/app.js
```

Die Abfragen der NASA-API konnten in der Erstellungsumgebung **nicht live ausgeführt** werden. Vor einem Wettbewerbseinsatz muss ein echter Abruf, insbesondere Parser und Standortkoordinaten, lokal getestet werden.

## Nächste wissenschaftliche Schritte

1. Offizielle Challenge-Orte und NASA-Datensätze übernehmen, Koordinaten/Zeitsystem dokumentieren.
2. Eine lokale Horizontmaske aus **LRO/LOLA-Geländehöhen** per Azimut ermitteln und gegen Horizons Az/El prüfen.
3. Sichtfenster an realen Daten verifizieren, Energie-/Kommunikationssysteme und Unsicherheiten differenziert behandeln.
4. Teamabsprachen zu Regeln für bereits vorhandene Vorarbeiten und Startzeit des Hackathons festhalten.

## Links

- Challenge: https://www.spaceappschallenge.org/2026/
- Horizons-Dokumentation: https://ssd.jpl.nasa.gov/horizons/manual.html
- API: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- NASA LRO: https://science.nasa.gov/mission/lro/

*Team und ursprüngliches Konzept: `00000000A_LAGRANGE_NEXUS`, wie in den gelieferten Projektdateien.*
