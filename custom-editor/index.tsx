import React from 'react';
import mdit from 'markdown-it';

import { CKEditor } from 'ckeditor4-react';

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
    .replace(/href="content\//g, 'href="');
}

class CustomEditorWidgetControl extends React.Component<CmsWidgetControlProps> {
  constructor(props: CmsWidgetControlProps) {
    super(props);
  }

  handleChange = (evt: any) => {
    const data = cleanupTags(evt.editor.getData());
    this.props.onChange(data);
  };

  render = () => {
    const { value } = this.props;

    return (
      <CKEditor
        initData={''}
        onChange={this.handleChange}
        onInstanceReady={evt => {
          evt.editor.setData(typeof value === 'string' ? md.render(value) : '');
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
          contentsCss: '/_preview/admin/styles.css',
          stylesSet: 'ochrance:/_preview/admin/styles.js',
          allowedContent: true,
          entities_latin: false,
          removeButtons:
            'Save,NewPage,ExportPdf,Preview,Print,Templates,SelectAll,Scayt,Form,Checkbox,Radio,Textarea,Select,Button,ImageButton,HiddenField,TextField,Underline,Superscript,Subscript,CopyFormatting,CreateDiv,Indent,Outdent,JustifyBlock,BidiLtr,BidiRtl,Language,Anchor,Image,Flash,Smiley,SpecialChar,PageBreak,Iframe,TextColor,BGColor,About,FontSize,Font,Format',
        }}
      />
    );
  };
}

CMS.registerLocale('cs', cs);
CMS.registerWidget('customEditor', CustomEditorWidgetControl);
CMS.init();
