#include "./ClipperOffsetToPolyTree.h"
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

/**
 *  static javascript interface initializer
 */

ClipperLib::JoinType getJoinType2(uint8_t type){
    switch (type)
    {
    case 0 :
      return ClipperLib::JoinType::jtSquare;
    case 1 :
      return ClipperLib::JoinType::jtRound;
    case 2 :
      return ClipperLib::JoinType::jtMiter;
    default:
      return ClipperLib::JoinType::jtSquare;
    }
}

ClipperLib::EndType getEndType2(uint8_t type){
    switch (type)
    {
    case 0 :
      return ClipperLib::EndType::etOpenSquare;
    case 1 :
      return ClipperLib::EndType::etOpenRound;
    case 2 :
      return ClipperLib::EndType::etOpenButt;
    case 3 :
      return ClipperLib::EndType::etClosedLine;
    case 4 :
      return ClipperLib::EndType::etClosedPolygon;
    default :
      return ClipperLib::EndType::etClosedPolygon;
    }
}


ClipperLib::PolyFillType getFillType2(uint8_t type){
    switch (type)
    {
    case 0 :
      return ClipperLib::PolyFillType::pftEvenOdd;
    case 1 :
      return ClipperLib::PolyFillType::pftNonZero;
    case 2 :
      return ClipperLib::PolyFillType::pftPositive;
    case 3 :
      return ClipperLib::PolyFillType::pftNegative;
    default :
      return ClipperLib::PolyFillType::pftEvenOdd;
    }
}


Napi::Value ClipperOffsetToPolyTree::Init(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  
  std::string checkResult = ParametersChecker(info, "ClipperOffsetToPolyTree", { napi_object, napi_number , napi_number, napi_boolean,napi_number, napi_boolean,napi_number, napi_number, napi_number});
  if (checkResult != "") {
    Napi::Object props = Napi::Object::New(env);
    props.Set("success", Napi::Boolean::New(env, false));
    props.Set("error", Napi::String::New(env, checkResult));
    return props;
  }

  Napi::Array polys = info[0].As<Napi::Array>();

  uint8_t joinTypeInt =  info[1].As<Napi::Number>().Uint32Value();
  uint8_t endTypeInt =  info[2].As<Napi::Number>().Uint32Value();
  bool clean = info[3].As<Napi::Boolean>().Value();
  double cleanDistance =  info[4].As<Napi::Number>().DoubleValue();
  bool simple = info[5].As<Napi::Boolean>().Value();
  uint8_t fillTypeInt =  info[6].As<Napi::Number>().Uint32Value();
  double offset =  info[7].As<Napi::Number>().DoubleValue();
  double precision =  info[8].As<Napi::Number>().FloatValue();
  
  
  ClipperOffsetToPolyTree *worker = new ClipperOffsetToPolyTree(&polys, joinTypeInt, endTypeInt, clean,cleanDistance, simple, fillTypeInt, offset, precision, Napi::Object::New(info.Env()));
  return worker->Execute(env);
}

/**
 *  Constructor
 */
ClipperOffsetToPolyTree::ClipperOffsetToPolyTree(Napi::Array *polys, uint8_t joinTypeInt,  uint8_t endTypeInt,bool clean,double cleanDistance, bool simple, uint8_t fillTypeInt, double offset, float precision, const Napi::Object &resource)
  : polys(polys), endTypeInt(endTypeInt), joinTypeInt(joinTypeInt), clean(clean), simple(simple), fillTypeInt(fillTypeInt), cleanDistance(cleanDistance), offset(offset), precision(precision)
  {
  }

  class SafeExecuteData
{
public:
  ClipperOffsetToPolyTree* m_obj;
  Napi::Env*        m_env;
};

void ClipperOffsetToPolyTree::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->ExecuteFunction(*executeData->m_env);
}

Napi::Value ClipperOffsetToPolyTree::Execute(Napi::Env env) {
  // Console::log("ClipperOffsetToPolyTree ----->");

  SafeExecuteData executeData;
  executeData.m_obj = this;
  executeData.m_env = &env;
  if (!safeExecuteFunc(SafeExecute, &executeData))
    return this->OnError(env);
  // this->ExecuteFunction(env);

 //Console::timeEnd("Colision with rays");
 return this->OnOK(env);
}

void ClipperOffsetToPolyTree::ExecuteFunction(Napi::Env env) {
  uint32_t numberOfPoly =  polys->Length();

  ClipperLib::JoinType joinType = getJoinType2(joinTypeInt);
  ClipperLib::EndType endType = getEndType2(endTypeInt);
  
  for(uint32_t h = 0; h < numberOfPoly; h++){
    const Napi::Array paths = polys->Get(h).As<Napi::Array>();

    uint32_t lengthPath =  paths.Length();
    ClipperLib::Paths ins(lengthPath);

    // Console::time("for");
    for(uint32_t i = 0; i < lengthPath; i++){

      // Console::time("pointsArray");
      Napi::ArrayBuffer pointsArray = paths.Get(i).As<Napi::ArrayBuffer>();
      int* points = reinterpret_cast<int *>(pointsArray.Data());
      uint64_t size = pointsArray.ByteLength() / sizeof(int);
      // Console::timeStep("pointsArray");
    
      for(uint64_t j = 0; j < size; j+=2){
        // Console::time("forInsert");
        ins[i] << ClipperLib::IntPoint(points[j], points[j+1]);
        // Console::timeStep("forInsert");
      }
    }
    // Console::timeStep("for");

    // Console::time("clean");
    try{
      if(clean){
        ClipperLib::Paths cleans;
        ClipperLib::CleanPolygons(ins, cleans, cleanDistance);
        ins = cleans;
      }
    }catch(int e){
      Console::log("ClipperOffsetToPolyTree CleanPolygons error", e);
    }
    // Console::timeStep("clean");
    
    // Console::time("simple");
    try{
      if(simple){
        ClipperLib::Paths simples;
        ClipperLib::PolyFillType fillType = getFillType2(fillTypeInt);
        ClipperLib::SimplifyPolygons(ins, simples, fillType);
        ins = simples;      
      }
    }catch(int e){
      Console::log("ClipperOffsetToPolyTree SimplifyPolygons error", e);
    }
    // Console::timeStep("simple");

    // Console::time("AddPaths");
    co.AddPaths(ins, joinType, endType);
    // Console::timeStep("AddPaths");
  }

  try{
    // Console::time("Execute");
    co.Execute(resultPolyTree, offset);
    // Console::timeStep("Execute");
  }catch(int e){
    // Console::log("ClipperOffsetToPolyTree Execute error", e);
  }
}

Napi::Value ClipperOffsetToPolyTree::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  // Console::log("<---- ClipperOffsetToPolyTree error");

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "AddPaths error "));

  co.Clear();

  return props;
}

Napi::Value ClipperOffsetToPolyTree::OnOK(Napi::Env env) {
  // Console::log("<---- ClipperOffsetToPolyTree");

  // Console::time("exportToView");
 
  Napi::HandleScope scope(env);
  Napi::Object props = Napi::Object::New(env);

  props.Set("success", Napi::Boolean::New(env, true));

  Napi::Object polyTree = ExportPolyTree(&resultPolyTree, env);

  props.Set("polytree", polyTree);
  // Console::timeStep("PolyTree");

  co.Clear();
  resultPolyTree.Clear();

  return props;
}