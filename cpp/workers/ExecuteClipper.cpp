#include "./ExecuteClipper.h"
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
 ClipperLib::PolyFillType getPolyFillType(uint32_t type){
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
    default:
      return ClipperLib::PolyFillType::pftEvenOdd;
    }
}

Napi::Value ExecuteClipper::Init(const Napi::CallbackInfo& info, Shape2D *shape2D) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  std::string checkResult = ParametersChecker(info, "Shape2D add path", { napi_number, napi_number , napi_number});
  if (checkResult != "") {
    return Napi::String::New(env, checkResult);
  }
  uint32_t clipTypeInt =  info[0].As<Napi::Number>().Uint32Value();
  uint32_t subFillTypeInt =  info[1].As<Napi::Number>().Uint32Value();
  uint32_t clipFillType =  info[2].As<Napi::Number>().Uint32Value();
 
 
  ExecuteClipper *worker = new ExecuteClipper(clipTypeInt, subFillTypeInt, clipFillType, shape2D, Napi::Object::New(info.Env()));
  return worker->Execute(env);

}

/**
 *  Constructor
 */
ExecuteClipper::ExecuteClipper(uint32_t clipTypeInt,uint32_t subFillTypeInt, uint32_t clipFillType, Shape2D *shape2D, const Napi::Object &resource)
  : shape2D(shape2D), clipTypeInt(clipTypeInt), subFillTypeInt(subFillTypeInt), clipFillType(clipFillType)
  {
  }

  class SafeExecuteData
{
public:
  ExecuteClipper* m_obj;
  Napi::Env*        m_env;
};

void ExecuteClipper::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->ExecClipper(*executeData->m_env);
}

Napi::Value ExecuteClipper::Execute(Napi::Env env) {
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

void ExecuteClipper::ExecClipper(Napi::Env env) {
  // Console::log("ExecuteClipper ---->");
  
  ClipperLib::ClipType clipType;
  ClipperLib::PolyFillType subjFillType = getPolyFillType(subFillTypeInt);
  ClipperLib::PolyFillType clipFillType = getPolyFillType(clipTypeInt);

  switch (clipTypeInt)
  {
  case 0 :
    clipType = ClipperLib::ClipType::ctIntersection;
    break;
  case 1 :
    clipType = ClipperLib::ClipType::ctUnion;
    break;
  case 2 :
    clipType = ClipperLib::ClipType::ctDifference;
    break;
  case 3 :
    clipType = ClipperLib::ClipType::ctXor;
    break;
  default:
    clipType = ClipperLib::ClipType::ctIntersection;
    break;
  }
  
  result = shape2D->clipper.Execute(clipType, shape2D->resultPolyTree, subjFillType, clipFillType);
  // Console::log("resultPolyTree", shape2D->resultPolyTree.Total(), result);
}

Napi::Value ExecuteClipper::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "ExecuteClipper error "));

  return props;
}

Napi::Value ExecuteClipper::OnOK(Napi::Env env) {
  // Console::log("<---- ExecuteClipper");

  // Console::time("exportToView");
 
  Napi::HandleScope scope(env);
  Napi::Object props = Napi::Object::New(env);


  props.Set("success", Napi::Boolean::New(env, result));

  // Console::timeEnd("exportToView");

 return props;
}
