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
  ButtonView,
  IconImage,
} from './ckeditor5/ckeditor5.js';

(function () {
  const md = markdownit({ html: true });

  function uuid() {
    return 'id-' + Math.random().toString(36).slice(2);
  }

  function cleanupTags(src) {
    return src
      .replace(/(<[a-z])/g, '\n$1')
      .split('{{&lt;')
      .map((piece, index) => {
        if (!index) return piece;

        const parts = piece.split('&gt;}}');
        const inside = parts[0];
        const rest = parts[1];

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
      .replace(/href="content-en\//g, 'href="')
      .trim();
  }

  class MediaLibraryButton {
    constructor(editor) {
      this.editor = editor;
    }

    init() {
      this.addButton('addImage', 'Přidat obrázek');
    }

    addButton(action, label) {
      const editor = this.editor;

      editor.ui.componentFactory.add(action, locale => {
        const config = editor.config.get('mediaLibraryButton');

        const imageIcon = ClassicEditor?.icons?.image || window.CKEDITOR?.icons?.image;

        const view = new ButtonView(locale);

        view.set({
          label: label,
          icon: IconImage,
          withText: false,
          tooltip: true,
        });

        view.on('execute', () => {
          if (config && config.openMediaLibrary) {
            config.openMediaLibrary();
          }
        });

        return view;
      });
    }
  }

  function openMediaLib(options) {
    const { field, callback, value, controlID } = options;

    let mediaLibraryFieldOptions;

    if (field && field.get && field.getIn && field.hasIn && field.hasIn(['options', 'media_library'])) {
      mediaLibraryFieldOptions = field.getIn(['options', 'media_library']);
    } else if (field && field.get) {
      mediaLibraryFieldOptions = field.get('media_library');
    }

    return function () {
      callback({
        controlID: controlID,
        forImage: false,
        privateUpload: field && field.get && field.get('private'),
        value,
        allowMultiple: false,
        config:
          mediaLibraryFieldOptions && mediaLibraryFieldOptions.get ? mediaLibraryFieldOptions.get('config') : undefined,
        field,
      });
    };
  }

  const CustomEditorControl = createClass({
    getInitialState() {
      return {
        controlID: uuid(),
        editor: null,
      };
    },

    shouldComponentUpdate(nextProps) {
      if (this.props.value !== nextProps.value || this.props.getAsset !== nextProps.getAsset) {
        return true;
      }

      const mediaPath = nextProps.mediaPaths.get(this.state.controlID);

      if (mediaPath && nextProps.value !== mediaPath) {
        return true;
      }

      return false;
    },

    componentDidUpdate(prevProps) {
      const mediaPath =
        this.props.mediaPaths && this.props.mediaPaths.get && this.props.mediaPaths.get(this.state.controlID);

      const prevMediaPath =
        prevProps.mediaPaths && prevProps.mediaPaths.get && prevProps.mediaPaths.get(this.state.controlID);

      if (mediaPath !== prevMediaPath) {
        const editor = this.state.editor;
        if (!editor) return;

        editor.model.change(writer => {
          let src = mediaPath;

          /* hack src, preventing bad slugified title urls */
          const entryPath = this.props.entry.get('path');
          if (entryPath && entryPath.startsWith('content') && entryPath.match(/index.(md|markdown)$/)) {
            const parts = src.split('/');
            const filename = parts[parts.length - 1];
            const path = entryPath.replace(/^content|index.(md|markdown)$/g, '');
            src = 'https://www.ochrance.cz' + path + filename;
          }
          /* end hack */

          const alt = src.replace(/^.+\//, '');

          if (/(jpeg|jpg|png|gif|webp|svg)$/i.test(src)) {
            const imageUtils = editor.plugins.get('ImageUtils');
            imageUtils.insertImage({ src, alt }, null, 'imageBlock', { setImageSizes: false });
          } else if (src) {
            const viewFragment = editor.data.processor.toView(`<a href="${src}">${alt}</a>`);

            const modelFragment = editor.data.toModel(viewFragment);

            editor.model.insertContent(modelFragment);
          }
        });
      }
    },

    handleChange(event, editor) {
      const data = cleanupTags(editor.getData());
      this.props.onChange(data);
      this.props.getAsset();
    },

    render() {
      const self = this;

      return h('div', { className: 'custom-editor-wrapper' }, [
        h('div', {
          ref: function (node) {
            if (!node || self.state.editor) return;

            ClassicEditor.create(node, {
              licenseKey: 'GPL',
              language: 'cs',
              initialData: typeof self.props.value === 'string' ? md.render(self.props.value) : '',
              mediaLibraryButton: {
                openMediaLibrary: openMediaLib({
                  field: self.props.field,
                  value: self.props.value,
                  controlID: self.state.controlID,
                  callback: self.props.onOpenMediaLibrary,
                }),
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
              toolbar: [
                'undo',
                'redo',
                '|',
                'paragraph',
                'heading1',
                'heading2',
                'heading3',
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
              table: {
                contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
              },
              image: {
                toolbar: ['toggleImageCaption', 'imageTextAlternative', 'imageStyle:block', 'imageStyle:wrapText'],
              },

              extraPlugins: [MediaLibraryButton],
            }).then(editor => {
              self.setState({ editor });

              editor.model.document.on('change:data', () => self.handleChange(null, editor));
            });
          },
        }),
      ]);
    },
  });

  CMS.registerWidget('customEditor', CustomEditorControl);
})();
