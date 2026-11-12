package com.formcad.android.ui

import android.view.MotionEvent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInteropFilter
import androidx.compose.ui.unit.dp

/**
 * FormCAD Android — S-Pen / Stylus + Multi-Touch CAD Workspace
 * Separates Stylus (MOTION_EVENT_TOOL_TYPE_STYLUS) for 2D/3D precision sketching & extrusion
 * from Finger touch (TOOL_TYPE_FINGER) for Orbit/Pan/Zoom camera navigation.
 */
@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun FormCadTabletScreen(
    onExportStl: () -> Unit,
    onExportScad: () -> Unit
) {
    var activeMode by remember { mutableStateOf("3D_DIRECT") }
    var stylusPressure by remember { mutableFloatStateOf(0f) }

    Row(modifier = Modifier.fillMaxSize()) {
        // Left Shapr3D-Style Radial/Dock Tool Strip
        Surface(
            tonalElevation = 2.dp,
            modifier = Modifier.width(72.dp).fillMaxHeight()
        ) {
            Column(
                modifier = Modifier.padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(onClick = { activeMode = "SKETCH_2D" }) { Text("2D") }
                Button(onClick = { activeMode = "3D_DIRECT" }) { Text("3D") }
                Spacer(modifier = Modifier.weight(1f))
                Button(onClick = onExportScad) { Text("SCAD") }
                Button(onClick = onExportStl) { Text("STL") }
            }
        }

        // Center Vulkan / Filament Viewport with Hardware Stylus Differentiation
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .pointerInteropFilter { event ->
                    val toolType = event.getToolType(0)
                    when (toolType) {
                        MotionEvent.TOOL_TYPE_STYLUS -> {
                            // S-Pen / Active Stylus -> Precision Sketch & Extrude Pull
                            stylusPressure = event.pressure
                            val tilt = event.getAxisValue(MotionEvent.AXIS_TILT)
                            handleStylusCadAction(event.x, event.y, stylusPressure, tilt)
                            true
                        }
                        MotionEvent.TOOL_TYPE_FINGER -> {
                            // Finger Touch -> Orbit / Pan / Pinch Camera Navigation
                            handleCameraTouchNavigation(event)
                            true
                        }
                        else -> false
                    }
                }
        )
    }
}

private fun handleStylusCadAction(x: Float, y: Float, pressure: Float, tilt: Float) {
    // Dispatches directly to JNI CadKernel
}

private fun handleCameraTouchNavigation(event: MotionEvent) {
    // Updates Filament Camera Orbit/Pan matrix
}
