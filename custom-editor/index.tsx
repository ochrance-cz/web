import React from 'react';
import 'codemirror/lib/codemirror.css';
import '@toast-ui/editor/dist/toastui-editor.css';
import CMS from 'netlify-cms-app';
import { CmsWidgetControlProps } from 'netlify-cms-core';
import { cs } from 'netlify-cms-locales';

import { Editor } from '@toast-ui/react-editor';

//interface IProps {
//  value: string;
//  classNameWrapper: string;
//  onChange(data: string): void;
//}

function formatHtml(src: string) {
  return src
    .replace('<p>{{', '\n\n{{')
    .replace('}}</p>', '}}\n\n')
    .replace('href="content/', 'href="');
}

class CustomEditorWidgetControl extends React.Component<CmsWidgetControlProps> {
  constructor(props: CmsWidgetControlProps) {
    super(props);
  }

  editorRef = React.createRef();

  handleChange = () => {
    const editor = (this.editorRef as any).current.getInstance();
    this.props.onChange(formatHtml(editor.getHtml()));
  };

  render = () => (
    <Editor
      initialValue={this.props.value}
      height="600px"
      initialEditType="wysiwyg"
      useCommandShortcut={true}
      onChange={this.handleChange}
      ref={this.editorRef as any}
      toolbarItems={[
        'heading',
        'bold',
        'italic',
        'strike',
        'divider',
        'hr',
        'quote',
        'divider',
        'ul',
        'ol',
        'indent',
        'outdent',
        'divider',
        'table',
        'link',
      ]}
    />
  );
}

CMS.registerLocale('cs', cs);
CMS.registerWidget('customEditor', CustomEditorWidgetControl);
CMS.init();
