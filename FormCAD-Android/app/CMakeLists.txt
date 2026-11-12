// CMakeLists.txt — FormCAD Android NDK CAD & CSG Kernel (Manifold + OpenSCAD + STL)
cmake_minimum_required(VERSION 3.22.1)
project("formcad_kernel" LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(
    formcad_kernel
    SHARED
    src/main/cpp/cad_kernel.cpp
    src/main/cpp/scad_transpiler.cpp
    src/main/cpp/stl_exporter.cpp
    src/main/cpp/jni_bridge.cpp
)

find_library(log-lib log)

target_link_libraries(
    formcad_kernel
    ${log-lib}
)
