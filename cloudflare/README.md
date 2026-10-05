# Cloudflare: provoz www.ochrance.cz a deti.ochrance.cz

Oba weby běží jako statické soubory ve Workerech v Cloudflare účtu Kanceláře:
`ochrance-web` z tohoto repozitáře a `ochrance-deti` z repozitáře dětského webu
(`cloudflare/wrangler.jsonc` tam). DNS domény `ochrance.cz` zůstává u
regzone/Zoneru. Do Cloudflare je převedená jen `domekpolopate.cz`, přes kterou
se oba weby připojují jako custom hostnames (Cloudflare for SaaS).

```
www.ochrance.cz  CNAME  fallback.domekpolopate.cz   (DNS u regzone)
        │
        ▼
Cloudflare, zóna domekpolopate.cz, route www.ochrance.cz/*
        │
        ├─ soubor z dist/ existuje ............ statický asset, Worker se nespouští
        ├─ /uploads-import/*, /uploads-deti/* .. Worker → https://www.soubory.ochrance.cz (VPS Zoner)
        │                                        když VPS neodpoví nebo soubor nemá → kopie na cdn.nuasite.com
        ├─ staré URL (TYPO3, .htaccess) ........ Worker → 301 podle src/legacy-redirects.json
        └─ cokoli jiného ....................... _redirects z buildu, jinak stránka 404

deti.ochrance.cz CNAME fallback.domekpolopate.cz → Worker ochrance-deti, jen statické soubory

ochrance.cz (apex) zůstává na VPS, Apache přesměruje na https://www.ochrance.cz
```

## Nasazení

Workflow `.github/workflows/deploy-cloudflare.yml` web po každém pushi do `main`
sestaví a nasadí přes `wrangler deploy` podle `wrangler.jsonc`. Potřebuje secrets
`CLOUDFLARE_API_TOKEN` (oprávnění Workers Editor, Workers Routes Write a Zone
Read pro zónu `domekpolopate.cz`) a `CLOUDFLARE_ACCOUNT_ID`. Dětský web má
stejný workflow ve svém repozitáři.

## Proč jdou některé soubory pořád z VPS

`/uploads-import/` a `/uploads-deti/` jsou živé adresáře na starém serveru.
Kancelář do nich dál nahrává (poslední ověřený soubor je z 24. 9. 2026) a
odkazují na ně i jiné weby, hlavně `deti.ochrance.cz` a ESO. Kopie na R2
(`cdn.nuasite.com`) ze 7. 8. 2026 obsahuje jen soubory, na které tehdy odkazoval
nový web, takže úplná není.

VPS odpovídá jen na jména svého vhostu. `www` teď míří na Cloudflare, proto se
na server chodí přes alias `soubory.ochrance.cz`. Ten přesměrovává na
`www.soubory.ochrance.cz`, na které má Zoner certifikát (DigiCert, platí do
30. 1. 2027). Když certifikát vyprší, Worker se na VPS nedostane a soubory
mimo kopii na CDN vrátí 503.

Worker si soubory z VPS drží hodinu v cache Cloudflare, aby server dostával
jen zlomek požadavků.

## Co je v repozitáři

| Soubor | K čemu |
| --- | --- |
| `wrangler.jsonc` | Worker, assety z `../dist`, route, adresy VPS a CDN |
| `src/index.ts` | proxy živých adresářů, stará přesměrování, stránka 404 |
| `src/legacy-redirects.json` | 1 885 starých URL → nové (generovaný soubor) |
| `scripts/build-legacy-redirects.ts` | generátor přesměrování |
| `../public/_headers` | bezpečnostní hlavičky a cache statických souborů |
| `setup-zone.sh` | nastavení zóny a custom hostnames přes `cf` CLI |
| `../.github/workflows/deploy-cloudflare.yml` | build a deploy z `main` v `ochrance-cz/web` |

Přesměrování se generují ze starého Hugo repozitáře (`ochrance-cz/web`, remote
`origin`): z ručních pravidel v `layouts/index.htaccess` a z `oldUrl` jednotlivých
stránek. Cíl se zapíše jen tehdy, když ho nový build opravdu obsahuje.

```bash
bun run build
bun cloudflare/scripts/build-legacy-redirects.ts            # volitelně ref, výchozí origin/main
```

## Lokální spuštění

```bash
bun run build
cd cloudflare
ulimit -n 61000
CHOKIDAR_USEPOLLING=true npx wrangler dev --port 8799
```

Bez `CHOKIDAR_USEPOLLING` wrangler na macOS spadne na `EMFILE`, protože hlídá
12 000 souborů v `dist/`.

## Jednorázové nastavení v Cloudflare

Vše v Cloudflare účtu Kanceláře, kde je zóna `domekpolopate.cz` (nameservery
`carlane` a `dan`, Free plán). Kroky 1, 2, 3 a 6 dělá `setup-zone.sh` přes `cf` CLI
a 4. 10. 2026 proběhly. Skript se dá pustit znovu, existující věci nechá být a na
konci vypíše DNS záznamy pro správce `ochrance.cz`:

```bash
cf auth create ochrance          # přihlášení kódem, funguje i přes vzdálený přístup
CF_DRY_RUN=1 cloudflare/setup-zone.sh
cloudflare/setup-zone.sh
```

1. **DNS zóny:** přidat `fallback` typu `AAAA` s hodnotou `100::`, proxied.
   Je to záznam bez originu, požadavky obslouží Worker.
2. **SSL/TLS → Custom Hostnames:** zapnout Cloudflare for SaaS. Prvních 100
   hostnames je zdarma, Cloudflare ale může chtít platební údaje. Jako Fallback Origin
   nastavit `fallback.domekpolopate.cz` a počkat na stav Active.
3. **Přidat custom hostnames `www.ochrance.cz` a `deti.ochrance.cz`**, minimální
   TLS 1.2, validace certifikátu TXT. U každého Cloudflare ukáže dva údaje, které
   musí do DNS `ochrance.cz` doplnit správce domény ještě před přepnutím:

   | Název | Typ | Hodnota |
   | --- | --- | --- |
   | `_cf-custom-hostname.www.ochrance.cz` | TXT | ověřovací UUID z detailu hostname |
   | `_acme-challenge.www.ochrance.cz` | CNAME | `www.ochrance.cz.<kód>.dcv.cloudflare.com` |
   | `_cf-custom-hostname.deti.ochrance.cz` | TXT | ověřovací UUID z detailu hostname |
   | `_acme-challenge.deti.ochrance.cz` | CNAME | `deti.ochrance.cz.<kód>.dcv.cloudflare.com` |

   `<kód>` je na stránce Custom Hostnames v části DCV Delegation. CNAME je
   lepší než jednorázový TXT: certifikát se pak obnovuje sám každých 90 dní
   a nikdo nemusí do DNS sahat znovu.
4. **Počkat, až je hostname i certifikát Active.** Teprve potom přepínat DNS.
   Web posílá HSTS, takže bez platného certifikátu by se návštěvníci na web
   vůbec nedostali.
5. **API token pro deploy:** šablona „Edit Cloudflare Workers“, omezená na tento
   účet a zónu `domekpolopate.cz`. Do `ochrance-cz/web` i `ochrance-cz/deti`
   (Settings → Secrets → Actions) uložit `CLOUDFLARE_API_TOKEN` a
   `CLOUDFLARE_ACCOUNT_ID`. Na secrets může být potřeba admin repozitáře.
6. **Nastavení zóny**, platí i pro custom hostname:
   - SSL/TLS → Edge Certificates: Always Use HTTPS zapnout, Minimum TLS 1.2.
   - Scrape Shield: Email Address Obfuscation vypnout. Jinak Cloudflare přepíše
     e-mailové adresy na stránkách na JavaScript.
   - Speed: Rocket Loader vypnout.
   - Security → Bots: Bot Fight Mode vypnout. Blokoval by RSS čtečky a jiné
     automaty, které web legitimně stahují.
   - Web Analytics: nezapínat automatické vkládání skriptu, pokud o něm
     Kancelář výslovně nerozhodne.

## Přepnutí

Den předem požádat správce DNS o snížení TTL záznamů `www` a `deti` z 1 800 na
300 sekund.

1. Nasadit aktuální verzi obou webů (push do `main`, deploy se spustí sám). Dokud DNS míří na VPS, nové weby
   jsou vidět jen na `ochrance-web.<účet>.workers.dev` a
   `ochrance-deti.<účet>.workers.dev`. Tam projít kontroly níže.
2. Správce DNS u `www.ochrance.cz` i `deti.ochrance.cz` smaže `A` i `AAAA` a
   přidá `CNAME fallback.domekpolopate.cz`. Záznamy `ochrance.cz`, `soubory` a
   `www.soubory` se nemění.
3. Projít kontroly na ostrých adresách.

Návrat zpět: `www` a `deti` vrátit na `A 217.198.116.7` a
`AAAA 2a00:19a0:3:74:0:d9c6:7407:1`. Staré weby na VPS zůstávají, nový strom do
nich nic nenasazuje.

## Kontroly

```bash
H=https://www.ochrance.cz        # před přepnutím adresa na workers.dev
curl -sI $H/ | grep -iE 'HTTP|strict-transport'                      # 200 + HSTS
curl -sI $H/neexistuje/ | head -1                                    # 404
curl -sI "$H/uploads-import/ESO/Stanovisko%20final.pdf" \
  | grep -iE 'HTTP|x-ochrance-source'                                # 200, legacy nebo cache
curl -sI $H/uploads-deti/user_upload/Prilohy/navod__1_.pdf | head -1 # 200
curl -sI $H/fileadmin/user_upload/ESO/6059-2015-IP-Z.pdf \
  | grep -iE 'HTTP|location'                                         # 301 → /uploads-import/…
curl -sI $H/kontakty/ | grep -iE 'HTTP|location'                     # 301 → /kontakt/
curl -sI http://ochrance.cz/ | grep -iE 'HTTP|location'              # 301 → https (VPS)

D=https://deti.ochrance.cz       # před přepnutím adresa na workers.dev
curl -sI $D/ | grep -iE 'HTTP|strict-transport'                      # 200 + HSTS
curl -sI $D/neexistuje/ | head -1                                    # 404
curl -sI $D/kontakt/ | grep -iE 'HTTP|location'                      # 301 → /jak-vas-kontaktovat/
```

`x-ochrance-source: legacy` potvrzuje, že se Cloudflare na VPS dostane. Hodnota
`cdn` u souboru, který na VPS existuje, znamená, že VPS požadavky z Cloudflare
odmítá.

## Po přepnutí

- **Duplicitní obsah:** `www.soubory.ochrance.cz` servíruje celý starý web.
  Z repozitáře se na VPS už nic nenasazuje, takže pravidlo musí na server
  doplnit Zoner nebo správce přes SSH, za pravidlo pro `www` v `.htaccess`:

  ```apache
  RewriteCond %{HTTP_HOST} ^www\.soubory\.ochrance\.cz$ [NC]
  RewriteCond %{REQUEST_URI} !^/(uploads-import|uploads-deti)/
  RewriteRule (.*) https://www.ochrance.cz%{REQUEST_URI} [L,R=301]
  ```

  Generátor přesměrování se pak už starého serveru na cíle nedoptá. Výsledek je
  uložený v `src/legacy-redirects.json`.
- **Elasticsearch** za `search.ochrance.cz` web od 12. 5. 2026 nepoužívá
  (vyhledávání je na Pagefindu). Plnil ho jen starý deploy. Pokud ho nic jiného
  nečte, může ho Kancelář vypnout a `/elastic.json` se dá z webu odstranit.
- **Certifikát `www.soubory.ochrance.cz`** vyprší 30. 1. 2027, obnovuje Zoner.

## Limity

- Free plán dovolí 20 000 souborů na verzi Workeru. Build webu jich má 12 611,
  dětský web 1 322.
  Každá nová stránka přidá zhruba tři. Workers Paid (5 USD měsíčně) limit
  zvedá na 100 000.
- Statické soubory se do denního limitu 100 000 požadavků Workeru nepočítají.
  Worker běží jen pro živé adresáře a pro adresy, které v buildu nejsou. Po
  vyčerpání limitu vrací tyto adresy 429, statický web běží dál.
- `_redirects` smí mít 2 000 statických a 100 dynamických pravidel, build má
  574 a 27. Proto jsou stará přesměrování ve Workeru, ne v `_redirects`.
- Média webu zůstávají na `cdn.nuasite.com` (R2 v účtu Nua), web odkazuje
  na zhruba 6 400 souborů.
