import type React from "react";

// <model-viewer> é um custom element (web component). Tipagem permissiva.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        "camera-controls"?: boolean | string;
        "auto-rotate"?: boolean | string;
        "auto-rotate-delay"?: number | string;
        "rotation-per-second"?: string;
        "shadow-intensity"?: number | string;
        "environment-image"?: string;
        exposure?: number | string;
        "variant-name"?: string;
        "camera-orbit"?: string;
        "field-of-view"?: string;
        ar?: boolean | string;
        loading?: string;
        reveal?: string;
        poster?: string;
      };
    }
  }
}

export {};
