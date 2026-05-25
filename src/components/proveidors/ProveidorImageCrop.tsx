import { useState, useRef, useEffect } from 'react';
import { Upload, Check, X } from 'lucide-react';

const CROP_PX = 110;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.1;

interface Props {
  currentImage?: string;
  onSave: (base64: string) => void;
  onRemove: () => void;
}

export default function ProveidorImageCrop({ currentImage, onSave, onRemove }: Props) {
  const [cropSrc, setCropSrc] = useState('');
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ sx: number; sy: number; ix: number; iy: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const baseScale = natW > 0 ? Math.max(CROP_PX / natW, CROP_PX / natH) : 1;
  const scaledW = natW * baseScale * zoom;
  const scaledH = natH * baseScale * zoom;

  // When image is larger than box: clamp to [CROP_PX - scaled, 0] (keeps image filling box)
  // When image is smaller than box: clamp to [0, CROP_PX - scaled] (allows free centering)
  const clampX = (x: number) => {
    const lo = Math.min(0, CROP_PX - scaledW);
    const hi = Math.max(0, CROP_PX - scaledW);
    return Math.min(hi, Math.max(lo, x));
  };
  const clampY = (y: number) => {
    const lo = Math.min(0, CROP_PX - scaledH);
    const hi = Math.max(0, CROP_PX - scaledH);
    return Math.min(hi, Math.max(lo, y));
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      setPosX(clampX(dragRef.current.ix + dx));
      setPosY(clampY(dragRef.current.iy + dy));
    };
    const onUp = () => { dragRef.current = null; setIsDragging(false); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [scaledW, scaledH]);

  // Recenter position when zoom changes so the crop center stays stable
  useEffect(() => {
    if (natW === 0) return;
    setPosX(prev => clampX(prev));
    setPosY(prev => clampY(prev));
  }, [zoom, scaledW, scaledH]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setCropSrc(e.target?.result as string);
      setNatW(0);
      setNatH(0);
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const s = Math.max(CROP_PX / nw, CROP_PX / nh);
    setNatW(nw);
    setNatH(nh);
    setPosX((CROP_PX - nw * s) / 2);
    setPosY((CROP_PX - nh * s) / 2);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setZoom(z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, parseFloat((z + delta).toFixed(2)))));
  };

  const handleConfirm = () => {
    if (!cropSrc || !canvasRef.current || natW === 0) return;
    const canvas = canvasRef.current;
    canvas.width = CROP_PX;
    canvas.height = CROP_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img, posX, posY, scaledW, scaledH);
      onSave(canvas.toDataURL('image/png'));
      setCropSrc('');
    };
    img.src = cropSrc;
  };

  // ── Crop mode ──────────────────────────────────────────────────────────────
  if (cropSrc) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />

        {/* Crop frame */}
        <div
          style={{
            width: CROP_PX, height: CROP_PX, overflow: 'hidden', position: 'relative',
            borderRadius: '8px', border: '2px solid var(--color-accent-primary)',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none', background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 12px 12px',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            dragRef.current = { sx: e.clientX, sy: e.clientY, ix: posX, iy: posY };
            setIsDragging(true);
          }}
          onWheel={handleWheel}
        >
          {/* Image (hidden until loaded) */}
          <img
            src={cropSrc}
            alt=""
            onLoad={handleImgLoad}
            style={{
              position: 'absolute',
              left: posX, top: posY,
              width: natW > 0 ? scaledW : 0,
              height: natH > 0 ? scaledH : 0,
              opacity: natW > 0 ? 1 : 0,
              pointerEvents: 'none',
            }}
            draggable={false}
          />
          {/* Loading indicator */}
          {natW === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.5)', fontSize: '0.75rem', background: 'white' }}>
              Carregant…
            </div>
          )}
          {/* Rule-of-thirds overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
              linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
            `,
            backgroundSize: `${CROP_PX / 3}px ${CROP_PX / 3}px`,
          }} />
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Zoom slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>−</span>
          <input
            type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={ZOOM_STEP}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{ flex: 1, cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>+</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={handleConfirm} disabled={natW === 0}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.4rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: natW === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.8rem', opacity: natW === 0 ? 0.5 : 1 }}
          >
            <Check size={13} /> Confirmar
          </button>
          <button type="button" onClick={() => setCropSrc('')}
            style={{ padding: '0.4rem 0.6rem', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer' }}
          >
            <X size={13} />
          </button>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', margin: 0, textAlign: 'center' }}>
          Arrossega · Roda per fer zoom
        </p>
      </div>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />

      {currentImage ? (
        <>
          <div style={{ width: CROP_PX, height: CROP_PX, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <img src={currentImage} alt="Imatge de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={() => fileRef.current?.click()}
              style={{ flex: 1, padding: '0.38rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}
            >
              Canviar
            </button>
            <button type="button" onClick={onRemove}
              style={{ padding: '0.38rem 0.6rem', background: 'var(--color-bg-secondary)', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer' }}
              title="Eliminar imatge"
            >
              <X size={13} />
            </button>
          </div>
        </>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            width: CROP_PX, height: CROP_PX,
            border: '2px dashed var(--color-border)',
            borderRadius: '8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
            background: 'var(--color-bg-secondary)',
          }}
        >
          <Upload size={22} />
          <div style={{ textAlign: 'center', lineHeight: 1.4 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 500 }}>Afegir imatge</div>
            <div style={{ fontSize: '0.68rem', marginTop: '0.15rem' }}>PNG, JPG, WebP</div>
          </div>
        </div>
      )}
    </div>
  );
}
