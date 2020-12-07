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

const tags = [
  "Výroční zpráva",
  "Publikace",
  "Připomínky k zákonům",
  "Materiál pro vládu",
  "Newsletter",
  "Seriál na ČT",
  "Bulletin k monitorování práv lidí s postižením",
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
    datetime("Datum", "date"),
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
  collections: [aktualne, dokument],
});
