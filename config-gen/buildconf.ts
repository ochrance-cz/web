import { stringify } from 'https://deno.land/std/encoding/yaml.ts';

interface Base {
  name: string;
  label: string;
}

interface Options {
  required?: boolean;
  hint?: string;
  pattern?: [string, string];
}

interface BaseWidget extends Base, Options {}

const base = (name: string, label: string, options?: Options) => {
  const w: BaseWidget = { label, name };

  if (name !== 'title' && (!options || !options.required)) w.required = false;
  if (options) {
    if (options.hint) w.hint = options.hint;
    if (options.pattern) w.pattern = options.pattern;
  }

  return w;
};

interface ImageWidget extends BaseWidget {
  widget: 'image';
}

export const image = (label: string, name: string, options?: Options): ImageWidget => {
  const w = { ...base(name, label, options), widget: 'image' as const };

  return w;
};

interface FileWidget extends BaseWidget {
  widget: 'file';
}

export const file = (label: string, name: string, options?: Options): FileWidget => {
  const w = { ...base(name, label, options), widget: 'file' as const };

  return w;
};

interface HiddenWidget extends BaseWidget {
  widget: 'hidden';
}

export const hidden = (name: string, value: string): HiddenWidget => {
  const w = { ...base(name, name), widget: 'hidden' as const };

  return w;
};

interface StringWidget extends BaseWidget {
  widget: 'string';
}

export const string = (label: string, name: string, options?: Options): StringWidget => {
  const w = { ...base(name, label, options), widget: 'string' as const };

  return w;
};

export const title = (label: string) => {
  return string(label, 'title', { required: true });
};

interface TextWidget extends BaseWidget {
  widget: 'text';
}

export const text = (label: string, name: string, options?: Options): TextWidget => {
  const w = { ...base(name, label, options), widget: 'text' as const };

  return w;
};

interface MarkdownWidget extends BaseWidget {
  widget: 'markdown';
  minimal?: boolean;
  buttons?: string[];
  editor_components?: string[];
}

interface MarkdownOptions extends Options {
  minimal?: boolean;
  buttons?: string[];
  editor_components?: string[];
}

export const markdown = (label: string, name: string, options?: Options): MarkdownWidget => {
  const w = {
    editor_components: ['image'],
    buttons: [
      'bold',
      'italic',
      'link',
      'heading-two',
      'heading-three',
      'heading-four',
      'quote',
      'bulleted-list',
      'numbered-list',
    ],
    ...base(name, label, options),
    widget: 'markdown' as const,
  };

  return w;
};

interface CustomEditorWidget extends BaseWidget {
  widget: 'customEditor';
}

export const customEditor = (
  label: string,
  name: string,
  options?: Options
): CustomEditorWidget => {
  const w = {
    ...base(name, label, options),
    widget: 'customEditor' as const,
  };

  return w;
};

interface MapWidget extends BaseWidget {
  widget: 'map';
}

export const map = (label: string, name: string, options?: Options): MapWidget => {
  const w = { ...base(name, label, options), widget: 'map' as const };

  return w;
};

interface NumberWidget extends BaseWidget {
  widget: 'number';
  value_type: 'int' | 'float';
  default?: number;
  min?: number;
  max?: number;
  step?: number;
}

interface NumberOptions extends Options {
  value_type?: 'int' | 'float';
  default?: number;
  min?: number;
  max?: number;
  step?: number;
}

export const number = (label: string, name: string, options?: NumberOptions): NumberWidget => {
  const w = { ...base(name, label, options), widget: 'number' as const } as NumberWidget;

  if (options && options.value_type) w.value_type = options.value_type;
  else w.value_type = 'int';

  if (options && options.default) w.default = options.default;
  if (options && options.min) w.min = options.min;
  if (options && options.max) w.max = options.max;
  if (options && options.step) w.step = options.step;

  return w;
};

interface ListWidget extends BaseWidget {
  widget: 'list';
  label_singular: string;
  fields?: AnyWidget[];
  field?: AnyWidget;
  collapsed?: boolean;
}

interface ListOptions extends Options {
  collapsed?: boolean;
}

export const list = (
  label: string,
  label_singular: string,
  name: string,
  fields: AnyWidget[] | AnyWidget,
  options?: ListOptions
): ListWidget => {
  const w: ListWidget = {
    ...base(name, label, options),
    label_singular,
    widget: 'list' as const,
  };

  if (Array.isArray(fields)) w.fields = fields;
  else w.field = fields;

  if (options && options.collapsed) w.collapsed = true;

  checkDuplicates(Array.isArray(fields) ? fields : [fields], name);

  return w;
};

interface BooleanWidget extends BaseWidget {
  widget: 'boolean';
}

export const boolean = (label: string, name: string, options?: Options): BooleanWidget => {
  const w = { ...base(name, label, options), widget: 'boolean' as const };

  return w;
};

interface ObjectWidget extends BaseWidget {
  widget: 'object';
  fields: AnyWidget[];
  collapsed?: boolean;
}

interface ObjectOptions extends Options {
  collapsed?: boolean;
}

export const object = (
  label: string,
  name: string,
  fields: AnyWidget[],
  options?: ObjectOptions
): ObjectWidget => {
  const w = {
    widget: 'object' as const,
    ...base(name, label, options),
    fields,
  } as ObjectWidget;

  if (options && options.collapsed) w.collapsed = true;

  checkDuplicates(fields, name);

  return w;
};

interface SelectItem {
  label: string;
  value: string;
}

interface SelectWidget extends BaseWidget {
  widget: 'select';
  multiple?: boolean;
  options: string[] | SelectItem[];
}

interface SelectOptions extends Options {
  multiple?: boolean;
}

export const select = (
  label: string,
  name: string,
  items: string[] | SelectItem[],
  options?: SelectOptions
): SelectWidget => {
  const w: SelectWidget = {
    ...base(name, label, options),
    widget: 'select' as const,
    options: items,
  };

  if (options && options.multiple !== undefined) w.multiple = options.multiple;

  return w;
};

interface DatetimeWidget extends BaseWidget {
  widget: 'datetime';
  date_format: string | boolean;
  time_format: string | boolean;
}

interface DatetimeOptions extends Options {
  date_format?: string | boolean;
  time_format?: string | boolean;
}

export const datetime = (
  label: string,
  name: string,
  options?: DatetimeOptions
): DatetimeWidget => {
  const w: DatetimeWidget = {
    ...base(name, label, options),
    widget: 'datetime' as const,
    date_format: options && options.date_format !== undefined ? options.date_format : 'DD.MM.YYYY',
    time_format: options && options.time_format !== undefined ? options.time_format : 'HH:mm',
  };

  return w;
};

interface RelationWidget extends BaseWidget {
  widget: 'relation';
  collection: string;
  value_field: string;
  display_fields?: string[];
  search_fields: string[];
  multiple?: boolean;
  options_length?: number;
}

interface RelationOptions extends Options {
  collection: string;
  value_field: string;
  display_fields?: string[];
  search_fields: string[];
  multiple?: boolean;
  options_length?: number;
}

export const relation = (label: string, name: string, options: RelationOptions): RelationWidget => {
  const { collection, value_field, display_fields, search_fields, multiple, options_length } = options;

  const w = {
    ...base(name, label, options),
    widget: 'relation' as const,
    collection,
    value_field,
    display_fields,
    search_fields,
    multiple,
    options_length: options_length || 20,
  };

  return w;
};

export interface FileCollection extends Base {
  file: string;
  fields: AnyWidget[];
  media_folder?: string;
}

interface FileCollectionOptions {
  media_folder?: string;
}

export const fileCollection = (
  label: string,
  name: string,
  file: string,
  fields: AnyWidget[],
  options?: FileCollectionOptions
): FileCollection => {
  checkDuplicates(fields, name);

  const col: FileCollection = {
    label,
    name,
    file,
    fields,
  };

  if (options && options.media_folder !== undefined) col['media_folder'] = options.media_folder;

  return col;
};

export interface Files {
  name: string;
  label: string;
  editor: {
    preview: boolean;
  };
  files: FileCollection[];
}

export const files = (label: string, name: string, files: FileCollection[]): Files => {
  checkDuplicates(files, name);

  return {
    name,
    label,
    editor: {
      preview: false,
    },
    files,
  };
};

export interface FolderCollection {
  name: string;
  label: string;
  label_singular: string;
  folder: string;
  extension: string;
  create?: boolean;
  path?: string;
  media_folder?: string;
  public_folder?: string;
  preview_path?: string;
  editor: {
    preview: boolean;
  };
  fields: AnyWidget[];
}

export type AnyWidget =
  | ImageWidget
  | FileWidget
  | HiddenWidget
  | StringWidget
  | TextWidget
  | MarkdownWidget
  | CustomEditorWidget
  | MapWidget
  | NumberWidget
  | ListWidget
  | BooleanWidget
  | ObjectWidget
  | SelectWidget
  | DatetimeWidget
  | RelationWidget;

interface FolderConfig {
  folder: string;
  extension: string;
  create?: boolean;
  path?: string;
  media_folder?: string;
  public_folder?: string;
  preview_path?: string;
}

export const folderCollection = (
  label: string,
  label_singular: string,
  name: string,
  folderConfig: FolderConfig,
  fields: AnyWidget[]
): FolderCollection => {
  const { folder, extension } = folderConfig;
  checkDuplicates(fields, name);

  const d: FolderCollection = {
    name,
    label,
    label_singular,
    folder,
    extension,
    editor: {
      preview: false,
    },
    fields,
  };

  if (folderConfig.create === true) d.create = true;
  if (folderConfig.path !== undefined) d.path = folderConfig.path;
  if (folderConfig.media_folder !== undefined) d.media_folder = folderConfig.media_folder;
  if (folderConfig.public_folder !== undefined) d.public_folder = folderConfig.public_folder;
  if (folderConfig.preview_path !== undefined) d.preview_path = folderConfig.preview_path;

  return d;
};

const checkDuplicates = (items: Base[], name: string) => {
  const duplicates = findDuplicates(items.map(f => f.name));
  if (duplicates.length > 0) {
    throw new Error(
      `Repeating name${duplicates.length > 1 ? 's' : ''} "${duplicates.join(', ')}" in "${name}"!`
    );
  }
};

const findDuplicates = (arr: string[]) => arr.filter((item, index) => arr.indexOf(item) != index);

export const save = (path: string, config: object) => {
  const yaml = stringify(config);
  const encoder = new TextEncoder();
  Deno.writeFile(path, encoder.encode(yaml));
};
