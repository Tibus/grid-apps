#include "./AddPathsToOffset.h"
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

ClipperLib::JoinType getJoinType(uint8_t type){
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

ClipperLib::EndType getEndType(uint8_t type){
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

ClipperLib::PolyFillType getFillType(uint8_t type){
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


Napi::Value AddPathsToOffset::Init(const Napi::CallbackInfo& info, Shape2D *shape2D) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  std::string checkResult = ParametersChecker(info, "Shape2D add path", { napi_object, napi_number , napi_number, napi_boolean,napi_number, napi_boolean,napi_number});
  if (checkResult != "") {
    return Napi::String::New(env, checkResult);
  }
  Napi::Array pointsArrays = info[0].As<Napi::Array>();
  uint32_t numberOfArray =  pointsArrays.Length();
  uint8_t joinTypeInt =  info[1].As<Napi::Number>().Uint32Value();
  uint8_t endTypeInt =  info[2].As<Napi::Number>().Uint32Value();
  bool clean = info[3].As<Napi::Boolean>().Value();
  double cleanDistance =  info[4].As<Napi::Number>().DoubleValue();
  bool simple = info[5].As<Napi::Boolean>().Value();
  uint8_t fillTypeInt =  info[6].As<Napi::Number>().Uint32Value();
  
  
  std::vector<std::vector<int>> segmentArray;
  ClipperLib::Paths path (numberOfArray);
  
  for(uint32_t i = 0; i < numberOfArray; i++){
    const Napi::Array pointsArray = pointsArrays.Get(i).As<Napi::Array>();
    uint32_t length =  pointsArray.Length();
   
    for(uint32_t j = 0; j < length; j ++){
      Napi::Object o = pointsArray[j].As<Napi::Object>();
      int32_t x = (int32_t) (o.Get("X").As<Napi::Number>().FloatValue() *  shape2D->precision );
      int32_t y = (int32_t) (o.Get("Y").As<Napi::Number>().FloatValue() *  shape2D->precision );
      Console::log("o.Get(X).As<Napi::Number>().FloatValue()", o.Get("X").As<Napi::Number>().FloatValue(), shape2D->precision, x);
      Console::log("o.Get(Y).As<Napi::Number>().FloatValue()", o.Get("Y").As<Napi::Number>().FloatValue(), shape2D->precision, y);
      path[i] << ClipperLib::IntPoint(x,y);
    }
  }
  Console::log("----addPathToOffset");
  Console::log("test", shape2D->test);
  Console::log("precision", shape2D->precision);
  Console::log("path", path);
  
  AddPathsToOffset *worker = new AddPathsToOffset(path, joinTypeInt, endTypeInt, clean,cleanDistance, simple, fillTypeInt, shape2D, Napi::Object::New(info.Env()));
  return worker->Execute(env);
}

/**
 *  Constructor
 */
AddPathsToOffset::AddPathsToOffset(ClipperLib::Paths path, uint8_t joinTypeInt,  uint8_t endTypeInt,bool clean,double cleanDistance, bool simple, uint8_t fillTypeInt, Shape2D *shape2D, const Napi::Object &resource)
  :  shape2D(shape2D), path(path), endTypeInt(endTypeInt), joinTypeInt(joinTypeInt), clean(clean), simple(simple), fillTypeInt(fillTypeInt), cleanDistance(cleanDistance)
  {
  }

  class SafeExecuteData
{
public:
  AddPathsToOffset* m_obj;
  Napi::Env*        m_env;
};

void AddPathsToOffset::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->AddP(*executeData->m_env);
}

Napi::Value AddPathsToOffset::Execute(Napi::Env env) {
  Console::log("AddPathsToOffset ----->");

  SafeExecuteData executeData;
  executeData.m_obj = this;
  executeData.m_env = &env;
  if (!safeExecuteFunc(SafeExecute, &executeData))
    return this->OnError(env);

 // //Console::timeEnd("Colision with rays");
 return this->OnOK(env);
}

void AddPathsToOffset::AddP(Napi::Env env) {

  ClipperLib::JoinType joinType = getJoinType(joinTypeInt);
  ClipperLib::EndType endType = getEndType(endTypeInt);

  try{
    if(clean){
      ClipperLib::CleanPolygons(path, cleanDistance);
    } 
  }catch(int e){
    Console::log("CleanPolygons error", e);
  }
  
  try{
    if(simple){
      // ClipperLib::Path out_path;
      ClipperLib::PolyFillType fillType = getFillType(fillTypeInt);
      ClipperLib::SimplifyPolygons(path, fillType);
      // path = out_path;
    }
  }catch(int e){
    Console::log("SimplifyPolygons error", e);
  }

  
  Console::log("path", path);
  Console::log("joinType", joinType);
  Console::log("endType", endType);
  Console::log("shape2D", shape2D);
  Console::log("shape2D->clipperOffset", shape2D->clipperOffset.ArcTolerance);
  
  try{
    shape2D->clipperOffset.AddPaths(path, joinType, endType);
  }catch(int e){
    Console::log("AddPaths error", e);
  }

}

Napi::Value AddPathsToOffset::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  Console::log("<---- AddPathsToOffset error");

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "AddPaths error "));

   return props;
}

Napi::Value AddPathsToOffset::OnOK(Napi::Env env) {
  Console::log("<---- AddPathsToOffset");

  // Console::time("exportToView");
 
  Napi::HandleScope scope(env);
  Napi::Object props = Napi::Object::New(env);


  props.Set("success", Napi::Boolean::New(env, true));

  // Console::timeEnd("exportToView");

   return props;
}