// This Decap CMS Widget’s code is provided under GPL 2.0 license.
// https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html

import React from 'react';
import mdit from 'markdown-it';

import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  SourceEditing,
  Heading,
  BlockQuote,
  ShowBlocks,
  Image,
  ImageToolbar,
  List,
  HorizontalLine,
  Strikethrough,
  RemoveFormat,
  Table,
  Link,
  PastePlainText,
  PasteFromOffice,
  EventInfo,
  TableToolbar,
  FindAndReplace,
  ImageUtils,
  ImageStyle,
  ImageCaption,
  HeadingButtonsUI,
  ParagraphButtonUI,
} from 'ckeditor5/src/index';
import { CKEditor } from '@ckeditor/ckeditor5-react';

import { v4 as uuid } from 'uuid';
import { Map } from 'immutable';

import CMS from 'decap-cms-app';
import { CmsWidgetControlProps } from 'decap-cms-core';
import { cs } from 'decap-cms-locales';
import { MediaLibraryButton } from './MediaLibraryButton';

const md = mdit({ html: true });

function cleanupTags(src: string) {
  return src
    .split('{{&lt;')
    .map((piece, index) => {
      if (!index) return piece;

      const [inside, rest] = piece.split('&gt;}}');

      return (
        '{{&lt;' +
        inside
          .replace(/(<([^>]+?)>)/gi, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&(quot|bdquo|rdquo|ldquo);/g, '"') +
        '&gt;}}' +
        rest
      );
    })
    .join('')
    .replace(/.*{{&lt;/g, '\n\n{{<')
    .replace(/&gt;}}.*/g, '>}}\n\n')
    .replace(/href="content\//g, 'href="')
    .replace(/href="content-en\//g, 'href="');
}

interface IState {
  controlID: string;
  editor: ClassicEditor | null;
}

interface MediaLibraryButtonOptions extends Pick<CmsWidgetControlProps, 'field' | 'value'> {
  field: CmsWidgetControlProps['field'];
  value: CmsWidgetControlProps['value'];
  controlID: string;
  callback: (options: any) => void;
}

const openMediaLib = (options: MediaLibraryButtonOptions) => {
  const { field, callback, value, controlID } = options;
  let mediaLibraryFieldOptions;

  /**
   * `options` hash as a general field property is deprecated, only used
   * when external media libraries were first introduced. Not to be
   * confused with `options` for the select widget, which serves a different
   * purpose.
   */
  if (field.hasIn(['options', 'media_library'])) {
    mediaLibraryFieldOptions = field.getIn(['options', 'media_library'], Map());
  } else {
    mediaLibraryFieldOptions = field.get('media_library', Map());
  }

  return () =>
    callback({
      controlID: controlID,
      forImage: false,
      privateUpload: field.get('private'),
      value,
      allowMultiple: false,
      config: mediaLibraryFieldOptions.get('config'),
      field,
    });
};

interface ExProps extends CmsWidgetControlProps {
  onRemoveInsertedMedia: (controlID: string) => void;
  onOpenMediaLibrary: () => void;
  mediaPaths: any;
  getAsset: () => void;
}

class CustomEditorWidgetControl extends React.Component<ExProps, IState> {
  constructor(props: ExProps) {
    super(props);

    this.state = {
      controlID: uuid(),
      editor: null,
    };
  }

  shouldComponentUpdate(nextProps: any) {
    /**
     * Always update if the value or getAsset changes.
     */
    if (this.props.value !== nextProps.value || this.props.getAsset !== nextProps.getAsset) {
      return true;
    }

    /**
     * If there is a media path for this control in the state object, and that
     * path is different than the value in `nextProps`, update.
     */
    const mediaPath = nextProps.mediaPaths.get(this.state.controlID);

    if (mediaPath && nextProps.value !== mediaPath) {
      return true;
    }

    return false;
  }

  componentDidUpdate(prevProps: any) {
    if (this.props.mediaPaths.get(this.state.controlID) !== prevProps.mediaPaths.get(this.state.controlID)) {
      let e = this.state.editor;

      if (e) {
        e.model.change(writer => {
          const src = this.props.mediaPaths.get(this.state.controlID);
          const alt = src.replace(/^.+\//, '');

          if (/(jpeg|jpg|png|gif|webp|svg)$/i.test(src)) {
            const imageUtils = e.plugins.get('ImageUtils');
            imageUtils.insertImage({ src, alt }, null, 'imageBlock', { setImageSizes: false });
          } else {
            // legacy alt
            // (this.state.editor as any).insertHtml(`<a href="${url}">${filename}</a>`);
          }
        });
      }
    } else {
      this.props.onRemoveInsertedMedia(this.state.controlID);
    }
  }

  handleChange = (eventInfo: EventInfo, editor: ClassicEditor) => {
    const data = cleanupTags(editor.getData());
    this.props.onChange(data);
    this.props.getAsset();
  };

  render = () => {
    const { value } = this.props;

    return (
      <CKEditor
        editor={ClassicEditor}
        onChange={this.handleChange}
        onReady={editor => {
          this.setState({ ...this.state, editor: editor });
        }}
        config={{
          licenseKey: 'GPL',
          language: 'cs',
          initialData: typeof value === 'string' ? md.render(value) : '',
          table: {
            contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
          },
          mediaLibraryButton: {
            openMediaLibrary: openMediaLib({
              field: this.props.field,
              value: this.props.value,
              controlID: this.state.controlID,
              callback: this.props.onOpenMediaLibrary,
            }),
          },
          image: {
            toolbar: ['toggleImageCaption', 'imageTextAlternative', 'imageStyle:block', 'imageStyle:wrapText'],
          },
          plugins: [
            Essentials,
            Bold,
            BlockQuote,
            Italic,
            Paragraph,
            FindAndReplace,
            List,
            Heading,
            Image,
            ImageStyle,
            ImageUtils,
            ImageCaption,
            ImageToolbar,
            HorizontalLine,
            Link,
            Table,
            Strikethrough,
            RemoveFormat,
            PastePlainText,
            PasteFromOffice,
            HeadingButtonsUI,
            ParagraphButtonUI,
            TableToolbar,
            ShowBlocks,
            SourceEditing,
            MediaLibraryButton,
          ],
          toolbar: {
            items: [
              'undo',
              'redo',
              '|', // break point
              'paragraph',
              'heading2',
              'heading3',
              'heading4',
              'bulletedList',
              'numberedList',
              '|',
              'bold',
              'italic',
              'strikethrough',
              'removeFormat',
              '|',
              'addImage',
              'link',
              'blockQuote',
              'horizontalLine',
              'insertTable',
              '|',
              'findAndReplace',
              'showBlocks',
              'sourceEditing',
            ],
          },
          heading: {
            options: [
              { model: 'paragraph', title: 'Odstavec', class: 'ck-heading_paragraph' },
              { model: 'heading2', view: 'h2', title: 'Nadpis 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Nadpis 3', class: 'ck-heading_heading3' },
              { model: 'heading4', view: 'h4', title: 'Nadpis 4', class: 'ck-heading_heading4' },
            ],
          },
          htmlSupport: {
            allow: [
              {
                name: /^blockquote|h2|h3|h4|ul|ol|li|p|del|s|hr|strong|em|b|i|table|thead|tbody|tr|td$/,
              },
              {
                name: 'th',
                attributes: true,
              },
              {
                name: 'iframe',
                styles: true,
                attributes: true,
              },
              {
                name: 'img',
                attributes: {
                  alt: true,
                  src: true,
                },
                styles: {
                  float: true,
                },
              },
              {
                name: 'a',
                attributes: {
                  href: true,
                },
              },
            ],
          },
        }}
      />
    );
  };
}

CMS.registerLocale('cs', cs);
CMS.registerWidget('customEditor', CustomEditorWidgetControl as any);
CMS.init();
