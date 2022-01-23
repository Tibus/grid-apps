#include "CleanPolyTree.h"
#include "../../utils/log.h"

/**
 *  static javascript interface initializer
 */
Napi::Object CleanPolyTree(ClipperLib::PolyNodes *PolyNodes, double clean){
  for(uint64_t index = 0; index < PolyNodes->size(); index++){
    ClipperLib::PolyNode * node = PolyNodes->at(index);
    // Console::time("CleanPolygon");
    ClipperLib::CleanPolygon(node->Contour, clean);
    // Console::timeStep("CleanPolygon");
    CleanPolyTree(&(node->Childs), clean);
  }
}