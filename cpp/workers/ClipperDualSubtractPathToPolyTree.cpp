#include "./ClipperDualSubtractPathToPolyTree.h"
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


Napi::Value ClipperDualSubtractPathToPolyTree::Init(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  
  std::string checkResult = ParametersChecker(info, "ClipperDualSubtractPathToPolyTree", { napi_object, napi_object, napi_number, napi_boolean, napi_boolean});
  if (checkResult != "") {
    Napi::Object props = Napi::Object::New(env);
    props.Set("success", Napi::Boolean::New(env, false));
    props.Set("error", Napi::String::New(env, checkResult));
    return props;
  }

  Napi::Array polyA = info[0].As<Napi::Array>();
  Napi::Array polyB = info[1].As<Napi::Array>();
  double clean = info[2].As<Napi::Number>().DoubleValue();
  bool needOa = info[3].As<Napi::Boolean>().Value();
  bool needOb = info[4].As<Napi::Boolean>().Value();
  
  ClipperDualSubtractPathToPolyTree *worker = new ClipperDualSubtractPathToPolyTree(&polyA, &polyB, clean, needOa, needOb, Napi::Object::New(info.Env()));
  return worker->Execute(env);
}

/**
 *  Constructor
 */
ClipperDualSubtractPathToPolyTree::ClipperDualSubtractPathToPolyTree(Napi::Array *polyA, Napi::Array *polyB, double clean, bool needOa, bool needOb, const Napi::Object &resource)
  : polyA(polyA), polyB(polyB), clean(clean), needOa(needOa), needOb(needOb)
  {
    success = false;
  }

  class SafeExecuteData
{
public:
  ClipperDualSubtractPathToPolyTree* m_obj;
  Napi::Env*        m_env;
};

void ClipperDualSubtractPathToPolyTree::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->ExecuteFunction(*executeData->m_env);
}

Napi::Value ClipperDualSubtractPathToPolyTree::Execute(Napi::Env env) {
  // Console::log("ClipperDualSubtractPathToPolyTree ----->");

  SafeExecuteData executeData;
  executeData.m_obj = this;
  executeData.m_env = &env;
  // if (!safeExecuteFunc(SafeExecute, &executeData))
  //   return this->OnError(env);
  this->ExecuteFunction(env);

  // Console::timeStep("DualSubtract Colision with rays");
  return this->OnOK(env);
}

void ClipperDualSubtractPathToPolyTree::ExecuteFunction(Napi::Env env) {
  
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
  
  if(needOa){
    try{
      // Console::time("DualSubtract AddPaths1");
      co.AddPaths(insA, ClipperLib::ptSubject, true);
      // Console::timeStep("DualSubtract AddPaths1");
    }catch(int e){
      Console::log("ClipperDualSubtractPathToPolyTree AddPaths1 error", e);
    }

    try{
      // Console::time("DualSubtract AddPaths2");
      co.AddPaths(insB, ClipperLib::ptClip, true);
      // Console::timeStep("DualSubtract AddPaths2");
    }catch(int e){
      Console::log("ClipperDualSubtractPathToPolyTree AddPaths2 error", e);
    }

    try{
      // Console::time("DualSubtract Execute");
      success = co.Execute(ClipperLib::ctDifference, resultPolyTreeA, ClipperLib::pftEvenOdd, ClipperLib::pftEvenOdd);
      // Console::log("success", success);
      // Console::timeStep("DualSubtract Execute");
    }catch(int e){
      Console::log("ClipperDualSubtractPathToPolyTree Execute error", e);
    }

    try{
      // Console::time("DualSubtract CleanPolyTree");
      CleanPolyTree(&(resultPolyTreeA.Childs), clean);
      // Console::log("success", success);
      // Console::timeStep("DualSubtract CleanPolyTree");
    }catch(int e){
      Console::log("ClipperDualSubtractPathToPolyTree CleanPolyTree error", e);
    }
  }

  co.Clear();

  if(needOb){
    try{
      // Console::time("DualSubtract AddPaths1");
      co.AddPaths(insB, ClipperLib::ptSubject, true);
      // Console::timeStep("DualSubtract AddPaths1");
    }catch(int e){
      Console::log("ClipperDualSubtractPathToPolyTree AddPaths1 error", e);
    }

    try{
      // Console::time("DualSubtract AddPaths2");
      co.AddPaths(insA, ClipperLib::ptClip, true);
      // Console::timeStep("DualSubtract AddPaths2");
    }catch(int e){
      Console::log("ClipperDualSubtractPathToPolyTree AddPaths2 error", e);
    }

    try{
      // Console::time("DualSubtract Execute");
      success = co.Execute(ClipperLib::ctDifference, resultPolyTreeB, ClipperLib::pftEvenOdd, ClipperLib::pftEvenOdd);
      // Console::log("success", success);
      // Console::timeStep("DualSubtract Execute");
    }catch(int e){
      Console::log("ClipperDualSubtractPathToPolyTree Execute error", e);
    }

    try{
      // Console::time("DualSubtract CleanPolyTree");
      CleanPolyTree(&(resultPolyTreeB.Childs), clean);
      // Console::log("success", success);
      // Console::timeStep("DualSubtract CleanPolyTree");
    }catch(int e){
      Console::log("ClipperDualSubtractPathToPolyTree CleanPolyTree error", e);
    }
  }
}

Napi::Value ClipperDualSubtractPathToPolyTree::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  // Console::log("<---- ClipperDualSubtractPathToPolyTree error");

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "AddPaths error "));

  co.Clear();

  return props;
}

Napi::Value ClipperDualSubtractPathToPolyTree::OnOK(Napi::Env env) {
  // Console::log("<---- ClipperDualSubtractPathToPolyTree");
 
  Napi::HandleScope scope(env);
  Napi::Object props = Napi::Object::New(env);

  props.Set("success", Napi::Boolean::New(env, success));

  // Console::time("DualSubtract PolyTree");
  Napi::Object polyTreeA = ExportPolyTree(&resultPolyTreeA, env);
  props.Set("polytreeA", polyTreeA);

  Napi::Object polyTreeB = ExportPolyTree(&resultPolyTreeB, env);
  props.Set("polytreeB", polyTreeB);
  // Console::timeStep("DualSubtract PolyTree");

  co.Clear();
  resultPolyTreeA.Clear();
  resultPolyTreeB.Clear();

  return props;
}