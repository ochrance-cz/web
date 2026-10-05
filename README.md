# www.ochrance.cz

Zdrojový kód webu veřejného ochránce práv [www.ochrance.cz](https://www.ochrance.cz). Web provozuje Kancelář veřejného ochránce práv. Česká verze je na `/`, anglická na `/en/`.

## Technologie

- [Astro](https://astro.build) 6 s nástavbou [@nuasite/nua](https://nuasite.com), která k Astru přidává CMS
- [Bun](https://bun.sh) pro instalaci balíčků a spouštění skriptů
- [Pagefind](https://pagefind.app) pro vyhledávání, index vzniká při buildu
- SCSS pro styly

## Lokální spuštění

```sh
bun install          # instalace závislostí včetně úprav z patches/
bun run dev          # vývojový server Astro
bun run build        # nua build, potom index Pagefind do dist/
bun run preview      # lokální náhled hotového buildu z dist/
```

Pull requesty do `main` projdou buildem a kontrolami v `.github/workflows/pr-build.yml`. Jednotlivé kontroly jsou v `package.json` jako skripty `verify:*`.

## Struktura repozitáře

- `src/content/` – obsah v kolekcích (aktuality, dokumenty, letáky, Zpravodaj, projekty a další) jako Markdown a YAML. Anglické kolekce mají příponu `-en`.
- `src/content.config.ts` – definice kolekcí a jejich polí, ze kterých vychází i CMS
- `src/pages/` – stránky a adresy webu včetně `/en/`, RSS a vyhledávání `/hledat/`
- `src/components/`, `src/layouts/`, `src/styles/` – šablony, komponenty a styly. Texty jednotlivých stránek jsou v `src/components/page-content/`.
- `src/remark/`, `src/lib/` – zpracování Markdownu (prvky převzaté z původního webu, česká typografie) a pomocné funkce
- `i18n/` – texty rozhraní v češtině a angličtině
- `public/` – statické soubory (fonty, ikony, část obrázků a příloh)
- `cloudflare/` – Worker pro produkční provoz a jeho dokumentace
- `patches/` – úpravy balíčků Nua, které Bun použije při `bun install`
- `scripts/` – kontrolní skripty a jednorázové skripty z převodu webu z Hugo, ponechané kvůli dohledatelnosti
- `content/`, `content-en/`, `data/` – obsah původního webu v Hugo, ze kterého převod vycházel. Build webu je nepoužívá.

Většina obrázků a příloh není v repozitáři, web je načítá z CDN.

## Úpravy obsahu

Obsah upravuje redakce v CMS Nua. CMS pracuje přímo se soubory v repozitáři: s kolekcemi v `src/content/` a s texty v komponentách stránek.

## Nasazení

Produkční web běží na Cloudflare jako Worker se statickými soubory. Workflow `.github/workflows/deploy-cloudflare.yml` web sestaví a nasadí adresář `dist/` podle `cloudflare/wrangler.jsonc`. Spouští se po každém pushi do `main`, v pracovní dny v 6:00 UTC a ručně. Nasazuje jen v repozitáři `ochrance-cz/web`.

Většinu adres obslouží přímo statické soubory. Worker v `cloudflare/` navíc:

- zpřístupňuje adresáře `/uploads-import/` a `/uploads-deti/`, které zůstávají na původním serveru,
- přesměrovává adresy původního webu, které už neexistují, na jejich nové umístění.

Workflow potřebuje v GitHub Actions secrets `CLOUDFLARE_API_TOKEN` a `CLOUDFLARE_ACCOUNT_ID`. Nastavení, lokální spuštění Workeru a kontroly provozu popisuje [`cloudflare/README.md`](cloudflare/README.md).

## Kontakt

Problémy se zobrazováním webu nebo s jeho přístupností můžete hlásit na [podatelna@ochrance.cz](mailto:podatelna@ochrance.cz), jak uvádí [prohlášení o přístupnosti](https://www.ochrance.cz/pristupnost/prohlaseni/).
