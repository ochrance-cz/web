import { Command, Editor } from 'ckeditor5/src/index';
import { CmsWidgetControlProps } from 'decap-cms-core';
export interface MediaLibraryButtonConfig extends Pick<CmsWidgetControlProps, 'field' | 'value'> {
    openMediaLibrary: any;
}
export declare class MediaLibraryButton extends Command {
    editor: Editor;
    field?: CmsWidgetControlProps['field'];
    constructor(editor: Editor);
    addButton(action: string, label: string): void;
}
