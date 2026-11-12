import React, { useEffect, useRef } from 'react';
import { Crosshair } from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import { triggerHapticPulse } from '../../services/nativeBridge';

export const GestureController: React.FC = () => {
  const undo = useCADStore((s) => s.undo);
  const redo = useCADStore((s) => s.redo);
  const openRadialMenu = useCADStore((s) => s.openRadialMenu);
  const magneticLoupe = useCADStore((s) => s.magneticLoupe);
  const setMagneticLoupe = useCADStore((s) => s.setMagneticLoupe);
  const activeSketchId = useCADStore((s) => s.activeSketchId);
  const activeTool = useCADStore((s) => s.activeTool);
  const gridSnapMm = useCADStore((s) => s.gridSnapMm);

  const activePenPointerId = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTwoFingerTapTime = useRef<number>(0);

  useEffect(() => {
    const clearLongPress = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Ignore UI buttons/modals outside the 3D canvas
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== 'CANVAS') return;

      // Palm Rejection: if stylus pen is active, ignore stray touch events
      if (e.pointerType === 'pen') {
        activePenPointerId.current = e.pointerId;
      } else if (e.pointerType === 'touch' && activePenPointerId.current !== null) {
        e.stopPropagation();
        return;
      }

      startPos.current = { x: e.clientX, y: e.clientY };

      // Show Magnetic Precision Loupe when sketching with pen/touch
      if (
        (e.pointerType === 'pen' || e.pointerType === 'touch') &&
        (activeSketchId !== null || activeTool.startsWith('sketch_'))
      ) {
        setMagneticLoupe({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          worldCoordsLabel: `Snap ${gridSnapMm}mm • ${e.pointerType === 'pen' ? 'S-Pen' : 'Touch'}`,
        });
      }

      // Start 420ms Long-Press detector for Radial Marking Menu
      clearLongPress();
      longPressTimer.current = setTimeout(() => {
        openRadialMenu(e.clientX, e.clientY);
      }, 420);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.hypot(dx, dy) > 9) {
        clearLongPress();
      }

      if (magneticLoupe.visible) {
        setMagneticLoupe({
          x: e.clientX,
          y: e.clientY,
        });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      clearLongPress();
      if (e.pointerId === activePenPointerId.current) {
        activePenPointerId.current = null;
      }
      if (magneticLoupe.visible) {
        setMagneticLoupe({ visible: false });
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== 'CANVAS') return;

      if (e.touches.length > 1) {
        clearLongPress();
      }

      // 2-Finger Double-Tap -> Undo
      if (e.touches.length === 2) {
        const now = performance.now();
        if (now - lastTwoFingerTapTime.current < 360) {
          triggerHapticPulse('commit');
          undo();
          lastTwoFingerTapTime.current = 0;
        } else {
          lastTwoFingerTapTime.current = now;
        }
      }

      // 3-Finger Single-Tap -> Redo
      if (e.touches.length === 3) {
        triggerHapticPulse('commit');
        redo();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'CANVAS') {
        e.preventDefault();
        openRadialMenu(e.clientX, e.clientY);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      clearLongPress();
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [
    undo,
    redo,
    openRadialMenu,
    magneticLoupe.visible,
    setMagneticLoupe,
    activeSketchId,
    activeTool,
    gridSnapMm,
  ]);

  if (!magneticLoupe.visible) return null;

  // Offset 74px above finger/stylus contact point so hand never blocks crosshair
  const loupeX = Math.max(60, Math.min(window.innerWidth - 60, magneticLoupe.x));
  const loupeY = Math.max(70, magneticLoupe.y - 74);

  return (
    <div
      style={{ left: loupeX, top: loupeY }}
      className="fixed z-50 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none flex flex-col items-center"
    >
      <div className="w-24 h-24 rounded-full bg-[#090D16]/95 border-2 border-sky-400 shadow-2xl shadow-sky-500/30 flex items-center justify-center relative overflow-hidden">
        {/* Magnified Grid & Precision Crosshair */}
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        />
        <Crosshair className="w-8 h-8 text-sky-400 relative z-10" />
        <div className="w-2 h-2 rounded-full bg-amber-400 absolute z-20 shadow" />
      </div>
      <span className="mt-1 px-2 py-0.5 rounded-full bg-sky-500 text-slate-950 font-mono font-bold text-[9px] shadow">
        2.5× {magneticLoupe.worldCoordsLabel}
      </span>
    </div>
  );
};
