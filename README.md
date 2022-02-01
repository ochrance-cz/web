---
title: Nastavení a struktura webu
---

# Web

Deployment webu je jednoduchý — spusťte hugo v0.81.0 v kořenovém adresáři a
umístěte na server složku ./public. V souboru .github/workflows/deploy.yml je popsaný automatický
deploy pomocí Github Actions: build probíhá na Githubu, následně se přesouvá obsah pomocí SCP
(rsync není na serveru dostupný) a ten se pak rozbalí.

## Úpravy webu a repozitář

Zdrojový kód celého webu je dostupný v repozitáři [github.com/ochrance-cz/web](https://github.com/ochrance-cz/web).

Po commitu do větve `main` se spouští automaticky actions, které nasadí web pomocí postupu
popsaného v `.github/workflows/deploy.yml` na produkční server. Přístupové údaje k serveru
jsou uložené v rozhraní Githubu.

## Struktura zdrojového kódu a lokální editování

Struktura webu je z velké části stejná jako ve výchozí šabloně [Hugo](https://gohugo.io/documentation/) — výjimkou je anglický obsah,
který je umístěn v adresáři /content-en. Nejdůležitější složky jsou následující

- `assets` obsahuje CSS styly a skripty
- `layouts` obsahuje HTML šablony celého webu
- `content` a `content-en` obsahují český, resp. anglický obsah
- `data` obsahují strukturovaná data, v našem případě především soubor s uživatelsky nastavitelnými přesměrováními
- `config-gen` a `custom-editor` souvisejí s administrací a custom HTML editorem
- `static` a `static-preview` obsahují soubory, které se přímo překopírují do vygenerovaného webu, resp. jeho náhledu

Ostatní složky a konfigurační soubory doporučuji neměnit.

### Obsah

Obsah je vždy strukturován následně:

- `/content[-en]/<název-kolekce>/_index.markdown` - každá kolekce vyžaduje kořenový soubor, jinak danou složku Hugo vynechá; přípona `.markdown` je použita, aby bylo možné tyto kořenové soubory odfiltrovat v administraci
- `/content[-en]/<název-kolekce>/<název-stránky>/index.md` - stránka vyžaduje soubor index.md, příp. je možné využít i `<název-stránky>.md`, ale bez adresářové konvence nebude daná stránka vidět v administraci

### Šablony

Šablony jsou strukturovány analogicky k obsahu. V každé kolekci existuje více šablon: přinejmenším `list.html`
pro rozcestníky (`_index.markdown`) a `single.html` pro jednotlivé stránky. Pokud nejsou šablony dostupné,
použijí se šablony z adresáře `_default`. V této složce je pak ještě obalová šablona baseof.html, do níž se
obalují všechny další šablony.

Šablony s non-html koncovkou (json, xml, htaccess) slouží pro vygenerování specifických souborů z dat,
která jsou obsažená v obsahových a data adresářích.

Některé šablony přebírají obsah z jiných kolekcí (např. Situace a Letáky). Některé vkládané soubory
obsahují větší komplexitu nebo specifickou funkcionalitu:

- layouts/partials/pages-map.html je speciální implementace řazení (stránek) podle české abecedy
- layouts/partials/md-block.html je partial, který mění chování markdownového překladače do HTML tak,
  aby byl i jednořádkový obsah obalen v HTML blokovým prvkem (odstavcem)

### Administrace

Administrace je spuštěná prostřednictvím služby Netlify a propojení s Githubem. Přístupové údaje a adresa administrace nejsou veřejné. Celý web je verzovaný, takže je možné jej spravovat i přímo lokálně anebo prostřednictvím úprav na Github.com.

# Elastic search

Kroky ke zprovoznění elasticsearch pro web ombudsman.cz na čisté VPS (Debian10), která běží na subdoméně.

## Jako root:

Instalace gitu, node, curl a certbota:

```
apt update
apt install git nodejs npm certbot curl
```

Instalace elasticsearch:

```
apt install apt-transport-https wget
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | apt-key add -
echo "deb https://artifacts.elastic.co/packages/7.x/apt stable main" | tee /etc/apt/sources.list.d/elastic-7.x.list
apt-get update && apt-get install elasticsearch
```

Pozn: V Debianu je starý nodejs (v10), ale prozatím to neřeším.

Zpřístupnění složek pro uživatele elasticuser:

```
chown -R elasticuser:elasticuser /var/lib/elasticsearch/
chown -R elasticuser:elasticuser /usr/share/elasticsearch/
chown -R elasticuser:elasticuser /etc/default/elasticsearch
chown -R elasticuser:elasticuser /etc/elasticsearch
chown -R elasticuser:elasticuser /var/log/elasticsearch
```

## Jako elasticuser:

Vyzkoušet, jestli jde ES spustit manuálně:

```
/usr/share/elasticsearch/bin/elasticsearch
```

Z uživatele root se pak dá vyzkoušet, jestli je server dostupný na portu 9200:

```
curl localhost:9200
```

Pro další postup nechte zatím ES v této session běžet.

## Jako root:

Začít generování certifikátu do kroku, který vytvoří acme-challenge:

```
certbot certonly --manual
```

## Jako root v druhém SSH okně:

Stáhnout aplikaci, vložit do .well-known požadovaný soubor (pozor na speciální název i obsah) a spustit server, který to zpřístupní:

```
git clone https://github.com/ochrance-cz/web ochrance
cd ochrance/server
npm i
touch .well-known/acme-challenge/<filename>
nano .well-known/acme-challenge/<filename>
node provide-acme.js
```

Spuštění zajistí dostupnost souboru na doméně, je možné to ověřit stažením souboru:

http://search.ombudsman.cz/.well-known/acme-challenge/<filename>

Pokud je soubor dostupný, nechte server se statickými soubory běžet a můžeme pokračovat.

## Zpět jako root v prvním okně:

Odklepnout Enterem verifikaci, proces by měl pogratulovat a uložit soubory

```
/etc/letsencrypt/live/search.ochrance.cz/fullchain.pem
/etc/letsencrypt/live/search.ochrance.cz/privkey.pem
```

Aplikaci ve druhé session je možné ukončit a spojení uzavřít.

Následně je možné otestovat funkčnost HTTPS pomocí testovacího serveru:

```
node ochrance/server/test-https.js
```

Prohlížeč by měl na doméně search.ochrance.cz zobrazit hlášku „Dobre rano!“.

## Nastavení elasticsearch

Konfigurace mapování obsahu je dumpnutá v souboru mapping.json.

Ten je možné vložit pomocí příkazu (uživatel elasticuser)

```
curl -X PUT "localhost:9200/ochrance-cs/_mapping?pretty" -H 'Content-Type: application/json' -d'
{
  ...
}
'
```

## Prevence log4j

src: https://xeraa.net/blog/2021_mitigate-log4j2-log4shell-elasticsearch/

Don’t edit /etc/elasticsearch/jvm.options directly, since it might get overwritten by an update. Instead, create a file in /etc/elasticsearch/jvm.options.d/. For example /etc/elasticsearch/jvm.options.d/log4j2.options with the following content and then restart the Elasticsearch service:

# CVE-2021-44228

-Dlog4j2.formatMsgNoLookups=true

## Nastavení automatického spouštění klientské aplikace a automatického obnovení certifikátu

Prozatím není aktivní — po rebootu serveru je nutné spustit aplikaci (po účtem elasticuser):

```
systemctl start elasticsearch

# ověření, že ES běží
curl http://localhost:9200/_cluster/health?pretty
```

Obnovení certifikátu probíhá automaticky pomocí certbot.
