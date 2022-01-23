#include "ExportPolyTree.h"
#include "../../utils/log.h"

/**
 *  static javascript interface initializer
 */

Napi::Object ExportPolyTree(ClipperLib::PolyTree *polyTree, Napi::Env env){
  // Console::time("ExportPolyTree");

  Napi::Object result = Napi::Object::New(env);
  Napi::Array childrenJS = Napi::Array::New(env, polyTree->Childs.size());
  
  for(uint64_t index = 0; index < polyTree->Childs.size(); index++){
    ClipperLib::PolyNode * node = polyTree->Childs[index];
    // Console::time("ExportPolyNode");
    Napi::Object childJS = ExportPolyNode(node, env);
    // Console::timeStep("ExportPolyNode");
    childrenJS.Set(index, childJS);
  }

  Napi::Buffer<int32_t> polygonBuffer = ExportPolyContour(&(polyTree->Contour), env);

  result.Set("m_AllPolysBuffer", polygonBuffer);
  result.Set("m_Childs",childrenJS);
  result.Set("IsOpen", Napi::Boolean::New(env, polyTree->IsOpen()));  
  //result.Set("IsHole", Napi::Boolean::New(env, polyTree->IsHole()));
  //result.Set("ChildCount", polyTree->ChildCount());
  //result.Set("m_endtype", polyTree->m_endtype);
  //result.Set("m_jointype", polyTree->m_jointype);

  // Console::timeStep("ExportPolyTree");

  return result;
}