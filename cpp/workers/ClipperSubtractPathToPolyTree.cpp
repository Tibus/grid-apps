#include "./ClipperSubtractPathToPolyTree.h"
#include "../vendors/utils/log.h"
#include "../vendors/utils/heapMutex.h"
#include "../vendors/utils/except.h"
#include "../vendors/utils/parallellFor.h"

#include <fstream>

#include "../lib/clipper.hpp"

#ifdef _WIN32
#include <Windows.h>
#include <string>
#endif


Napi::Value ClipperSubtractPathToPolyTree::Init(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  
  std::string checkResult = ParametersChecker(info, "ClipperSubtractPathToPolyTree", { napi_object, napi_object, napi_number});
  if (checkResult != "") {
    Napi::Object props = Napi::Object::New(env);
    props.Set("success", Napi::Boolean::New(env, false));
    props.Set("error", Napi::String::New(env, checkResult));
    return props;
  }

  Napi::Array polyA = info[0].As<Napi::Array>();
  Napi::Array polyB = info[1].As<Napi::Array>();
  double clean = info[2].As<Napi::Number>().DoubleValue();
  
  ClipperSubtractPathToPolyTree *worker = new ClipperSubtractPathToPolyTree(&polyA, &polyB, clean, Napi::Object::New(info.Env()));
  return worker->Execute(env);
}

/**
 *  Constructor
 */
ClipperSubtractPathToPolyTree::ClipperSubtractPathToPolyTree(Napi::Array *polyA, Napi::Array *polyB, double clean, const Napi::Object &resource)
  : polyA(polyA), polyB(polyB), clean(clean)
  {
    success = false;
  }

  class SafeExecuteData
{
public:
  ClipperSubtractPathToPolyTree* m_obj;
  Napi::Env*        m_env;
};

void ClipperSubtractPathToPolyTree::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->ExecuteFunction(*executeData->m_env);
}

Napi::Value ClipperSubtractPathToPolyTree::Execute(Napi::Env env) {
  // Console::log("ClipperSubtractPathToPolyTree ----->");

  SafeExecuteData executeData;
  executeData.m_obj = this;
  executeData.m_env = &env;
  // if (!safeExecuteFunc(SafeExecute, &executeData))
  //   return this->OnError(env);
  this->ExecuteFunction(env);

  //Console::timeEnd("Colision with rays");
  return this->OnOK(env);
}

void ClipperSubtractPathToPolyTree::ExecuteFunction(Napi::Env env) {
  
  Napi::Array paths = polyA->As<Napi::Array>();
  uint32_t lengthPath =  paths.Length();
  ClipperLib::Paths insA(lengthPath);

  for(uint32_t i = 0; i < lengthPath; i++){
    Napi::ArrayBuffer pointsArray = paths.Get(i).As<Napi::ArrayBuffer>();
    int* points = reinterpret_cast<int *>(pointsArray.Data());
    uint64_t size = pointsArray.ByteLength() / sizeof(int);
    
    for(uint64_t j = 0; j < size; j+=2){
      insA[i] << ClipperLib::IntPoint(points[j], points[j+1]);
    }
  }

  paths = polyB->As<Napi::Array>();
  lengthPath =  paths.Length();
  ClipperLib::Paths insB(lengthPath);

  for(uint32_t i = 0; i < lengthPath; i++){
    Napi::ArrayBuffer pointsArray = paths.Get(i).As<Napi::ArrayBuffer>();
    int* points = reinterpret_cast<int *>(pointsArray.Data());
    uint64_t size = pointsArray.ByteLength() / sizeof(int);
    
    for(uint64_t j = 0; j < size; j+=2){
      insB[i] << ClipperLib::IntPoint(points[j], points[j+1]);
    }
  }
  

  try{
    // Console::time("AddPaths1");
    co.AddPaths(insA, ClipperLib::ptSubject, true);
    insA.clear();
    // Console::timeEnd("AddPaths1");
  }catch(int e){
    Console::log("ClipperSubtractPathToPolyTree AddPaths1 error", e);
  }

  try{
    // Console::time("AddPaths2");
    co.AddPaths(insB, ClipperLib::ptClip, true);
    insB.clear();
    // Console::timeEnd("AddPaths2");
  }catch(int e){
    Console::log("ClipperSubtractPathToPolyTree AddPaths2 error", e);
  }

  try{
    // Console::time("Execute");
    success = co.Execute(ClipperLib::ctDifference, resultPolyTree, ClipperLib::pftEvenOdd, ClipperLib::pftEvenOdd);
    co.Clear();
    // Console::log("success", success);
    // Console::timeEnd("Execute");
  }catch(int e){
    Console::log("ClipperSubtractPathToPolyTree Execute error", e);
  }

  try{
    // Console::time("CleanPolyTree");
    CleanPolyTree(&(resultPolyTree.Childs), clean);
    // Console::log("success", success);
    // Console::timeEnd("CleanPolyTree");
  }catch(int e){
    Console::log("ClipperSubtractPathToPolyTree CleanPolyTree error", e);
  }

  try{
    insA.clear();
    insB.clear();
    co.Clear();
  }catch(int e){
    Console::log("ClipperSubtractPathToPolyTree Clean Path error", e);
  }

}

Napi::Value ClipperSubtractPathToPolyTree::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  // Console::log("<---- ClipperSubtractPathToPolyTree error");

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "AddPaths error "));

  co.Clear();

  return props;
}

Napi::Value ClipperSubtractPathToPolyTree::OnOK(Napi::Env env) {
  // Console::log("<---- ClipperSubtractPathToPolyTree");

  // Console::time("exportToView");
 
  Napi::HandleScope scope(env);
  Napi::Object props = Napi::Object::New(env);

  props.Set("success", Napi::Boolean::New(env, success));

  Napi::Object polyTree = ExportPolyTree(&resultPolyTree, env);

  props.Set("polytree", polyTree);
  co.Clear();
  resultPolyTree.Clear();

  // Console::timeStep("PolyTree");

  return props;
}