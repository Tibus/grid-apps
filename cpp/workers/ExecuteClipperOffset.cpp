#include "./ExecuteClipperOffset.h"
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

Napi::Value ExecuteClipperOffset::Init(const Napi::CallbackInfo& info, Shape2D *shape2D) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  std::string checkResult = ParametersChecker(info, "Shape2D add path", { napi_number});
  if (checkResult != "") {
    return Napi::String::New(env, checkResult);
  }

  double delta =  info[0].As<Napi::Number>().DoubleValue();
 
 
  ExecuteClipperOffset *worker = new ExecuteClipperOffset( delta, shape2D, Napi::Object::New(info.Env()));
  return worker->Execute(env);

}

/**
 *  Constructor
 */
ExecuteClipperOffset::ExecuteClipperOffset( double delta, Shape2D *shape2D, const Napi::Object &resource)
  : shape2D(shape2D), delta(delta)
  {
  }

  class SafeExecuteData
{
public:
  ExecuteClipperOffset* m_obj;
  Napi::Env*        m_env;
};

void ExecuteClipperOffset::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->ExecClipperOffset(*executeData->m_env);
}

Napi::Value ExecuteClipperOffset::Execute(Napi::Env env) {
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

void ExecuteClipperOffset::ExecClipperOffset(Napi::Env env) {
  
  shape2D->clipperOffset.Execute(shape2D->resultPolyTree, delta);
}

Napi::Value ExecuteClipperOffset::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "ExecuteClipperOffset error "));

  return props;
}

Napi::Value ExecuteClipperOffset::OnOK(Napi::Env env) {
  // Console::log("<---- ExecuteClipperOffset");

  // Console::time("exportToView");
 
  Napi::HandleScope scope(env);
  Napi::Object props = Napi::Object::New(env);


  props.Set("success", Napi::Boolean::New(env, true));

  // Console::timeEnd("exportToView");

 return props;
}
