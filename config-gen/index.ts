import {
  string,
  hidden,
  text,
  datetime,
  list,
  file,
  image,
  markdown,
  boolean,
  object,
  select,
  relation,
  map,
  save,
  fileCollection,
  FileCollection,
  Files,
  files,
  title,
  folderCollection,
  FolderCollection,
} from "./buildconf.ts";

const pic = (title: string, name: string) =>
  object(title, name, [
    image("Obrázek", "pic"),
    string("Popis obrázku", "desc", {
      hint: "Popis slouží ke zpřístupnění obrazového obsahu v textové formě.",
      required: true,
    }),
  ]);

const fig = (title: string, name: string) =>
  object(title, name, [
    image("Obrázek", "pic"),
    string("Titulek obrázku", "caption", {
      hint: "Titulek viditelný pod obrázkem.",
    }),
    string("Popis obrázku", "desc", {
      hint: "Popis slouží ke zpřístupnění obrazového obsahu v textové formě.",
      required: true,
    }),
  ]);

const cta = () =>
  object(
    "Kontaktní patička",
    "cta",
    [
      string("Nadpis", "title"),
      string("Odkaz", "btnLink", {
        hint: "Výchozí odkaz směřuje na stránku podání stížnosti.",
      }),
    ],
    {
      collapsed: true,
    }
  );

const links = (title: string, name: string = "links") => {
  return list(title, "odkaz", name, [
    string("Odkaz", "link"),
    string("Popis", "text"),
  ]);
};

const tags = [
  { label: "Výroční zpráva", value: "vyrocni-zprava" },
  { label: "Publikace", value: "publikace" },
  { label: "Připomínky k zákonům", value: "pripominky" },
  { label: "Materiál pro vládu", value: "pro-vladu" },
  { label: "Newsletter", value: "newsletter" },
  { label: "Seriál na ČT", value: "ct" },
  { label: "Podcast", value: "podcast" },
  {
    label: "Bulletin k monitorování práv lidí s postižením",
    value: "bulletin",
  },
];

const stranky = files("Stránky", "stranky", [
  fileCollection("Homepage", "home", "content/_index.markdown", [
    title("Titulek"),
    string("Motto", "claim"),
    markdown("Hlavní text", "body"),
    string("Mezititulek: potřebuji pomoc", "situationsTitle"),
    string("Mezititulek: činnost", "cinnostTitle"),
    markdown("Info o přístupnosti", "accessibility"),
    markdown("Souhlas u newsletteru", "consent"),
  ]),
  fileCollection("Varování", "varovani", "content/alert/_index.markdown", [
    title("Titulek"),
    boolean("Je varování aktivní?", "active"),
    markdown("Podrobný popis", "body", {
      hint:
        "Titulek se zobrazí na titulní straně, detailní popis na samostatné stránce.",
    }),
  ]),
  fileCollection("Kontakt", "ou", "content/kontakt.md", [
    title("Titulek"),
    string("Podtitul", "description"),
    string("Titulek v menu", "menuTitle"),
    string("Telefonní číslo", "phone"),
    string("E-mail", "email"),
    string("ID datové schránky", "dataId"),
    markdown("Adresa", "address"),
    string("Komentář k adrese", "addressComment"),
    markdown("Popis infolinky s online-přepisem", "infolineHearing"),
    object("Přístup do budov", "access", [
      markdown("Pěšky", "walk"),
      markdown("MHD", "public"),
      markdown("Obecně", "universal"),
      image("Ilustrační obrázek", "pic"),
    ]),
  ]),
  fileCollection(
    "Přístupnost budovy",
    "budova",
    "content/pristupnost/budova/index.md",
    [
      title("Titulek"),
      list("Sekce", "sekce", "gallery", [
        image("Ilustrační obrázek", "pic"),
        markdown("Text", "desc"),
      ]),
    ],
    {
      media_folder: "",
    }
  ),
  fileCollection(
    "Snadné čtení",
    "easy-read",
    "content/pristupnost/snadne-cteni/index.md",
    [title("Titulek"), markdown("Text stránky", "body")],
    {
      media_folder: "",
    }
  ),
]);

const onas = files("O nás", "onas", [
  fileCollection(
    "O kanceláři",
    "o-kancelari",
    "content/o-nas/_index.markdown",
    [
      title("Titulek stránky"),
      string("Titulek v menu", "menuTitle"),
      markdown("Perex", "description"),
      markdown("Text stránky", "body"),
      links("Odkazy"),
    ],
    {
      media_folder: "",
    }
  ),
  fileCollection(
    "Veřejný ochránce práv",
    "ombudsman",
    "content/o-nas/ombudsman/index.md",
    [
      title("Název role"),
      string("Jméno", "name"),
      image("Portrét", "pic"),
      string("Citát / motto", "quote"),
      markdown("Krátký životopis", "bio"),
      list("Oblasti", "Oblast", "areas", [
        string("Název", "area"),
        string("Popis", "desc"),
      ]),
    ],
    {
      media_folder: "",
    }
  ),
  fileCollection(
    "Zástupce",
    "deputy",
    "content/o-nas/deputy/index.md",
    [
      title("Název role"),
      string("Jméno", "name"),
      image("Portrét", "pic"),
      string("Citát / motto", "quote"),
      markdown("Krátký životopis", "bio"),
      list("Oblasti", "Oblast", "areas", [
        string("Název", "area"),
        text("Popis", "desc"),
      ]),
    ],
    {
      media_folder: "",
    }
  ),
  fileCollection(
    "Historie",
    "historie",
    "content/o-nas/historie/index.md",
    [
      title("Titulek"),
      list("Časová osa", "Událost", "timeline", [
        string("Časové určení", "time"),
        text("Popis", "desc"),
      ]),
    ],
    {
      media_folder: "",
    }
  ),
  fileCollection(
    "Předpisy",
    "predpisy",
    "content/o-nas/predpisy/index.md",
    [title("Titulek"), markdown("Text stránky", "body")],
    {
      media_folder: "",
    }
  ),
]);

const dokument = folderCollection(
  "Dokumenty",
  "dokument",
  "dokument",
  {
    folder: "content/dokument",
    path: "{{slug}}/index",
    extension: "md",
    create: true,
    media_folder: "",
    public_folder: "",
  },
  [
    title("Titulek"),
    select("Štítky", "tags", tags, { multiple: true }),
    markdown("Text", "body"),
    list("Přílohy", "Příloha", "attachments", [
      title("Název přílohy"),
      file("Soubor", "file"),
    ]),
  ]
);

const pomoc = folderCollection(
  "Potřebuji pomoc",
  "Problematika",
  "potrebuji-pomoc",
  {
    folder: "content/potrebuji-pomoc",
    path: "{{slug}}/index",
    extension: "md",
    media_folder: "",
    public_folder: "",
  },
  [
    title("Titulek"),
    markdown("Perex", "perex"),
    markdown("Popisek na homepage", "hp"),
    markdown("Úvodní text", "body"),
    list(
      "Seznam: můžeme pomoci",
      "Situace",
      "we-can",
      markdown("Situace", "situation"),
      { collapsed: false }
    ),
    list(
      "Seznam: nemůžeme pomoci",
      "Situace",
      "we-cannot",
      markdown("Situace", "situation"),
      { collapsed: false }
    ),
    list("Příklady", "Příklad", "examples", [
      string("Jméno", "name"),
      markdown("Popis případu", "desc"),
    ]),
    object("Sekce „podejte podnět“", "button", [
      string("Text na tlačítku", "text"),
    ]),
  ]
);

const headerColors = [
  { label: "Zelená", value: "green" },
  { label: "Růžová", value: "pink" },
  { label: "Oranžová", value: "orange" },
  { label: "Žlutozelená", value: "yellow" },
];

const pusobnost = folderCollection(
  "Působnost",
  "Oblast",
  "pusobnost",
  {
    folder: "content/pusobnost",
    path: "{{slug}}/index",
    extension: "md",
    media_folder: "",
    public_folder: "",
  },
  [
    title("Název oblasti"),
    select("Barva hlavičky", "headerColor", headerColors),
    markdown("Perex", "perex"),
    markdown("Text", "body"),
    cta(),
  ]
);

const info = folderCollection(
  "Další informace",
  "informační stránka",
  "info",
  {
    folder: "content/info",
    path: "{{slug}}/index",
    extension: "md",
    create: true,
    media_folder: "",
    public_folder: "",
  },
  [
    title("Titulek"),
    links("Odkazy"),
    markdown("Text", "body"),
    links("Odkazy pod hlavním textem", "linksAfter"),
  ]
);

const ops = folderCollection(
  "Provoz",
  "informační stránka",
  "provoz",
  {
    folder: "content/provoz",
    path: "{{slug}}/index",
    extension: "md",
    create: true,
    media_folder: "",
    public_folder: "",
  },
  [
    title("Titulek"),
    links("Odkazy"),
    markdown("Text", "body"),
    links("Odkazy pod hlavním textem", "linksAfter"),
  ]
);

const aktualne = folderCollection(
  "Aktuality",
  "aktualita",
  "aktualne",
  {
    folder: "content/aktualne",
    path: "{{slug}}/index",
    extension: "md",
    create: true,
    media_folder: "",
    public_folder: "",
  },
  [
    title("Titulek"),
    datetime("Datum", "date", { time_format: false }),
    markdown("Perex", "perex"),
    markdown("Text", "body"),
  ]
);

const situace = folderCollection(
  "Situace",
  "situace",
  "situace",
  {
    folder: "content/situace",
    path: "{{slug}}/_index",
    extension: "md",
    create: true,
  },
  [
    title("Název situace"),
    string("Titulek ve formě otázky", "questionTitle"),
    markdown("Perex", "perex"),
    image("Ilustrační obrázek", "illustration"),
  ]
);

const letaky = folderCollection(
  "Letáky",
  "leták",
  "letaky",
  {
    folder: "content/letaky",
    path: "{{slug}}/index",
    extension: "md",
    create: true,
    media_folder: "",
    public_folder: "",
  },
  [
    title("Název letáku"),
    relation("Situace", "situace", {
      collection: "situace",
      value_field: "slug",
      display_fields: ["title"],
      search_fields: ["title"],
      multiple: true,
    }),
    file("Leták v PDF", "file"),
    file("Příloha", "info"),
    file("Verze pro zrakově znevýhodněné", "seeing"),
    file("Verze v romštině", "roma"),
  ]
);

const projekty = folderCollection(
  "Projekty",
  "projekt",
  "projekty",
  {
    folder: "content/projekty",
    path: "{{slug}}/index",
    extension: "md",
    create: true,
    media_folder: "",
    public_folder: "",
  },
  [
    title("Název projektu"),
    string("Řetezec v adrese", "slug"),
    boolean("Probíhající projekt", "ongoing"),
    markdown("Popis projektu", "body"),
    markdown("Dodatečný text pod aktualitami k projektu", "bonus"),
    fig("Ilustrační obrázek", "illustration"),
    list("Partneři", "Partner", "partners", [
      string("Název", "name"),
      image("Logo", "logo"),
    ]),
    list("Galerie", "Fotka", "gallery", [
      image("Obrázek", "pic"),
      string("Popis obrázku", "alt", {
        hint: "Popis slouží ke zpřístupnění obrazového obsahu v textové formě.",
      }),
    ]),
  ]
);

const englishFolder = (collection: FolderCollection) => {
  return {
    ...collection,
    name: `${collection.name}-en`,
    label: `${collection.label} (EN)`,
    label_singular: `${collection.label_singular} (en)`,
    folder: collection.folder.replace("content/", "content-en/"),
  };
};

const englishFiles = (files: Files) => {
  return {
    label: `${files.label} (EN)`,
    name: `${files.name}-en`,
    files: files.files.map((file: FileCollection) => ({
      ...file,
      file: file.file.replace("content/", "content-en/"),
    })),
  };
};

save("./static/admin/config.yml", {
  backend: {
    name: "git-gateway",
    branch: "main",
  },
  media_folder: "content/media",
  public_folder: "/media",
  site_domain: "http://ochrance-preview.netlify.app",
  display_url: "http://ochrance-preview.netlify.app",
  slug: {
    encoding: "ascii",
    clean_accents: true,
    sanitize_replacement: "_",
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
    ops,
    info,
    projekty,
    englishFiles(stranky),
    englishFolder(aktualne),
    englishFolder(dokument),
    englishFiles(onas),
    englishFolder(pusobnost),
    englishFolder(pomoc),
    englishFolder(ops),
    englishFolder(info),
    englishFolder(projekty),
  ],
});
