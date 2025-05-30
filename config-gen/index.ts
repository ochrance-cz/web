import {
  string,
  text,
  datetime,
  list,
  file,
  image,
  markdown,
  customEditor,
  boolean,
  object,
  select,
  relation,
  map,
  number,
  save,
  fileCollection,
  FileCollection,
  Files,
  files,
  title,
  folderCollection,
  FolderCollection,
  AnyWidget,
} from './buildconf.ts';

const pic = (title: string, name: string) =>
  object(title, name, [
    image('Obrázek', 'pic'),
    string('Popis obrázku', 'desc', {
      hint: 'Popis slouží ke zpřístupnění obrazového obsahu v textové formě.',
      required: true,
    }),
  ]);

const slug = (required: boolean = false) =>
  string('Řetezec v adrese', 'slug', {
    hint: 'Pouze číslice, písmena anglické abecedy, spojovník a podtržítko.',
    pattern: [
      '^[a-z0-9-_]+$',
      'Řetezec v adrese může obsahovat pouze číslice, písmena anglické abecedy, spojovník a podtržítko.',
    ],
    required: required,
  });

const fig = (title: string, name: string) =>
  object(title, name, [
    image('Obrázek', 'pic'),
    string('Titulek obrázku', 'caption', {
      hint: 'Titulek viditelný pod obrázkem.',
    }),
    string('Popis obrázku', 'desc', {
      hint: 'Popis slouží ke zpřístupnění obrazového obsahu v textové formě.',
      required: true,
    }),
  ]);

const attached = (listTitle: string = 'Přílohy', name: string = 'attachments') =>
  list(listTitle, 'Příloha', name, [title('Název přílohy'), file('Soubor', 'file'), string('Odkaz', 'link')]);

const cta = () =>
  object(
    'Kontaktní patička',
    'cta',
    [
      string('Nadpis', 'title'),
      string('Odkaz', 'btnLink', {
        hint: 'Výchozí odkaz směřuje na stránku podání stížnosti.',
      }),
    ],
    {
      collapsed: true,
    }
  );

const links = (title: string, name: string = 'links') => {
  return list(title, 'odkaz', name, [string('Odkaz', 'link'), string('Popis', 'text')]);
};

const twoColTypes = [
  { label: 'Špatně x Správně', value: 'no-yes' },
  { label: 'Příklady', value: 'yes-yes' },
];

const twoColFields: ReturnType<typeof markdown>[] = [];

for (var i = 1; i <= 10; ++i) {
  twoColFields.push(markdown(`${i}. pole vlevo`, `left-${i}`));
  twoColFields.push(markdown(`${i}. pole vpravo`, `right-${i}`));
}

const stranky = files('Jiné', 'stranky', [
  fileCollection('Homepage', 'home', 'content/_index.markdown', [
    title('Titulek'),
    string('Motto', 'claim'),
    image('Obrázek na homepage', 'headerPic'),
    string('Alternativní text k obrázku na homepage', 'headerPicAlt', {
      hint: 'Popis slouží ke zpřístupnění obrazového obsahu v textové formě.',
    }),
    markdown('Hlavní text', 'body'),
    string('Mezititulek: potřebuji pomoc', 'situationsTitle'),
    string('Mezititulek: činnost', 'cinnostTitle'),
    markdown('Info o přístupnosti', 'accessibility'),
    relation('Zobrazené kategorie aktualit', 'aktuality', {
      collection: 'vystupy',
      value_field: 'slug',
      display_fields: ['title'],
      search_fields: ['title'],
      multiple: true,
    }),
  ]),
  fileCollection('Varování', 'varovani', 'content/alert/_index.markdown', [
    title('Titulek'),
    string('Označení', 'prefix', { hint: 'Např. "AKTUÁLNĚ". Můžete ponechat prázdné' }),
    boolean('Je varování aktivní?', 'active'),
    markdown('Podrobný popis', 'body', {
      hint: 'Titulek se zobrazí na titulní straně, detailní popis na samostatné stránce.',
    }),
  ]),
  fileCollection('Přesměrování', 'presmerovani', 'data/redirects.yml', [
    list('Seznam přesměrování', 'přesměrování', 'redirects', [
      string('Původní adresa', 'from'),
      string('Nová adresa', 'to'),
    ]),
  ]),
  fileCollection('Podejte stížnost', 'stiznost', 'content/podejte-stiznost/_index.markdown', [
    title('Titulek'),
    string('Podtitul', 'description'),
    list('Formuláře (e-mail)', 'formulář', 'email', [file('Soubor', 'link'), string('Popis', 'desc')]),
    list('Formuláře (poštou)', 'formulář', 'post', [file('Soubor', 'link'), string('Popis', 'desc')]),
    list('Formuláře (osobně)', 'formulář', 'inperson', [file('Soubor', 'link'), string('Popis', 'desc')]),
    object('Jak napsat ombudsmanovi', 'submission', [title('Titulek'), markdown('Poznámky', 'body')]),
    list('Ukázky', 'ukázkově vyplněný formulář', 'example-links', [file('Soubor', 'link'), string('Popis', 'desc')]),
  ]),
  fileCollection('Kontakt', 'kontakt', 'content/kontakt.md', [
    title('Titulek'),
    string('Podtitul', 'description'),
    string('Titulek v menu', 'menuTitle'),
    string('Telefonní číslo', 'phone'),
    string('E-mail', 'email'),
    string('ID datové schránky', 'dataId'),
    markdown('Adresa', 'address'),
    string('Komentář k adrese', 'addressComment'),
    object('Přístup do budov', 'access', [
      markdown('Pěšky', 'walk'),
      markdown('MHD', 'public'),
      markdown('Obecně', 'universal'),
      image('Ilustrační obrázek', 'pic'),
    ]),
    object('Mluvčí', 'pressAgent', [
      string('Pozice', 'role'),
      string('Jméno', 'name'),
      string('Telefon', 'phone'),
      string('E-mail', 'email'),
    ]),
    object('International Relations Officer', 'intl', [
      string('Pozice', 'role'),
      string('Jméno', 'name'),
      string('Telefon', 'phone'),
      string('E-mail', 'email '),
    ]),
  ]),
  fileCollection('Pro média', 'pro-media', 'content/pro-media.md', [
    title('Titulek'),
    string('Podtitul', 'description'),
    boolean('Uložit jako draft', 'draft'),
    markdown('Obsah stránky', 'body'),
  ]),
  fileCollection('Kontakty', 'kontakty', 'content/provoz/kontakty/index.md', [
    title('Titulek'),
    list('Sekce a odbory', 'sekce', 'sections', [title('Název'), markdown('Popis', 'intro')]),
    list('Odbory právní sekce', 'odbor', 'lawyers', [
      title('Název'),
      markdown('Popis', 'intro'),
      list('Lidé', 'vizitka', 'people', [
        string('Jméno', 'name'),
        string('Role', 'role'),
        string('Telefon', 'phone'),
        string('E-mail', 'email'),
      ]),
    ]),
  ]),
  fileCollection(
    'Přístupnost budovy',
    'budova',
    'content/pristupnost/budova/index.md',
    [
      title('Titulek'),
      list('Sekce', 'sekce', 'gallery', [image('Ilustrační obrázek', 'pic'), markdown('Text', 'desc')]),
    ],
    {
      media_folder: '',
    }
  ),
  fileCollection(
    'Snadné čtení',
    'easy-read',
    'content/pristupnost/snadne-cteni/index.md',
    [title('Titulek'), markdown('Text stránky', 'body')],
    {
      media_folder: '',
    }
  ),
  fileCollection(
    'Výstupy',
    'output',
    'content/vystupy/_index.markdown',
    [title('Titulek'), markdown('Podtitul na homepage', 'hp')],
    {
      media_folder: '',
    }
  ),
  fileCollection(
    'ESO',
    'eso',
    'content/eso/_index.markdown',
    [
      title('Titulek'),
      markdown('Podtitul na homepage', 'hp'),
      markdown('Perex', 'perex'),
      markdown('Text stránky', 'body'),
    ],
    {
      media_folder: '',
    }
  ),
  fileCollection('Newsletter', 'newsletter', 'content/newsletter.md', [
    title('Titulek'),
    boolean('Uložit jako draft', 'draft'),
    markdown('Souhlas u newsletteru', 'consent'),
  ]),
  fileCollection('Náš příběh (Obsah)', 'nas-pribeh-toc', 'content/nas-pribeh/_index.markdown', [
    title('Titulek'),
    string('Podtitul', 'description'),
    boolean('Uložit jako draft', 'draft'),
    markdown('Text stránky', 'body'),
    list(
      'Kapitoly',
      'kapitola',
      'chapters',
      [
        relation('Kapitola', 'chapter', {
          collection: 'nas-pribeh',
          value_field: '{{slug}}',
          display_fields: ['title'],
          search_fields: ['title'],
          multiple: false,
          options_length: 100,
        }),
      ],
      {
        collapsed: false,
      }
    ),
  ]),
  fileCollection('Jak psát srozumitelně (Obsah)', 'srozumitelnetoc', 'content/srozumitelne/_index.markdown', [
    title('Titulek'),
    list(
      'Kapitoly',
      'kapitola',
      'chapters',
      [
        relation('Kapitola', 'chapter', {
          collection: 'srozumitelne',
          value_field: '{{slug}}',
          display_fields: ['title'],
          search_fields: ['title'],
          multiple: false,
          options_length: 100,
        }),
      ],
      {
        collapsed: false,
      }
    ),
    list(
      'Textový obsah',
      'obsah',
      'textcontent',
      [
        relation('Před kapitolou', 'before', {
          collection: 'srozumitelne',
          value_field: '{{slug}}',
          display_fields: ['title'],
          search_fields: ['title'],
          multiple: false,
          options_length: 100,
        }),
        markdown('Text', 'text'),
      ],
      {
        collapsed: false,
      }
    ),
    list('Dvousloupcový obsah', 'obsah', 'twocols', [
      string('Identifikátor', 'id'),
      select('Typ obsahu', 'type', twoColTypes),
      ...twoColFields,
    ]),
  ]),
]);

const strankyEn = files('Jiné', 'stranky', [
  fileCollection('Homepage', 'home', 'content/_index.markdown', [
    title('Titulek'),
    string('Motto', 'claim'),
    image('Obrázek na homepage', 'headerPic'),
    markdown('Hlavní text', 'body'),
    string('Mezititulek: potřebuji pomoc', 'situationsTitle'),
    string('Mezititulek: činnost', 'cinnostTitle'),
    markdown('Info o přístupnosti', 'accessibility'),
    relation('Zobrazené kategorie aktualit', 'aktuality', {
      collection: 'vystupy',
      value_field: 'slug',
      display_fields: ['title'],
      search_fields: ['title'],
      multiple: true,
    }),
  ]),
  fileCollection('Varování', 'varovani', 'content/alert/_index.markdown', [
    title('Titulek'),
    string('Označení', 'prefix', { hint: 'Např. "ALERT". Můžete ponechat prázdné' }),
    boolean('Je varování aktivní?', 'active'),
    markdown('Podrobný popis', 'body', {
      hint: 'Titulek se zobrazí na titulní straně, detailní popis na samostatné stránce.',
    }),
  ]),
  fileCollection('Podejte stížnost', 'stiznost', 'content/podejte-stiznost/_index.markdown', [
    title('Titulek'),
    string('Podtitul', 'description'),
    list('Formuláře (e-mail)', 'formulář', 'email', [file('Soubor', 'link'), string('Popis', 'desc')]),
    list('Formuláře (poštou)', 'formulář', 'post', [file('Soubor', 'link'), string('Popis', 'desc')]),
    list('Formuláře (osobně)', 'formulář', 'inperson', [file('Soubor', 'link'), string('Popis', 'desc')]),
    object('Jak napsat ombudsmanovi', 'submission', [title('Titulek'), markdown('Poznámky', 'body')]),
    list('Ukázky', 'ukázkově vyplněný formulář', 'example-links', [file('Soubor', 'link'), string('Popis', 'desc')]),
  ]),
  fileCollection('Kontakt', 'kontakt', 'content/kontakt.md', [
    title('Titulek'),
    string('Podtitul', 'description'),
    string('Titulek v menu', 'menuTitle'),
    string('Telefonní číslo', 'phone'),
    string('E-mail', 'email'),
    string('ID datové schránky', 'dataId'),
    markdown('Adresa', 'address'),
    string('Komentář k adrese', 'addressComment'),
    object('Přístup do budov', 'access', [
      markdown('Pěšky', 'walk'),
      markdown('MHD', 'public'),
      markdown('Obecně', 'universal'),
      image('Ilustrační obrázek', 'pic'),
    ]),
    object('Mluvčí', 'pressAgent', [
      string('Pozice', 'role'),
      string('Jméno', 'name'),
      string('Telefon', 'phone'),
      string('E-mail', 'email '),
    ]),
    object('International Relations Officer', 'intl', [
      string('Pozice', 'role'),
      string('Jméno', 'name'),
      string('Telefon', 'phone'),
      string('E-mail', 'email '),
    ]),
  ]),
  fileCollection(
    'Přístupnost budovy',
    'budova',
    'content/pristupnost/budova/index.md',
    [
      title('Titulek'),
      list('Sekce', 'sekce', 'gallery', [image('Ilustrační obrázek', 'pic'), markdown('Text', 'desc')]),
    ],
    {
      media_folder: '',
    }
  ),
  fileCollection(
    'Snadné čtení',
    'easy-read',
    'content/pristupnost/snadne-cteni/index.md',
    [title('Titulek'), markdown('Text stránky', 'body')],
    {
      media_folder: '',
    }
  ),
  fileCollection(
    'Výstupy',
    'output',
    'content/vystupy/_index.markdown',
    [title('Titulek'), markdown('Podtitul na homepage', 'hp')],
    {
      media_folder: '',
    }
  ),
]);

const onas = files('O nás', 'onas', [
  fileCollection(
    'O kanceláři',
    'o-kancelari',
    'content/o-nas/_index.markdown',
    [
      title('Titulek stránky'),
      string('Titulek v menu', 'menuTitle'),
      image('Ilustrační obrázek', 'illustration'),
      text('Perex', 'description'),
      markdown('Text stránky', 'body'),
      links('Odkazy'),
    ],
    {
      media_folder: '',
    }
  ),
  fileCollection(
    'Veřejný ochránce práv',
    'ombudsman',
    'content/o-nas/ombudsman/index.md',
    [
      title('Název role'),
      string('Jméno', 'name'),
      image('Portrét', 'pic'),
      string('Citát / motto', 'quote'),
      markdown('Krátký životopis', 'bio'),
      list('Oblasti', 'oblast', 'areas', [string('Název', 'area'), string('Popis', 'desc')]),
    ],
    {
      media_folder: '',
    }
  ),
  fileCollection(
    'Zástupce',
    'deputy',
    'content/o-nas/deputy/index.md',
    [
      title('Název role'),
      string('Jméno', 'name'),
      image('Portrét', 'pic'),
      string('Citát / motto', 'quote'),
      markdown('Krátký životopis', 'bio'),
      list('Oblasti', 'oblast', 'areas', [string('Název', 'area'), text('Popis', 'desc')]),
    ],
    {
      media_folder: '',
    }
  ),
  fileCollection(
    'Historie',
    'historie',
    'content/o-nas/historie/index.md',
    [
      title('Titulek'),
      image('Ilustrační obrázek', 'illustration'),
      list('Časová osa', 'Událost', 'timeline', [string('Časové určení', 'time'), text('Popis', 'desc')]),
    ],
    {
      media_folder: '',
    }
  ),
  fileCollection(
    'Předpisy',
    'predpisy',
    'content/o-nas/predpisy/index.md',
    [title('Titulek'), image('Ilustrační obrázek', 'illustration'), customEditor('Text stránky', 'body')],
    {
      media_folder: '',
    }
  ),
]);

const vzdelavaciAkce = folderCollection(
  'Vzdělávací akce',
  'vzdělávací akce',
  'vzdelavaci-akce',
  {
    folder: 'content/vzdelavaci-akce',
    preview_path: '/vzdelavaci-akce/{{slug}}',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: 'https://www.ochrance.cz/vzdelavaci-akce/{{slug}}',
  },
  [title('Titulek'), markdown('Perex', 'perex'), datetime('Datum konání', 'startDate'), markdown('Popis akce', 'body')]
);

const eso = folderCollection(
  'ESO',
  'sekce eso',
  'eso',
  {
    folder: 'content/eso',
    preview_path: '/eso/{{slug}}',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: 'https://www.ochrance.cz/eso/{{slug}}',
  },
  [
    title('Titulek'),
    number('Pořadí', 'rank', {
      default: 10,
      required: true,
    }),
    image('Ilustrační obrázek', 'illustration'),
    markdown('Popis sekce', 'perex'),
    list('Kde hledat daná stanoviska', 'sekce', 'eso', [string('Sekce', 'title')]),
  ]
);

const zpravodaj = folderCollection(
  'Zpravodaj',
  'Číslo zpravodaje',
  'zpravodaj',
  {
    folder: 'content/zpravodaj',
    preview_path: '/zpravodaj/{{slug}}',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: 'https://www.ochrance.cz/zpravodaj/{{slug}}',
  },
  [
    title('Název vydání ve formátu #/YYYY', { hint: 'Například 1/2023' }),
    number('Měsíc vydání', 'month', { required: true }),
    number('Rok vydání', 'year', { required: true }),
    text('Perex', 'perex'),
    string('Autor', 'author'),
    file('Zpravodaj v PDF', 'file'),
    list('Obsah zpravodaje', 'sekce', 'sections', [
      title('Titulek sekce'),
      list('Články', 'článek', 'articles', [
        title('Titulek'),
        string('Spisová značka', 'id'),
        string('Odkaz na tiskovou zprávu', 'release'),
        string('Odkaz na podcast k tématu', 'podcast'),
        string('Odkaz do ESO', 'eso'),
        customEditor('Text', 'body'),
      ]),
    ]),
  ]
);

const dokument = folderCollection(
  'Dokumenty',
  'dokument',
  'dokument',
  {
    folder: 'content/dokument',
    preview_path: '/dokument/{{slug}}',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: 'https://www.ochrance.cz/dokument/{{slug}}',
  },
  [
    title('Titulek'),
    text('Podtitulek', 'perex'),
    datetime('Datum publikování', 'date'),
    boolean('Uložit jako draft', 'draft'),
    relation('Štítky', 'vystupy', {
      collection: 'vystupy',
      value_field: 'slug',
      display_fields: ['title'],
      search_fields: ['title'],
      multiple: true,
    }),
    customEditor('Text', 'body'),
    attached('Přílohy před textem', 'attachmentsTop'),
    attached('Přílohy pod textem'),
  ]
);

const pomoc = folderCollection(
  'Potřebuji pomoc',
  'Problematika',
  'potrebuji-pomoc',
  {
    folder: 'content/potrebuji-pomoc',
    path: '{{slug}}/index',
    extension: 'md',
    media_folder: '',
    public_folder: '',
  },
  [
    title('Titulek'),
    text('Perex', 'perex'),
    string('Překladový klíč', 'translationKey'),
    image('Ilustrační obrázek', 'illustration'),
    markdown('Popisek na homepage', 'hp'),
    markdown('Úvodní text', 'body'),
    list('Seznam: můžeme pomoci', 'Situace', 'we-can', markdown('Situace', 'situation'), {
      collapsed: false,
    }),
    list('Seznam: nemůžeme pomoci', 'Situace', 'we-cannot', markdown('Situace', 'situation'), {
      collapsed: false,
    }),
    list('Příklady', 'Příklad', 'examples', [string('Jméno', 'name'), markdown('Popis případu', 'desc')]),
    object('Sekce „podejte podnět“', 'button', [string('Text na tlačítku', 'text')]),
  ]
);

const headerColors = [
  { label: 'Zelená', value: 'green' },
  { label: 'Růžová', value: 'pink' },
  { label: 'Oranžová', value: 'orange' },
  { label: 'Žlutozelená', value: 'yellow' },
];

const pusobnost = folderCollection(
  'Působnost',
  'oblast působnosti',
  'pusobnost',
  {
    folder: 'content/pusobnost',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: '',
  },
  [
    title('Název oblasti'),
    string('Překladový klíč', 'translationKey'),
    boolean('Uložit jako draft', 'draft'),
    image('Ilustrační obrázek', 'illustration'),
    select('Barva hlavičky', 'headerColor', headerColors),
    text('Perex', 'perex'),
    markdown('Text', 'body'),
    cta(),
  ]
);

const info106 = folderCollection(
  'Poskytované informace',
  'rok poskytovaných informací',
  'info106',
  {
    folder: 'content/info106',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: 'https://www.ochrance.cz/info106/{{slug}}',
  },
  [title('Rok'), customEditor('Text', 'body')]
);

const info = folderCollection(
  'Další informace',
  'infostránka',
  'info',
  {
    folder: 'content/info',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: 'https://www.ochrance.cz/info/{{slug}}',
  },
  [
    title('Titulek'),
    boolean('Uložit jako draft', 'draft'),
    string('Překladový klíč', 'translationKey'),
    links('Odkazy'),
    customEditor('Text', 'body'),
    links('Odkazy pod hlavním textem', 'linksAfter'),
  ]
);

const ops = folderCollection(
  'Provoz',
  'provozní info',
  'provoz',
  {
    folder: 'content/provoz',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: '',
  },
  [
    title('Titulek'),
    boolean('Uložit jako draft', 'draft'),
    string('Překladový klíč', 'translationKey'),
    links('Odkazy'),
    customEditor('Text', 'body'),
    links('Odkazy pod hlavním textem', 'linksAfter'),
  ]
);

const aktualne = folderCollection(
  'Aktuality',
  'aktualita',
  'aktualne',
  {
    folder: 'content/aktualne',
    preview_path: '/aktualne/{{slug}}',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: 'https://www.ochrance.cz/aktualne/{{slug}}',
  },
  [
    title('Titulek'),
    boolean('Uložit jako draft', 'draft'),
    image('Ilustrační obrázek', 'illustration'),
    datetime('Datum', 'date', { use_time: true }),
    relation('Štítky', 'vystupy', {
      collection: 'vystupy',
      value_field: 'slug',
      display_fields: ['title'],
      search_fields: ['title'],
      multiple: true,
    }),
    customEditor('Perex', 'perex'),
    customEditor('Text', 'body'),
    attached(),
  ]
);

const srozumitelne = folderCollection(
  'Jak psát srozumitelně',
  'kapitola',
  'srozumitelne',
  {
    folder: 'content/srozumitelne',
    preview_path: '/srozumitelne/{{slug}}',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: 'https://www.ochrance.cz/srozumitelne/{{slug}}',
  },
  [title('Titulek'), number('Číslo kapitoly', 'num'), markdown('Text', 'body')]
);

const nasPribeh = folderCollection(
  'Náš příběh',
  'kapitola',
  'nas-pribeh',
  {
    folder: 'content/nas-pribeh',
    preview_path: '/nas-pribeh/{{slug}}',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: 'https://www.ochrance.cz/nas-pribeh/{{slug}}',
  },
  [title('Titulek'), number('Číslo kapitoly', 'num'), markdown('Text', 'body')]
);

const situace = folderCollection(
  'Situace',
  'situace',
  'situace',
  {
    folder: 'content/situace',
    path: '{{slug}}/_index',
    extension: 'md',
    create: true,
  },
  [
    title('Název situace'),
    slug(),
    string('Titulek ve formě otázky', 'questionTitle'),
    text('Perex', 'perex'),
    image('Ilustrační obrázek', 'illustration'),
  ]
);

const vystupy = folderCollection(
  'Kategorie výstupů',
  'kategorie výstupů',
  'vystupy',
  {
    folder: 'content/vystupy',
    path: '{{slug}}/_index',
    extension: 'markdown',
    create: true,
    media_folder: '',
    public_folder: '',
  },
  [
    title('Kategorie výstupu (singulár)'),
    string('Titulek kategorie (plurál)', 'plural'),
    boolean('Zobrazovat v seznamu výstupů z činnosti', 'listed'),
    slug(true),
    text('Perex', 'perex'),
    image('Ilustrační obrázek', 'illustration'),
    markdown('Dodatečný text stránky', 'body'),
    file('Pole pro nahrávání souborů', 'file'),
  ]
);

const letaky = folderCollection(
  'Letáky',
  'leták',
  'letaky',
  {
    folder: 'content/letaky',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: '',
  },
  [
    title('Název letáku'),
    slug(),
    boolean('Uložit jako draft', 'draft'),
    relation('Situace', 'situace', {
      collection: 'situace',
      value_field: 'slug',
      display_fields: ['title'],
      search_fields: ['title'],
      multiple: true,
    }),
    file('Leták v PDF', 'file'),
    file('Verze pro zrakově znevýhodněné', 'seeing'),
    file('Verze v romštině', 'roma'),
    attached(),
  ]
);

const projekty = folderCollection(
  'Projekty',
  'projekt',
  'projekty',
  {
    folder: 'content/projekty',
    path: '{{slug}}/index',
    extension: 'md',
    create: true,
    media_folder: '',
    public_folder: '',
  },
  [
    title('Název projektu'),
    boolean('Uložit jako draft', 'draft'),
    slug(),
    string('Překladový klíč', 'translationKey'),
    boolean('Probíhající projekt', 'ongoing'),
    customEditor('Popis projektu', 'body'),
    customEditor('Dodatečný text pod aktualitami k projektu', 'bonus'),
    fig('Ilustrační obrázek', 'illustration'),
    list('Partneři', 'Partner', 'partners', [string('Název', 'name'), image('Logo', 'logo')]),
    list('Galerie', 'Fotka', 'gallery', [
      image('Obrázek', 'pic'),
      string('Popis obrázku', 'alt', {
        hint: 'Popis slouží ke zpřístupnění obrazového obsahu v textové formě.',
      }),
    ]),
  ]
);

const englishFolder = (collection: FolderCollection) => {
  const en = {
    ...collection,
    name: `${collection.name}-en`,
    label: `${collection.label} (EN)`,
    label_singular: `${collection.label_singular} (en)`,
    folder: collection.folder.replace('content/', 'content-en/'),
    fields: collection.fields.map((field: AnyWidget) => englishWidget(field)),
  };

  if (collection.public_folder) en.public_folder = collection.public_folder.replace('ochrance.cz/', 'ochrance.cz/en/');

  if (collection.preview_path) en.preview_path = collection.preview_path.replace(/^\//, '/en/');

  return en;
};

const englishFiles = (files: Files) => {
  return {
    ...files,
    label: `${files.label} (EN)`,
    name: `${files.name}-en`,
    files: files.files.map((file: FileCollection) => ({
      ...file,
      file: file.file.replace('content/', 'content-en/'),
      fields: file.fields.map((field: AnyWidget) => englishWidget(field)),
    })),
  };
};

const englishWidget = (widget: AnyWidget) => {
  const ew = { ...widget };

  if (ew.widget && ew.widget === 'relation') ew.collection = `${ew.collection}-en`;

  return ew;
};

save('./static-preview/admin/config.yml', {
  backend: {
    name: 'git-gateway',
    branch: 'main',
  },
  locale: 'cs',
  media_folder: 'content/media',
  public_folder: '/media',
  site_domain: 'https://ochrance-preview.netlify.app',
  display_url: 'https://www.ochrance.cz/_preview/',
  logo_url: '/admin/admin-logo.png',
  slug: {
    encoding: 'ascii',
    clean_accents: true,
    sanitize_replacement: '_',
  },
  collections: [
    stranky,
    aktualne,
    dokument,
    onas,
    pusobnost,
    pomoc,
    letaky,
    situace,
    vystupy,
    ops,
    vzdelavaciAkce,
    info,
    info106,
    projekty,
    eso,
    zpravodaj,
    nasPribeh,
    srozumitelne,
    englishFiles(strankyEn),
    englishFolder(aktualne),
    englishFolder(dokument),
    englishFiles(onas),
    englishFolder(pusobnost),
    englishFolder(pomoc),
    englishFolder(letaky),
    englishFolder(situace),
    englishFolder(vystupy),
    englishFolder(ops),
    englishFolder(info),
    englishFolder(projekty),
  ],
});
