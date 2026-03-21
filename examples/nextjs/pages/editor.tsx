'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import type { DocumentState } from '@pixieditor/core';
import { useEditorAPI } from '../hooks/useEditorAPI';

// PixiJS requires DOM — never render on the server
const PixiEditorWrapper = dynamic(
  () => import('../components/PixiEditorWrapper'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        width: '100%', height: '100%',
        background: '#0f0f1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: '#6366f1', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
          Loading editor…
        </span>
      </div>
    ),
  }
);

// ── Toolbar button ─────────────────────────────────────────────────────────

function Btn({
  label, onClick, primary = false,
}: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: primary ? '#6366f1' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${primary ? '#6366f1' : '#2d2d3d'}`,
        color: '#e2e8f0',
        fontSize: 12,
        padding: '5px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: primary ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function EditorPage() {
  const { setApi, addElement, removeSelected, undo, redo, exportJSON, toggleSnap } = useEditorAPI();
  const [docName, setDocName] = useState('Untitled Design');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');

  const handleChange = useCallback((doc: DocumentState) => {
    setSaveStatus('unsaved');
    setDocName(doc.name);
  }, []);

  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    const json = exportJSON();
    if (json) {
      // Replace with your API call / cloud storage
      try { localStorage.setItem('pixieditor-draft', json); } catch {}
      setTimeout(() => setSaveStatus('saved'), 600);
    }
  }, [exportJSON]);

  const statusColor = saveStatus === 'saved' ? '#4ade80' : '#fbbf24';
  const statusBg   = saveStatus === 'saved' ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)';
  const statusText = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Unsaved';

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: '#0f0f1a',
    }}>
      {/* ── Custom top bar ── */}
      <div style={{
        height: 48, flexShrink: 0,
        background: '#12122a',
        borderBottom: '1px solid #2d2d3d',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <span style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px', marginRight: 4 }}>
          ✦ PixiEditor
        </span>
        <span style={{ color: '#64748b', fontSize: 13 }}>/</span>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>{docName}</span>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 99,
          background: statusBg, color: statusColor,
        }}>
          {statusText}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Btn label="+ Box"    onClick={() => addElement('box')} />
          <Btn label="+ Text"   onClick={() => addElement('text')} />
          <Btn label="+ Image"  onClick={() => addElement('image')} />
          <div style={{ width: 1, height: 20, background: '#2d2d3d', margin: '0 2px' }} />
          <Btn label="↩"        onClick={undo} />
          <Btn label="↪"        onClick={redo} />
          <Btn label="⊡ Snap"  onClick={toggleSnap} />
          <Btn label="🗑"       onClick={removeSelected} />
          <div style={{ width: 1, height: 20, background: '#2d2d3d', margin: '0 2px' }} />
          <Btn label="Save"     onClick={handleSave} primary />
        </div>
      </div>

      {/* ── Editor ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <PixiEditorWrapper
          style={{ width: '100%', height: '100%' }}
          onReady={setApi}
          onChange={handleChange}
          initialDocument={{ name: docName }}
        />
      </div>
    </div>
  );
}
