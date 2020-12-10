import {
  string,
  datetime,
  list,
  file,
  markdown,
  object,
  select,
  relation,
  map,
  save,
  fileCollection,
  files,
  title,
  folderCollection,
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

const headerColors = [
  { label: "Zelená", value: "green" },
  { label: "Růžová", value: "pink" },
  { label: "Oranžová", value: "orange" },
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
    datetime("Datum", "date", { timeFormat: false }),
    markdown("Perex", "perex"),
    markdown("Text", "body"),
  ]
);

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
  collections: [aktualne, dokument, pusobnost],
});
