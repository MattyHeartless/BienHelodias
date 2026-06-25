import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
          src?: string;
          alt?: string;
          poster?: string;
          exposure?: string;
          orientation?: string;
          "camera-orbit"?: string;
          "field-of-view"?: string;
          "shadow-intensity"?: string;
          "interaction-prompt"?: string;
          "disable-zoom"?: boolean;
          "camera-controls"?: boolean;
          autoplay?: boolean;
          ar?: boolean;
        };
      }
    }
  }
}

export {};
