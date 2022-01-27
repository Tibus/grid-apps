#include "./ClipperFillAreaToPolyTree.h"
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


Napi::Value ClipperFillAreaToPolyTree::Init(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  
  std::string checkResult = ParametersChecker(info, "ClipperFillAreaToPolyTree", { napi_object, napi_object, napi_boolean});
  if (checkResult != "") {
    Napi::Object props = Napi::Object::New(env);
    props.Set("success", Napi::Boolean::New(env, false));
    props.Set("error", Napi::String::New(env, checkResult));
    return props;
  }

  Napi::ArrayBuffer polyA = info[0].As<Napi::ArrayBuffer>();
  Napi::Array polyB = info[1].As<Napi::Array>();
  bool outPutOnlyLine = info[2].As<Napi::Boolean>().Value();
 
  
  ClipperFillAreaToPolyTree *worker = new ClipperFillAreaToPolyTree(&polyA, &polyB, outPutOnlyLine, Napi::Object::New(info.Env()));
  return worker->Execute(env);
}

/**
 *  Constructor
 */
ClipperFillAreaToPolyTree::ClipperFillAreaToPolyTree(Napi::ArrayBuffer *polyA, Napi::Array *polyB,bool outPutOnlyLine, const Napi::Object &resource)
  : polyA(polyA), polyB(polyB), outPutOnlyLine(outPutOnlyLine)
  {
    success = false;
  }

  class SafeExecuteData
{
public:
  ClipperFillAreaToPolyTree* m_obj;
  Napi::Env*        m_env;
};

void ClipperFillAreaToPolyTree::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->ExecuteFunction(*executeData->m_env);
}

Napi::Value ClipperFillAreaToPolyTree::Execute(Napi::Env env) {
  // Console::log("ClipperFillAreaToPolyTree ----->");

  SafeExecuteData executeData;
  executeData.m_obj = this;
  executeData.m_env = &env;
  // if (!safeExecuteFunc(SafeExecute, &executeData))
  //   return this->OnError(env);
  this->ExecuteFunction(env);

  //Console::timeEnd("Colision with rays");
  return this->OnOK(env);
}

void ClipperFillAreaToPolyTree::ExecuteFunction(Napi::Env env) {

  Napi::ArrayBuffer pointsArray = polyA->As<Napi::ArrayBuffer>();
  int* points = reinterpret_cast<int *>(pointsArray.Data());
  uint64_t size = pointsArray.ByteLength() / sizeof(int);
  ClipperLib::Paths insA(size/4);
  
  for(uint64_t i = 0; i < size/4; i++){
    for(uint64_t j = 0; j < 2; j++){
      insA[i] << ClipperLib::IntPoint(points[i*4 + j*2], points[i*4 + j*2+1]);
    }
  }

  Napi::Array paths = polyB->As<Napi::Array>();
  uint32_t lengthPath =  paths.Length();
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
    success = co.AddPaths(insA, ClipperLib::ptSubject, false);
    // Console::log("success", success);
    // Console::timeEnd("AddPaths1");
  }catch(int e){
    Console::log("ClipperFillAreaToPolyTree AddPaths1 error", e);
  }

  try{
    // Console::time("AddPaths2");
    success = co.AddPaths(insB, ClipperLib::ptClip, true);
    // Console::log("success", success);
    // Console::timeEnd("AddPaths2");
  }catch(int e){
    Console::log("ClipperFillAreaToPolyTree AddPaths2 error", e);
  }

  try{
    // Console::time("Execute");
    success = co.Execute(ClipperLib::ctIntersection, resultPolyTree, ClipperLib::pftNonZero, ClipperLib::pftEvenOdd);
    
  }catch(int e){
    Console::log("ClipperFillAreaToPolyTree Execute error", e);
  }

  try{
    insA.clear();
    insB.clear();
    co.Clear();
  }catch(int e){
    Console::log("ClipperFillAreaToPolyTree Clean Path error", e);
  }

}

Napi::Value ClipperFillAreaToPolyTree::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  // Console::log("<---- ClipperFillAreaToPolyTree error");

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "AddPaths error "));

  co.Clear();

  return props;
}

Napi::Value ClipperFillAreaToPolyTree::OnOK(Napi::Env env) {
  //Console::log("<---- ClipperFillAreaToPolyTree", outPutOnlyLine);

  // Console::time("exportToView");
 
  Napi::HandleScope scope(env);
  Napi::Object props = Napi::Object::New(env);

  props.Set("success", Napi::Boolean::New(env, success));
  if(outPutOnlyLine){
    Napi::Buffer<int32_t> lines = ExportLine(&resultPolyTree, env);
  }else{
    Napi::Object polyTree = ExportPolyTree(&resultPolyTree, env);

  props.Set("polytree", polyTree);
  }
  
  // Console::timeStep("PolyTree");

  co.Clear();
  resultPolyTree.Clear();

  return props;
}