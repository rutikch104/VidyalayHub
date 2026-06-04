// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import resourceLibraryService from '@/services/resourceLibraryService';
import { isPdfResource } from './libraryUtils';

export default function ResourcePdfViewer({ doc }) {
  const containerRef = useRef(null);
  const [blobUrl, setBlobUrl] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const loadPreview = useCallback(async (signal) => {
    if (!doc?.id) return;
    setStatus('loading');
    setErrorMsg('');
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });

    if (!isPdfResource(doc)) {
      setStatus('unsupported');
      return;
    }

    try {
      const blob = await resourceLibraryService.getResourcePreview(doc.id);
      if (signal.aborted) return;

      if (!(blob instanceof Blob) || blob.size === 0) {
        setStatus('error');
        setErrorMsg('The file is empty or could not be retrieved.');
        return;
      }

      const type = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'application/pdf';
      const pdfBlob = blob.type === type ? blob : new Blob([blob], { type });
      const url = URL.createObjectURL(pdfBlob);
      setBlobUrl(url);
      setStatus('ready');
    } catch (err) {
      if (signal.aborted) return;
      let message =
        err?.response?.status === 403
          ? 'You do not have permission to preview this resource.'
          : 'Unable to load the document preview.';
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json?.message) message = json.message;
        } catch {
          /* ignore parse errors */
        }
      } else if (err?.response?.data?.message) {
        message = err.response.data.message;
      }
      setStatus('error');
      setErrorMsg(message);
    }
  }, [doc]);

  useEffect(() => {
    const controller = new AbortController();
    void loadPreview(controller.signal);
    return () => {
      controller.abort();
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });
    };
  }, [loadPreview, retryKey]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* unsupported */
    }
  };

  const openInNewTab = () => {
    if (blobUrl) window.open(blobUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div ref={containerRef} className="lib-preview-viewer">
      <div className="lib-preview-viewer__toolbar">
        <div className="lib-preview-viewer__toolbar-title">
          <FileText className="h-4 w-4 text-red-500" aria-hidden />
          <span>Document preview</span>
        </div>
        <div className="lib-preview-viewer__toolbar-actions">
          {status === 'ready' ? (
            <>
              <button type="button" onClick={openInNewTab} className="lib-preview-viewer__tool-btn" title="Open in new tab">
                <ExternalLink className="h-4 w-4" />
              </button>
              <button type="button" onClick={toggleFullscreen} className="lib-preview-viewer__tool-btn" title={fullscreen ? 'Exit full screen' : 'Full screen'}>
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </>
          ) : null}
          {status === 'error' ? (
            <button type="button" onClick={() => setRetryKey((k) => k + 1)} className="lib-preview-viewer__tool-btn" title="Retry">
              <RefreshCw className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="lib-preview-viewer__canvas">
        {status === 'loading' ? (
          <div className="lib-preview-viewer__state">
            <div className="lib-preview-viewer__skeleton" aria-hidden />
            <div className="lib-preview-viewer__state-content">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-foreground">Loading document…</p>
              <p className="text-xs text-muted-foreground">Preparing your preview</p>
            </div>
          </div>
        ) : null}

        {status === 'ready' && blobUrl ? (
          <iframe title={`Preview: ${doc.title}`} src={blobUrl} className="lib-preview-viewer__iframe" />
        ) : null}

        {status === 'error' ? (
          <div className="lib-preview-viewer__state">
            <div className="lib-preview-viewer__state-content">
              <div className="lib-preview-viewer__error-icon">
                <AlertCircle className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-foreground">Preview unavailable</p>
              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{errorMsg}</p>
              <button type="button" onClick={() => setRetryKey((k) => k + 1)} className="lib-preview-viewer__retry-btn">
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </button>
            </div>
          </div>
        ) : null}

        {status === 'unsupported' ? (
          <div className="lib-preview-viewer__state">
            <div className="lib-preview-viewer__state-content">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">Inline preview not supported</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                This file type cannot be previewed in the browser. Use Download to open it locally.
              </p>
              {doc.fileUrl ? (
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="lib-preview-viewer__retry-btn">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open file
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
