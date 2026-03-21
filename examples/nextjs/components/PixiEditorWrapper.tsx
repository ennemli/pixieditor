'use client';

import { useRef, useEffect } from 'react';
import type { EditorAPI, DocumentState } from '@pixieditor/core';

interface Props {
  initialDocument?: Partial<DocumentState>;
  onReady?: (api: EditorAPI) => void;
  onChange?: (doc: DocumentState) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * PixiEditorWrapper — React component that mounts @pixieditor/core.
 * Must be used with `dynamic(..., { ssr: false })` or inside a Client Component
 * that is already excluded from SSR, since PixiJS requires DOM/canvas.
 */
export default function PixiEditorWrapper({
  initialDocument,
  onReady,
  onChange,
  className,
  style,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<EditorAPI | null>(null);
  const onReadyRef = useRef(onReady);
  const onChangeRef = useRef(onChange);

  // Keep callbacks current without triggering remount
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let destroyed = false;

    // Dynamic import ensures PixiJS is only loaded client-side
    import('@pixieditor/core').then(({ createEditor }) => {
      if (destroyed) return;

      const api = createEditor({
        container,
        document: {
          width: 1200,
          height: 800,
          name: 'Untitled',
          ...initialDocument,
        },
        snap: {
          enabled: true,
          grid: true,
          gridSize: 20,
          elements: true,
          canvas: true,
          smartGuides: true,
          threshold: 8,
        },
        theme: {
          panelBackground: '#1e1e2e',
          panelBorder: '#2d2d3d',
          accent: '#6366f1',
          text: '#e2e8f0',
          textMuted: '#64748b',
          inputBackground: 'rgba(255,255,255,0.06)',
        },
        onReady: (a) => {
          apiRef.current = a;
          onReadyRef.current?.(a);
        },
      });

      api.on('document:change', ({ document }) => {
        onChangeRef.current?.(document);
      });
    });

    return () => {
      destroyed = true;
      apiRef.current?.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    />
  );
}
