#pragma once
#include <vector>
#include <string>
#include <cstdint>

namespace formcad {

struct Vec3 {
    float x, y, z;
};

struct Triangle {
    uint32_t i0, i1, i2;
    Vec3 normal;
};

enum class BooleanOp {
    UNION,
    DIFFERENCE_CUT,
    INTERSECTION
};

enum class PrimitiveType {
    BOX,
    CYLINDER,
    TUBE,
    HEX_PRISM,
    EXTRUDED_SKETCH
};

struct CadFeature {
    uint32_t id;
    std::string name;
    PrimitiveType type;
    BooleanOp op;
    float width;
    float depth;
    float height;
    float chamfer;
    Vec3 position;
    std::vector<Vec3> sketchProfile2D;
};

struct ManifoldMesh {
    std::vector<Vec3> vertices;
    std::vector<Triangle> triangles;
    bool isWatertight = true;
    float volumeCm3 = 0.0f;
};

class CadKernel {
public:
    CadKernel() = default;

    uint32_t addFeature(const CadFeature& feature);
    bool updateFeatureDimensions(uint32_t id, float w, float d, float h, float chamfer);
    ManifoldMesh evaluateCSGTree() const;

    // 3D Printer & OpenSCAD Interop
    std::string exportToOpenSCAD() const;
    std::string exportToAsciiSTL(const std::string& solidName = "FormCAD_Model") const;
    std::vector<uint8_t> exportToBinarySTL() const;

private:
    std::vector<CadFeature> features_;
    ManifoldMesh tessellateFeature(const CadFeature& f) const;
};

} // namespace formcad
