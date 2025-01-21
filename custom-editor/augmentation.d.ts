import '@ckeditor/ckeditor5-core';

import { MediaLibraryButton, MediaLibraryButtonConfig } from './MediaLibraryButton';

declare module '@ckeditor/ckeditor5-core' {
  interface EditorConfig {
    mediaLibraryButton?: {
      openMediaLibrary: () => void;
    };
  }

  interface PluginsMap {
    MediaLibraryButton: MediaLibraryButton;
  }
}
