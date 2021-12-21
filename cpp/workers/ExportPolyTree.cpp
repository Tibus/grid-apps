#include "./ExportPolyTree.h"
#include "../vendors/utils/log.h"
#include "../vendors/utils/heapMutex.h"
#include "../vendors/utils/except.h"

#include <fstream>

#include "../lib/clipper.hpp"

#ifdef _WIN32
#include <Windows.h>
#include <string>
#endif

/**
 *  static javascript interface initializer
 */


Napi::Value ExportPolyTree::Init(const Napi::CallbackInfo& info, Shape2D *shape2D) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  std::string checkResult = ParametersChecker(info, "Shape2D add path", {});
  if (checkResult != "") {
    return Napi::String::New(env, checkResult);
  }
  
 
  ExportPolyTree *worker = new ExportPolyTree( shape2D, Napi::Object::New(info.Env()));
  return worker->Execute(env);

}

/**
 *  Constructor
 */
ExportPolyTree::ExportPolyTree( Shape2D *shape2D, const Napi::Object &resource)
  : shape2D(shape2D)
  {
  }

  class SafeExecuteData
{
public:
  ExportPolyTree* m_obj;
  Napi::Env*        m_env;
};

void ExportPolyTree::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->Export(*executeData->m_env);
}

Napi::Value ExportPolyTree::Execute(Napi::Env env) {
  //Console::log("ColisionWithPath ---->");
  ////Console::time("Colision with rays");

  SafeExecuteData executeData;
  executeData.m_obj = this;
  executeData.m_env = &env;
  if (!safeExecuteFunc(SafeExecute, &executeData))
    return this->OnError(env);

 // //Console::timeEnd("Colision with rays");
 return this->OnOK(env);
}



void ExportPolyTree::Export(Napi::Env env) {
  // Console::log("----> ExportPolyTree");
}

Napi::Value ExportPolyTree::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "ExportPolyTree error "));

  return props;
}

Napi::Object ExportPolyTree::ExportPolyNode(ClipperLib::PolyNode *node, Napi::Env env){
  Napi::Object polyNode = Napi::Object::New(env);
  Napi::Array polygon = Napi::Array::New(env, node->Contour.size());
  for(uint32_t index =0; index < node->Contour.size(); index++ ){
    Napi::Object point = Napi::Object::New(env);
    point.Set("X", node->Contour[index].X);
    point.Set("Y", node->Contour[index].Y);
    polygon.Set(index, point);
  }
  polyNode.Set("m_polygon", polygon);
  polyNode.Set("IsHole", Napi::Boolean::New(env, node->IsHole()));
  polyNode.Set("IsOpen", Napi::Boolean::New(env, node->IsOpen()));
  //polyNode.Set("ChildCount", node->ChildCount());
  
  Napi::Array childrenJS = Napi::Array::New(env, node->ChildCount());
  for(uint64_t index = 0; index < node->ChildCount(); index++){
    ClipperLib::PolyNode * nextNode = node->Childs[index];
    Napi::Object childJS = ExportPolyNode(nextNode, env);
    childrenJS.Set(index, childJS);
  }
  Console::logOnce("<---- ExportPolyTree", node->Contour.size());
  polyNode.Set("m_Childs",childrenJS);
  return polyNode;
}

Napi::Value ExportPolyTree::OnOK(Napi::Env env) {
  
 
  Napi::HandleScope scope(env);
  Napi::Object polyTree = Napi::Object::New(env);
  Napi::Array childrenJS = Napi::Array::New(env, shape2D->resultPolyTree.Childs.size());
  for(uint64_t index = 0; index < shape2D->resultPolyTree.Childs.size(); index++){
    ClipperLib::PolyNode * node = shape2D->resultPolyTree.Childs[index];
    Napi::Object childJS = ExportPolyNode(node, env);
    childrenJS.Set(index, childJS);
  }

  Napi::Array polygon = Napi::Array::New(env, shape2D->resultPolyTree.Contour.size());
  for(uint32_t index =0; index < shape2D->resultPolyTree.Contour.size(); index++ ){
    Napi::Object point = Napi::Object::New(env);
    point.Set("X", shape2D->resultPolyTree.Contour[index].X);
    point.Set("Y", shape2D->resultPolyTree.Contour[index].Y);
    polygon.Set(index, point);
  }
  polyTree.Set("m_polygon", polygon);
 
  
  polyTree.Set("m_Childs",childrenJS);
  polyTree.Set("IsHole", Napi::Boolean::New(env, shape2D->resultPolyTree.IsHole()));
  polyTree.Set("IsOpen", Napi::Boolean::New(env, shape2D->resultPolyTree.IsOpen()));  
  //polyTree.Set("ChildCount", shape2D->resultPolyTree.ChildCount());
  //polyTree.Set("m_endtype", shape2D->resultPolyTree.m_endtype);
  //polyTree.Set("m_jointype", shape2D->resultPolyTree.m_jointype);

 return polyTree;
}
