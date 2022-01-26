#include "ExportPolyNode.h"
#include "../../utils/log.h"

/**
 *  static javascript interface initializer
 */

Napi::Object ExportPolyNode(ClipperLib::PolyNode *node, Napi::Env env){
  Napi::Object polyNode = Napi::Object::New(env);

  Napi::Buffer<int32_t> polygonBuffer = ExportPolyContour(&(node->Contour), env);

  // polyNode.Set("m_polygon", polygon);
  polyNode.Set("m_polygonBuffer", polygonBuffer);
  //polyNode.Set("IsHole", node->IsHole()? 1 : 0 );
  polyNode.Set("IsOpen", node->IsOpen()? 1 : 0 );
  //polyNode.Set("ChildCount", node->ChildCount());
  
  Napi::Array childrenJS = Napi::Array::New(env, node->ChildCount());
  for(uint64_t index = 0; index < node->ChildCount(); index++){
    ClipperLib::PolyNode * nextNode = node->Childs[index];
    Napi::Object childJS = ExportPolyNode(nextNode, env);
    childrenJS.Set(index, childJS);
  }
  //Console::logOnce("<---- ExportPolyTree", node->Contour.size());
  polyNode.Set("m_Childs", childrenJS);
  return polyNode;
}
