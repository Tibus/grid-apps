#include "./CleanClipperPolygons.h"
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
Napi::Value CleanClipperPolygons::Init(const Napi::CallbackInfo& info, Shape2D *shape2D) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  std::string checkResult = ParametersChecker(info, "Shape2D add path", { napi_number});
  if (checkResult != "") {
    return Napi::String::New(env, checkResult);
  }
  double clean =  info[0].As<Napi::Number>().DoubleValue();

  
  CleanClipperPolygons *worker = new CleanClipperPolygons(clean, shape2D, Napi::Object::New(info.Env()));
  return worker->Execute(env);
}

/**
 *  Constructor
 */
CleanClipperPolygons::CleanClipperPolygons(double clean, Shape2D *shape2D, const Napi::Object &resource)
  :  clean(clean), shape2D(shape2D)
  {
  }

  class SafeExecuteData
{
public:
  CleanClipperPolygons* m_obj;
  Napi::Env*        m_env;
};

void CleanClipperPolygons::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->Clean(*executeData->m_env);
}

Napi::Value CleanClipperPolygons::Execute(Napi::Env env) {
  Console::log("CleanClipperPolygon ---->");
  //Console::time("Colision with rays");

  SafeExecuteData executeData;
  executeData.m_obj = this;
  executeData.m_env = &env;
  if (!safeExecuteFunc(SafeExecute, &executeData))
    return this->OnError(env);

 // //Console::timeEnd("Colision with rays");
 return this->OnOK(env);
}

void CleanClipperPolygons::Clean(Napi::Env env) {
  ClipperLib::CleanPolygons(shape2D->resultPaths, clean);
}

Napi::Value CleanClipperPolygons::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  Console::log("<---- CleanClipperPolygons error");

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "CleanClipperPolygons error "));

   return props;
}

Napi::Value CleanClipperPolygons::OnOK(Napi::Env env) {
  Console::log("<------- CleanClipperPolygons");
 
  Napi::HandleScope scope(env);
  Napi::Object props = Napi::Object::New(env);


  props.Set("success", Napi::Boolean::New(env, true));

  return props;
}