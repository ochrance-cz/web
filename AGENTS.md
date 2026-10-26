# Instrukce pro agenty

Základní popis repozitáře, příkazy a nasazení jsou v [README.md](README.md). Tady je jen to, co agent potřebuje navíc.

## Editory obsahu: který se používá a kde ho opravovat

Redakce upravuje obsah v hostované administraci Nua, v panelu **Kolekce**: bílý panel se seznamem záznamů vlevo a formulářem. Tohle je editor, na kterém záleží.

| Co | Odkud je | Kde se opravuje |
|---|---|---|
| Formulář kolekce (pole, levý sloupec, ukládání) | kód hostované administrace Nua | mimo toto repo |
| Editor těla článku ve formuláři | balíček `@nuasite/cms-mdx-editor` (monorepo nuasite) | PR do nuasite, vydání, zvednutí verze v administraci |
| Čtení a zápis souborů pro formulář | `@nuasite/cms-sidecar` (spouští se jako `@latest`) | je to jen API, ne editor |
| Černý inline editor v náhledu stránky | `@nuasite/cms`, na tomto webu se načítá z CDN | nesahat |
| Lokální `/_nua/admin` | `@nuasite/collections-admin` z `node_modules` | vidí ho jen vývojář |

Z toho plyne:

- Chyba v bílém editoru nebo formuláři se neopravuje v tomto repu. Patche v `patches/` se v hostované administraci neprojeví, mění jen lokální `/_nua/admin`.
- Patche na `@nuasite/cms/src/editor/*` nemají žádný účinek ani lokálně, editor se bere z CDN. Nepřidávej je.
- V tomto repu se pro administraci mění jen `src/content.config.ts` (pole, popisky, nápověda, `cms: { label, order, group, hidden, pathname, sidebar, sections }`) a obsah v `src/content/`.
- Nový text, který má redakce upravovat, patří do kolekce, ne natvrdo do `.astro`.

## Pravidla pro `src/content.config.ts`

Administrace čte konfiguraci staticky ze zdrojového kódu, ne spuštěním.

- Hodnoty v `defineCmsCollection` a v nastavení polí (`label`, `help`, `accept`, `cms: {…}`) piš jako literály, ne konstanty ani šablonové řetězce.
- Každý výskyt slova `base` musí mít tvar `base: 'prostý řetězec',`. Jiný tvar (konstanta, šablona, slovo „base“ v komentáři) zablokuje trvalé mazání souborů v administraci.
- Alternativní text obrázku je textové pole `<pole>Alt` hned vedle obrázkového pole `<pole>`. Administrace je spáruje a zobrazí pod výběrem obrázku. Šablona ho musí vykreslit; bez textu zůstává obrázek dekorativní (`alt=""`).

## Před merge do `main`

Push do `main` v `ochrance-cz/web` web rovnou nasadí. Před ním:

```sh
DEPLOY_TARGET=cloudflare bun run build
bun run verify:file-urls
bun run verify:cms
```

Repo je veřejné. Do commitů nepatří screenshoty z administrace, interní adresy ani odkazy `#číslo` na PR z jiného repa (GitHub by je navázal na cizí issue). Soubory nahrané z CMS končí v `public/uploads/` v gitu, velká média proto zvaž.
