'use client';

import { useRef, useCallback } from 'react';
import type { EditorAPI, ElementType, ElementStyle } from '@pixieditor/core';

/**
 * useEditorAPI — convenience hook for controlling the editor from React.
 *
 * @example
 * ```tsx
 * const { setApi, addElement, undo, redo } = useEditorAPI();
 *
 * <PixiEditorWrapper onReady={setApi} />
 * <button onClick={() => addElement('box')}>Add Box</button>
 * ```
 */
export function useEditorAPI() {
  const apiRef = useRef<EditorAPI | null>(null);

  const setApi = useCallback((api: EditorAPI) => {
    apiRef.current = api;
  }, []);

  const addElement = useCallback((
    type: ElementType,
    parentId: string | null = null,
    style?: Partial<ElementStyle>
  ): string | null => {
    return apiRef.current?.addElement(type, parentId, style ?? {}) ?? null;
  }, []);

  const removeSelected = useCallback(() => {
    apiRef.current?.getSelection().ids.forEach(id => apiRef.current?.removeElement(id));
  }, []);

  const undo = useCallback(() => apiRef.current?.undo(), []);
  const redo = useCallback(() => apiRef.current?.redo(), []);

  const exportJSON = useCallback((): string | null => {
    const doc = apiRef.current?.getDocument();
    return doc ? JSON.stringify(doc, null, 2) : null;
  }, []);

  const toggleSnap = useCallback(() => {
    if (!apiRef.current) return;
    const cfg = apiRef.current.getSnapConfig();
    apiRef.current.setSnapConfig({ enabled: !cfg.enabled });
  }, []);

  return { setApi, addElement, removeSelected, undo, redo, exportJSON, toggleSnap, apiRef };
}
