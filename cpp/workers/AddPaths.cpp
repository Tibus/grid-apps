#include "./AddPaths.h"
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
Napi::Value AddPaths::Init(const Napi::CallbackInfo& info, Shape2D *shape2D) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  std::string checkResult = ParametersChecker(info, "Shape2D add path", { napi_object, napi_number , napi_boolean});
  if (checkResult != "") {
    return Napi::String::New(env, checkResult);
  }
  Napi::Array pointsArrays = info[0].As<Napi::Array>();
  uint32_t polyTypeInt =  info[1].As<Napi::Number>().Uint32Value();
  bool closed = info[2].As<Napi::Boolean>().Value();
  uint32_t numberOfArray =  pointsArrays.Length();
  
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
  
  AddPaths *worker = new AddPaths(path, polyTypeInt, closed, shape2D, Napi::Object::New(info.Env()));
  return worker->Execute(env);
}

/**
 *  Constructor
 */
AddPaths::AddPaths(ClipperLib::Paths path, uint32_t polyTypeInt, bool closed, Shape2D *shape2D, const Napi::Object &resource)
  :  shape2D(shape2D), path(path), closed(closed), polyTypeInt(polyTypeInt)
  {
  }

  class SafeExecuteData
{
public:
  AddPaths* m_obj;
  Napi::Env*        m_env;
};

void AddPaths::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->AddP(*executeData->m_env);
}

Napi::Value AddPaths::Execute(Napi::Env env) {
  //Console::log("AddPaths ---->");
  ////Console::time("Colision with rays");

  SafeExecuteData executeData;
  executeData.m_obj = this;
  executeData.m_env = &env;
  if (!safeExecuteFunc(SafeExecute, &executeData))
    return this->OnError(env);

 // //Console::timeEnd("Colision with rays");
 return this->OnOK(env);
}

void AddPaths::AddP(Napi::Env env) {
  // Console::time("AddPaths");
  ClipperLib::PolyType polyType = polyTypeInt==0? ClipperLib::PolyType::ptSubject : ClipperLib::PolyType::ptClip;
  //Console::log("AddPaths ---->",polyType, closed);
  
  shape2D->clipper.AddPaths(path, polyType, closed);
  
  //shape2D->clipper.clear();
  //shape2D->mainPath.clear();
  // Console::timeEnd("AddPaths");
}

Napi::Value AddPaths::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "AddPaths error "));

   return props;
}

Napi::Value AddPaths::OnOK(Napi::Env env) {
  // Console::log("<---- AddPaths");

  // Console::time("exportToView");
 
  Napi::HandleScope scope(env);
  Napi::Object props = Napi::Object::New(env);


  props.Set("success", Napi::Boolean::New(env, true));

  // Console::timeEnd("exportToView");

   return props;
}