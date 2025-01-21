import { ButtonView, Command, Editor, icons } from 'ckeditor5/src/index';
import { CmsWidgetControlProps } from 'decap-cms-core';

export interface MediaLibraryButtonConfig extends Pick<CmsWidgetControlProps, 'field' | 'value'> {
  openMediaLibrary: any;
}

export class MediaLibraryButton extends Command {
  editor: Editor;
  field?: CmsWidgetControlProps['field'];

  constructor(editor: Editor) {
    super(editor);

    this.editor = editor;
    this.addButton('addImage', 'Přidat obrázek');
  }

  addButton(action: string, label: string) {
    this.editor.ui.componentFactory.add(action, locale => {
      let config = (this.editor.config as any).get('mediaLibraryButton');

      const view = new ButtonView(locale);

      view.set({
        label: label,
        icon: icons.image,
        withText: false,
        tooltip: true,
      });

      view.on('execute', () => {
        config.openMediaLibrary();
      });

      return view;
    });
  }
}
