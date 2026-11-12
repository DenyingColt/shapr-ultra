import React, { useEffect } from 'react';
import { useCADStore } from './store/useCADStore';
import { TopHeaderBar } from './components/ui/TopHeaderBar';
import { LeftSidebarDrawer } from './components/ui/LeftSidebarDrawer';
import { AdaptiveContextMenu } from './components/ui/AdaptiveContextMenu';
import { NumericHUD } from './components/ui/NumericHUD';
import { HistoryTimeline } from './components/ui/HistoryTimeline';
import { MeasurementBar } from './components/ui/MeasurementBar';
import { MechanicalMacrosModal } from './components/ui/MechanicalMacrosModal';
import { TechnicalDrawingModal } from './components/ui/TechnicalDrawingModal';
import { ProjectDashboard } from './components/studio/ProjectDashboard';
import { ThumbModifierPad } from './components/ui/ThumbModifierPad';
import { RadialContextMenu } from './components/ui/RadialContextMenu';
import { OperationCoachBar } from './components/ui/OperationCoachBar';
import { GestureController } from './components/viewport/GestureController';
import { CADViewport } from './components/viewport/CADViewport';
import { CommandPalette } from './components/ui/CommandPalette';
import { SelectionFilterBar } from './components/ui/SelectionFilterBar';
import { FeatureOperationDialog } from './components/ui/FeatureOperationDialog';
import { ExplodedViewBar } from './components/ui/ExplodedViewBar';
import { InterferenceCheckModal } from './components/ui/InterferenceCheckModal';
import { HoleWizardModal } from './components/ui/HoleWizardModal';
import { SheetMetalBar } from './components/ui/SheetMetalBar';

export const App: React.FC = () => {
  const undo = useCADStore((s) => s.undo);
  const redo = useCADStore((s) => s.redo);
  const selectedFaceIds = useCADStore((s) => s.selectedFaceIds);
  const commitDeleteAndHealFaces = useCADStore((s) => s.commitDeleteAndHealFaces);
  const deleteSelectedEntities = useCADStore((s) => s.deleteSelectedEntities);
  const clearSelection = useCADStore((s) => s.clearSelection);
  const setActiveTool = useCADStore((s) => s.setActiveTool);
  const startSketchOnSelectionOrPlane = useCADStore(
    (s) => s.startSketchOnSelectionOrPlane
  );

  // Global CAD Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFaceIds.length > 0) {
          commitDeleteAndHealFaces();
        } else {
          deleteSelectedEntities();
        }
      } else if (e.key === 'Escape') {
        clearSelection();
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('extrude');
      } else if (e.key.toLowerCase() === 's') {
        startSketchOnSelectionOrPlane();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    selectedFaceIds,
    commitDeleteAndHealFaces,
    deleteSelectedEntities,
    clearSelection,
    setActiveTool,
    startSketchOnSelectionOrPlane,
  ]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#090d16] text-slate-100 select-none">
      {/* Top Action & View Bar with IndexedDB Auto-Save Status */}
      <TopHeaderBar />

      {/* Main Middle Workspace: Left Sidebar + 3D R3F CAD Viewport */}
      <div className="flex-1 flex relative overflow-hidden">
        <LeftSidebarDrawer />
        <CADViewport />
      </div>

      {/* Top Center Step-by-Step Operation Coach Bar & 3D Print Doctor Modal */}
      <OperationCoachBar />

      {/* Topological Selection Filter & Smart Propagation Bar */}
      <SelectionFilterBar />

      {/* Live Parametric Feature Operation Inspector Card */}
      <FeatureOperationDialog />

      {/* Assembly Auto-Explode, Section Box, Blueprint & Interference Check Bar */}
      <ExplodedViewBar />

      {/* Shapr3D Context-Aware Floating Quick-Action Pill */}
      <AdaptiveContextMenu />

      {/* Floating Precision Numeric HUD with Draggable CAD Numpad & Variable Dropdown */}
      <NumericHUD />

      {/* Tablet Ergonomics: Floating Thumb Modifier Pad (Shift, Alt, Construction, Lasso, Undo/Redo) */}
      <ThumbModifierPad />

      {/* 8-Slice Radial Marking Context Menu (Long-Press / Right-Click) */}
      <RadialContextMenu />

      {/* Multi-Touch Palm Rejection, 2-Finger Undo, 3-Finger Redo & Magnetic Crosshair Loupe */}
      <GestureController />

      {/* Persistent Engineering Measurement Readout */}
      <MeasurementBar />

      {/* Bottom Parametric History Timeline Scrubber */}
      <HistoryTimeline />

      {/* Universal Command Search Palette (Ctrl+K / /) */}
      <CommandPalette />

      {/* Commercial Project Studio Hub & IndexedDB Project Manager */}
      <ProjectDashboard />

      {/* Engineering Modals: Mechanical Standard Parts, 2D Blueprint, ISO Hole Wizard, Sheet Metal & Interference */}
      <MechanicalMacrosModal />
      <TechnicalDrawingModal />
      <HoleWizardModal />
      <SheetMetalBar />
      <InterferenceCheckModal />
    </div>
  );
};

export default App;
