---
title: Manuál k tvorbě webu
---

## Struktura administrace

Struktura administrace je záměrně plochá, aby byly všechny kategorie snadno dosažitelné při editaci. Pomocí tlačítka **Quick add** je možné rychle přidat do některé z kategorií novou položku (např. aktualitu).

Na webu jsou některé součásti zanořené skrze podmenu: například v sekci _O nás_ jsou dostupné jak stránky o personálním složení úřadu, tak informace o působnosti Ombudsmana a Provozní informace.

## Práce s obsahem

Celá administrace je složená z různých polí — některé umožňují formátování, jiná ne, jiná umožňují jen výběr z definovaných možností. To by mělo usnadňovat práci, protože by nemělo docházet k chybnému zadání informací.

Pozor je potřeba dávat jen na nadpisy: ty by se měly vždy v kontextu stránky postupně zanořovat (hlavní nadpis > nadpis druhé úrovně > nadpis třetí úrovně atp.). Každá stránka již má hlavní nadpis, takže v editoru by neměl být nikdy vložen nadpis první úrovně — nejlepší je vždy začít druhou úrovní.

> Pozor: promítnutí změn do náhledu webu chvíli trvá (cca 20–30 sekund) kvůli zvolenému technickému řešení.

## Vkládání odkazů

Když chcete odkázat na jinou stránku na webu ombudsmana v textu, můžete zkopírovat celou adresu z adresního řádku prohlížeče. Nyní web běží na dočasné adrese, ale to není problém — při spuštění webu tyto odkazy automaticky zkonvertuji tak, aby směřovaly na správnou doménu.

## Vkládání obrázků

Obrázek je možné vložit přímo v editoru (tlačítko +, položka Image). Každý obrázek má krom samotného souboru dvě textová pole:

- Povinný alternativní text (Alt Text), který by měl **vždy** popisovat, co je na obrázku vidět — je náhradou za obrázek v případech, kdy obrázek nejde načíst, pro hlasové čtečky a podobně.
- Nepovinný titulek, který je **volitelně** zobrazen u obrázku.

Většina stránek na webu má vlastní úložiště obrázků, aby nevznikala knihovna plná nejrůznějších obrázků z rozličných zdrojů. Výjimkou jsou následující sekce, které sdílejí jedno společné úložiště:

- Stránky v obecné kategorii „Stránky“ (home, varování, kontakt apod.)
- Stránky v kategorii „Další informace“
- Stránky v kategorii „Provoz“

Toto sdílené úložiště je dostupné skrze odkaz **Media** v horním menu administrace.

## Jazykové mutace webu

V administraci jsou všechny sekce dostupné v obou jazycích: je tedy možné jakoukoli stránku zveřejnit v obou jazycích. Anglická a česká verze se nemusí shodovat.

Pokud jsou dvě stránky identické, např. aktualita v češtině a její překlad, je možné je provázat pomocí tzv. klíče pro překlad. Do klíče u obou jazykových verzí napsat stejný text (nejlépe titulek stránky, pokud je unikátní napříč webem). Je podstatné dávat pozor na mezery apod., nejlepší je text zkopírovat. Základní struktura webu je provázaná automaticky.

Pokud jsou stránky provázaná, přepínač jazykových verzí zobrazí automaticky překlad stejné stránky. Pokud provázané nejsou, zobrazí se homepage.

## Vkládání speciálních prvků

Pro vložení složitějších prvků do textu je místy potřebné použít následující značky. Do textu je můžete přímo kopírovat a jen vyměnit části textů.

### Video z Youtube

Odkazy na Youtube obsahují vždy identifikátor, který označuje konkrétní video. Mohou vypadat např. takto:

https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=20
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://youtu.be/dQw4w9WgXcQ

Pro vložení videa je potřeba jen tento identifikátor nebo adresa. Takto vložené video je zobrazí automaticky ve správné velikosti.

**Ukázka:**

{{< youtube "dQw4w9WgXcQ" >}}

**Kód (obě varianty jsou správně):**

&#123;&#123;< youtube "dQw4w9WgXcQ" >&#125;&#125;

&#123;&#123;< youtube "https://youtu.be/dQw4w9WgXcQ" >&#125;&#125;

### Rozbalovací text

Rozbalovací text je po načtení stránky sbalený a obsahuje nějaké sekundární detaily, ilustrační příklad apod. Text uvnitř může mít několik odstavců a může obsahovat i obrázky apod. Text titulku je pouze jednořádkový.

**Ukázka:**

{{< rozbal "Titulek" >}}
Vložený text

Další odstavec
{{< /rozbal >}}

**Kód:**

&#123;&#123;< rozbal "Titulek" >&#125;&#125;
Vložený text

Další odstavec
&#123;&#123;< /rozbal >&#125;&#125;
