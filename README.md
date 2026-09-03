# Spain at Silicon Valley

Landing page for the Spring 2027 summit at Google HQ, Mountain View.

The page **is** the journey: one fixed WebGL stage that the whole document
scrolls through, flying the length of the Golden Gate. The programme stands on
the bridge as extruded 3D type rather than sitting in DOM sections over it.

Bilingual (EN/ES), including the 3D lettering — both languages are baked into
each model and swapped by visibility.

## Running it

Static files, no build step. Any file server will do:

    python3 -m http.server 8777

Then open <http://localhost:8777>. It needs to be served over HTTP rather than
opened as a `file://` URL, because `scene.js` is an ES module.

## How it fits together

| | |
|---|---|
| `index.html` | Markup, plus a full DOM version of every section for SEO and for browsers without WebGL. `.stage-on` hides the duplicates once WebGL is confirmed. |
| `scene.js` | The whole 3D scene. Camera path, sky, water, bridge, signage, speaker wall, landfall. |
| `main.js` | Language, step navigation, the request form. |
| `styles.css` | Context tokens (`--c-ink`, `--c-gold`…) redefined per surface, so one component works over sky, glass and paper. |
| `models/` | GLB assets, Draco-compressed. The 3D type is generated in Blender. |
| `vendor/` | three.js r161 and loaders, vendored — no package manager. |

The flight stops at six **stations**, and scrolling steps between them rather
than running free: one gesture, one composed frame. Stations are found by
searching the camera path for a world position, so they follow the flight if it
is re-shaped rather than drifting off the thing they are meant to be framing.
Each has its own URL (`#venue`, `#on-stage`, `#lineup`, `#format`, `#attend`).

## Before this goes anywhere real

- **The speakers have not agreed to appear.** Names, roles and links are
  researched and current, but this is dressing for the design until the
  programme is confirmed.
- **The request form has no endpoint.** Submitting only acknowledges.
- Partner logos are placeholders.

## Portrait credits

Five portraits are used under Creative Commons licences and require this credit
wherever they run:

- Enrique Lores © Vicente Lara — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Javier Oliván © Christopher Michel — [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Nuria Oliver © Kristof Roomp — [CC0](https://creativecommons.org/publicdomain/zero/1.0/)
- Carme Artigas © TEDx UNebrija — [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)
- César Cernuda © PorterNovelli33 — [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

All via Wikimedia Commons, cropped from the originals. The two BY-SA crops are
adaptations and carry the same licence onward.

**Pilar Manchón's portrait is an El País editorial photograph and is not
cleared for use.** It needs permission or replacing before this is published in
earnest. Every other speaker without a rights-cleared photograph shows a
monogram instead, which is what that one should be until it is settled.
