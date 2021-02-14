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
    file("Obrázek", "pic"),
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
]);

const onas = files("O nás", "onas", [
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
  fileCollection("Historie", "historie", "content/o-nas/historie/index.md", [
    title("Titulek"),
    list("Časová osa", "Událost", "timeline", [
      string("Časové určení", "time"),
      text("Popis", "desc"),
    ]),
  ]),
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
  [title("Titulek"), markdown("Text", "body")]
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

const englishFolder = (collection: FolderCollection) => {
  return {
    ...collection,
    name: `${collection.name}-en`,
    label: `${collection.label} (EN)`,
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
    info,
    englishFiles(stranky),
    englishFolder(aktualne),
    englishFolder(dokument),
    englishFiles(onas),
    englishFolder(pusobnost),
    englishFolder(pomoc),
    englishFolder(info),
  ],
});
