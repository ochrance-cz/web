import React from 'react';
import mdit from 'markdown-it';

import { CKEditor } from 'ckeditor4-react';

import uuid from 'uuid/v4';
import { Map } from 'immutable';

import CMS from 'netlify-cms-app';
import { CmsWidgetControlProps } from 'netlify-cms-core';
import { cs } from 'netlify-cms-locales';

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
  editor: typeof CKEditor | null;
}

class CustomEditorWidgetControl extends React.Component<CmsWidgetControlProps, IState> {
  constructor(props: CmsWidgetControlProps) {
    super(props);

    this.state = {
      controlID: uuid(),
      editor: null,
    };
  }

  shouldComponentUpdate(nextProps: any) {
    const props = this.props as any;

    /**
     * Always update if the value or getAsset changes.
     */
    if (this.props.value !== nextProps.value || props.getAsset !== nextProps.getAsset) {
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
    if (
      (this.props as any).mediaPaths.get(this.state.controlID) !==
      prevProps.mediaPaths.get(this.state.controlID)
    ) {
      if (this.state.editor !== null) {
        const url = (this.props as any).mediaPaths.get(this.state.controlID);
        const filename = url.replace(/^.+\//, '');
        if (/(jpeg|jpg|png|gif|webp|svg)$/i.test(filename)) {
          (this.state.editor as any).insertHtml(`<img src="${url}" alt="${filename}">`);
        } else {
          (this.state.editor as any).insertHtml(`<a href="${url}">${filename}</a>`);
        }
      }
    }
  }

  handleMediaLib = () => {
    const { field, onOpenMediaLibrary, value } = this.props as any;
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

    return onOpenMediaLibrary({
      controlID: this.state.controlID,
      forImage: false,
      privateUpload: field.get('private'),
      value,
      allowMultiple: false,
      config: mediaLibraryFieldOptions.get('config'),
      field,
    });
  };

  handleChange = (evt: any) => {
    const data = cleanupTags(evt.editor.getData());
    this.props.onChange(data);
    (this.props as any).getAsset();
  };

  render = () => {
    const { value } = this.props;

    return (
      <>
        <a
          style={{ float: 'right', fontWeight: 'bold', cursor: 'pointer' }}
          onClick={this.handleMediaLib}
        >
          Vložit obrázek/odkaz z knihovny médií
        </a>
        <CKEditor
          initData={''}
          onChange={this.handleChange}
          onInstanceReady={evt => {
            evt.editor.setData(typeof value === 'string' ? md.render(value) : '');
            this.setState({ ...this.state, editor: evt.editor });
          }}
          config={{
            language: 'cs',
            toolbarGroups: [
              { name: 'clipboard', groups: ['undo', 'clipboard'] },
              { name: 'editing', groups: ['find', 'selection', 'spellchecker', 'editing'] },
              { name: 'document', groups: ['document', 'doctools', 'mode'] },
              { name: 'tools', groups: ['tools'] },
              '/',
              { name: 'styles', groups: ['styles'] },
              { name: 'basicstyles', groups: ['basicstyles', 'cleanup'] },
              { name: 'forms', groups: ['forms'] },
              {
                name: 'paragraph',
                groups: ['list', 'indent', 'blocks', 'align', 'bidi', 'paragraph'],
              },
              { name: 'links', groups: ['links'] },
              { name: 'insert', groups: ['insert'] },
              { name: 'colors', groups: ['colors'] },
              { name: 'others', groups: ['others'] },
              { name: 'about', groups: ['about'] },
            ],
            allowedContent:
              'blockquote h2 h3 h4 ul ol li p del s hr strong em b i; img[alt,src]{float}; a [!href];table thead tbody tr td th[*]',
            contentsCss: '/admin/styles.css',
            stylesSet: 'ochrance:/admin/styles.js',
            entities_latin: false,
            removeButtons:
              'Save,NewPage,ExportPdf,Preview,Print,Templates,SelectAll,Scayt,Form,Checkbox,Radio,Textarea,Select,Button,HiddenField,TextField,Underline,Superscript,Subscript,CopyFormatting,CreateDiv,Indent,Outdent,JustifyBlock,BidiLtr,BidiRtl,Language,Anchor,Flash,Smiley,SpecialChar,PageBreak,Iframe,TextColor,BGColor,About,FontSize,Font,Format',
          }}
        />
      </>
    );
  };
}

CMS.registerLocale('cs', cs);
CMS.registerWidget('customEditor', CustomEditorWidgetControl);
CMS.init();
