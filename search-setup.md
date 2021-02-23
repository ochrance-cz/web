---
title: Setup
---

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
git clone X ochrance
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

## Nastavení automatického spouštění klientské aplikace

## Nastavení automatického obnovení certifikátu

? systemd, spustit certbot renew každých 60 dní
? je to dost spolehlivé?
