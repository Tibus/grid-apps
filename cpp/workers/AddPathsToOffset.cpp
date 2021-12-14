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


Napi::Value AddPathsToOffset::Init(const Napi::CallbackInfo& info, Shape2D *shape2D) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  std::string checkResult = ParametersChecker(info, "Shape2D add path", { napi_object, napi_number , napi_number});
  if (checkResult != "") {
    return Napi::String::New(env, checkResult);
  }
  Napi::Array pointsArrays = info[0].As<Napi::Array>();
  uint32_t numberOfArray =  pointsArrays.Length();
  uint8_t joinTypeInt =  info[1].As<Napi::Number>().Uint32Value();
  uint8_t endTypeInt =  info[2].As<Napi::Number>().Uint32Value();
  
  
  std::vector<std::vector<int>> segmentArray;
  ClipperLib::Paths path (numberOfArray);
  
  for(uint32_t i = 0; i < numberOfArray; i++){
    const Napi::Array pointsArray = pointsArrays.Get(i).As<Napi::Array>();
    uint32_t length =  pointsArray.Length();
   
    for(uint32_t j = 0; j < length; j ++){
      Napi::Object o = pointsArray[j].As<Napi::Object>();
      int32_t x = (int32_t) (o.Get("X").As<Napi::Number>().FloatValue() *  shape2D->precision );
      int32_t y = (int32_t) (o.Get("Y").As<Napi::Number>().FloatValue() *  shape2D->precision );
      path[i] << ClipperLib::IntPoint(x,y);
    }
  }
  
  AddPathsToOffset *worker = new AddPathsToOffset(path, joinTypeInt, endTypeInt, shape2D, Napi::Object::New(info.Env()));
  return worker->Execute(env);
}

/**
 *  Constructor
 */
AddPathsToOffset::AddPathsToOffset(ClipperLib::Paths path, uint8_t joinTypeInt,  uint8_t endTypeInt, Shape2D *shape2D, const Napi::Object &resource)
  :  shape2D(shape2D), path(path), endTypeInt(endTypeInt), joinTypeInt(joinTypeInt)
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
  
  shape2D->clipperOffset.AddPaths(path, joinType, endType);
  

}

Napi::Value AddPathsToOffset::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "AddPaths error "));

   return props;
}

Napi::Value AddPathsToOffset::OnOK(Napi::Env env) {
  // Console::log("<---- AddPaths");

  // Console::time("exportToView");
 
  Napi::HandleScope scope(env);
  Napi::Object props = Napi::Object::New(env);


  props.Set("success", Napi::Boolean::New(env, true));

  // Console::timeEnd("exportToView");

   return props;
}