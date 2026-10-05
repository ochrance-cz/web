/**
 * Legacy/changed URLs → targets. Ported from Hugo data/redirects.yml.
 * Astro emits meta-refresh pages for these in the static build.
 */
export const redirects: Record<string, string> = {
  '/info/obcane-eu/': '/pusobnost/obcane-eu/',
  // Verified against the live sitemaps on 2026-10-02.
  "/err/": "/err/404/",
  "/dokument/doporuceni_verejne_ochrankyne_prav_ke_spolecnemu_vzdelavani_romskych_a_neromskych_deti/index_1/": "/dokument/doporuceni_verejne_ochrankyne_prav_ke_spolecnemu_vzdelavani_romskych_a_neromskych_deti/",
  "/vzdelavaci-akce/aplikace-stavebniho-zakona-amoznosti-reseni-hluku--kulaty-stul/": "/vzdelavaci-akce/aplikace-stavebniho-zakona-amoznosti-reseni-hluku-–-kulaty-stul/",
  "/vzdelavaci-akce/budoucnost-rodinnepravniho-soudnictvi--justice-vstricna-detem/": "/vzdelavaci-akce/budoucnost-rodinnepravniho-soudnictvi-–-justice-vstricna-detem/",
  "/vystupy/rocenky_uprchlickeho_a_cizineckeho_prava/": "/vystupy/rocenky-uprchlickeho-a-cizineckeho-prava/",
  "/situace/skolstvi/": "/situace/skolství/",
  "/en/vystupy/opinions_of_the_public_defender_of_rights/": "/en/vystupy/opinions/",
  "/letaky/sdilena-ekonomika_prepravni-sluzby/": "/letaky/",

  '/testovaci-ukazka/': '/kontakt/',
  '/pusobnost/dohled-nad-omezovanim-osobni-svobodyaktuality-z-detenci/aktuality-z-detenci-2019/osn-zasady-ucinneho-vysetrovani-a-dokumentovani-muceni-a-spatneho-zachazeni-konecn-1/':
    '/aktualne/osn_zasady_ucinneho_vysetrovani_a_dokumentovani_muceni_a_spatneho_zachazeni_konecne_v_cestine/',
  // Sources stay site paths — a redirect cannot be keyed on an absolute URL.
  // Targets point straight at the CDN so the browser takes one hop, not two.
  '/letaky/sluzebni-pomer-ozbrojene-slozky/sluzebni-pomer-ozbrojene-slozky.pdf':
    'https://cdn.nuasite.com/assets/ochrance-web-lj8h86/versions/6274dbc087032c2d3f735c7b7dca1fd21c90982c7d0d6ac298b4dfa2a9c81272/letaky/statni-sluzba/statni-sluzba.pdf',
  '/uploads-import/ochrana_osob/Umluvy/vezenstvi/R_2006_2_Evr_vezen_pravidla_.pdf':
    'https://cdn.nuasite.com/assets/ochrance-web-lj8h86/uploads-import/ESO/EVP_CS_FIN.pdf',
  '/skolska-zarizeni-2022':
    'https://cdn.nuasite.com/assets/ochrance-web-lj8h86/uploads-import/ESO/%C5%A0kolsk%C3%A1-za%C5%99%C3%ADzen%C3%AD_CZ_el-verze.pdf',
  '/vystupy/vz-diskriminace/': '/vystupy/vyrocni_zprava_o_diskriminaci/',
  // English sections use localized slugs in production; we serve them at Czech slugs.
  '/en/projects/': '/en/projekty/',
  '/en/news/': '/en/aktualne/',
  '/en/situace/': '/en/not-sure/',

  // Press releases moved out of Hugo year-folders to flat /aktualne/<slug>/.
  // (Cross-links in imported article bodies; targets verified to exist in build.)
  '/aktualne/tiskove-zpravy-2009/': '/aktualne/',
  '/aktualne/tiskove-zpravy-2007/vsetin-pri-vystehovani-romskych-rodin-pochybil/': '/aktualne/vsetin-pri-vystehovani-romskych-rodin-pochybil/',
  '/aktualne/tiskove-zpravy-2008/dodrzovani-pracovnich-podminek-polskych-delniku/': '/aktualne/dodrzovani-pracovnich-podminek-polskych-delniku/',
  '/aktualne/tiskove-zpravy-2010/desatero-dobre-praxe-pro-posouzeni-zadosti-o-odskodneni/': '/aktualne/desatero-dobre-praxe-pro-posouzeni-zadosti-o-odskodneni/',
  '/aktualne/tiskove-zpravy-2011/fotovoltaicka-elektrarna-v-chranenem-uzemi-musi-mit-souhlasy-a-vyjimky-dle-zakona-o-ochra/': '/aktualne/fotovoltaicka-elektrarna-v-chranenem-uzemi-musi-mit-souhlasy-a-vyjimky-dle-zakona-o-ochra/',
  '/aktualne/tiskove-zpravy-2015/deset-let-ochrance-uspesne-bojuje-proti-spatnemu-zachazeni/': '/aktualne/deset-let-ochrance-uspesne-bojuje-proti-spatnemu-zachazeni/',
  '/aktualne/tiskove-zpravy-2015/novinky-planovane-ve-stavebnim-zakone/': '/aktualne/novinky-planovane-ve-stavebnim-zakone/',
  '/aktualne/tiskove-zpravy-2015/ochrankyne-se-zasazuje-o-lepsi-kvalitu-vody/': '/aktualne/ochrankyne-se-zasazuje-o-lepsi-kvalitu-vody/',
  '/aktualne/tiskove-zpravy-2015/ombudsmanka-brani-fasadu-historickeho-domu-v-olomouci/': '/aktualne/ombudsmanka-brani-fasadu-historickeho-domu-v-olomouci/',
  '/aktualne/tiskove-zpravy-2016/adresati-mladsi-15-let-maji-pravo-prebirat-zasilky-urcene-do-vlastnich-rukou/': '/aktualne/adresati-mladsi-15-let-maji-pravo-prebirat-zasilky-urcene-do-vlastnich-rukou/',
  '/aktualne/tiskove-zpravy-2016/neprihlasili-auto-vcas-prisli-o-nej/': '/aktualne/neprihlasili-auto-vcas-prisli-o-nej/',
  '/aktualne/tiskove-zpravy-2016/ombudsmanka-zada-vladu-o-napravu-nezakonne-praxe-v-oblasti-stavebniho-radu/': '/aktualne/ombudsmanka-zada-vladu-o-napravu-nezakonne-praxe-v-oblasti-stavebniho-radu/',
  '/aktualne/tiskove-zpravy-2016/verejny-ochrance-prav-a-ceske-soudy-maji-obvykle-stejny-pravni-nazor/': '/aktualne/verejny-ochrance-prav-a-ceske-soudy-maji-obvykle-stejny-pravni-nazor/',
  '/aktualne/tiskove-zpravy-2016/zveme-na-konferenci-o-nerovnem-odmenovani/': '/aktualne/zveme-na-konferenci-o-nerovnem-odmenovani/',
  '/aktualne/tiskove-zpravy-2017/lide-podcenuji-chov-zvirat-urady-musi-pri-reseni-spolupracovat/': '/aktualne/lide-podcenuji-chov-zvirat-urady-musi-pri-reseni-spolupracovat/',
  '/aktualne/tiskove-zpravy-2018/lecebny-dlouhodobe-nemocnych-jake-vybaveni-mohou-pacienti-vyzadovat/': '/aktualne/lecebny-dlouhodobe-nemocnych-jake-vybaveni-mohou-pacienti-vyzadovat/',
  '/aktualne/tiskove-zpravy-2018/lecebny-dlouhodobe-nemocnych-prehled-prav-pacientu/': '/aktualne/lecebny-dlouhodobe-nemocnych-prehled-prav-pacientu/',
  '/aktualne/tiskove-zpravy-2018/ombudsmanka-zada-o-snizeni-byrokracie-a-zatezovani-lidi-pri-nahlizeni-do-spisu/': '/aktualne/ombudsmanka-zada-o-snizeni-byrokracie-a-zatezovani-lidi-pri-nahlizeni-do-spisu/',
  '/aktualne/tiskove-zpravy-2018/ombudsmanka-zada-vladu-aby-urady-informovaly-obcany-o-moznosti-nezavisleho-soudniho-pre/': '/aktualne/ombudsmanka-zada-vladu-aby-urady-informovaly-obcany-o-moznosti-nezavisleho-soudniho-pre/',
  '/aktualne/tiskove-zpravy-2018/stiznosti-tykajicich-se-socialniho-zabezpeceni-je-historicky-nejvic/': '/aktualne/stiznosti-tykajicich-se-socialniho-zabezpeceni-je-historicky-nejvic/',
  '/aktualne/tiskove-zpravy-2019/jak-branit-sireni-nenavisti-na-internetu-1/': '/aktualne/jak-branit-sireni-nenavisti-na-internetu-1/',
  '/aktualne/tiskove-zpravy-2019/je-alarmujici-ze-stat-odsouva-ochranu-senioru/': '/aktualne/je-alarmujici-ze-stat-odsouva-ochranu-senioru/',
  '/aktualne/tiskove-zpravy-2019/konzulat-odmital-vydat-cestovni-prukaz-nemocnemu-diteti-ktere-se-tak-nemohlo-vratit-s-matk/': '/aktualne/konzulat-odmital-vydat-cestovni-prukaz-nemocnemu-diteti-ktere-se-tak-nemohlo-vratit-s-matk/',
  '/aktualne/tiskove-zpravy-2019/lide-s-postizenim-maji-pravo-na-dostupnou-zubni-peci/': '/aktualne/lide-s-postizenim-maji-pravo-na-dostupnou-zubni-peci/',
  '/aktualne/tiskove-zpravy-2019/nezaplatite-li-10-000-kc-uohs-ani-nezakonna-verejna-zakazka-nezajima-ombudsmanka-to-chce/': '/aktualne/nezaplatite-li-10-000-kc-uohs-ani-nezakonna-verejna-zakazka-nezajima-ombudsmanka-to-chce/',
  '/aktualne/tiskove-zpravy-2019/ospod-nechal-matce-se-zdravotnim-postizenim-prechodne-odebrat-dite-misto-aby-se-ji-snazil/': '/aktualne/ospod-nechal-matce-se-zdravotnim-postizenim-prechodne-odebrat-dite-misto-aby-se-ji-snazil/',
  '/aktualne/tiskove-zpravy-2019/predcasne-narozenemu-diteti-se-diky-ombudsmance-dostava-pece-hrazene-pojistovnou/': '/aktualne/predcasne-narozenemu-diteti-se-diky-ombudsmance-dostava-pece-hrazene-pojistovnou/',
  '/aktualne/tiskove-zpravy-2019/ustecky-krajsky-urad-podporuje-nezakonne-jednani/': '/aktualne/ustecky-krajsky-urad-podporuje-nezakonne-jednani/',
  '/aktualne/tiskove-zpravy-2019/zarizeni-pro-deti-vyzadujici-okamzitou-pomoc-neplni-svuj-zakonny-ucel/': '/aktualne/zarizeni-pro-deti-vyzadujici-okamzitou-pomoc-neplni-svuj-zakonny-ucel/',
  '/aktualne/tiskove-zpravy-2020/deti-s-postizenim-maji-pravo-chodit-do-skoly/': '/aktualne/deti-s-postizenim-maji-pravo-chodit-do-skoly/',
  '/aktualne/tiskove-zpravy-2020/dluhy-nemohou-byt-duvodem-odmitnuti-porucnictvi-zajem-ditete-je-dulezitejsi/': '/aktualne/dluhy-nemohou-byt-duvodem-odmitnuti-porucnictvi-zajem-ditete-je-dulezitejsi/',
  '/aktualne/tiskove-zpravy-2020/dnes-si-pripominame-mezinarodni-den-lidi-s-postizenim/': '/aktualne/dnes-si-pripominame-mezinarodni-den-lidi-s-postizenim/',
  '/aktualne/tiskove-zpravy-2020/inspekce-prace-a-neziskove-organizace-spolecne-ombudsmanka-zorganizovala-setkani-k-ochrane-p/': '/aktualne/inspekce-prace-a-neziskove-organizace-spolecne-ombudsmanka-zorganizovala-setkani-k-ochrane-p/',
  '/aktualne/tiskove-zpravy-2020/lide-v-zarizenich-byli-v-dobe-pandemie-covid-19-nekdy-uplne-odriznuti-od-okoli/': '/aktualne/lide-v-zarizenich-byli-v-dobe-pandemie-covid-19-nekdy-uplne-odriznuti-od-okoli/',
  '/aktualne/tiskove-zpravy-2020/matce-s-postizenim-bylo-upirano-pravo-starat-se-o-sve-dite-pomohl-ji-az-zasah-ombudsmank/': '/aktualne/matce-s-postizenim-bylo-upirano-pravo-starat-se-o-sve-dite-pomohl-ji-az-zasah-ombudsmank/',
  '/aktualne/tiskove-zpravy-2020/monika-simunkova-pomohla-rodinam-ktere-rozdelila-epidemie/': '/aktualne/monika-simunkova-pomohla-rodinam-ktere-rozdelila-epidemie/',
  '/aktualne/tiskove-zpravy-2020/ombudsman-proveri-zamer-zrusit-telefonni-automaty/': '/aktualne/ombudsman-proveri-zamer-zrusit-telefonni-automaty/',
  '/aktualne/tiskove-zpravy-2020/ombudsmanka-usporadala-konferenci-venovanou-obecnimu-bydleni-a-socialni-praci-s-klienty-v-by/': '/aktualne/ombudsmanka-usporadala-konferenci-venovanou-obecnimu-bydleni-a-socialni-praci-s-klienty-v-by/',
  '/aktualne/tiskove-zpravy-2020/vzdelavaci-system-nepocita-s-zaky-s-odlisnym-materskym-jazykem/': '/aktualne/vzdelavaci-system-nepocita-s-zaky-s-odlisnym-materskym-jazykem/',
  '/aktualne/tiskove-zpravy-2020/zastupkyne-ombudsmana-monika-simunkova-zahajila-odborny-seminar-venovany-zarizenim-pro/': '/aktualne/zastupkyne-ombudsmana-monika-simunkova-zahajila-odborny-seminar-venovany-zarizenim-pro/',
  '/aktualne/tiskove-zpravy-2020/zastupkyne-ombudsmana-resi-stiznosti-na-nova-pravidla-ohledne-prijimani-zaku-na-str/': '/aktualne/zastupkyne-ombudsmana-resi-stiznosti-na-nova-pravidla-ohledne-prijimani-zaku-na-str/',
  '/tiskove-zpravy/tiskove-zpravy-2012/ministryne-prace-a-socialnich-veci-prislibila-zabyvat-se-systemem-donez/': '/aktualne/ministryne-prace-a-socialnich-veci-prislibila-zabyvat-se-systemem-donez/',
  '/tiskove-zpravy/tiskove-zpravy-2012/nedostatky-systemu-visapoint-odporuji-mezinarodnim-zavazkum-cr/': '/aktualne/nedostatky-systemu-visapoint-odporuji-mezinarodnim-zavazkum-cr/',
  '/tiskove-zpravy/tiskove-zpravy-2012/ochrance-upozornuje-na-protipravni-aspekty-tzv-karty-socialnich-systemu-skarty/': '/aktualne/ochrance-upozornuje-na-protipravni-aspekty-tzv-karty-socialnich-systemu-skarty/',
  '/tiskove-zpravy/tiskove-zpravy-2012/pece-o-seniory-jako-podnikatelsky-zamer-bez-zaruky-kvality/': '/aktualne/pece-o-seniory-jako-podnikatelsky-zamer-bez-zaruky-kvality/',
  '/tiskove-zpravy/tiskove-zpravy-2012/pocet-stiznosti-na-novy-system-dochazky-nezamestnanych-roste/': '/aktualne/pocet-stiznosti-na-novy-system-dochazky-nezamestnanych-roste/',
  '/tiskove-zpravy/tiskove-zpravy-2012/vetsinu-doporuceni-poslanci-realizovali-ochrance-jim-predklada-7-dalsich/': '/aktualne/vetsinu-doporuceni-poslanci-realizovali-ochrance-jim-predklada-7-dalsich/',
  '/tiskove-zpravy/tiskove-zpravy-2013/dite-lze-prijmout-do-skolky-i-nad-kapacitu-mist/': '/aktualne/dite-lze-prijmout-do-skolky-i-nad-kapacitu-mist/',
  '/tiskove-zpravy/tiskove-zpravy-2013/lidem-hrozi-dalsi-vydaje-za-vodovodni-pripojky/': '/aktualne/lidem-hrozi-dalsi-vydaje-za-vodovodni-pripojky/',
  '/tiskove-zpravy/tiskove-zpravy-2013/ministerstvo-zivotniho-prostredi-postupovalo-pri-zamitani-dotaci-z-programu-zelena-uspor': '/aktualne/ministerstvo-zivotniho-prostredi-postupovalo-pri-zamitani-dotaci-z-programu-zelena-uspor/',
  '/tiskove-zpravy/tiskove-zpravy-2013/zaostreno-na-peci-o-seniory/': '/aktualne/zaostreno-na-peci-o-seniory/',
  '/tiskove-zpravy/tiskove-zpravy-2014/navrhovana-pomoc-obcim-zbavit-se-ubytoven-povede-k-bezdomovectvi/': '/aktualne/navrhovana-pomoc-obcim-zbavit-se-ubytoven-povede-k-bezdomovectvi/',
  '/tiskove-zpravy/tiskove-zpravy-2014/ochrankyne-varuje-pred-nelegalnimi-socialnimi-sluzbami/': '/aktualne/ochrankyne-varuje-pred-nelegalnimi-socialnimi-sluzbami/',
  '/tiskove-zpravy/tiskove-zpravy-2014/vime-ze-se-povodne-budou-opakovat-prevenci-vsak-zanedbavame/': '/aktualne/vime-ze-se-povodne-budou-opakovat-prevenci-vsak-zanedbavame/',
  '/tiskove-zpravy/tiskove-zpravy-2015/chybuje-verejna-ochrankyne-prav-tim-ze-poukazuje-na-nezakonny-postup-realitnich-kancela/': '/aktualne/chybuje-verejna-ochrankyne-prav-tim-ze-poukazuje-na-nezakonny-postup-realitnich-kancela/',
};

export default redirects;
